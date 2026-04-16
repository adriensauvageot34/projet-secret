import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createTokenEvent } from "@/lib/game/services/token-events";
import { createScoreEvent } from "@/lib/game/services/score-events";
import type { AdvantageInstance, AdvantageTemplate } from "@/types/domain";

export type AdvantageEffectContext = {
  instance: Pick<
    AdvantageInstance,
    "id" | "participant_id" | "session_id" | "target_element_instance_id" | "target_participant_id"
  >;
  template: Pick<AdvantageTemplate, "effect_code" | "effect_family">;
  context: Record<string, unknown>;
  runtime?: AdvantageEffectRuntime;
};

export type AdvantageEffectRuntime = {
  now: () => Date;
  grantTokens: (input: { participantId: string; sessionId: string; advantageInstanceId: string; deltaTokens: number; notes: string }) => Promise<void>;
  grantScore: (input: { participantId: string; sessionId: string; advantageInstanceId: string; deltaPoints: number; notes: string }) => Promise<void>;
  setSkipAvailableNow: (input: { elementInstanceId: string; sessionId: string; nowIso: string }) => Promise<void>;
  scaleOwnSlotCooldown: (input: { elementInstanceId: string; sessionId: string; participantId: string; nowIso: string; factor: number }) => Promise<void>;
  unlockOwnSlotCooldownNow: (input: { elementInstanceId: string; sessionId: string; participantId: string; nowIso: string }) => Promise<void>;
  reduceElementTimer: (input: {
    elementInstanceId: string;
    sessionId: string;
    nowIso: string;
    reductionSeconds: number;
    expectedParticipantId?: string;
    expectedElementType?: "mission" | "constraint";
    expectedState?: "active" | "cooldown";
  }) => Promise<void>;
  doubleElementTimer: (input: {
    elementInstanceId: string;
    sessionId: string;
    nowIso: string;
    expectedParticipantId?: string;
    expectedElementType?: "mission" | "constraint";
    expectedState?: "active" | "cooldown";
  }) => Promise<void>;
};

export type AdvantageEffectHandler = (context: AdvantageEffectContext) => Promise<void>;

function ensureTargetElementId(context: AdvantageEffectContext): string {
  if (!context.instance.target_element_instance_id) {
    throw new Error(`Effect ${context.template.effect_code} requires target_element_instance_id`);
  }

  return context.instance.target_element_instance_id;
}

