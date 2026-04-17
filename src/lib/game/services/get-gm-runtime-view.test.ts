import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildGmFinalSummary, mapGmRuntimeElement } from "@/lib/game/services/get-gm-runtime-view";

function makeRawElementRow(overrides: Partial<Parameters<typeof mapGmRuntimeElement>[0]> = {}): Parameters<typeof mapGmRuntimeElement>[0] {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    participant_id: "00000000-0000-0000-0000-000000000002",
    element_template_id: "00000000-0000-0000-0000-000000000003",
    state: "active",
    proof_status: "pending",
    is_fake: false,
    activated_at: "2026-01-01T00:00:00.000Z",
    ends_at: "2026-01-01T00:10:00.000Z",
    claimed_result: "success",
    final_result: null,
    participants: [{ display_name: "Player A" }],
    element_templates: [{ name: "Mission X", element_type: "mission", validation_mode: "proof" }],
    ...overrides,
  };
}

test("signal proof_pending: visible uniquement après claim et avant final_result", () => {
  const shouldBePending = mapGmRuntimeElement(makeRawElementRow());
  assert.equal(shouldBePending.is_proof_pending, true);

  const notClaimed = mapGmRuntimeElement(makeRawElementRow({ claimed_result: null }));
  assert.equal(notClaimed.is_proof_pending, false);

  const alreadyFinal = mapGmRuntimeElement(makeRawElementRow({ final_result: "success" }));
  assert.equal(alreadyFinal.is_proof_pending, false);
});

test("signal gm_pending: visible uniquement en mode gm après claim et avant final_result", () => {
  const shouldBePending = mapGmRuntimeElement(
    makeRawElementRow({
      element_templates: [{ name: "Constraint Y", element_type: "constraint", validation_mode: "gm" }],
      proof_status: "not_required",
    }),
  );
  assert.equal(shouldBePending.is_gm_pending, true);

  const notClaimed = mapGmRuntimeElement(
    makeRawElementRow({
      element_templates: [{ name: "Constraint Y", element_type: "constraint", validation_mode: "gm" }],
      claimed_result: null,
      proof_status: "not_required",
    }),
  );
  assert.equal(notClaimed.is_gm_pending, false);

  const alreadyFinal = mapGmRuntimeElement(
    makeRawElementRow({
      element_templates: [{ name: "Constraint Y", element_type: "constraint", validation_mode: "gm" }],
      final_result: "fail",
      proof_status: "not_required",
    }),
  );
  assert.equal(alreadyFinal.is_gm_pending, false);
});

test("résumé final GM: exclut le GM, expose winner/podium/bottom5", () => {
  const summary = buildGmFinalSummary([
    {
      id: "gm",
      session_id: "s1",
      display_name: "GM",
      role: "gm",
      current_status: "gm",
      current_score: 999,
      current_tokens: 999,
      completed_elements_count: 0,
      waiting_slot_count: 0,
      blocked_slot_count: 0,
    },
    {
      id: "p1",
      session_id: "s1",
      display_name: "Alice",
      role: "player",
      current_status: "active",
      current_score: 10,
      current_tokens: 2,
      completed_elements_count: 0,
      waiting_slot_count: 0,
      blocked_slot_count: 0,
    },
    {
      id: "p2",
      session_id: "s1",
      display_name: "Bob",
      role: "player",
      current_status: "active",
      current_score: 20,
      current_tokens: 1,
      completed_elements_count: 0,
      waiting_slot_count: 0,
      blocked_slot_count: 0,
    },
  ]);

  assert.equal(summary.ranking.length, 2);
  assert.equal(summary.winner?.participantId, "p2");
  assert.deepEqual(summary.podium.map((entry) => entry.participantId), ["p2", "p1"]);
  assert.deepEqual(summary.bottomFive.map((entry) => entry.participantId), ["p2", "p1"]);
});

test("lecture GM des accusations: fallback FK suspected_template_id + joins participants/element_instances explicites", () => {
  const accusationQuery = readFileSync("src/lib/db/queries/accusations.ts", "utf8");

  assert.match(accusationQuery, /suspected_template:element_templates!accusations_suspected_template_id_fkey\(name\)/);
  assert.match(accusationQuery, /suspected_template:element_templates!accusations_suspect_template_id_fkey\(name\)/);
  assert.match(accusationQuery, /accuser:participants!accusations_accuser_participant_id_fkey\(display_name\)/);
  assert.match(accusationQuery, /accused:participants!accusations_accused_participant_id_fkey\(display_name\)/);
  assert.match(accusationQuery, /adjudicated_by:participants!accusations_adjudicated_by_participant_id_fkey\(display_name\)/);
  assert.match(accusationQuery, /related_element_instance:element_instances!accusations_related_element_instance_id_fkey\(is_fake, state\)/);
  assert.match(accusationQuery, /queryAccusationsWithRelationshipFallback/);
});
