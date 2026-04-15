import { getAdvantageTemplateById } from "@/lib/db/queries/advantage-templates";
import {
  getActiveTimedAdvantagesExpiringBefore,
  getAdvantageInstanceWithTemplateById,
} from "@/lib/db/queries/advantage-instances";
import { getParticipantById } from "@/lib/db/queries/participants";
import {
  activateAdvantageInstance,
  cancelAdvantageInstance,
  consumeAdvantageInstanceUse,
  createAdvantageInstance,
  markAdvantageInstanceExpired,
} from "@/lib/db/mutations/advantage-instances";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdvantageEffectHandler } from "@/lib/game/engine/advantage-effect-registry";
import {
  canActivateAdvantageInstance,
  canConsumeAdvantageUse,
  computeAdvantageTheoreticalExpiresAt,
  getAdvantageEffectiveExpiresAt,
  isAdvantageExpired,
} from "@/lib/game/rules/advantage-instances";
import { canParticipantBuyAdvantage } from "@/lib/game/rules/advantages";
import { validateAdvantageTargeting } from "@/lib/game/rules/advantage-targeting";
import type { AdvantageInstance, AdvantageTemplate } from "@/types/domain";

export async function grantAdvantageToParticipant(input: {
  templateId: string;
  sessionId: string;
  participantId: string;
  assignedPlayerId: string;
  source: "bonus" | "fake_bait" | "manual";
  costPaid?: number;
  gmNotes?: string;
}): Promise<AdvantageInstance> {
  const template = await getAdvantageTemplateById(input.templateId);

  if (!template) {
    throw new Error("Advantage template not found");
  }

  return createAdvantageInstance({
    source: input.source,
    cost_paid: input.costPaid ?? 0,
    state: "owned",
    activated_at: null,
    expires_at: null,
    remaining_uses: template.max_uses,
    gm_notes: input.gmNotes ?? "",
    advantage_template_id: template.id,
    session_id: input.sessionId,
    assigned_player_id: input.assignedPlayerId,
    participant_id: input.participantId,
    target_participant_id: null,
    target_element_instance_id: null,
  });
}

export async function purchaseAdvantageForParticipant(input: {
  templateId: string;
  participantId: string;
  gmNotes?: string;
}): Promise<AdvantageInstance> {
  const participant = await getParticipantById(input.participantId);

  if (!participant) {
    throw new Error("Participant not found");
  }

  const template = await getAdvantageTemplateById(input.templateId);

  if (!template) {
    throw new Error("Advantage template not found");
  }

  const levelNumber = Number(participant.current_level_id ? 999 : 1);
  const purchaseCheck = canParticipantBuyAdvantage(template, levelNumber, participant.current_tokens);

  if (!purchaseCheck.ok) {
    throw new Error(`Cannot purchase advantage: ${purchaseCheck.reasons.join(", ")}`);
  }

  const supabase = createServerSupabaseClient();

  const { data: instanceData, error: instanceError } = await supabase
    .from("advantage_instances")
    .insert({
      source: "shop",
      cost_paid: template.cost_tokens,
      state: "owned",
      activated_at: null,
      expires_at: null,
      remaining_uses: template.max_uses,
      gm_notes: input.gmNotes ?? "",
      advantage_template_id: template.id,
      session_id: participant.session_id,
      assigned_player_id: participant.player_id,
      participant_id: participant.id,
      target_participant_id: null,
      target_element_instance_id: null,
    })
    .select("*")
    .single();

  if (instanceError || !instanceData) {
    throw new Error(`Failed to create purchased advantage: ${instanceError?.message ?? "unknown error"}`);
  }

  const { error: tokenEventError } = await supabase.from("token_events").insert({
    session_id: participant.session_id,
    participant_id: participant.id,
    event_type: "purchase",
    delta: -template.cost_tokens,
    source_table: "advantage_instances",
    source_id: instanceData.id,
    related_advantage_instance_id: instanceData.id,
    meta: { template_id: template.id, effect_code: template.effect_code },
  });

  if (tokenEventError) {
    throw new Error(`Failed to create purchase token event: ${tokenEventError.message}`);
  }

  const { error: participantUpdateError } = await supabase
    .from("participants")
    .update({ current_tokens: Math.max(0, participant.current_tokens - template.cost_tokens) })
    .eq("id", participant.id);

  if (participantUpdateError) {
    throw new Error(`Failed to update participant current_tokens: ${participantUpdateError.message}`);
  }

  return instanceData as AdvantageInstance;
}

