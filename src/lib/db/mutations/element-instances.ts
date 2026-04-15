import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ClaimedResult, FinalResult, ScoreEventType } from "@/lib/game/enums";
import { mapFinalResultToState } from "@/lib/game/state-machines/element-instance-machine";
import type { ElementInstance, ElementTemplate } from "@/types/domain";

type ActivateElementInput = {
  participantId: string;
  templateId: string;
  slotIndex: number;
  isFake?: boolean;
};

type ResolveElementOptions = {
  skippedCooldownMinutes?: number;
};

function addSeconds(base: Date, seconds: number): string {
  return new Date(base.getTime() + seconds * 1_000).toISOString();
}

function computeSkipAvailableAt(
  activatedAt: Date,
  template: Pick<ElementTemplate, "skip_unlock_rule" | "duration_seconds">,
): string {
  const ratio = template.skip_unlock_rule === "one_half" ? 0.5 : 1 / 3;
  return addSeconds(activatedAt, Math.ceil(template.duration_seconds * ratio));
}

function assertSingleRow<T>(data: T | null, error: { message: string } | null, context: string): T {
  if (error || !data) {
    throw new Error(`${context}: ${error?.message ?? "not found"}`);
  }

  return data;
}

export async function activateElement(input: ActivateElementInput): Promise<ElementInstance> {
  const supabase = createServerSupabaseClient();

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, session_id")
    .eq("id", input.participantId)
    .maybeSingle();

  const runtimeParticipant = assertSingleRow(participant, participantError, "Failed to load participant for activation");

  const { data: template, error: templateError } = await supabase
    .from("element_templates")
    .select("id, duration_seconds, skip_unlock_rule, proof_required")
    .eq("id", input.templateId)
    .maybeSingle();

  const runtimeTemplate = assertSingleRow(template, templateError, "Failed to load element template for activation");
  const activatedAt = new Date();

  const payload = {
    participant_id: input.participantId,
    session_id: runtimeParticipant.session_id,
    element_template_id: input.templateId,
    state: "active" as const,
    active_slot_index: input.slotIndex,
    is_fake: input.isFake ?? false,
    activated_at: activatedAt.toISOString(),
    ends_at: addSeconds(activatedAt, runtimeTemplate.duration_seconds),
    skip_available_at: computeSkipAvailableAt(activatedAt, runtimeTemplate),
    proof_status: runtimeTemplate.proof_required ? "pending" : "not_required",
  };

  const { data: instance, error: insertError } = await supabase
    .from("element_instances")
    .insert(payload)
    .select("*")
    .single();

  return assertSingleRow(instance as ElementInstance | null, insertError, "Failed to create element instance");
}

export function getEndsAt(instance: Pick<ElementInstance, "ends_at">): string | null {
  return instance.ends_at ?? null;
}

export function getSkipAvailableAt(instance: Pick<ElementInstance, "skip_available_at">): string | null {
  return instance.skip_available_at ?? null;
}

export async function claimResult(instanceId: string, claimedResult: ClaimedResult): Promise<ElementInstance> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("element_instances")
    .update({ claimed_result: claimedResult })
    .eq("id", instanceId)
    .select("*")
    .single();

  return assertSingleRow(data as ElementInstance | null, error, "Failed to claim element result");
}

export async function submitProof(instanceId: string): Promise<ElementInstance> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("element_instances")
    .update({ proof_status: "provided" })
    .eq("id", instanceId)
    .select("*")
    .single();

  return assertSingleRow(data as ElementInstance | null, error, "Failed to submit proof");
}

export async function denyProof(instanceId: string): Promise<ElementInstance> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("element_instances")
    .update({ proof_status: "denied" })
    .eq("id", instanceId)
    .select("*")
    .single();

  return assertSingleRow(data as ElementInstance | null, error, "Failed to deny proof");
}

export async function resolveElement(
  instanceId: string,
  finalResult: FinalResult,
  options: ResolveElementOptions = {},
): Promise<ElementInstance> {
  const supabase = createServerSupabaseClient();

  const nextState = mapFinalResultToState(finalResult);
  const updatePayload: Record<string, string | null> = {
    final_result: finalResult,
    state: nextState,
  };

  if (finalResult === "skipped") {
    const cooldownMinutes = options.skippedCooldownMinutes ?? 0;
    updatePayload.cooldown_until = cooldownMinutes > 0 ? addSeconds(new Date(), cooldownMinutes * 60) : null;
  }

  const { data, error } = await supabase
    .from("element_instances")
    .update(updatePayload)
    .eq("id", instanceId)
    .select("*")
    .single();

  return assertSingleRow(data as ElementInstance | null, error, "Failed to resolve element");
}

export async function expireElement(instanceId: string): Promise<ElementInstance | null> {
  const supabase = createServerSupabaseClient();

  const { data: instance, error: loadError } = await supabase
    .from("element_instances")
    .select("*")
    .eq("id", instanceId)
    .maybeSingle();

  const runtimeInstance = assertSingleRow(instance as ElementInstance | null, loadError, "Failed to load element instance for expiration");

  if (runtimeInstance.state !== "active" || !runtimeInstance.ends_at || new Date(runtimeInstance.ends_at).getTime() >= Date.now()) {
    return null;
  }

  const { data, error } = await supabase
    .from("element_instances")
    .update({ state: "expired", final_result: "fail" })
    .eq("id", instanceId)
    .select("*")
    .single();

  return assertSingleRow(data as ElementInstance | null, error, "Failed to expire element instance");
}

export function computeNetPoints(instance: Pick<ElementInstance, "points_gained" | "points_lost">): number {
  return instance.points_gained - instance.points_lost;
}

export function createScoreEventFromInstance(
  instance: Pick<ElementInstance, "final_result">,
  template: Pick<ElementTemplate, "element_type">,
): ScoreEventType | null {
  if (!instance.final_result) {
    return null;
  }

  if (template.element_type === "mission") {
    if (instance.final_result === "success") {
      return "mission_success";
    }
    if (instance.final_result === "skipped") {
      return "skip_penalty";
    }
  }

  if (template.element_type === "constraint") {
    if (instance.final_result === "success") {
      return "constraint_success";
    }
    if (instance.final_result === "broken") {
      return "constraint_break_penalty";
    }
    if (instance.final_result === "skipped") {
      return "skip_penalty";
    }
  }

  return null;
}
