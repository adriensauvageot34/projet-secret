import assert from "node:assert/strict";
import test from "node:test";
import {
  applyClaimRuntimeOptimisticUpdate,
  canClaimRuntimeElement,
  sanitizeRuntimeActiveElements,
} from "@/lib/game/services/player-runtime-client-state";
import type { ElementInstance } from "@/types/domain";

function makeInstance(overrides: Partial<ElementInstance>): ElementInstance {
  return {
    id: "instance-1",
    participant_id: "participant-1",
    session_id: "session-1",
    element_template_id: "template-1",
    state: "active",
    active_slot_index: 0,
    is_fake: false,
    claimed_result: null,
    final_result: null,
    proof_status: "not_required",
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

test("claim success terminal retire immédiatement l'élément actif du runtime local", () => {
  const runtime = {
    participant: { current_score: 0 },
    activeElements: [{ instance: makeInstance({ id: "instance-1" }), template: null }],
  };

  const updated = applyClaimRuntimeOptimisticUpdate(runtime, {
    instanceId: "instance-1",
    claimedResult: "success",
    finalResolved: true,
  });

  assert(updated);
  assert.equal(updated.activeElements.length, 0);
});

test("claim non terminal marque claimed_result et bloque un second claim UI", () => {
  const runtime = {
    participant: { current_score: 0 },
    activeElements: [{ instance: makeInstance({ id: "instance-2" }), template: null }],
  };

  const updated = applyClaimRuntimeOptimisticUpdate(runtime, {
    instanceId: "instance-2",
    claimedResult: "success",
    finalResolved: false,
  });

  assert(updated);
  assert.equal(updated.activeElements.length, 1);
  assert.equal(updated.activeElements[0].instance.claimed_result, "success");
  assert.equal(canClaimRuntimeElement(updated.activeElements[0].instance, null), false);
});

test("sanitizeRuntimeActiveElements retire tout élément incohérent/terminal", () => {
  const runtime = {
    participant: { current_score: 4 },
    activeElements: [
      { instance: makeInstance({ id: "ok-active", state: "active", final_result: null }), template: null },
      { instance: makeInstance({ id: "already-completed", state: "completed", final_result: "success" }), template: null },
    ],
  };

  const sanitized = sanitizeRuntimeActiveElements(runtime);

  assert.equal(sanitized.activeElements.length, 1);
  assert.equal(sanitized.activeElements[0].instance.id, "ok-active");
});
