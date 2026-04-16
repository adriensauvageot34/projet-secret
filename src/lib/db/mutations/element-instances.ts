import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ClaimedResult, FinalResult, ScoreEventType } from "@/lib/game/enums";
import { mapFinalResultToState } from "@/lib/game/state-machines/element-instance-machine";
import type { ElementInstance, ElementTemplate } from "@/types/domain";

export type CreateElementInstanceInput = {
  participantId: string;
  sessionId: string;
  templateId: string;
  slotIndex: number;
  activatedAt: string;
  endsAt: string;
  skipAvailableAt: string;
  proofStatus: ElementInstance["proof_status"];
  isFake?: boolean;
};

type ResolveElementOptions = {
  skippedCooldownMinutes?: number;
};

function addSeconds(base: Date, seconds: number): string {
  return new Date(base.getTime() + seconds * 1_000).toISOString();
}

function assertSingleRow<T>(data: T | null, error: { message: string } | null, context: string): T {
  if (error || !data) {
    throw new Error(`${context}: ${error?.message ?? "not found"}`);
  }

  return data;
}

export async function createElementInstance(input: CreateElementInstanceInput): Promise<ElementInstance> {
  const supabase = createServerSupabaseClient();

  const payload = {
    participant_id: input.participantId,
    session_id: input.sessionId,
    element_template_id: input.templateId,
    state: "active" as const,
    active_slot_index: input.slotIndex,
    is_fake: input.isFake ?? false,
    activated_at: input.activatedAt,
    ends_at: input.endsAt,
    skip_available_at: input.skipAvailableAt,
    proof_status: input.proofStatus,
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
    .is("final_result", null)
    .select("*")
    .single();

  return assertSingleRow(
    data as ElementInstance | null,
    error,
    "Failed to claim element result (already terminally resolved or not found)",
  );
}

export async function submitProof(instanceId: string): Promise<ElementInstance> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("element_instances")
    .update({ proof_status: "provided" })
    .eq("id", instanceId)
    .eq("state", "active")
    .eq("proof_status", "pending")
    .is("final_result", null)
    .select("*")
    .single();

  return assertSingleRow(
    data as ElementInstance | null,
    error,
    "Failed to submit proof (instance not pending, already resolved, or not found)",
  );
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
    .is("final_result", null)
    .select("*")
    .single();

  return assertSingleRow(data as ElementInstance | null, error, "Failed to resolve element (already resolved or not found)");
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
