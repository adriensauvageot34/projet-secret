import test from "node:test";
import assert from "node:assert/strict";
import type { ScoreEvent } from "@/types/domain";
import { enrichScoreEventRow } from "@/lib/db/queries/score-events";
import {
  assertScoreEventTypeDeltaConsistency,
  createScoreEventSchema,
} from "@/lib/game/services/score-events";

function makeEvent(overrides: Partial<ScoreEvent> = {}): ScoreEvent {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    session_id: "00000000-0000-0000-0000-000000000010",
    participant_id: "00000000-0000-0000-0000-000000000020",
    event_type: "manual_adjustment",
    delta_points: 3,
    created_at: "2026-01-01T00:00:00.000Z",
    notes: null,
    related_element_instance_id: null,
    related_accusation_id: null,
    related_gm_decision_id: null,
    ...overrides,
  };
}

test("schema/validation: required fields and delta_points != 0 are enforced", () => {
  const valid = {
    participantId: "00000000-0000-0000-0000-000000000020",
    sessionId: "00000000-0000-0000-0000-000000000010",
    eventType: "mission_success",
    deltaPoints: 4,
  };

  assert.doesNotThrow(() => createScoreEventSchema.parse(valid));

  assert.throws(() => createScoreEventSchema.parse({ ...valid, participantId: undefined }));
  assert.throws(() => createScoreEventSchema.parse({ ...valid, sessionId: undefined }));
  assert.throws(() => createScoreEventSchema.parse({ ...valid, eventType: undefined }));
  assert.throws(() => createScoreEventSchema.parse({ ...valid, deltaPoints: undefined }));
  assert.throws(() => createScoreEventSchema.parse({ ...valid, deltaPoints: 0 }));
});

test("score_event_label / positivity / negativity are derived correctly", () => {
  const row = makeEvent({ event_type: "constraint_success", delta_points: 5 });
  const enriched = enrichScoreEventRow(row, {
    participants: { display_name: "Julie", session_id: row.session_id },
    sessions: { name: "Session Nuit" },
    element_instances: { state: "completed", element_templates: { element_type: "constraint" } },
    accusations: { status: "validated" },
    gm_decisions: { decision_label: "Validation spéciale" },
    targeted_by_gm_decisions: [
      {
        id: "00000000-0000-0000-0000-000000000090",
        decision_label: "Audit post-partie",
        decision_type: "retro_cancel",
        status: "logged",
        created_at: "2026-01-02T00:00:00.000Z",
      },
    ],
  });

  assert.equal(enriched.score_event_label, "Julie — constraint_success — 5");
  assert.equal(enriched.is_positive_score_event, true);
  assert.equal(enriched.is_negative_score_event, false);
  assert.equal(enriched.session_name, "Session Nuit");
  assert.equal(enriched.participant_display_name, "Julie");
  assert.equal(enriched.related_element_state, "completed");
  assert.equal(enriched.related_accusation_status, "validated");
  assert.equal(enriched.related_gm_decision_label, "Validation spéciale");
  assert.equal(enriched.related_element_type, "constraint");
  assert.equal(enriched.targeted_by_gm_decisions.length, 1);
});

test("event-type delta consistency: strict signs and flexible types", () => {
  assert.throws(() => assertScoreEventTypeDeltaConsistency("mission_success", -1));
  assert.throws(() => assertScoreEventTypeDeltaConsistency("skip_penalty", 1));
  assert.throws(() => assertScoreEventTypeDeltaConsistency("constraint_break_penalty", 1));

  assert.doesNotThrow(() => assertScoreEventTypeDeltaConsistency("mission_success", 1));
  assert.doesNotThrow(() => assertScoreEventTypeDeltaConsistency("skip_penalty", -1));
  assert.doesNotThrow(() => assertScoreEventTypeDeltaConsistency("manual_adjustment", 3));
  assert.doesNotThrow(() => assertScoreEventTypeDeltaConsistency("manual_adjustment", -3));
  assert.doesNotThrow(() => assertScoreEventTypeDeltaConsistency("retro_validation_cancel", -2));
});
