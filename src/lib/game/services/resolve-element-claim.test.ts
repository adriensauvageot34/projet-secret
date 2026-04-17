import test from "node:test";
import assert from "node:assert/strict";
import {
  computeSkippedCooldownMinutes,
  doesElementExitFlowAndTriggerRefill,
  resolveElementClaim,
} from "@/lib/game/services/resolve-element-claim";
import type { ClaimedResult, FinalResult, ScoreEventType, ValidationMode } from "@/lib/game/enums";
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


function makeDeps(params: {
  claimResult: ClaimedResult;
  validationMode: ValidationMode;
  durationSeconds?: number;
  resolvedFinalResult?: FinalResult;
  templateElementType?: ElementTemplate["element_type"];
  templateBasePoints?: number;
  existingScoreEvents?: ScoreEventType[];
  createScoreEventErrorMessage?: string;
  updateComboReturn?: number;
  latestSuccessScoreEventType?: "mission_success" | "constraint_success" | null;
  nowIso?: string;
  claimSkipAvailableAt?: string | null;
  claimedFinalResult?: FinalResult | null;
  resolvedIsFake?: boolean;
  resolvedState?: ElementInstance["state"];
}) {
  const claimedInstance = makeInstance({
    claimed_result: params.claimResult,
    skip_available_at:
      params.claimSkipAvailableAt === undefined ? "2026-01-01T00:03:00.000Z" : params.claimSkipAvailableAt,
    final_result: params.claimedFinalResult ?? null,
  });
  const resolveCalls: Array<{ finalResult: FinalResult; options?: { skippedCooldownMinutes?: number } }> = [];
  const createScoreEventCalls: Array<{ eventType: ScoreEventType; deltaPoints: number; relatedElementInstanceId: string }> = [];
  const updateComboCalls: boolean[] = [];
  let recomputeParticipantSlotsCalls = 0;
  let updateParticipantLevelCalls = 0;
  let refillReserveCalls = 0;

  return {
    resolveCalls,
    createScoreEventCalls,
    updateComboCalls,
    getRecomputeParticipantSlotsCalls: () => recomputeParticipantSlotsCalls,
    getUpdateParticipantLevelCalls: () => updateParticipantLevelCalls,
    getRefillReserveCalls: () => refillReserveCalls,
    deps: {
      claimResult: async () => claimedInstance,
      getElementTemplateById: async () =>
        makeTemplate(params.validationMode, params.durationSeconds ?? 600, {
          elementType: params.templateElementType,
          basePoints: params.templateBasePoints,
        }),
      resolveElement: async (_instanceId: string, finalResult: FinalResult, options?: { skippedCooldownMinutes?: number }) => {
        resolveCalls.push({ finalResult, options });
        return makeInstance({
          claimed_result: params.claimResult,
          final_result: params.resolvedFinalResult ?? finalResult,
          is_fake: params.resolvedIsFake ?? false,
          state:
            params.resolvedState
            ?? (finalResult === "success"
              ? "completed"
              : finalResult === "fail"
                ? "failed"
                : finalResult === "broken"
                  ? "broken"
                  : "cooldown"),
          cooldown_until: finalResult === "skipped" ? "2026-01-01T00:20:00.000Z" : null,
        });
      },
      createScoreEvent: async (input: {
        participantId: string;
        sessionId: string;
        eventType: ScoreEventType;
        deltaPoints: number;
        relatedElementInstanceId: string;
      }) => {
        if (params.createScoreEventErrorMessage) {
          throw new Error(params.createScoreEventErrorMessage);
        }
        createScoreEventCalls.push({
          eventType: input.eventType,
          deltaPoints: input.deltaPoints,
          relatedElementInstanceId: input.relatedElementInstanceId,
        });
        return {};
      },
      listResolutionScoreEvents: async () => params.existingScoreEvents ?? [],
      getLatestSuccessScoreEventType: async () => params.latestSuccessScoreEventType ?? null,
      recomputeParticipantSlots: async () => {
        recomputeParticipantSlotsCalls += 1;
      },
      updateCombo: async (_participantId: string, success: boolean) => {
        updateComboCalls.push(success);
        if (params.updateComboReturn !== undefined) {
          return params.updateComboReturn;
        }
        return success ? 1 : 0;
      },
      updateParticipantLevel: async () => {
        updateParticipantLevelCalls += 1;
        return null;
      },
      consumeFirstArmedAdvantage: async (_input: { participantId: string; effectCode: string }) => null,
      refillVisibleReserveOfferForResolvedElement: async () => {
        refillReserveCalls += 1;
        return { replaced: true, replacementOfferId: "offer-new", reason: "replaced" as const, debugMessage: "ok" };
      },
      now: () => new Date(params.nowIso ?? "2026-01-01T00:05:00.000Z"),
    },
  };
}