const defaultRuntime: AdvantageEffectRuntime = {
  now: () => new Date(),
  grantTokens: async (input) => {
    await createTokenEvent({
      participantId: input.participantId,
      sessionId: input.sessionId,
      eventType: "bonus_effect",
      deltaTokens: input.deltaTokens,
      relatedAdvantageInstanceId: input.advantageInstanceId,
      notes: input.notes,
    });
  },
  grantScore: async (input) => {
    await createScoreEvent({
      participantId: input.participantId,
      sessionId: input.sessionId,
      eventType: "manual_adjustment",
      deltaPoints: input.deltaPoints,
      notes: input.notes,
    });
  },
  setSkipAvailableNow: async (input) => {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("element_instances")
      .update({ skip_available_at: input.nowIso })
      .eq("id", input.elementInstanceId)
      .eq("session_id", input.sessionId);

    if (error) {
      throw new Error(`Failed to unlock skip on target element: ${error.message}`);
    }
  },
  scaleOwnSlotCooldown: async (input) => {
    if (input.factor <= 0 || input.factor >= 1) {
      throw new Error("scaleOwnSlotCooldown requires factor strictly between 0 and 1");
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("element_instances")
      .select("id, participant_id, state, cooldown_until")
      .eq("id", input.elementInstanceId)
      .eq("session_id", input.sessionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load target cooldown element: ${error.message}`);
    }

    if (!data) {
      throw new Error("Target cooldown element not found");
    }

    if (data.participant_id !== input.participantId) {
      throw new Error("Target cooldown element must belong to advantage owner");
    }

    if (data.state !== "cooldown" || !data.cooldown_until) {
      throw new Error("Target element is not in cooldown");
    }

    const now = new Date(input.nowIso);
    const cooldownUntil = new Date(data.cooldown_until);

    if (cooldownUntil.getTime() <= now.getTime()) {
      throw new Error("Target cooldown already ended");
    }

    const remainingMs = cooldownUntil.getTime() - now.getTime();
    const nextCooldownUntil = new Date(now.getTime() + Math.max(1_000, Math.floor(remainingMs * input.factor))).toISOString();

    const { error: updateError } = await supabase
      .from("element_instances")
      .update({ cooldown_until: nextCooldownUntil })
      .eq("id", input.elementInstanceId)
      .eq("session_id", input.sessionId);

    if (updateError) {
      throw new Error(`Failed to adjust cooldown on target element: ${updateError.message}`);
    }
  },
  unlockOwnSlotCooldownNow: async (input) => {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("element_instances")
      .select("id, participant_id, state, cooldown_until")
      .eq("id", input.elementInstanceId)
      .eq("session_id", input.sessionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load target cooldown element: ${error.message}`);
    }

    if (!data) {
      throw new Error("Target cooldown element not found");
    }

    if (data.participant_id !== input.participantId) {
      throw new Error("Target cooldown element must belong to advantage owner");
    }

    if (data.state !== "cooldown" || !data.cooldown_until) {
      throw new Error("Target element is not in cooldown");
    }

    const now = new Date(input.nowIso);
    const cooldownUntil = new Date(data.cooldown_until);

    if (cooldownUntil.getTime() <= now.getTime()) {
      throw new Error("Target cooldown already ended");
    }

    const { error: updateError } = await supabase
      .from("element_instances")
      .update({ cooldown_until: input.nowIso })
      .eq("id", input.elementInstanceId)
      .eq("session_id", input.sessionId);

    if (updateError) {
      throw new Error(`Failed to unlock cooldown on target element: ${updateError.message}`);
    }
  },
  reduceElementTimer: async (input) => {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("element_instances")
      .select("id, participant_id, state, ends_at, element_templates!inner(element_type)")
      .eq("id", input.elementInstanceId)
      .eq("session_id", input.sessionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load target element timer: ${error.message}`);
    }

    if (!data?.ends_at) {
      throw new Error("Target element has no ends_at to reduce");
    }

    if (input.expectedParticipantId && data.participant_id !== input.expectedParticipantId) {
      throw new Error("Target element participant mismatch");
    }

    if (input.expectedState && data.state !== input.expectedState) {
      throw new Error(`Target element must be in state ${input.expectedState}`);
    }

    const elementTypeRelation = Array.isArray(data.element_templates) ? data.element_templates[0] : data.element_templates;
    const elementType = (elementTypeRelation?.element_type as "mission" | "constraint") ?? "mission";
    if (input.expectedElementType && elementType !== input.expectedElementType) {
      throw new Error(`Target element must be of type ${input.expectedElementType}`);
    }

    const reduced = new Date(new Date(data.ends_at).getTime() - (input.reductionSeconds * 1000));
    const floor = new Date(new Date(input.nowIso).getTime() + (5 * 1000));
    const nextEndsAt = reduced.getTime() < floor.getTime() ? floor.toISOString() : reduced.toISOString();

    const { error: updateError } = await supabase
      .from("element_instances")
      .update({ ends_at: nextEndsAt })
      .eq("id", input.elementInstanceId)
      .eq("session_id", input.sessionId);

    if (updateError) {
      throw new Error(`Failed to reduce target element timer: ${updateError.message}`);
    }
  },
  doubleElementTimer: async (input) => {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("element_instances")
      .select("id, participant_id, state, ends_at, element_templates!inner(element_type)")
      .eq("id", input.elementInstanceId)
      .eq("session_id", input.sessionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load target element timer: ${error.message}`);
    }

    if (!data?.ends_at) {
      throw new Error("Target element has no ends_at to extend");
    }

    if (input.expectedParticipantId && data.participant_id !== input.expectedParticipantId) {
      throw new Error("Target element participant mismatch");
    }

    if (input.expectedState && data.state !== input.expectedState) {
      throw new Error(`Target element must be in state ${input.expectedState}`);
    }

    const elementTypeRelation = Array.isArray(data.element_templates) ? data.element_templates[0] : data.element_templates;
    const elementType = (elementTypeRelation?.element_type as "mission" | "constraint") ?? "mission";
    if (input.expectedElementType && elementType !== input.expectedElementType) {
      throw new Error(`Target element must be of type ${input.expectedElementType}`);
    }

    const now = new Date(input.nowIso);
    const currentEndsAt = new Date(data.ends_at);

    if (currentEndsAt.getTime() <= now.getTime()) {
      throw new Error("Target element timer is already over");
    }

    const remainingMs = currentEndsAt.getTime() - now.getTime();
    const nextEndsAt = new Date(now.getTime() + (remainingMs * 2)).toISOString();
    const { error: updateError } = await supabase
      .from("element_instances")
      .update({ ends_at: nextEndsAt })
      .eq("id", input.elementInstanceId)
      .eq("session_id", input.sessionId);

    if (updateError) {
      throw new Error(`Failed to double target element timer: ${updateError.message}`);
    }
  },
};

