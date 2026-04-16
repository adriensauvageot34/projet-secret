import test from "node:test";
import assert from "node:assert/strict";
import {
  assertMadeByParticipantSession,
  assertSameSession,
  computeNextDecisionStatus,
  resolveTargetParticipantForImpacts,
  validateGMDecisionBusinessRules,
} from "@/lib/game/services/gm-decisions";

test("schema/workflow helper: default and transitions", () => {
  assert.equal(computeNextDecisionStatus("logged", "apply"), "applied");
  assert.equal(computeNextDecisionStatus("applied", "apply"), "applied");
  assert.equal(computeNextDecisionStatus("logged", "cancel"), "cancelled");

  assert.throws(() => computeNextDecisionStatus("cancelled", "apply"));
});

test("validation: manual_bonus and manual_penalty enforce impact signs", () => {
  assert.throws(() =>
    validateGMDecisionBusinessRules({
      decisionType: "manual_bonus",
      scoreImpact: 0,
      tokenImpact: 0,
      isRetroactive: false,
      targetAccusationId: null,
      relatedElementInstanceId: null,
      targetElementInstanceId: null,
      targetParticipantId: null,
      otherTargetParticipantId: null,
      targetScoreEventId: null,
      targetTokenEventId: null,
    }),
  );

  assert.throws(() =>
    validateGMDecisionBusinessRules({
      decisionType: "manual_penalty",
      scoreImpact: 0,
      tokenImpact: 2,
      isRetroactive: false,
      targetAccusationId: null,
      relatedElementInstanceId: null,
      targetElementInstanceId: null,
      targetParticipantId: null,
      otherTargetParticipantId: null,
      targetScoreEventId: null,
      targetTokenEventId: null,
    }),
  );

  assert.doesNotThrow(() =>
    validateGMDecisionBusinessRules({
      decisionType: "manual_bonus",
      scoreImpact: 3,
      tokenImpact: 0,
      isRetroactive: false,
      targetAccusationId: null,
      relatedElementInstanceId: null,
      targetElementInstanceId: null,
      targetParticipantId: null,
      otherTargetParticipantId: null,
      targetScoreEventId: null,
      targetTokenEventId: null,
    }),
  );

  assert.doesNotThrow(() =>
    validateGMDecisionBusinessRules({
      decisionType: "manual_penalty",
      scoreImpact: -1,
      tokenImpact: 0,
      isRetroactive: false,
      targetAccusationId: null,
      relatedElementInstanceId: null,
      targetElementInstanceId: null,
      targetParticipantId: null,
      otherTargetParticipantId: null,
      targetScoreEventId: null,
      targetTokenEventId: null,
    }),
  );
});

test("validation: decision-type specific targeting constraints", () => {
  assert.throws(() =>
    validateGMDecisionBusinessRules({
      decisionType: "retro_cancel",
      scoreImpact: 0,
      tokenImpact: 0,
      isRetroactive: false,
      targetAccusationId: null,
      relatedElementInstanceId: null,
      targetElementInstanceId: null,
      targetParticipantId: null,
      otherTargetParticipantId: null,
      targetScoreEventId: null,
      targetTokenEventId: null,
    }),
  );

  assert.throws(() =>
    validateGMDecisionBusinessRules({
      decisionType: "accusation_arbitration",
      scoreImpact: 0,
      tokenImpact: 0,
      isRetroactive: false,
      targetAccusationId: null,
      relatedElementInstanceId: null,
      targetElementInstanceId: null,
      targetParticipantId: null,
      otherTargetParticipantId: null,
      targetScoreEventId: null,
      targetTokenEventId: null,
    }),
  );

  assert.throws(() =>
    validateGMDecisionBusinessRules({
      decisionType: "validation_override",
      scoreImpact: 0,
      tokenImpact: 0,
      isRetroactive: false,
      targetAccusationId: null,
      relatedElementInstanceId: null,
      targetElementInstanceId: null,
      targetParticipantId: null,
      otherTargetParticipantId: null,
      targetScoreEventId: null,
      targetTokenEventId: null,
    }),
  );

  assert.doesNotThrow(() =>
    validateGMDecisionBusinessRules({
      decisionType: "fake_element_resolution",
      scoreImpact: 0,
      tokenImpact: 0,
      isRetroactive: false,
      targetAccusationId: null,
      relatedElementInstanceId: "00000000-0000-0000-0000-000000000100",
      targetElementInstanceId: null,
      targetParticipantId: null,
      otherTargetParticipantId: null,
      targetScoreEventId: null,
      targetTokenEventId: null,
    }),
  );

  assert.doesNotThrow(() =>
    validateGMDecisionBusinessRules({
      decisionType: "abuse_correction",
      scoreImpact: 0,
      tokenImpact: 0,
      isRetroactive: false,
      targetAccusationId: null,
      relatedElementInstanceId: null,
      targetElementInstanceId: null,
      targetParticipantId: "00000000-0000-0000-0000-000000000001",
      otherTargetParticipantId: null,
      targetScoreEventId: null,
      targetTokenEventId: null,
    }),
  );
});