function makeTemplate(
  validationMode: ValidationMode,
  durationSeconds = 600,
  options?: { elementType?: ElementTemplate["element_type"]; basePoints?: number },
): ElementTemplate {
  return {
    id: "00000000-0000-0000-0000-000000000004",
    code: "mission_test",
    name: "Mission test",
    element_type: options?.elementType ?? "mission",
    category: "test",
    difficulty: 1,
    base_points: options?.basePoints ?? 3,
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

test("activation puis success auto-validé => score_event + score/runtime chain", async () => {
  const { deps, resolveCalls, createScoreEventCalls, updateComboCalls, getRecomputeParticipantSlotsCalls, getUpdateParticipantLevelCalls, getRefillReserveCalls } = makeDeps({
    claimResult: "success",
    validationMode: "auto",
    templateElementType: "mission",
    templateBasePoints: 3,
  });

  const result = await resolveElementClaim("instance-1", "success", deps);

  assert.equal(result.flow, "auto_resolved");
  assert.equal(result.finalResolved, true);
  assert.equal(result.claimedInstance.claimed_result, "success");
  assert.equal(result.instance.final_result, "success");
  assert.equal(resolveCalls.length, 1);
  assert.deepEqual(resolveCalls[0], { finalResult: "success", options: undefined });
  assert.deepEqual(createScoreEventCalls, [
    {
      eventType: "mission_success",
      deltaPoints: 3,
      relatedElementInstanceId: "00000000-0000-0000-0000-000000000001",
    },
  ]);
  assert.deepEqual(updateComboCalls, [true]);
  assert.equal(getRecomputeParticipantSlotsCalls(), 1);
  assert.equal(getUpdateParticipantLevelCalls(), 1);
  assert.equal(getRefillReserveCalls(), 1);
});

test("activation puis fail auto-validé => pas de gain indu, runtime mis à jour", async () => {
  const { deps, createScoreEventCalls, updateComboCalls, getRecomputeParticipantSlotsCalls, getUpdateParticipantLevelCalls, getRefillReserveCalls } = makeDeps({
    claimResult: "fail",
    validationMode: "auto",
  });

  const result = await resolveElementClaim("instance-1", "fail", deps);

  assert.equal(result.flow, "auto_resolved");
  assert.equal(result.finalResolved, true);
  assert.equal(result.instance.final_result, "fail");
  assert.equal(createScoreEventCalls.length, 0);
  assert.deepEqual(updateComboCalls, [false]);
  assert.equal(getRecomputeParticipantSlotsCalls(), 1);
  assert.equal(getUpdateParticipantLevelCalls(), 1);
  assert.equal(getRefillReserveCalls(), 1);
});

test("activation puis broken auto-validé => penalty cohérente sur constraint", async () => {
  const { deps, createScoreEventCalls, updateComboCalls } = makeDeps({
    claimResult: "broken",
    validationMode: "auto",
    templateElementType: "constraint",
    templateBasePoints: 4,
  });

  const result = await resolveElementClaim("instance-1", "broken", deps);

  assert.equal(result.finalResolved, true);
  assert.equal(result.instance.final_result, "broken");
  assert.deepEqual(createScoreEventCalls, [
    {
      eventType: "constraint_break_penalty",
      deltaPoints: -4,
      relatedElementInstanceId: "00000000-0000-0000-0000-000000000001",
    },
  ]);
  assert.deepEqual(updateComboCalls, [false]);
});

test("activation puis skipped => état cooldown + score_event penalty", async () => {
  const { deps, resolveCalls, createScoreEventCalls, updateComboCalls, getRefillReserveCalls } = makeDeps({
    claimResult: "skipped",
    validationMode: "gm",
    durationSeconds: 125,
    templateBasePoints: 2,
  });

  const result = await resolveElementClaim("instance-1", "skipped", deps);

  assert.equal(result.finalResolved, true);
  assert.equal(result.instance.final_result, "skipped");
  assert.equal(resolveCalls.length, 1);
  assert.equal(resolveCalls[0]?.finalResult, "skipped");
  assert.deepEqual(resolveCalls[0]?.options, { skippedCooldownMinutes: 3 });
  assert.equal(computeSkippedCooldownMinutes(makeTemplate("gm", 125)), 3);
  assert.deepEqual(createScoreEventCalls, [
    {
      eventType: "skip_penalty",
      deltaPoints: -2,
      relatedElementInstanceId: "00000000-0000-0000-0000-000000000001",
    },
  ]);
  assert.deepEqual(updateComboCalls, [false]);
  assert.equal(getRefillReserveCalls(), 1);
});

test("buff armé free_skip: neutralise uniquement le prochain skip_penalty puis se consomme", async () => {
  let armedCalls = 0;
  const { deps, createScoreEventCalls, updateComboCalls } = makeDeps({
    claimResult: "skipped",
    validationMode: "gm",
    templateBasePoints: 2,
  });
  deps.consumeFirstArmedAdvantage = async ({ effectCode }: { participantId: string; effectCode: string }) => {
    if (effectCode === "free_skip") {
      armedCalls += 1;
      return { id: "adv-free" } as never;
    }
    return null;
  };

  const result = await resolveElementClaim("instance-1", "skipped", deps);

  assert.equal(result.finalResolved, true);
  assert.equal(armedCalls, 1);
  assert.deepEqual(createScoreEventCalls, []);
  assert.deepEqual(updateComboCalls, [false]);
});

test("buff armé double_next_mission_value: ajoute un bonus score égal à la valeur de base", async () => {
  const { deps, createScoreEventCalls } = makeDeps({
    claimResult: "success",
    validationMode: "auto",
    templateElementType: "mission",
    templateBasePoints: 3,
  });

  deps.consumeFirstArmedAdvantage = async ({ effectCode }: { participantId: string; effectCode: string }) =>
    effectCode === "double_next_mission_value" ? ({ id: "adv-double" } as never) : null;

  await resolveElementClaim("instance-1", "success", deps);

  assert.deepEqual(createScoreEventCalls.map((call) => [call.eventType, call.deltaPoints]), [
    ["mission_success", 3],
    ["manual_adjustment", 3],
  ]);
});

test("skip trop tôt => refusé avant skip_available_at", async () => {
  const { deps } = makeDeps({
    claimResult: "skipped",
    validationMode: "gm",
    nowIso: "2026-01-01T00:02:00.000Z",
    claimSkipAvailableAt: "2026-01-01T00:03:00.000Z",
  });

  await assert.rejects(
    () => resolveElementClaim("instance-1", "skipped", deps),
    /Skip is not available yet/,
  );
});

test("skip sans skip_available_at => refusé", async () => {
  const { deps } = makeDeps({
    claimResult: "skipped",
    validationMode: "gm",
    claimSkipAvailableAt: null,
  });

  await assert.rejects(
    () => resolveElementClaim("instance-1", "skipped", deps),
    /Skip is not available for this element instance/,
  );
});

test("claim proof pending => claimed_result oui, final_result non, score non modifié", async () => {
  const { deps, resolveCalls, createScoreEventCalls, updateComboCalls, getRecomputeParticipantSlotsCalls, getUpdateParticipantLevelCalls, getRefillReserveCalls } = makeDeps({
    claimResult: "success",
    validationMode: "proof",
  });

  const result = await resolveElementClaim("instance-1", "success", deps);

  assert.equal(result.flow, "proof_pending");
  assert.equal(result.finalResolved, false);
  assert.equal(result.claimedInstance.claimed_result, "success");
  assert.equal(result.instance.final_result, null);
  assert.equal(resolveCalls.length, 0);
  assert.equal(createScoreEventCalls.length, 0);
  assert.equal(updateComboCalls.length, 0);
  assert.equal(getRecomputeParticipantSlotsCalls(), 0);
  assert.equal(getUpdateParticipantLevelCalls(), 0);
  assert.equal(getRefillReserveCalls(), 0);
});

test("claim gm pending => claimed_result oui, final_result non, score non modifié", async () => {
  const { deps, resolveCalls, createScoreEventCalls, updateComboCalls, getRecomputeParticipantSlotsCalls, getUpdateParticipantLevelCalls, getRefillReserveCalls } = makeDeps({
    claimResult: "broken",
    validationMode: "gm",
  });

  const result = await resolveElementClaim("instance-1", "broken", deps);

  assert.equal(result.flow, "gm_pending");
  assert.equal(result.finalResolved, false);
  assert.equal(result.claimedInstance.claimed_result, "broken");
  assert.equal(result.instance.final_result, null);
  assert.equal(resolveCalls.length, 0);
  assert.equal(createScoreEventCalls.length, 0);
  assert.equal(updateComboCalls.length, 0);
  assert.equal(getRecomputeParticipantSlotsCalls(), 0);
  assert.equal(getUpdateParticipantLevelCalls(), 0);
  assert.equal(getRefillReserveCalls(), 0);
});

test("refill trigger matrix: cancelled / gm_voided / bait_triggered déclenchent un refill", async () => {
  for (const finalResult of ["cancelled", "gm_voided", "bait_triggered"] as const) {
    const { deps, getRefillReserveCalls } = makeDeps({
      claimResult: "fail",
      validationMode: "auto",
      resolvedFinalResult: finalResult,
      resolvedState: finalResult,
    });

    const result = await resolveElementClaim(`instance-${finalResult}`, "fail", deps);
    assert.equal(result.finalResolved, true);
    assert.equal(getRefillReserveCalls(), 1);
  }
});

test("doesElementExitFlowAndTriggerRefill: états terminaux attendus", () => {
  assert.equal(doesElementExitFlowAndTriggerRefill({ state: "active" }), false);
  assert.equal(doesElementExitFlowAndTriggerRefill({ state: "completed" }), true);
  assert.equal(doesElementExitFlowAndTriggerRefill({ state: "failed" }), true);
  assert.equal(doesElementExitFlowAndTriggerRefill({ state: "broken" }), true);
  assert.equal(doesElementExitFlowAndTriggerRefill({ state: "cooldown" }), true);
  assert.equal(doesElementExitFlowAndTriggerRefill({ state: "cancelled" }), true);
  assert.equal(doesElementExitFlowAndTriggerRefill({ state: "gm_voided" }), true);
  assert.equal(doesElementExitFlowAndTriggerRefill({ state: "bait_triggered" }), true);
  assert.equal(doesElementExitFlowAndTriggerRefill({ state: "expired" }), true);
});

test("claim refusé si instance déjà terminalement résolue", async () => {
  const { deps, resolveCalls, createScoreEventCalls, updateComboCalls, getRecomputeParticipantSlotsCalls, getUpdateParticipantLevelCalls } = makeDeps({
    claimResult: "success",
    validationMode: "auto",
    claimedFinalResult: "success",
  });

  await assert.rejects(
    () => resolveElementClaim("instance-1", "success", deps),
    /already terminally resolved/,
  );

  assert.equal(resolveCalls.length, 0);
  assert.equal(createScoreEventCalls.length, 0);
  assert.equal(updateComboCalls.length, 0);
  assert.equal(getRecomputeParticipantSlotsCalls(), 0);
  assert.equal(getUpdateParticipantLevelCalls(), 0);
});

test("pas de double score_event si déjà présent pour l'instance", async () => {
  const { deps, createScoreEventCalls } = makeDeps({
    claimResult: "success",
    validationMode: "auto",
    existingScoreEvents: ["mission_success"],
  });

  const result = await resolveElementClaim("instance-1", "success", deps);

  assert.equal(result.finalResolved, true);
  assert.equal(createScoreEventCalls.length, 0);
});

test("écriture score idempotente: ignore duplicate key et continue les effets runtime", async () => {
  const { deps, updateComboCalls, getRecomputeParticipantSlotsCalls, getUpdateParticipantLevelCalls } = makeDeps({
    claimResult: "success",
    validationMode: "auto",
    createScoreEventErrorMessage: "duplicate key value violates unique constraint",
  });

  const result = await resolveElementClaim("instance-1", "success", deps);

  assert.equal(result.finalResolved, true);
  assert.deepEqual(updateComboCalls, [true]);
  assert.equal(getRecomputeParticipantSlotsCalls(), 1);
  assert.equal(getUpdateParticipantLevelCalls(), 1);
});

test("combo_2: deuxième réussite consécutive attribue combo_2", async () => {
  const { deps, createScoreEventCalls } = makeDeps({
    claimResult: "success",
    validationMode: "auto",
    templateElementType: "mission",
    updateComboReturn: 2,
    latestSuccessScoreEventType: "mission_success",
  });

  await resolveElementClaim("instance-1", "success", deps);

  assert.deepEqual(createScoreEventCalls.map((call) => call.eventType), [
    "mission_success",
    "combo_2",
  ]);
});

test("combo_3: troisième réussite consécutive attribue combo_3", async () => {
  const { deps, createScoreEventCalls } = makeDeps({
    claimResult: "success",
    validationMode: "auto",
    templateElementType: "mission",
    updateComboReturn: 3,
  });

  await resolveElementClaim("instance-1", "success", deps);

  assert.deepEqual(createScoreEventCalls.map((call) => call.eventType), [
    "mission_success",
    "combo_3",
  ]);
});

test("reset combo: une non-réussite ne crée aucun bonus combo", async () => {
  const { deps, createScoreEventCalls, updateComboCalls } = makeDeps({
    claimResult: "fail",
    validationMode: "auto",
  });

  await resolveElementClaim("instance-1", "fail", deps);

  assert.deepEqual(updateComboCalls, [false]);
  assert.deepEqual(createScoreEventCalls, []);
});

test("bonus mission+contrainte: attribué uniquement à la bonne fenêtre (streak=2 et types complémentaires)", async () => {
  const { deps, createScoreEventCalls } = makeDeps({
    claimResult: "success",
    validationMode: "auto",
    templateElementType: "constraint",
    updateComboReturn: 2,
    latestSuccessScoreEventType: "mission_success",
  });

  await resolveElementClaim("instance-1", "success", deps);

  assert.deepEqual(createScoreEventCalls.map((call) => call.eventType), [
    "constraint_success",
    "combo_2",
    "mission_constraint_bonus",
  ]);
});

test("faux élément: une exécution simple ne produit aucun score_event ni bonus combo", async () => {
  const { deps, createScoreEventCalls, updateComboCalls } = makeDeps({
    claimResult: "success",
    validationMode: "auto",
    templateElementType: "mission",
    resolvedIsFake: true,
  });

  await resolveElementClaim("instance-1", "success", deps);

  assert.deepEqual(createScoreEventCalls, []);
  assert.deepEqual(updateComboCalls, [false]);
});
