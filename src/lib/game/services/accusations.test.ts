import test from "node:test";
import assert from "node:assert/strict";
import {
  adjudicateAccusationSchema,
  assertStatusDecisionVerdictConsistency,
  createAccusationSchema,
  mapDecisionToIsReceivable,
  mapDecisionToOutcome,
} from "@/lib/game/services/accusations";

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