test("validation: distinct targeting guards and accounting target requirement", () => {
  assert.throws(() =>
    validateGMDecisionBusinessRules({
      decisionType: "other",
      scoreImpact: 0,
      tokenImpact: 0,
      isRetroactive: false,
      targetAccusationId: null,
      relatedElementInstanceId: null,
      targetElementInstanceId: null,
      targetParticipantId: "00000000-0000-0000-0000-000000000010",
      otherTargetParticipantId: "00000000-0000-0000-0000-000000000010",
      targetScoreEventId: null,
      targetTokenEventId: null,
    }),
  );

  assert.throws(() =>
    validateGMDecisionBusinessRules({
      decisionType: "other",
      scoreImpact: 0,
      tokenImpact: 0,
      isRetroactive: false,
      targetAccusationId: null,
      relatedElementInstanceId: "00000000-0000-0000-0000-000000000111",
      targetElementInstanceId: "00000000-0000-0000-0000-000000000111",
      targetParticipantId: null,
      otherTargetParticipantId: null,
      targetScoreEventId: null,
      targetTokenEventId: null,
    }),
  );

  assert.throws(() =>
    resolveTargetParticipantForImpacts({
      target_participant_id: null,
      score_impact: 2,
      token_impact: 0,
    }),
  );

  assert.equal(
    resolveTargetParticipantForImpacts({
      target_participant_id: "00000000-0000-0000-0000-000000000001",
      score_impact: 2,
      token_impact: 0,
    }),
    "00000000-0000-0000-0000-000000000001",
  );
});

test("session coherence helpers reject cross-session links", () => {
  assert.doesNotThrow(() => assertSameSession({ session_id: "s1" }, "s1", "target_participant"));
  assert.throws(() => assertSameSession({ session_id: "s2" }, "s1", "target_participant"));

  assert.doesNotThrow(() =>
    assertMadeByParticipantSession(
      {
        id: "p1",
        session_id: "s1",
        player_id: "pl1",
        public_slug: "gm-a1b2",
        current_level_id: null,
        display_name: "GM",
        role: "gm",
        current_status: "gm",
        current_score: 0,
        current_tokens: 0,
        combo_streak_current: 0,
        mission_slot_max: 0,
        constraint_slot_max: 0,
        completed_elements_count: 0,
        waiting_slot_count: 0,
        blocked_slot_count: 0,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      "s1",
    ),
  );

  assert.throws(() =>
    assertMadeByParticipantSession(
      {
        id: "p1",
        session_id: "s2",
        player_id: "pl1",
        public_slug: "gm-a1b2",
        current_level_id: null,
        display_name: "GM",
        role: "gm",
        current_status: "gm",
        current_score: 0,
        current_tokens: 0,
        combo_streak_current: 0,
        mission_slot_max: 0,
        constraint_slot_max: 0,
        completed_elements_count: 0,
        waiting_slot_count: 0,
        blocked_slot_count: 0,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      "s1",
    ),
  );
});