export async function activateParticipantAdvantage(input: {
  advantageInstanceId: string;
  targetParticipantId?: string | null;
  targetElementInstanceId?: string | null;
  activatedAt?: Date;
  forcedExpiresAt?: Date | null;
}): Promise<AdvantageInstance> {
  const instance = await getAdvantageInstanceWithTemplateById(input.advantageInstanceId);

  if (!instance) {
    throw new Error("Advantage instance not found");
  }

  const activationCheck = canActivateAdvantageInstance(instance, { ...instance.template, is_active: true });

  if (!activationCheck.ok) {
    throw new Error(`Cannot activate advantage: ${activationCheck.reasons.join(", ")}`);
  }

  const targetingCheck = validateAdvantageTargeting({
    target_type: instance.template.target_type,
    participant_id: instance.participant_id,
    target_participant_id: input.targetParticipantId,
    target_element_instance_id: input.targetElementInstanceId,
  });

  if (!targetingCheck.ok) {
    throw new Error(`Invalid target: ${targetingCheck.reasons.join(", ")}`);
  }

  const activatedAt = input.activatedAt ?? new Date();

  const expiresAt =
    input.forcedExpiresAt ??
    computeAdvantageTheoreticalExpiresAt(activatedAt, instance.template.duration_seconds);

  return activateAdvantageInstance(instance.id, {
    activated_at: activatedAt.toISOString(),
    expires_at: expiresAt ? expiresAt.toISOString() : null,
    target_participant_id: input.targetParticipantId ?? null,
    target_element_instance_id: input.targetElementInstanceId ?? null,
  });
}

export async function applyAdvantageUse(input: {
  advantageInstanceId: string;
  context?: Record<string, unknown>;
  gmNotes?: string;
}): Promise<AdvantageInstance> {
  const instance = await getAdvantageInstanceWithTemplateById(input.advantageInstanceId);

  if (!instance) {
    throw new Error("Advantage instance not found");
  }

  const consumeCheck = canConsumeAdvantageUse(instance, { ...instance.template, is_active: true });

  if (!consumeCheck.ok) {
    throw new Error(`Cannot consume advantage use: ${consumeCheck.reasons.join(", ")}`);
  }

  const handler = getAdvantageEffectHandler(instance.template.effect_code);
  await handler({
    instance,
    template: instance.template,
    context: input.context ?? {},
  });

  return consumeAdvantageInstanceUse(instance.id, {
    gm_notes: input.gmNotes,
  });
}

export async function expireAdvantageIfNeeded(input: {
  instance: Pick<AdvantageInstance, "id" | "state" | "activated_at" | "expires_at">;
  template: Pick<AdvantageTemplate, "duration_seconds">;
  now?: Date;
}): Promise<AdvantageInstance | null> {
  if (!["owned", "active"].includes(input.instance.state)) {
    return null;
  }

  if (!isAdvantageExpired(input.instance, input.template, input.now)) {
    return null;
  }

  return markAdvantageInstanceExpired(input.instance.id);
}

export async function expireAllOverdueAdvantagesForSession(sessionId: string): Promise<number> {
  const expiring = await getActiveTimedAdvantagesExpiringBefore(new Date());
  const sessionItems = expiring.filter((item) => item.session_id === sessionId);

  let expiredCount = 0;

  for (const item of sessionItems) {
    const effectiveExpiresAt = getAdvantageEffectiveExpiresAt(item, item.template);

    if (!effectiveExpiresAt || effectiveExpiresAt.getTime() > Date.now()) {
      continue;
    }

    await markAdvantageInstanceExpired(item.id);
    expiredCount += 1;
  }

  return expiredCount;
}

export async function expireAllOverdueAdvantagesGlobally(): Promise<number> {
  const expiring = await getActiveTimedAdvantagesExpiringBefore(new Date());

  for (const item of expiring) {
    await markAdvantageInstanceExpired(item.id);
  }

  return expiring.length;
}

export async function cancelAdvantage(advantageInstanceId: string, notes?: string): Promise<AdvantageInstance> {
  return cancelAdvantageInstance(advantageInstanceId, notes);
}
