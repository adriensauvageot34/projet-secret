import test from "node:test";
import assert from "node:assert/strict";
import { canConsumeAdvantageUse } from "@/lib/game/rules/advantage-instances";
import { validateAdvantageTargeting } from "@/lib/game/rules/advantage-targeting";
import {
  isGmTicketEffectCode,
  isGmTicketParticipantTargetRequired,
  toPlayerAdvantageStateLabel,
} from "@/lib/game/gm-ticket-advantages";

test("lot MVP: les 5 effect_code sont bien reconnus comme tickets GM", () => {
  const codes = [
    "targeted_person_hint",
    "reveal_exact_mission_5m",
    "reveal_exact_constraint_5m",
    "force_public_hint_reveal",
    "freeze_timer_60s",
  ];

  for (const code of codes) {
    assert.equal(isGmTicketEffectCode(code), true);
  }
});

test("ciblage: les tickets d'investigation/exposure exigent une cible participant", () => {
  assert.equal(isGmTicketParticipantTargetRequired("targeted_person_hint"), true);
  assert.equal(isGmTicketParticipantTargetRequired("reveal_exact_mission_5m"), true);
  assert.equal(isGmTicketParticipantTargetRequired("reveal_exact_constraint_5m"), true);
  assert.equal(isGmTicketParticipantTargetRequired("force_public_hint_reveal"), true);
  assert.equal(isGmTicketParticipantTargetRequired("freeze_timer_60s"), false);

  const invalid = validateAdvantageTargeting({
    target_type: "other_participant",
    participant_id: "self",
    target_participant_id: null,
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.reasons.includes("missing_target_participant_id"), true);
});

test("double consommation: un ticket déjà consommé n'est plus consommable", () => {
  const check = canConsumeAdvantageUse(
    { state: "consumed", remaining_uses: 0, activated_at: "2026-01-01T00:00:00.000Z", expires_at: null },
    { duration_seconds: 0, max_uses: 1, is_active: true },
  );

  assert.equal(check.ok, false);
  assert.equal(check.reasons.includes("invalid_state"), true);
  assert.equal(check.reasons.includes("no_remaining_uses"), true);
});

test("libellés joueur: états ticket GM en français", () => {
  assert.equal(toPlayerAdvantageStateLabel("owned", true), "disponible");
  assert.equal(toPlayerAdvantageStateLabel("active", true), "ticket actif");
  assert.equal(toPlayerAdvantageStateLabel("consumed", true), "consommé");
});
