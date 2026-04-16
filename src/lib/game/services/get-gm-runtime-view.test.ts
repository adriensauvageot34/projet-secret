import test from "node:test";
import assert from "node:assert/strict";
import { mapGmRuntimeElement } from "@/lib/game/services/get-gm-runtime-view";

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
