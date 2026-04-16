import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createTokenEvent } from "@/lib/game/services/token-events";
import { createScoreEvent } from "@/lib/game/services/score-events";
import type { AdvantageInstance, AdvantageTemplate } from "@/types/domain";

export type AdvantageEffectContext = {
  instance: Pick<AdvantageInstance, "id" | "participant_id" | "session_id" | "target_element_instance_id">;
  template: Pick<AdvantageTemplate, "effect_code" | "effect_family">;
  context: Record<string, unknown>;
  runtime?: AdvantageEffectRuntime;
};

export type AdvantageEffectRuntime = {
  now: () => Date;
  grantTokens: (input: { participantId: string; sessionId: string; advantageInstanceId: string; deltaTokens: number; notes: string }) => Promise<void>;
  grantScore: (input: { participantId: string; sessionId: string; advantageInstanceId: string; deltaPoints: number; notes: string }) => Promise<void>;
  setSkipAvailableNow: (input: { elementInstanceId: string; sessionId: string; nowIso: string }) => Promise<void>;
  reduceElementTimer: (input: { elementInstanceId: string; sessionId: string; nowIso: string; reductionSeconds: number }) => Promise<void>;
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
  reduceElementTimer: async (input) => {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("element_instances")
      .select("id, ends_at")
      .eq("id", input.elementInstanceId)
      .eq("session_id", input.sessionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load target element timer: ${error.message}`);
    }

    if (!data?.ends_at) {
      throw new Error("Target element has no ends_at to reduce");
    }

    const reduced = new Date(new Date(data.ends_at).getTime() - (input.reductionSeconds * 1000));
    const floor = new Date(new Date(input.nowIso).getTime() + (30 * 1000));
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
  halve_slot_cooldown: noopAdvantageEffectHandler,
  unlock_slot_now: noopAdvantageEffectHandler,
  accusation_shield_3m: accusationShieldHandler,
  reveal_exact_mission_5m: noopAdvantageEffectHandler,
  reveal_exact_constraint_5m: noopAdvantageEffectHandler,
  double_next_mission_value: noopAdvantageEffectHandler,
  double_next_constraint_value: noopAdvantageEffectHandler,
  next_correct_accusation_bonus_3: nextCorrectAccusationBonusHandler,
  reveal_mission_category: noopAdvantageEffectHandler,
  accelerate_slot_unlock: noopAdvantageEffectHandler,
  shorten_own_constraint_timer: noopAdvantageEffectHandler,
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
  double_other_constraint_timer: noopAdvantageEffectHandler,
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
