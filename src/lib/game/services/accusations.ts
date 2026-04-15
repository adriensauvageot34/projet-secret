import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Accusation, ElementInstance, ElementTemplate, Participant } from "@/types/domain";
import type { AccusationDecision, AccusationStatus, AccusationVerdict, ElementType } from "@/lib/game/enums";
import { createAccusationRecord, updateAccusationRecord } from "@/lib/db/mutations/accusations";
import { createTokenEvent } from "@/lib/game/services/token-events";
import { createScoreEvent } from "@/lib/game/services/score-events";
import { createGMDecisionRecord } from "@/lib/db/mutations/gm-decisions";
import { getAccusationById, type AccusationDetail } from "@/lib/db/queries/accusations";

const suspectedTypeSchema = z.enum(["mission", "constraint"]);
const accusationStatusSchema = z.enum(["submitted", "under_review", "validated", "rejected", "cancelled"]);
const accusationDecisionSchema = z.enum(["correct", "incorrect", "fake_bait_triggered", "not_receivable", "cancelled_by_gm"]);

export const createAccusationSchema = z.object({
  sessionId: z.string().uuid(),
  accuserParticipantId: z.string().uuid(),
  accusedParticipantId: z.string().uuid(),
  suspectedType: suspectedTypeSchema,
  suspectedTemplateId: z.string().uuid(),
  relatedElementInstanceId: z.string().uuid().nullable().optional(),
  justification: z.string().trim().min(1),
  createdAt: z.coerce.date().optional(),
});

export const markAccusationUnderReviewSchema = z.object({
  accusationId: z.string().uuid(),
  sessionId: z.string().uuid(),
  verdict: z.literal("en arbitrage").optional(),
});

export const adjudicateAccusationSchema = z.object({
  accusationId: z.string().uuid(),
  sessionId: z.string().uuid(),
  adjudicatedByParticipantId: z.string().uuid(),
  decision: accusationDecisionSchema,
  notesAdmin: z.string().nullable().optional(),
  adjudicatedAt: z.coerce.date().optional(),
  rewardTokens: z.number().int().min(0).nullable().optional(),
  cancelledPreviousValidation: z.boolean().optional(),
  fakeBaitBonusTokens: z.number().int().min(0).optional(),
  fakeBaitBonusScore: z.number().int().min(0).optional(),
  createGmDecisionRecord: z.boolean().optional(),
});

export const cancelAccusationSchema = z.object({
  accusationId: z.string().uuid(),
  sessionId: z.string().uuid(),
  adjudicatedByParticipantId: z.string().uuid(),
  notesAdmin: z.string().trim().min(1),
  adjudicatedAt: z.coerce.date().optional(),
});

export type CreateAccusationInput = z.input<typeof createAccusationSchema>;
export type MarkAccusationUnderReviewInput = z.input<typeof markAccusationUnderReviewSchema>;
export type AdjudicateAccusationInput = z.input<typeof adjudicateAccusationSchema>;
export type CancelAccusationInput = z.input<typeof cancelAccusationSchema>;

export function mapDecisionToOutcome(decision: AccusationDecision): {
  status: AccusationStatus;
  verdict: AccusationVerdict;
  isReceivable: boolean;
  triggeredFakeBait: boolean;
} {
  switch (decision) {
    case "correct":
      return { status: "validated", verdict: "juste", isReceivable: true, triggeredFakeBait: false };
    case "incorrect":
      return { status: "rejected", verdict: "fausse", isReceivable: true, triggeredFakeBait: false };
    case "not_receivable":
      return { status: "rejected", verdict: "irrecevable", isReceivable: false, triggeredFakeBait: false };
    case "fake_bait_triggered":
      return { status: "validated", verdict: "juste", isReceivable: true, triggeredFakeBait: true };
    case "cancelled_by_gm":
      return { status: "cancelled", verdict: "annulée", isReceivable: false, triggeredFakeBait: false };
  }
}

export function assertStatusDecisionVerdictConsistency(status: AccusationStatus, decision: AccusationDecision | null, verdict: AccusationVerdict | null): void {
  if (status === "submitted") {
    if (decision !== null) {
      throw new Error("submitted accusations cannot have a final decision");
    }

    if (verdict !== null && verdict !== "reçue") {
      throw new Error("submitted accusations can only use verdict=\"reçue\" or null");
    }

    return;
  }

  if (status === "under_review") {
    if (decision !== null) {
      throw new Error("under_review accusations cannot have a final decision");
    }

    if (verdict !== null && verdict !== "en arbitrage") {
      throw new Error("under_review accusations can only use verdict=\"en arbitrage\" or null");
    }

    return;
  }

  if (!decision || !verdict) {
    throw new Error("final accusation statuses require both decision and verdict");
  }

  const expected = mapDecisionToOutcome(decision);

  if (expected.status !== status) {
    throw new Error(`Decision ${decision} requires status=${expected.status}`);
  }

  if (expected.verdict !== verdict) {
    throw new Error(`Decision ${decision} requires verdict=${expected.verdict}`);
  }
}

