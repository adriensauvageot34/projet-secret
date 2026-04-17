import test from "node:test";
import assert from "node:assert/strict";
import { resolveExpiredElementInstance } from "@/lib/game/services/resolve-expired-elements";
import type { ElementInstance } from "@/types/domain";
import type { ClaimedResult } from "@/lib/game/enums";

function makeInstance(overrides: Partial<ElementInstance> = {}): ElementInstance {
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
    skip_available_at: "2026-01-01T00:02:00.000Z",
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

test("mission expirée => fail automatique", async () => {
  const claims: ClaimedResult[] = [];
  const result = await resolveExpiredElementInstance(
    "instance-1",
    new Date("2026-01-01T00:11:00.000Z"),
    {
      getElementInstanceById: async () => makeInstance(),
      getElementTypeByTemplateId: async () => "mission",
      resolveElementClaim: async (_instanceId, claimedResult) => {
        claims.push(claimedResult);
        return {
          ok: true,
          claimedInstance: makeInstance({ claimed_result: "fail" }),
          instance: makeInstance({ final_result: "fail", state: "failed" }),
          flow: "auto_resolved",
          finalResolved: true,
        };
      },
    },
  );

  assert.equal(result?.instance.final_result, "fail");
  assert.deepEqual(claims, ["fail"]);
});

test("contrainte expirée => success automatique", async () => {
  const claims: ClaimedResult[] = [];
  const result = await resolveExpiredElementInstance(
    "instance-1",
    new Date("2026-01-01T00:11:00.000Z"),
    {
      getElementInstanceById: async () => makeInstance(),
      getElementTypeByTemplateId: async () => "constraint",
      resolveElementClaim: async (_instanceId, claimedResult) => {
        claims.push(claimedResult);
        return {
          ok: true,
          claimedInstance: makeInstance({ claimed_result: "success" }),
          instance: makeInstance({ final_result: "success", state: "completed" }),
          flow: "auto_resolved",
          finalResolved: true,
        };
      },
    },
  );

  assert.equal(result?.instance.final_result, "success");
  assert.deepEqual(claims, ["success"]);
});

test("contrainte fail avant expiration => pas d'auto-résolution", async () => {
  let resolveCalls = 0;
  const result = await resolveExpiredElementInstance(
    "instance-1",
    new Date("2026-01-01T00:09:59.000Z"),
    {
      getElementInstanceById: async () => makeInstance(),
      getElementTypeByTemplateId: async () => "constraint",
      resolveElementClaim: async () => {
        resolveCalls += 1;
        throw new Error("should not be called");
      },
    },
  );

  assert.equal(result, null);
  assert.equal(resolveCalls, 0);
});
