import test from "node:test";
import assert from "node:assert/strict";
import { computeSkippedCooldownMinutes, resolveElementClaim } from "@/lib/game/services/resolve-element-claim";
import type { ClaimedResult, FinalResult, ValidationMode } from "@/lib/game/enums";
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

function makeTemplate(validationMode: ValidationMode, durationSeconds = 600): ElementTemplate {
  return {
    id: "00000000-0000-0000-0000-000000000004",
    code: "mission_test",
    name: "Mission test",
    element_type: "mission",
    category: "test",
    difficulty: 1,
    base_points: 1,
    duration_seconds: durationSeconds,
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

function makeDeps(params: {
  claimResult: ClaimedResult;
  validationMode: ValidationMode;
  durationSeconds?: number;
  resolvedFinalResult?: FinalResult;
}) {
  const claimedInstance = makeInstance({ claimed_result: params.claimResult });
  const resolveCalls: Array<{ finalResult: FinalResult; options?: { skippedCooldownMinutes?: number } }> = [];

  return {
    resolveCalls,
    deps: {
      claimResult: async () => claimedInstance,
      getElementTemplateById: async () => makeTemplate(params.validationMode, params.durationSeconds),
      resolveElement: async (_instanceId: string, finalResult: FinalResult, options?: { skippedCooldownMinutes?: number }) => {
        resolveCalls.push({ finalResult, options });
        return makeInstance({
          claimed_result: params.claimResult,
          final_result: params.resolvedFinalResult ?? finalResult,
          state: finalResult === "success" ? "completed" : finalResult === "fail" ? "failed" : "cooldown",
          cooldown_until: finalResult === "skipped" ? "2026-01-01T00:20:00.000Z" : null,
        });
      },
    },
  };
}

test("claim success auto-validé => claimed_result puis final_result", async () => {
  const { deps, resolveCalls } = makeDeps({ claimResult: "success", validationMode: "auto" });

  const result = await resolveElementClaim("instance-1", "success", deps);

  assert.equal(result.flow, "auto_resolved");
  assert.equal(result.finalResolved, true);
  assert.equal(result.claimedInstance.claimed_result, "success");
  assert.equal(result.instance.final_result, "success");
  assert.equal(resolveCalls.length, 1);
  assert.deepEqual(resolveCalls[0], { finalResult: "success", options: undefined });
});

test("claim fail auto-validé => final fail immédiat", async () => {
  const { deps, resolveCalls } = makeDeps({ claimResult: "fail", validationMode: "auto" });

  const result = await resolveElementClaim("instance-1", "fail", deps);

  assert.equal(result.flow, "auto_resolved");
  assert.equal(result.finalResolved, true);
  assert.equal(result.instance.final_result, "fail");
  assert.equal(resolveCalls.length, 1);
  assert.equal(resolveCalls[0]?.finalResult, "fail");
});

test("claim skipped => résolution immédiate avec cooldown calculé", async () => {
  const { deps, resolveCalls } = makeDeps({ claimResult: "skipped", validationMode: "gm", durationSeconds: 125 });

  const result = await resolveElementClaim("instance-1", "skipped", deps);

  assert.equal(result.finalResolved, true);
  assert.equal(result.instance.final_result, "skipped");
  assert.equal(resolveCalls.length, 1);
  assert.equal(resolveCalls[0]?.finalResult, "skipped");
  assert.deepEqual(resolveCalls[0]?.options, { skippedCooldownMinutes: 3 });
  assert.equal(computeSkippedCooldownMinutes(makeTemplate("gm", 125)), 3);
});

test("claim proof => claimed_result stocké sans final_result prématuré", async () => {
  const { deps, resolveCalls } = makeDeps({ claimResult: "success", validationMode: "proof" });

  const result = await resolveElementClaim("instance-1", "success", deps);

  assert.equal(result.flow, "proof_pending");
  assert.equal(result.finalResolved, false);
  assert.equal(result.claimedInstance.claimed_result, "success");
  assert.equal(result.instance.final_result, null);
  assert.equal(resolveCalls.length, 0);
});

test("claim gm => claimed_result stocké sans résolution prématurée", async () => {
  const { deps, resolveCalls } = makeDeps({ claimResult: "broken", validationMode: "gm" });

  const result = await resolveElementClaim("instance-1", "broken", deps);

  assert.equal(result.flow, "gm_pending");
  assert.equal(result.finalResolved, false);
  assert.equal(result.claimedInstance.claimed_result, "broken");
  assert.equal(result.instance.final_result, null);
  assert.equal(resolveCalls.length, 0);
});
