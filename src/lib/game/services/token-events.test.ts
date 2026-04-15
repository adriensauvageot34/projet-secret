import test from "node:test";
import assert from "node:assert/strict";
import type { TokenEvent } from "@/types/domain";
import { enrichTokenEventRow } from "@/lib/db/queries/token-events";
import { assertEventTypeDeltaConsistency } from "@/lib/game/services/token-events";

function makeEvent(overrides: Partial<TokenEvent> = {}): TokenEvent {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    session_id: "00000000-0000-0000-0000-000000000010",
    participant_id: "00000000-0000-0000-0000-000000000020",
    event_type: "shop_purchase",
    delta_tokens: -2,
    created_at: "2026-01-01T00:00:00.000Z",
    notes: null,
    related_accusation_id: null,
    related_advantage_instance_id: null,
    related_gm_decision_id: null,
    related_element_instance_id: null,
    ...overrides,
  };
}

test("token_event_label / is_positive / is_negative are derived correctly", () => {
  const row = makeEvent({ event_type: "refund", delta_tokens: 3 });
  const enriched = enrichTokenEventRow(row, {
    participants: { display_name: "Julie", session_id: row.session_id },
    sessions: { name: "Session Nuit" },
    accusations: null,
    advantage_instances: null,
    gm_decisions: null,
    element_instances: null,
  });

  assert.equal(enriched.token_event_label, "Julie — refund — 3");
  assert.equal(enriched.is_positive, true);
  assert.equal(enriched.is_negative, false);
  assert.equal(enriched.session_name, "Session Nuit");
  assert.equal(enriched.participant_display_name, "Julie");
});

test("related_advantage_name is resolved from relation chain", () => {
  const row = makeEvent({ event_type: "shop_purchase", delta_tokens: -4 });
  const enriched = enrichTokenEventRow(row, {
    participants: { display_name: "Noa", session_id: row.session_id },
    sessions: { name: "Session Ombres" },
    accusations: null,
    advantage_instances: {
      advantage_templates: { name: "Bouclier de rumeur" },
    },
    gm_decisions: { decision_label: "Validation achat" },
    element_instances: null,
  });

  assert.equal(enriched.related_advantage_name, "Bouclier de rumeur");
  assert.equal(enriched.related_gm_decision_label, "Validation achat");
});

test("strict sign rules: shop_purchase negative, refund and accusation_correct positive", () => {
  assert.throws(() => assertEventTypeDeltaConsistency("shop_purchase", 2));
  assert.throws(() => assertEventTypeDeltaConsistency("refund", -2));
  assert.throws(() => assertEventTypeDeltaConsistency("accusation_correct", -1));

  assert.doesNotThrow(() => assertEventTypeDeltaConsistency("shop_purchase", -2));
  assert.doesNotThrow(() => assertEventTypeDeltaConsistency("refund", 2));
  assert.doesNotThrow(() => assertEventTypeDeltaConsistency("accusation_correct", 1));
});

test("manual_adjustment and cancellation allow both signs", () => {
  assert.doesNotThrow(() => assertEventTypeDeltaConsistency("manual_adjustment", -3));
  assert.doesNotThrow(() => assertEventTypeDeltaConsistency("manual_adjustment", 3));
  assert.doesNotThrow(() => assertEventTypeDeltaConsistency("cancellation", -1));
  assert.doesNotThrow(() => assertEventTypeDeltaConsistency("cancellation", 1));
});
