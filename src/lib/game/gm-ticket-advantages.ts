const GM_TICKET_EFFECT_CODES = new Set([
  "targeted_person_hint",
  "reveal_exact_mission_5m",
  "reveal_exact_constraint_5m",
  "force_public_hint_reveal",
  "freeze_timer_60s",
]);

const PARTICIPANT_TARGET_REQUIRED_EFFECT_CODES = new Set([
  "targeted_person_hint",
  "reveal_exact_mission_5m",
  "reveal_exact_constraint_5m",
  "force_public_hint_reveal",
]);

export function isGmTicketEffectCode(effectCode: string): boolean {
  return GM_TICKET_EFFECT_CODES.has(effectCode);
}

export function isGmTicketParticipantTargetRequired(effectCode: string): boolean {
  return PARTICIPANT_TARGET_REQUIRED_EFFECT_CODES.has(effectCode);
}

const ARMED_BUFF_EFFECT_CODES = new Set([
  "free_skip",
  "next_correct_accusation_bonus_3",
  "double_next_mission_value",
]);

export function toPlayerAdvantageStateLabel(state: string, isGmTicket: boolean, effectCode?: string): string {
  if (state === "owned") {
    return "disponible";
  }

  if (state === "active" && isGmTicket) {
    return "ticket actif";
  }

  if (state === "active" && effectCode && ARMED_BUFF_EFFECT_CODES.has(effectCode)) {
    return "armé (en attente)";
  }

  if (state === "active") {
    return "actif";
  }

  if (state === "consumed") {
    return "consommé";
  }

  if (state === "expired") {
    return "expiré";
  }

  if (state === "cancelled") {
    return "annulé";
  }

  return state;
}
