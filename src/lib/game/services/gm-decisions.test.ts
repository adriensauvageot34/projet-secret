import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertMadeByParticipantSession,
  assertSameSession,
  computeNextDecisionStatus,
  deriveLedgerEffectsPlan,
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

  assert.throws(() =>
    validateGMDecisionBusinessRules({
      decisionType: "manual_bonus",
      scoreImpact: -2,
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

  assert.doesNotThrow(() =>
    validateGMDecisionBusinessRules({
      decisionType: "manual_bonus",
      scoreImpact: 3,
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

  assert.doesNotThrow(() =>
    validateGMDecisionBusinessRules({
      decisionType: "manual_penalty",
      scoreImpact: -1,
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

  assert.doesNotThrow(() =>
    validateGMDecisionBusinessRules({
      decisionType: "manual_bonus",
      scoreImpact: 0,
      tokenImpact: 2,
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

function makeDecisionForPlan(overrides: Partial<Parameters<typeof deriveLedgerEffectsPlan>[0]> = {}): Parameters<typeof deriveLedgerEffectsPlan>[0] {
  return {
    id: "00000000-0000-0000-0000-000000000900",
    score_impact: 3,
    token_impact: 0,
    target_participant_id: "00000000-0000-0000-0000-000000000001",
    produced_score_events: [],
    produced_token_events: [],
    ...overrides,
  };
}

test("apply plan: manual_bonus score creates score ledger once", () => {
  const plan = deriveLedgerEffectsPlan(
    makeDecisionForPlan({
      score_impact: 4,
      token_impact: 0,
    }),
  );

  assert.equal(plan.shouldCreateScoreEvent, true);
  assert.equal(plan.shouldCreateTokenEvent, false);
});

test("apply plan: manual_penalty score creates score ledger once", () => {
  const plan = deriveLedgerEffectsPlan(
    makeDecisionForPlan({
      score_impact: -2,
      token_impact: 0,
    }),
  );

  assert.equal(plan.shouldCreateScoreEvent, true);
  assert.equal(plan.shouldCreateTokenEvent, false);
});

test("apply plan: bonus token creates token ledger once", () => {
  const plan = deriveLedgerEffectsPlan(
    makeDecisionForPlan({
      score_impact: 0,
      token_impact: 2,
    }),
  );

  assert.equal(plan.shouldCreateScoreEvent, false);
  assert.equal(plan.shouldCreateTokenEvent, true);
});

test("apply plan: decision applied twice does not request duplicate ledger", () => {
  const plan = deriveLedgerEffectsPlan(
    makeDecisionForPlan({
      score_impact: 3,
      produced_score_events: [
        {
          id: "00000000-0000-0000-0000-000000000901",
          session_id: "00000000-0000-0000-0000-000000000010",
          participant_id: "00000000-0000-0000-0000-000000000001",
          event_type: "manual_adjustment",
          delta_points: 3,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    }),
  );

  assert.equal(plan.shouldCreateScoreEvent, false);
  assert.equal(plan.shouldCreateTokenEvent, false);
});

test("apply plan: cancel-related status transition and cancelled guard", () => {
  assert.equal(computeNextDecisionStatus("logged", "cancel"), "cancelled");
  assert.throws(() => computeNextDecisionStatus("cancelled", "apply"));
});

test("apply plan: rejects incoherent target and duplicate ledger replay", () => {
  assert.throws(() =>
    deriveLedgerEffectsPlan(
      makeDecisionForPlan({
        target_participant_id: null,
        score_impact: 2,
      }),
    ),
  );

  assert.throws(() =>
    deriveLedgerEffectsPlan(
      makeDecisionForPlan({
        score_impact: 3,
        produced_score_events: [
          {
            id: "00000000-0000-0000-0000-000000000901",
            session_id: "00000000-0000-0000-0000-000000000010",
            participant_id: "00000000-0000-0000-0000-000000000001",
            event_type: "manual_adjustment",
            delta_points: 3,
            created_at: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "00000000-0000-0000-0000-000000000902",
            session_id: "00000000-0000-0000-0000-000000000010",
            participant_id: "00000000-0000-0000-0000-000000000001",
            event_type: "manual_adjustment",
            delta_points: 3,
            created_at: "2026-01-01T00:00:01.000Z",
          },
        ],
      }),
    ),
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

test("schema guardrail: unique manual_adjustment ledger event per GM decision", () => {
  const migration = readFileSync("supabase/migrations/0018_gm_decision_ledger_uniqueness.sql", "utf8");

  assert.match(migration, /create unique index if not exists uq_score_events_manual_adjustment_once_per_gm_decision/s);
  assert.match(migration, /create unique index if not exists uq_token_events_manual_adjustment_once_per_gm_decision/s);
  assert.match(migration, /related_gm_decision_id is not null/s);
  assert.match(migration, /event_type = 'manual_adjustment'/s);
});