function assertSameSession(record: { session_id: string }, sessionId: string, label: string): void {
  if (record.session_id !== sessionId) {
    throw new Error(`${label}.session_id must match accusation.session_id`);
  }
}

function assertTemplateMatchesSuspectedType(template: Pick<ElementTemplate, "element_type">, suspectedType: ElementType): void {
  if (template.element_type !== suspectedType) {
    throw new Error(`suspected_template_id must target an element_templates row with element_type=${suspectedType}`);
  }
}

async function loadParticipant(participantId: string): Promise<Participant> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("participants").select("*").eq("id", participantId).maybeSingle();

  if (error) {
    throw new Error(`Failed to load participant ${participantId}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Participant ${participantId} not found`);
  }

  return data as Participant;
}

async function loadTemplate(templateId: string): Promise<ElementTemplate> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("element_templates").select("*").eq("id", templateId).maybeSingle();

  if (error) {
    throw new Error(`Failed to load element_template ${templateId}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Element template ${templateId} not found`);
  }

  return data as ElementTemplate;
}

async function loadElementInstance(instanceId: string): Promise<ElementInstance> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("element_instances").select("*").eq("id", instanceId).maybeSingle();

  if (error) {
    throw new Error(`Failed to load element_instance ${instanceId}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Element instance ${instanceId} not found`);
  }

  return data as ElementInstance;
}

function isFinalStatus(status: AccusationStatus): boolean {
  return status === "validated" || status === "rejected" || status === "cancelled";
}

async function createArbitrationDecisionRecord(params: {
  accusation: Accusation;
  adjudicatedByParticipantId: string;
  decision: AccusationDecision;
  notesAdmin?: string | null;
}): Promise<void> {
  await createGMDecisionRecord({
    session_id: params.accusation.session_id,
    made_by_participant_id: params.adjudicatedByParticipantId,
    decision_type: params.decision === "cancelled_by_gm" ? "retro_cancel" : "accusation_arbitration",
    decision_label:
      params.decision === "cancelled_by_gm"
        ? "Annulation accusation"
        : `Arbitrage accusation ${params.decision}`,
    reason: params.notesAdmin?.trim() || "Arbitrage accusation",
    notes: params.notesAdmin ?? null,
    score_impact: 0,
    token_impact: 0,
    is_retroactive: params.decision === "cancelled_by_gm",
    status: "logged",
    created_at: new Date().toISOString(),
    assigned_player_id: null,
    target_participant_id: params.accusation.accused_participant_id,
    other_target_participant_id: params.accusation.accuser_participant_id,
    related_element_instance_id: params.accusation.related_element_instance_id ?? null,
    target_element_instance_id: params.accusation.related_element_instance_id ?? null,
    target_accusation_id: params.accusation.id,
    target_score_event_id: null,
    target_token_event_id: null,
  });
}

export async function createAccusation(input: CreateAccusationInput): Promise<AccusationDetail> {
  const payload = createAccusationSchema.parse(input);

  if (payload.accuserParticipantId === payload.accusedParticipantId) {
    throw new Error("accuser_participant_id must be different from accused_participant_id");
  }

  const [accuser, accused, suspectedTemplate] = await Promise.all([
    loadParticipant(payload.accuserParticipantId),
    loadParticipant(payload.accusedParticipantId),
    loadTemplate(payload.suspectedTemplateId),
  ]);

  assertSameSession(accuser, payload.sessionId, "accuser_participant");
  assertSameSession(accused, payload.sessionId, "accused_participant");
  assertTemplateMatchesSuspectedType(suspectedTemplate, payload.suspectedType);

  if (payload.relatedElementInstanceId) {
    const relatedInstance = await loadElementInstance(payload.relatedElementInstanceId);
    assertSameSession(relatedInstance, payload.sessionId, "related_element_instance");
  }

  const created = await createAccusationRecord({
    session_id: payload.sessionId,
    accuser_participant_id: payload.accuserParticipantId,
    accused_participant_id: payload.accusedParticipantId,
    adjudicated_by_participant_id: null,
    suspected_type: payload.suspectedType,
    suspected_template_id: payload.suspectedTemplateId,
    related_element_instance_id: payload.relatedElementInstanceId ?? null,
    justification: payload.justification,
    status: "submitted",
    decision: null,
    verdict: "reçue",
    created_at: (payload.createdAt ?? new Date()).toISOString(),
    adjudicated_at: null,
    is_receivable: null,
    triggered_fake_bait: false,
    reward_tokens: 0,
    cancelled_previous_validation: false,
    notes_admin: null,
  });

  const detail = await getAccusationById(created.id);

  if (!detail) {
    throw new Error("Failed to reload created accusation");
  }

  return detail;
}

