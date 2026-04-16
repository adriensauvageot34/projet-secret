import test from "node:test";
import assert from "node:assert/strict";
import { submitProof } from "@/lib/game/services/submit-proof";
import type { ElementInstance, ElementTemplate } from "@/types/domain";

function makeInstance(overrides: Partial<ElementInstance> = {}): ElementInstance {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    participant_id: "00000000-0000-0000-0000-000000000002",
    session_id: "00000000-0000-0000-0000-000000000003",
    element_template_id: "00000000-0000-0000-0000-000000000004",
    state: "active",
    active_slot_index: 0,
    is_fake: false,
    claimed_result: "success",
    final_result: null,
    proof_status: "pending",
    activated_at: "2026-01-01T00:00:00.000Z",
    skip_available_at: "2026-01-01T00:03:00.000Z",
    ends_at: "2026-01-01T00:10:00.000Z",
    cooldown_until: null,
    points_gained: 0,
    points_lost: 0,
    tokens_gained: 0,
    was_retroactively_invalidated: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeTemplate(validationMode: ElementTemplate["validation_mode"]): ElementTemplate {
  return {
    id: "00000000-0000-0000-0000-000000000004",
    code: "mission_test",
    name: "Mission test",
    element_type: "mission",
    category: "test",
    difficulty: 1,
    base_points: 3,
    duration_seconds: 600,
    skip_unlock_rule: "one_third",
    validation_mode: validationMode,
    proof_required: validationMode === "proof",
    can_be_fake: false,
    can_appear_in_reserve: true,
    is_active: true,
    player_display_text: "do it",
    ui_tag_1: "",
    ui_tag_2: "",
    success_button_label: "success",
    failure_button_label: "fail",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

test("submit-proof en mode proof + pending => passe en provided", async () => {
  const initial = makeInstance({ proof_status: "pending" });
  let called = 0;
  const result = await submitProof(initial.id, {
    getElementInstanceById: async () => initial,
    getElementTemplateById: async () => makeTemplate("proof"),
    submitProof: async () => {
      called += 1;
      return makeInstance({ proof_status: "provided" });
    },
  });

  assert.equal(result.flow, "proof_submitted");
  assert.equal(result.instance.proof_status, "provided");
  assert.equal(called, 1);
});

test("submit-proof déjà provided => idempotent sans mutation DB", async () => {
  const initial = makeInstance({ proof_status: "provided" });
  let called = 0;
  const result = await submitProof(initial.id, {
    getElementInstanceById: async () => initial,
    getElementTemplateById: async () => makeTemplate("proof"),
    submitProof: async () => {
      called += 1;
      return initial;
    },
  });

  assert.equal(result.flow, "already_provided");
  assert.equal(called, 0);
});

test("submit-proof refusé si mode validation != proof", async () => {
  await assert.rejects(
    () =>
      submitProof("instance-1", {
        getElementInstanceById: async () => makeInstance({ proof_status: "pending" }),
        getElementTemplateById: async () => makeTemplate("gm"),
        submitProof: async () => makeInstance({ proof_status: "provided" }),
      }),
    /only available for proof validation mode/,
  );
});

test("submit-proof refusé tant que claimed_result est absent", async () => {
  await assert.rejects(
    () =>
      submitProof("instance-1", {
        getElementInstanceById: async () => makeInstance({ claimed_result: null, proof_status: "pending" }),
        getElementTemplateById: async () => makeTemplate("proof"),
        submitProof: async () => makeInstance({ proof_status: "provided" }),
      }),
    /before claiming a result/,
  );
});

test("submit-proof refusé si instance déjà résolue (final_result posé)", async () => {
  await assert.rejects(
    () =>
      submitProof("instance-1", {
        getElementInstanceById: async () => makeInstance({ final_result: "success", state: "completed", proof_status: "provided" }),
        getElementTemplateById: async () => makeTemplate("proof"),
        submitProof: async () => makeInstance({ proof_status: "provided" }),
      }),
    /resolved element instance/,
  );
});

test("submit-proof refusé si proof_status=denied", async () => {
  await assert.rejects(
    () =>
      submitProof("instance-1", {
        getElementInstanceById: async () => makeInstance({ proof_status: "denied" }),
        getElementTemplateById: async () => makeTemplate("proof"),
        submitProof: async () => makeInstance({ proof_status: "provided" }),
      }),
    /already been denied/,
  );
});
