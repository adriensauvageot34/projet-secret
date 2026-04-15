export type AdvantageEffectHandler = (context: unknown) => Promise<void>;

async function unimplementedAdvantageEffect(): Promise<void> {
  // Intentionnel: placeholder MVP pour brancher les handlers réels par effect_code.
}

export const advantageEffectRegistry: Record<string, AdvantageEffectHandler> = {
  reveal_partial_profile: unimplementedAdvantageEffect,
  inspect_recent_action: unimplementedAdvantageEffect,
  extend_mission_window_60: unimplementedAdvantageEffect,
  freeze_target_300: unimplementedAdvantageEffect,
  delay_next_assignment_900: unimplementedAdvantageEffect,
  shield_from_accusation_60: unimplementedAdvantageEffect,
  negate_next_pressure: unimplementedAdvantageEffect,
  force_public_hint: unimplementedAdvantageEffect,
  lock_skip_300: unimplementedAdvantageEffect,
  token_rebate_1: unimplementedAdvantageEffect,
  social_callout: unimplementedAdvantageEffect,
};

export function getAdvantageEffectHandler(effectCode: string): AdvantageEffectHandler | null {
  return advantageEffectRegistry[effectCode] ?? null;
}