export async function markAccusationUnderReview(input: MarkAccusationUnderReviewInput): Promise<AccusationDetail> {
  const payload = markAccusationUnderReviewSchema.parse(input);
  const accusation = await getAccusationById(payload.accusationId);

  if (!accusation) {
    throw new Error("Accusation not found");
  }

  if (accusation.session_id !== payload.sessionId) {
    throw new Error("Accusation belongs to another session");
  }

  if (isFinalStatus(accusation.status)) {
    return accusation;
  }

  await updateAccusationRecord(accusation.id, {
    status: "under_review",
    verdict: payload.verdict ?? "en arbitrage",
  });

  const detail = await getAccusationById(accusation.id);

  if (!detail) {
    throw new Error("Failed to reload accusation");
  }

  return detail;
}

export async function adjudicateAccusation(input: AdjudicateAccusationInput): Promise<AccusationDetail> {
  const payload = adjudicateAccusationSchema.parse(input);
  const accusation = await getAccusationById(payload.accusationId);

  if (!accusation) {
    throw new Error("Accusation not found");
  }

  if (accusation.session_id !== payload.sessionId) {
    throw new Error("Accusation belongs to another session");
  }

  const adjudicator = await loadParticipant(payload.adjudicatedByParticipantId);
  assertSameSession(adjudicator, payload.sessionId, "adjudicated_by_participant");

  if (isFinalStatus(accusation.status)) {
    if (accusation.decision === payload.decision) {
      return accusation;
    }

    throw new Error("Accusation already adjudicated with another decision");
  }

  const decisionOutcome = mapDecisionToOutcome(payload.decision);
  const rewardTokens = payload.decision === "correct" ? payload.rewardTokens ?? 1 : payload.rewardTokens ?? 0;
  const cancelledPreviousValidation = payload.cancelledPreviousValidation ?? false;

  if (cancelledPreviousValidation && !["correct", "fake_bait_triggered", "cancelled_by_gm"].includes(payload.decision)) {
    throw new Error("cancelled_previous_validation can only be true for correct/fake_bait_triggered/cancelled_by_gm");
  }

  await updateAccusationRecord(accusation.id, {
    status: decisionOutcome.status,
    decision: payload.decision,
    verdict: decisionOutcome.verdict,
    adjudicated_at: (payload.adjudicatedAt ?? new Date()).toISOString(),
    adjudicated_by_participant_id: payload.adjudicatedByParticipantId,
    is_receivable: decisionOutcome.isReceivable,
    triggered_fake_bait: decisionOutcome.triggeredFakeBait,
    reward_tokens: rewardTokens,
    cancelled_previous_validation: cancelledPreviousValidation,
    notes_admin: payload.notesAdmin ?? null,
  });

  if (payload.decision === "correct" && rewardTokens > 0) {
    await createTokenEvent({
      participantId: accusation.accuser_participant_id,
      sessionId: accusation.session_id,
      eventType: "accusation_correct",
      deltaTokens: rewardTokens,
      relatedAccusationId: accusation.id,
      notes: payload.notesAdmin ?? "Accusation correcte",
      createdAt: payload.adjudicatedAt,
    });
  }

  if (payload.decision === "fake_bait_triggered") {
    const bonusTokens = payload.fakeBaitBonusTokens ?? 1;
    const bonusScore = payload.fakeBaitBonusScore ?? 0;

    if (bonusTokens > 0) {
      await createTokenEvent({
        participantId: accusation.accused_participant_id,
        sessionId: accusation.session_id,
        eventType: "fake_bait_bonus",
        deltaTokens: bonusTokens,
        relatedAccusationId: accusation.id,
        relatedElementInstanceId: accusation.related_element_instance_id ?? null,
        notes: payload.notesAdmin ?? "Bonus fake bait",
        createdAt: payload.adjudicatedAt,
      });
    }

    if (bonusScore !== 0) {
      await createScoreEvent({
        participantId: accusation.accused_participant_id,
        sessionId: accusation.session_id,
        eventType: "fake_bait_bonus",
        deltaPoints: bonusScore,
        notes: payload.notesAdmin ?? "Bonus score fake bait",
        relatedAccusationId: accusation.id,
        relatedElementInstanceId: accusation.related_element_instance_id ?? null,
        createdAt: payload.adjudicatedAt,
      });
    }
  }

  if (cancelledPreviousValidation || payload.decision === "cancelled_by_gm" || payload.createGmDecisionRecord) {
    await createArbitrationDecisionRecord({
      accusation,
      adjudicatedByParticipantId: payload.adjudicatedByParticipantId,
      decision: payload.decision,
      notesAdmin: payload.notesAdmin,
    });
  }

  const detail = await getAccusationById(accusation.id);

  if (!detail) {
    throw new Error("Failed to reload accusation");
  }

  return detail;
}

export async function cancelAccusation(input: CancelAccusationInput): Promise<AccusationDetail> {
  const payload = cancelAccusationSchema.parse(input);
  return adjudicateAccusation({
    accusationId: payload.accusationId,
    sessionId: payload.sessionId,
    adjudicatedByParticipantId: payload.adjudicatedByParticipantId,
    decision: "cancelled_by_gm",
    notesAdmin: payload.notesAdmin,
    adjudicatedAt: payload.adjudicatedAt,
    createGmDecisionRecord: true,
  });
}