const noopAdvantageEffectHandler: AdvantageEffectHandler = async () => {};

const revealMissionHintHandler: AdvantageEffectHandler = async (effectContext) => {
  const runtime = effectContext.runtime ?? defaultRuntime;
  await runtime.grantTokens({
    participantId: effectContext.instance.participant_id,
    sessionId: effectContext.instance.session_id,
    advantageInstanceId: effectContext.instance.id,
    deltaTokens: 1,
    notes: "Info advantage: reveal mission hint",
  });
};

const freeSkipHandler: AdvantageEffectHandler = async (effectContext) => {
  const runtime = effectContext.runtime ?? defaultRuntime;
  const targetElementId = ensureTargetElementId(effectContext);
  await runtime.setSkipAvailableNow({
    elementInstanceId: targetElementId,
    sessionId: effectContext.instance.session_id,
    nowIso: runtime.now().toISOString(),
  });
};

const nextCorrectAccusationBonusHandler: AdvantageEffectHandler = async (effectContext) => {
  const runtime = effectContext.runtime ?? defaultRuntime;
  await runtime.grantTokens({
    participantId: effectContext.instance.participant_id,
    sessionId: effectContext.instance.session_id,
    advantageInstanceId: effectContext.instance.id,
    deltaTokens: 3,
    notes: "Value advantage: accusation bonus",
  });
};

const accusationShieldHandler: AdvantageEffectHandler = async (effectContext) => {
  const runtime = effectContext.runtime ?? defaultRuntime;
  await runtime.grantScore({
    participantId: effectContext.instance.participant_id,
    sessionId: effectContext.instance.session_id,
    advantageInstanceId: effectContext.instance.id,
    deltaPoints: 1,
    notes: "Defense advantage: accusation shield",
  });
};

const reduceOtherMissionTimerHandler: AdvantageEffectHandler = async (effectContext) => {
  const runtime = effectContext.runtime ?? defaultRuntime;
  const targetElementId = ensureTargetElementId(effectContext);
  await runtime.reduceElementTimer({
    elementInstanceId: targetElementId,
    sessionId: effectContext.instance.session_id,
    nowIso: runtime.now().toISOString(),
    reductionSeconds: 120,
    expectedParticipantId: effectContext.instance.target_participant_id ?? undefined,
    expectedElementType: "mission",
    expectedState: "active",
  });
};

const halveSlotCooldownHandler: AdvantageEffectHandler = async (effectContext) => {
  const runtime = effectContext.runtime ?? defaultRuntime;
  const targetElementId = ensureTargetElementId(effectContext);
  await runtime.scaleOwnSlotCooldown({
    elementInstanceId: targetElementId,
    participantId: effectContext.instance.participant_id,
    sessionId: effectContext.instance.session_id,
    nowIso: runtime.now().toISOString(),
    factor: 0.5,
  });
};

const unlockSlotNowHandler: AdvantageEffectHandler = async (effectContext) => {
  const runtime = effectContext.runtime ?? defaultRuntime;
  const targetElementId = ensureTargetElementId(effectContext);
  await runtime.unlockOwnSlotCooldownNow({
    elementInstanceId: targetElementId,
    participantId: effectContext.instance.participant_id,
    sessionId: effectContext.instance.session_id,
    nowIso: runtime.now().toISOString(),
  });
};

