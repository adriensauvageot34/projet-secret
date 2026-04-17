import test from "node:test";
import assert from "node:assert/strict";
import {
  adjudicateAccusation,
  adjudicateAccusationSchema,
  assertStatusDecisionVerdictConsistency,
  createAccusation,
  createAccusationSchema,
  mapDecisionToIsReceivable,
  mapDecisionToOutcome,
} from "@/lib/game/services/accusations";
import type { AccusationDetail } from "@/lib/db/queries/accusations";
import type { Participant, ElementTemplate } from "@/types/domain";

const SESSION_ID = "00000000-0000-0000-0000-000000000001";
const ACCUSER_ID = "00000000-0000-0000-0000-000000000002";
const ACCUSED_ID = "00000000-0000-0000-0000-000000000003";
const GM_ID = "00000000-0000-0000-0000-000000000004";
const TEMPLATE_ID = "00000000-0000-0000-0000-000000000005";
const ACCUSATION_ID = "00000000-0000-0000-0000-000000000006";

function makeParticipant(id: string, overrides: Partial<Participant> = {}): Participant {
  return {
    id,
    session_id: SESSION_ID,
    player_id: "00000000-0000-0000-0000-000000000010",
    public_slug: "slug",
    current_level_id: null,
    display_name: "Player",
    role: "player",
    current_status: "active",
    current_score: 0,
    current_tokens: 0,
    combo_streak_current: 0,
    mission_slot_max: 2,
    constraint_slot_max: 2,
    completed_elements_count: 0,
    waiting_slot_count: 0,
    blocked_slot_count: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeTemplate(elementType: "mission" | "constraint" = "mission"): ElementTemplate {
  return {
    id: TEMPLATE_ID,
    code: "TMP",
    name: "Template",
    element_type: elementType,
    category: "cat",
    difficulty: 1,
    base_points: 1,
    duration_seconds: 60,
    skip_unlock_rule: "one_third",
    validation_mode: "auto",
    proof_required: false,
    can_be_fake: true,
    can_appear_in_reserve: true,
    is_active: true,
    player_display_text: "",
    ui_tag_1: "",
    ui_tag_2: "",
    success_button_label: "",
    failure_button_label: "",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function makeAccusation(overrides: Partial<AccusationDetail> = {}): AccusationDetail {
  return {
    id: ACCUSATION_ID,
    session_id: SESSION_ID,
    accuser_participant_id: ACCUSER_ID,
    accused_participant_id: ACCUSED_ID,
    adjudicated_by_participant_id: null,
    suspected_type: "mission",
    suspected_template_id: TEMPLATE_ID,
    related_element_instance_id: null,
    status: "submitted",
    decision: null,
    verdict: "reçue",
    justification: "preuve",
    created_at: "2026-01-01T00:00:00.000Z",
    adjudicated_at: null,
    is_receivable: null,
    triggered_fake_bait: false,
    reward_tokens: 0,
    cancelled_previous_validation: false,
    notes_admin: null,
    session_name: null,
    accuser_display_name: null,
    accused_display_name: null,
    adjudicated_by_display_name: null,
    suspected_template_name: null,
    related_element_is_fake: null,
    related_element_state: null,
    linked_token_events: [],
    linked_score_events: [],
    linked_gm_decisions: [],
    ...overrides,
  };
}

test("validation/schema: required accusation fields are enforced", () => {
  const base = {
    sessionId: "00000000-0000-0000-0000-000000000001",
    accuserParticipantId: "00000000-0000-0000-0000-000000000002",
    accusedParticipantId: "00000000-0000-0000-0000-000000000003",
    suspectedType: "mission",
    suspectedTemplateId: "00000000-0000-0000-0000-000000000004",
    justification: "Il a décrit mot pour mot la mission.",
  };

  assert.equal(createAccusationSchema.safeParse(base).success, true);
  assert.equal(createAccusationSchema.safeParse({ ...base, sessionId: undefined }).success, false);
  assert.equal(createAccusationSchema.safeParse({ ...base, accuserParticipantId: undefined }).success, false);
  assert.equal(createAccusationSchema.safeParse({ ...base, accusedParticipantId: undefined }).success, false);
  assert.equal(createAccusationSchema.safeParse({ ...base, suspectedType: undefined }).success, false);
  assert.equal(createAccusationSchema.safeParse({ ...base, suspectedTemplateId: undefined }).success, false);
  assert.equal(createAccusationSchema.safeParse({ ...base, justification: "" }).success, false);
});

test("workflow/status-decision-verdict guards: coherent combinations are accepted", () => {
  assert.doesNotThrow(() => assertStatusDecisionVerdictConsistency("submitted", null, "reçue"));
  assert.doesNotThrow(() => assertStatusDecisionVerdictConsistency("under_review", null, "en arbitrage"));
  assert.doesNotThrow(() => assertStatusDecisionVerdictConsistency("validated", "correct", "juste"));
  assert.doesNotThrow(() => assertStatusDecisionVerdictConsistency("rejected", "incorrect", "fausse"));
  assert.doesNotThrow(() => assertStatusDecisionVerdictConsistency("rejected", "not_receivable", "irrecevable"));
  assert.doesNotThrow(() => assertStatusDecisionVerdictConsistency("cancelled", "cancelled_by_gm", "annulée"));
});

test("workflow/status-decision-verdict guards: incoherent combinations are rejected", () => {
  assert.throws(() => assertStatusDecisionVerdictConsistency("submitted", "correct", "juste"));
  assert.throws(() => assertStatusDecisionVerdictConsistency("under_review", null, "juste"));
  assert.throws(() => assertStatusDecisionVerdictConsistency("validated", "incorrect", "fausse"));
  assert.throws(() => assertStatusDecisionVerdictConsistency("rejected", "correct", "juste"));
  assert.throws(() => assertStatusDecisionVerdictConsistency("cancelled", "incorrect", "fausse"));
});

test("adjudication mapping: each decision maps to expected status/verdict/flags", () => {
  assert.deepEqual(mapDecisionToOutcome("correct"), {
    status: "validated",
    verdict: "juste",
    isReceivable: true,
    triggeredFakeBait: false,
  });

  assert.deepEqual(mapDecisionToOutcome("incorrect"), {
    status: "rejected",
    verdict: "fausse",
    isReceivable: true,
    triggeredFakeBait: false,
  });

  assert.deepEqual(mapDecisionToOutcome("not_receivable"), {
    status: "rejected",
    verdict: "irrecevable",
    isReceivable: false,
    triggeredFakeBait: false,
  });

  assert.deepEqual(mapDecisionToOutcome("fake_bait_triggered"), {
    status: "validated",
    verdict: "juste",
    isReceivable: true,
    triggeredFakeBait: true,
  });

  assert.deepEqual(mapDecisionToOutcome("cancelled_by_gm"), {
    status: "cancelled",
    verdict: "annulée",
    isReceivable: null,
    triggeredFakeBait: false,
  });
});

test("adjudication mapping: is_receivable mirror follows decision convention", () => {
  assert.equal(mapDecisionToIsReceivable("correct"), true);
  assert.equal(mapDecisionToIsReceivable("incorrect"), true);
  assert.equal(mapDecisionToIsReceivable("fake_bait_triggered"), true);
  assert.equal(mapDecisionToIsReceivable("not_receivable"), false);
  assert.equal(mapDecisionToIsReceivable("cancelled_by_gm"), null);
});

test("adjudication schema: non-negative rewards and bonus values are enforced", () => {
  const valid = adjudicateAccusationSchema.safeParse({
    accusationId: "00000000-0000-0000-0000-000000000001",
    sessionId: "00000000-0000-0000-0000-000000000010",
    adjudicatedByParticipantId: "00000000-0000-0000-0000-000000000020",
    decision: "correct",
    rewardTokens: 1,
    fakeBaitBonusTokens: 2,
  });

  assert.equal(valid.success, true);

  const invalidReward = adjudicateAccusationSchema.safeParse({
    accusationId: "00000000-0000-0000-0000-000000000001",
    sessionId: "00000000-0000-0000-0000-000000000010",
    adjudicatedByParticipantId: "00000000-0000-0000-0000-000000000020",
    decision: "correct",
    rewardTokens: -1,
  });

  assert.equal(invalidReward.success, false);

  const invalidBonus = adjudicateAccusationSchema.safeParse({
    accusationId: "00000000-0000-0000-0000-000000000001",
    sessionId: "00000000-0000-0000-0000-000000000010",
    adjudicatedByParticipantId: "00000000-0000-0000-0000-000000000020",
    decision: "fake_bait_triggered",
    fakeBaitBonusTokens: -2,
  });

  assert.equal(invalidBonus.success, false);
});

test("MVP flow: adjudication correct creates one accusation_correct token_event", async () => {
  let tokenEventCalls = 0;
  let updated = false;
  const finalDetail = makeAccusation({
    status: "validated",
    decision: "correct",
    verdict: "juste",
    is_receivable: true,
    reward_tokens: 2,
  });

  const result = await adjudicateAccusation(
    {
      accusationId: ACCUSATION_ID,
      sessionId: SESSION_ID,
      adjudicatedByParticipantId: GM_ID,
      decision: "correct",
      rewardTokens: 2,
    },
    {
      getAccusationDetailById: async () => (updated ? finalDetail : makeAccusation()),
      loadParticipantById: async () => makeParticipant(GM_ID, { role: "gm", current_status: "gm" }),
      updateAccusationRow: async () => {
        updated = true;
        return finalDetail;
      },
      createTokenEventEntry: async () => {
        tokenEventCalls += 1;
        return { id: "evt" } as never;
      },
      createScoreEventEntry: async () => ({ id: "score" } as never),
      createArbitrationDecision: async () => undefined,
      hasAccusationCorrectRewardTokenEventEntry: async () => false,
      consumeFirstArmedAdvantageEntry: async () => null,
    },
  );

  assert.equal(result.status, "validated");
  assert.equal(result.decision, "correct");
  assert.equal(result.verdict, "juste");
  assert.equal(result.is_receivable, true);
  assert.equal(result.reward_tokens, 2);
  assert.equal(tokenEventCalls, 1);
});

test("buff armé: next_correct_accusation_bonus_3 donne +3 jetons uniquement sur accusation correcte", async () => {
  const tokenEvents: Array<{ eventType: string; deltaTokens: number }> = [];
  let updated = false;
  const finalDetail = makeAccusation({
    status: "validated",
    decision: "correct",
    verdict: "juste",
    is_receivable: true,
    reward_tokens: 1,
  });

  await adjudicateAccusation(
    {
      accusationId: ACCUSATION_ID,
      sessionId: SESSION_ID,
      adjudicatedByParticipantId: GM_ID,
      decision: "correct",
      rewardTokens: 1,
    },
    {
      getAccusationDetailById: async () => (updated ? finalDetail : makeAccusation()),
      loadParticipantById: async () => makeParticipant(GM_ID, { role: "gm", current_status: "gm" }),
      updateAccusationRow: async () => {
        updated = true;
        return finalDetail;
      },
      createTokenEventEntry: async (input) => {
        tokenEvents.push({ eventType: input.eventType, deltaTokens: input.deltaTokens });
        return { id: "evt" } as never;
      },
      createScoreEventEntry: async () => ({ id: "score" } as never),
      createArbitrationDecision: async () => undefined,
      hasAccusationCorrectRewardTokenEventEntry: async () => false,
      consumeFirstArmedAdvantageEntry: async () => ({ id: "adv-1" } as never),
    },
  );

  assert.deepEqual(tokenEvents, [
    { eventType: "accusation_correct", deltaTokens: 1 },
    { eventType: "bonus_effect", deltaTokens: 3 },
  ]);
});

test("guardrail: self-accusation is rejected", async () => {
  await assert.rejects(() =>
    createAccusation(
      {
        sessionId: SESSION_ID,
        accuserParticipantId: ACCUSER_ID,
        accusedParticipantId: ACCUSER_ID,
        suspectedType: "mission",
        suspectedTemplateId: TEMPLATE_ID,
        justification: "self",
      },
      {
        loadParticipantById: async () => makeParticipant(ACCUSER_ID),
        loadTemplateById: async () => makeTemplate("mission"),
        loadElementInstanceById: async () => {
          throw new Error("not used");
        },
        createAccusationRow: async () => ({ id: ACCUSATION_ID } as never),
        getAccusationDetailById: async () => makeAccusation(),
      },
    ),
  );
});

test("guardrail: template type mismatch is rejected", async () => {
  await assert.rejects(() =>
    createAccusation(
      {
        sessionId: SESSION_ID,
        accuserParticipantId: ACCUSER_ID,
        accusedParticipantId: ACCUSED_ID,
        suspectedType: "mission",
        suspectedTemplateId: TEMPLATE_ID,
        justification: "mismatch",
      },
      {
        loadParticipantById: async (id) => makeParticipant(id),
        loadTemplateById: async () => makeTemplate("constraint"),
        loadElementInstanceById: async () => {
          throw new Error("not used");
        },
        createAccusationRow: async () => ({ id: ACCUSATION_ID } as never),
        getAccusationDetailById: async () => makeAccusation(),
      },
    ),
  );
});

test("guardrail: accusation targeting GM participant is rejected", async () => {
  await assert.rejects(() =>
    createAccusation(
      {
        sessionId: SESSION_ID,
        accuserParticipantId: ACCUSER_ID,
        accusedParticipantId: GM_ID,
        suspectedType: "mission",
        suspectedTemplateId: TEMPLATE_ID,
        justification: "gm-target",
      },
      {
        loadParticipantById: async (id) =>
          id === GM_ID ? makeParticipant(GM_ID, { role: "gm", current_status: "gm" }) : makeParticipant(id),
        loadTemplateById: async () => makeTemplate("mission"),
        loadElementInstanceById: async () => {
          throw new Error("not used");
        },
        createAccusationRow: async () => ({ id: ACCUSATION_ID } as never),
        getAccusationDetailById: async () => makeAccusation(),
      },
    ),
    /accused_participant_id must reference a player participant/,
  );
});

test("guardrail: related_element_instance must belong to accused participant", async () => {
  await assert.rejects(() =>
    createAccusation(
      {
        sessionId: SESSION_ID,
        accuserParticipantId: ACCUSER_ID,
        accusedParticipantId: ACCUSED_ID,
        suspectedType: "mission",
        suspectedTemplateId: TEMPLATE_ID,
        relatedElementInstanceId: "00000000-0000-0000-0000-000000000099",
        justification: "mauvais owner",
      },
      {
        loadParticipantById: async (id) => makeParticipant(id),
        loadTemplateById: async () => makeTemplate("mission"),
        loadElementInstanceById: async () =>
          ({
            id: "00000000-0000-0000-0000-000000000099",
            session_id: SESSION_ID,
            participant_id: ACCUSER_ID,
            element_template_id: TEMPLATE_ID,
          }) as never,
        createAccusationRow: async () => ({ id: ACCUSATION_ID } as never),
        getAccusationDetailById: async () => makeAccusation(),
      },
    ),
  );
});

test("guardrail: related_element_instance must match suspected_template_id", async () => {
  await assert.rejects(() =>
    createAccusation(
      {
        sessionId: SESSION_ID,
        accuserParticipantId: ACCUSER_ID,
        accusedParticipantId: ACCUSED_ID,
        suspectedType: "mission",
        suspectedTemplateId: TEMPLATE_ID,
        relatedElementInstanceId: "00000000-0000-0000-0000-000000000099",
        justification: "mauvais template",
      },
      {
        loadParticipantById: async (id) => makeParticipant(id),
        loadTemplateById: async () => makeTemplate("mission"),
        loadElementInstanceById: async () =>
          ({
            id: "00000000-0000-0000-0000-000000000099",
            session_id: SESSION_ID,
            participant_id: ACCUSED_ID,
            element_template_id: "00000000-0000-0000-0000-000000000088",
          }) as never,
        createAccusationRow: async () => ({ id: ACCUSATION_ID } as never),
        getAccusationDetailById: async () => makeAccusation(),
      },
    ),
  );
});

test("adjudication not_receivable maps to rejected/irrecevable without reward token event", async () => {
  let tokenEventCalls = 0;
  let updated = false;
  const finalDetail = makeAccusation({
    status: "rejected",
    decision: "not_receivable",
    verdict: "irrecevable",
    is_receivable: false,
  });

  const result = await adjudicateAccusation(
    {
      accusationId: ACCUSATION_ID,
      sessionId: SESSION_ID,
      adjudicatedByParticipantId: GM_ID,
      decision: "not_receivable",
    },
    {
      getAccusationDetailById: async () => (updated ? finalDetail : makeAccusation()),
      loadParticipantById: async () => makeParticipant(GM_ID, { role: "gm", current_status: "gm" }),
      updateAccusationRow: async () => {
        updated = true;
        return finalDetail;
      },
      createTokenEventEntry: async () => {
        tokenEventCalls += 1;
        return { id: "evt" } as never;
      },
      createScoreEventEntry: async () => ({ id: "score" } as never),
      createArbitrationDecision: async () => undefined,
      hasAccusationCorrectRewardTokenEventEntry: async () => false,
      consumeFirstArmedAdvantageEntry: async () => null,
    },
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.verdict, "irrecevable");
  assert.equal(result.is_receivable, false);
  assert.equal(tokenEventCalls, 0);
});

test("guardrail: adjudication must be performed by a GM participant", async () => {
  await assert.rejects(() =>
    adjudicateAccusation(
      {
        accusationId: ACCUSATION_ID,
        sessionId: SESSION_ID,
        adjudicatedByParticipantId: GM_ID,
        decision: "incorrect",
      },
      {
        getAccusationDetailById: async () => makeAccusation(),
        loadParticipantById: async () => makeParticipant(GM_ID, { role: "player" }),
        updateAccusationRow: async () => makeAccusation() as never,
        createTokenEventEntry: async () => ({ id: "evt" } as never),
        createScoreEventEntry: async () => ({ id: "score" } as never),
        createArbitrationDecision: async () => undefined,
        hasAccusationCorrectRewardTokenEventEntry: async () => false,
      consumeFirstArmedAdvantageEntry: async () => null,
      },
    ),
  );
});

test("guardrail: second adjudication with different decision is rejected", async () => {
  await assert.rejects(() =>
    adjudicateAccusation(
      {
        accusationId: ACCUSATION_ID,
        sessionId: SESSION_ID,
        adjudicatedByParticipantId: GM_ID,
        decision: "correct",
      },
      {
        getAccusationDetailById: async () =>
          makeAccusation({
            status: "rejected",
            decision: "incorrect",
            verdict: "fausse",
            adjudicated_by_participant_id: GM_ID,
            adjudicated_at: "2026-01-01T00:00:00.000Z",
          }),
        loadParticipantById: async () => makeParticipant(GM_ID, { role: "gm", current_status: "gm" }),
        updateAccusationRow: async () => makeAccusation(),
        createTokenEventEntry: async () => ({ id: "evt" } as never),
        createScoreEventEntry: async () => ({ id: "score" } as never),
        createArbitrationDecision: async () => undefined,
        hasAccusationCorrectRewardTokenEventEntry: async () => false,
      consumeFirstArmedAdvantageEntry: async () => null,
      },
    ),
  );
});

test("guardrail: no duplicate reward when correct adjudication is replayed after reward exists", async () => {
  let tokenEventCalls = 0;
  let updated = false;
  const finalDetail = makeAccusation({
    status: "validated",
    decision: "correct",
    verdict: "juste",
    reward_tokens: 1,
    is_receivable: true,
  });

  await adjudicateAccusation(
    {
      accusationId: ACCUSATION_ID,
      sessionId: SESSION_ID,
      adjudicatedByParticipantId: GM_ID,
      decision: "correct",
    },
    {
      getAccusationDetailById: async () => (updated ? finalDetail : makeAccusation()),
      loadParticipantById: async () => makeParticipant(GM_ID, { role: "gm", current_status: "gm" }),
      updateAccusationRow: async () => {
        updated = true;
        return finalDetail;
      },
      createTokenEventEntry: async () => {
        tokenEventCalls += 1;
        return { id: "evt" } as never;
      },
      createScoreEventEntry: async () => ({ id: "score" } as never),
      createArbitrationDecision: async () => undefined,
      hasAccusationCorrectRewardTokenEventEntry: async () => true,
      consumeFirstArmedAdvantageEntry: async () => null,
    },
  );

  assert.equal(tokenEventCalls, 0);
});

test("idempotence: duplicate token reward write does not break adjudication result", async () => {
  let updated = false;
  const finalDetail = makeAccusation({
    status: "validated",
    decision: "correct",
    verdict: "juste",
    reward_tokens: 1,
    is_receivable: true,
  });

  const result = await adjudicateAccusation(
    {
      accusationId: ACCUSATION_ID,
      sessionId: SESSION_ID,
      adjudicatedByParticipantId: GM_ID,
      decision: "correct",
      rewardTokens: 1,
    },
    {
      getAccusationDetailById: async () => (updated ? finalDetail : makeAccusation()),
      loadParticipantById: async () => makeParticipant(GM_ID, { role: "gm", current_status: "gm" }),
      updateAccusationRow: async () => {
        updated = true;
        return finalDetail;
      },
      createTokenEventEntry: async () => {
        throw new Error("duplicate key value violates unique constraint");
      },
      createScoreEventEntry: async () => ({ id: "score" } as never),
      createArbitrationDecision: async () => undefined,
      hasAccusationCorrectRewardTokenEventEntry: async () => false,
      consumeFirstArmedAdvantageEntry: async () => null,
    },
  );

  assert.equal(result.status, "validated");
  assert.equal(result.decision, "correct");
  assert.equal(result.reward_tokens, 1);
});

test("fake bait: applique bonus MVP +5 score / +2 jetons pour l'accusé", async () => {
  const tokenCalls: Array<{ deltaTokens: number }> = [];
  const scoreCalls: Array<{ deltaPoints: number }> = [];
  let updated = false;
  const finalDetail = makeAccusation({
    status: "validated",
    decision: "fake_bait_triggered",
    verdict: "juste",
    triggered_fake_bait: true,
    related_element_is_fake: true,
  });

  await adjudicateAccusation(
    {
      accusationId: ACCUSATION_ID,
      sessionId: SESSION_ID,
      adjudicatedByParticipantId: GM_ID,
      decision: "fake_bait_triggered",
    },
    {
      getAccusationDetailById: async () =>
        (updated ? finalDetail : makeAccusation({ related_element_is_fake: true, related_element_instance_id: "instance-fake-1" })),
      loadParticipantById: async () => makeParticipant(GM_ID, { role: "gm", current_status: "gm" }),
      updateAccusationRow: async () => {
        updated = true;
        return finalDetail;
      },
      createTokenEventEntry: async (input) => {
        tokenCalls.push({ deltaTokens: input.deltaTokens });
        return { id: "evt" } as never;
      },
      createScoreEventEntry: async (input) => {
        scoreCalls.push({ deltaPoints: input.deltaPoints });
        return { id: "score" } as never;
      },
      createArbitrationDecision: async () => undefined,
      hasAccusationCorrectRewardTokenEventEntry: async () => false,
      consumeFirstArmedAdvantageEntry: async () => null,
    },
  );

  assert.deepEqual(tokenCalls, [{ deltaTokens: 2 }]);
  assert.deepEqual(scoreCalls, [{ deltaPoints: 5 }]);
});

test("fake bait: rejeté si l'accusation n'est pas liée à un faux élément", async () => {
  await assert.rejects(() =>
    adjudicateAccusation(
      {
        accusationId: ACCUSATION_ID,
        sessionId: SESSION_ID,
        adjudicatedByParticipantId: GM_ID,
        decision: "fake_bait_triggered",
      },
      {
        getAccusationDetailById: async () => makeAccusation({ related_element_is_fake: false }),
        loadParticipantById: async () => makeParticipant(GM_ID, { role: "gm", current_status: "gm" }),
        updateAccusationRow: async () => makeAccusation() as never,
        createTokenEventEntry: async () => ({ id: "evt" } as never),
        createScoreEventEntry: async () => ({ id: "score" } as never),
        createArbitrationDecision: async () => undefined,
        hasAccusationCorrectRewardTokenEventEntry: async () => false,
      consumeFirstArmedAdvantageEntry: async () => null,
      },
    ),
  );
});

test("accusation GM correcte sur mission => fail auto", async () => {
  const forcedClaims: string[] = [];
  let updated = false;
  const finalDetail = makeAccusation({
    status: "validated",
    decision: "correct",
    verdict: "juste",
    is_receivable: true,
    related_element_instance_id: "00000000-0000-0000-0000-000000000101",
    suspected_type: "mission",
  });

  await adjudicateAccusation(
    {
      accusationId: ACCUSATION_ID,
      sessionId: SESSION_ID,
      adjudicatedByParticipantId: GM_ID,
      decision: "correct",
      rewardTokens: 0,
    },
    {
      getAccusationDetailById: async () => (updated ? finalDetail : makeAccusation({
        related_element_instance_id: "00000000-0000-0000-0000-000000000101",
        suspected_type: "mission",
      })),
      loadParticipantById: async () => makeParticipant(GM_ID, { role: "gm", current_status: "gm" }),
      updateAccusationRow: async () => {
        updated = true;
        return finalDetail;
      },
      createTokenEventEntry: async () => ({ id: "evt" } as never),
      createScoreEventEntry: async () => ({ id: "score" } as never),
      createArbitrationDecision: async () => undefined,
      hasAccusationCorrectRewardTokenEventEntry: async () => false,
      consumeFirstArmedAdvantageEntry: async () => null,
      resolveElementClaimEntry: async (instanceId, claimedResult) => {
        forcedClaims.push(`${instanceId}:${claimedResult}`);
        return {} as never;
      },
    },
  );

  assert.deepEqual(forcedClaims, ["00000000-0000-0000-0000-000000000101:fail"]);
});

test("accusation GM correcte sur contrainte => broken auto", async () => {
  const forcedClaims: string[] = [];
  let updated = false;
  const finalDetail = makeAccusation({
    status: "validated",
    decision: "correct",
    verdict: "juste",
    is_receivable: true,
    related_element_instance_id: "00000000-0000-0000-0000-000000000102",
    suspected_type: "constraint",
  });

  await adjudicateAccusation(
    {
      accusationId: ACCUSATION_ID,
      sessionId: SESSION_ID,
      adjudicatedByParticipantId: GM_ID,
      decision: "correct",
      rewardTokens: 0,
    },
    {
      getAccusationDetailById: async () => (updated ? finalDetail : makeAccusation({
        related_element_instance_id: "00000000-0000-0000-0000-000000000102",
        suspected_type: "constraint",
      })),
      loadParticipantById: async () => makeParticipant(GM_ID, { role: "gm", current_status: "gm" }),
      updateAccusationRow: async () => {
        updated = true;
        return finalDetail;
      },
      createTokenEventEntry: async () => ({ id: "evt" } as never),
      createScoreEventEntry: async () => ({ id: "score" } as never),
      createArbitrationDecision: async () => undefined,
      hasAccusationCorrectRewardTokenEventEntry: async () => false,
      consumeFirstArmedAdvantageEntry: async () => null,
      resolveElementClaimEntry: async (instanceId, claimedResult) => {
        forcedClaims.push(`${instanceId}:${claimedResult}`);
        return {} as never;
      },
    },
  );

  assert.deepEqual(forcedClaims, ["00000000-0000-0000-0000-000000000102:broken"]);
});
