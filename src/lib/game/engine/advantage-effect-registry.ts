export type AdvantageEffectHandler = (context: unknown) => Promise<void>;

const noopAdvantageEffectHandler: AdvantageEffectHandler = async () => {
  // TODO: implémenter la logique métier par effect_code.
};

export const advantageEffectRegistry: Record<string, AdvantageEffectHandler> = {
  reveal_mission_hint: noopAdvantageEffectHandler,
  reveal_constraint_hint: noopAdvantageEffectHandler,
  detect_active_constraint: noopAdvantageEffectHandler,
  targeted_person_hint: noopAdvantageEffectHandler,
  free_skip: noopAdvantageEffectHandler,
  cancel_skip_penalty: noopAdvantageEffectHandler,
  reroll_one_mission: noopAdvantageEffectHandler,
  reroll_one_constraint: noopAdvantageEffectHandler,
  halve_slot_cooldown: noopAdvantageEffectHandler,
  unlock_slot_now: noopAdvantageEffectHandler,
  accusation_shield_3m: noopAdvantageEffectHandler,
  reveal_exact_mission_5m: noopAdvantageEffectHandler,
  reveal_exact_constraint_5m: noopAdvantageEffectHandler,
  double_next_mission_value: noopAdvantageEffectHandler,
  double_next_constraint_value: noopAdvantageEffectHandler,
  next_correct_accusation_bonus_3: noopAdvantageEffectHandler,
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
  reduce_other_mission_timer: noopAdvantageEffectHandler,
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