const accelerateSlotUnlockHandler: AdvantageEffectHandler = async (effectContext) => {
  const runtime = effectContext.runtime ?? defaultRuntime;
  const targetElementId = ensureTargetElementId(effectContext);
  await runtime.scaleOwnSlotCooldown({
    elementInstanceId: targetElementId,
    participantId: effectContext.instance.participant_id,
    sessionId: effectContext.instance.session_id,
    nowIso: runtime.now().toISOString(),
    factor: 0.7,
  });
};

const shortenOwnConstraintTimerHandler: AdvantageEffectHandler = async (effectContext) => {
  const runtime = effectContext.runtime ?? defaultRuntime;
  const targetElementId = ensureTargetElementId(effectContext);
  await runtime.reduceElementTimer({
    elementInstanceId: targetElementId,
    sessionId: effectContext.instance.session_id,
    nowIso: runtime.now().toISOString(),
    reductionSeconds: 60,
    expectedParticipantId: effectContext.instance.participant_id,
    expectedElementType: "constraint",
    expectedState: "active",
  });
};

const doubleOtherConstraintTimerHandler: AdvantageEffectHandler = async (effectContext) => {
  const runtime = effectContext.runtime ?? defaultRuntime;
  const targetElementId = ensureTargetElementId(effectContext);
  await runtime.doubleElementTimer({
    elementInstanceId: targetElementId,
    sessionId: effectContext.instance.session_id,
    nowIso: runtime.now().toISOString(),
    expectedParticipantId: effectContext.instance.target_participant_id ?? undefined,
    expectedElementType: "constraint",
    expectedState: "active",
  });
};

export const advantageEffectRegistry: Record<string, AdvantageEffectHandler> = {
  reveal_mission_hint: revealMissionHintHandler,
  reveal_constraint_hint: noopAdvantageEffectHandler,
  detect_active_constraint: noopAdvantageEffectHandler,
  targeted_person_hint: noopAdvantageEffectHandler,
  free_skip: freeSkipHandler,
  cancel_skip_penalty: noopAdvantageEffectHandler,
  reroll_one_mission: noopAdvantageEffectHandler,
  reroll_one_constraint: noopAdvantageEffectHandler,
  halve_slot_cooldown: halveSlotCooldownHandler,
  unlock_slot_now: unlockSlotNowHandler,
  accusation_shield_3m: accusationShieldHandler,
  reveal_exact_mission_5m: noopAdvantageEffectHandler,
  reveal_exact_constraint_5m: noopAdvantageEffectHandler,
  double_next_mission_value: noopAdvantageEffectHandler,
  double_next_constraint_value: noopAdvantageEffectHandler,
  next_correct_accusation_bonus_3: nextCorrectAccusationBonusHandler,
  reveal_mission_category: noopAdvantageEffectHandler,
  accelerate_slot_unlock: accelerateSlotUnlockHandler,
  shorten_own_constraint_timer: shortenOwnConstraintTimerHandler,
  halve_own_constraint_timer: noopAdvantageEffectHandler,
  freeze_timer_60s: noopAdvantageEffectHandler,
  swap_active_mission_same_difficulty: noopAdvantageEffectHandler,
  swap_active_constraint_same_difficulty: noopAdvantageEffectHandler,
  cancel_one_penalty: noopAdvantageEffectHandler,
  ignore_one_accusation: noopAdvantageEffectHandler,
  deny_reward_on_next_correct_accusation: noopAdvantageEffectHandler,
  protect_constraint_until_end: noopAdvantageEffectHandler,
  extend_other_mission_timer_light: noopAdvantageEffectHandler,
  extend_other_constraint_timer_light: noopAdvantageEffectHandler,
  reduce_other_mission_timer: reduceOtherMissionTimerHandler,
  double_other_constraint_timer: doubleOtherConstraintTimerHandler,
  halve_other_timer: noopAdvantageEffectHandler,
  block_other_context_15m: noopAdvantageEffectHandler,
  block_second_mission_slot_5m: noopAdvantageEffectHandler,
  block_second_constraint_slot_5m: noopAdvantageEffectHandler,
  force_public_hint_reveal: noopAdvantageEffectHandler,
};

export function getAdvantageEffectHandler(effectCode: string): AdvantageEffectHandler {
  const handler = advantageEffectRegistry[effectCode];

  if (!handler) {
    throw new Error(`Unknown advantage effect code: ${effectCode}`);
  }

  return handler;
}
