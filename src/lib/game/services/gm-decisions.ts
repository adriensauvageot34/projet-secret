import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { GMDecision, Participant } from "@/types/domain";
import type { GmDecisionStatus, GmDecisionType } from "@/lib/game/enums";
import { createGMDecisionRecord, updateGMDecisionRecord } from "@/lib/db/mutations/gm-decisions";
import { createScoreEventRecord } from "@/lib/db/mutations/score-events";
import { createTokenEvent } from "@/lib/game/services/token-events";
import { getGMDecisionById, type GMDecisionDetail } from "@/lib/db/queries/gm-decisions";

const decisionTypeSchema = z.enum([
  "validation_override",
  "accusation_arbitration",
  "retro_cancel",
  "fake_element_resolution",
  "abuse_correction",
  "manual_bonus",
  "manual_penalty",
  "other",
]);

const decisionStatusSchema = z.enum(["logged", "applied", "cancelled"]);

const createGMDecisionSchema = z.object({
  sessionId: z.string().uuid(),
  madeByParticipantId: z.string().uuid(),
  decisionType: decisionTypeSchema,
  decisionLabel: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  notes: z.string().nullable().optional(),
  scoreImpact: z.number().int().nullable().optional(),
  tokenImpact: z.number().int().nullable().optional(),
  isRetroactive: z.boolean().optional(),
  status: decisionStatusSchema.optional(),
  createdAt: z.coerce.date().optional(),
  assignedPlayerId: z.string().uuid().nullable().optional(),
  targetParticipantId: z.string().uuid().nullable().optional(),
  otherTargetParticipantId: z.string().uuid().nullable().optional(),
  relatedElementInstanceId: z.string().uuid().nullable().optional(),
  targetElementInstanceId: z.string().uuid().nullable().optional(),
  targetAccusationId: z.string().uuid().nullable().optional(),
  targetScoreEventId: z.string().uuid().nullable().optional(),
  targetTokenEventId: z.string().uuid().nullable().optional(),
});

const applyGMDecisionSchema = z.object({
  decisionId: z.string().uuid(),
  produceLedgerEvents: z.boolean().default(true),
  applyAt: z.coerce.date().optional(),
});

const cancelGMDecisionSchema = z.object({
  decisionId: z.string().uuid(),
  notes: z.string().nullable().optional(),
});

export type CreateGMDecisionInput = z.input<typeof createGMDecisionSchema>;
export type ApplyGMDecisionInput = z.input<typeof applyGMDecisionSchema>;
export type CancelGMDecisionInput = z.input<typeof cancelGMDecisionSchema>;

type SessionScopedRecord = { id: string; session_id: string };

type SessionScopedTable =
  | "participants"
  | "element_instances"
  | "accusations"
  | "score_events"
  | "token_events";

async function loadSessionScopedRecord(table: SessionScopedTable, id: string): Promise<SessionScopedRecord | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from(table).select("id, session_id").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(`Failed to load ${table} ${id}: ${error.message}`);
  }

  return (data as SessionScopedRecord | null) ?? null;
}

async function assertSessionCoherence(table: SessionScopedTable, id: string, sessionId: string): Promise<void> {
  const record = await loadSessionScopedRecord(table, id);

  if (!record) {
    throw new Error(`Related ${table} ${id} not found`);
  }

  if (record.session_id !== sessionId) {
    throw new Error(`Related ${table} ${id} belongs to another session`);
  }
}

async function assertPlayerExists(playerId: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("players").select("id").eq("id", playerId).maybeSingle();

  if (error) {
    throw new Error(`Failed to load player ${playerId}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Assigned player ${playerId} not found`);
  }
}

export function validateGMDecisionBusinessRules(input: {
  decisionType: GmDecisionType;
  scoreImpact: number;
  tokenImpact: number;
  isRetroactive: boolean;
  targetAccusationId: string | null;
  relatedElementInstanceId: string | null;
  targetElementInstanceId: string | null;
  targetParticipantId: string | null;
  otherTargetParticipantId: string | null;
  targetScoreEventId: string | null;
  targetTokenEventId: string | null;
}): void {
  if (input.targetParticipantId && input.otherTargetParticipantId && input.targetParticipantId === input.otherTargetParticipantId) {
    throw new Error("target_participant_id and other_target_participant_id must be different");
  }

  if (input.relatedElementInstanceId && input.targetElementInstanceId && input.relatedElementInstanceId === input.targetElementInstanceId) {
    throw new Error("related_element_instance_id and target_element_instance_id must be different");
  }

  if (input.decisionType === "manual_bonus" && input.scoreImpact <= 0 && input.tokenImpact <= 0) {
    throw new Error("manual_bonus requires a positive score_impact or token_impact");
  }

  if (input.decisionType === "manual_penalty" && input.scoreImpact >= 0 && input.tokenImpact >= 0) {
    throw new Error("manual_penalty requires a negative score_impact or token_impact");
  }

  if (input.decisionType === "retro_cancel" && !input.isRetroactive) {
    throw new Error("retro_cancel requires is_retroactive=true");
  }

  if (input.decisionType === "accusation_arbitration" && !input.targetAccusationId) {
    throw new Error("accusation_arbitration generally targets an accusation");
  }

  if (input.decisionType === "fake_element_resolution" && !input.targetAccusationId && !input.targetElementInstanceId && !input.relatedElementInstanceId) {
    throw new Error("fake_element_resolution should target an accusation and/or an element_instance");
  }

  if (input.decisionType === "validation_override" && !input.targetElementInstanceId) {
    throw new Error("validation_override generally targets an element_instance");
  }

  if (input.decisionType === "abuse_correction") {
    const hasTarget = Boolean(
      input.targetParticipantId ||
        input.otherTargetParticipantId ||
        input.targetElementInstanceId ||
        input.relatedElementInstanceId ||
        input.targetScoreEventId ||
        input.targetTokenEventId,
    );

    if (!hasTarget) {
      throw new Error("abuse_correction should target participant, element, score_event or token_event");
    }
  }
}

async function validateCreatePayload(payload: z.output<typeof createGMDecisionSchema>): Promise<void> {
  await assertSessionCoherence("participants", payload.madeByParticipantId, payload.sessionId);

  if (payload.targetParticipantId) {
    await assertSessionCoherence("participants", payload.targetParticipantId, payload.sessionId);
  }

  if (payload.otherTargetParticipantId) {
    await assertSessionCoherence("participants", payload.otherTargetParticipantId, payload.sessionId);
  }

  if (payload.relatedElementInstanceId) {
    await assertSessionCoherence("element_instances", payload.relatedElementInstanceId, payload.sessionId);
  }

  if (payload.targetElementInstanceId) {
    await assertSessionCoherence("element_instances", payload.targetElementInstanceId, payload.sessionId);
  }

  if (payload.targetAccusationId) {
    await assertSessionCoherence("accusations", payload.targetAccusationId, payload.sessionId);
  }

  if (payload.targetScoreEventId) {
    await assertSessionCoherence("score_events", payload.targetScoreEventId, payload.sessionId);
  }

  if (payload.targetTokenEventId) {
    await assertSessionCoherence("token_events", payload.targetTokenEventId, payload.sessionId);
  }

  if (payload.assignedPlayerId) {
    await assertPlayerExists(payload.assignedPlayerId);
  }

  validateGMDecisionBusinessRules({
    decisionType: payload.decisionType,
    scoreImpact: payload.scoreImpact ?? 0,
    tokenImpact: payload.tokenImpact ?? 0,
    isRetroactive: payload.isRetroactive ?? false,
    targetAccusationId: payload.targetAccusationId ?? null,
    relatedElementInstanceId: payload.relatedElementInstanceId ?? null,
    targetElementInstanceId: payload.targetElementInstanceId ?? null,
    targetParticipantId: payload.targetParticipantId ?? null,
    otherTargetParticipantId: payload.otherTargetParticipantId ?? null,
    targetScoreEventId: payload.targetScoreEventId ?? null,
    targetTokenEventId: payload.targetTokenEventId ?? null,
  });
}

export async function createGMDecision(input: CreateGMDecisionInput): Promise<GMDecisionDetail> {
  const payload = createGMDecisionSchema.parse(input);
  await validateCreatePayload(payload);

  const created = await createGMDecisionRecord({
    session_id: payload.sessionId,
    decision_type: payload.decisionType,
    decision_label: payload.decisionLabel,
    reason: payload.reason,
    notes: payload.notes ?? null,
    score_impact: payload.scoreImpact ?? 0,
    token_impact: payload.tokenImpact ?? 0,
    is_retroactive: payload.isRetroactive ?? false,
    status: payload.status ?? "logged",
    created_at: (payload.createdAt ?? new Date()).toISOString(),
    made_by_participant_id: payload.madeByParticipantId,
    assigned_player_id: payload.assignedPlayerId ?? null,
    target_participant_id: payload.targetParticipantId ?? null,
    other_target_participant_id: payload.otherTargetParticipantId ?? null,
    related_element_instance_id: payload.relatedElementInstanceId ?? null,
    target_element_instance_id: payload.targetElementInstanceId ?? null,
    target_accusation_id: payload.targetAccusationId ?? null,
    target_score_event_id: payload.targetScoreEventId ?? null,
    target_token_event_id: payload.targetTokenEventId ?? null,
  });

  const detail = await getGMDecisionById(created.id);

  if (!detail) {
    throw new Error("Failed to reload created GM decision");
  }

  return detail;
}

async function applyScoreImpact(decision: GMDecision, appliedAt: Date): Promise<void> {
  const delta = decision.score_impact ?? 0;

  if (delta === 0) {
    return;
  }

  if (!decision.target_participant_id) {
    throw new Error("Cannot apply score impact without target_participant_id");
  }

  const supabase = createServerSupabaseClient();
  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, current_score")
    .eq("id", decision.target_participant_id)
    .single();

  if (participantError || !participant) {
    throw new Error(`Failed to load target participant for score impact: ${participantError?.message ?? "not found"}`);
  }

  const nextScore = participant.current_score + delta;

  if (nextScore < 0) {
    throw new Error("Score impact would make participant.current_score negative");
  }

  await createScoreEventRecord({
    session_id: decision.session_id,
    participant_id: decision.target_participant_id,
    event_type: "gm_adjustment",
    delta,
    notes: `GM decision ${decision.id}: ${decision.decision_label}`,
    related_gm_decision_id: decision.id,
    created_at: appliedAt.toISOString(),
    source_table: "gm_decisions",
    source_id: decision.id,
  });

  const { error: updateError } = await supabase
    .from("participants")
    .update({ current_score: nextScore })
    .eq("id", decision.target_participant_id);

  if (updateError) {
    throw new Error(`Failed to update participant.current_score: ${updateError.message}`);
  }
}

async function applyTokenImpact(decision: GMDecision, appliedAt: Date): Promise<void> {
  const deltaTokens = decision.token_impact ?? 0;

  if (deltaTokens === 0) {
    return;
  }

  if (!decision.target_participant_id) {
    throw new Error("Cannot apply token impact without target_participant_id");
  }

  await createTokenEvent({
    participantId: decision.target_participant_id,
    sessionId: decision.session_id,
    eventType: "manual_adjustment",
    deltaTokens,
    notes: `GM decision ${decision.id}: ${decision.decision_label}`,
    createdAt: appliedAt,
    relatedGmDecisionId: decision.id,
  });
}

export async function applyGMDecision(input: ApplyGMDecisionInput): Promise<GMDecisionDetail> {
  const payload = applyGMDecisionSchema.parse(input);
  const decision = await getGMDecisionById(payload.decisionId);

  if (!decision) {
    throw new Error("GM decision not found");
  }

  if (decision.status === "cancelled") {
    throw new Error("A cancelled GM decision cannot be applied");
  }

  if (decision.status === "applied") {
    return decision;
  }

  const appliedAt = payload.applyAt ?? new Date();

  if (payload.produceLedgerEvents) {
    await applyScoreImpact(decision, appliedAt);
    await applyTokenImpact(decision, appliedAt);
  }

  await updateGMDecisionRecord(decision.id, { status: "applied" });

  const detail = await getGMDecisionById(decision.id);

  if (!detail) {
    throw new Error("Failed to reload applied GM decision");
  }

  return detail;
}

export async function cancelGMDecision(input: CancelGMDecisionInput): Promise<GMDecisionDetail> {
  const payload = cancelGMDecisionSchema.parse(input);
  const decision = await getGMDecisionById(payload.decisionId);

  if (!decision) {
    throw new Error("GM decision not found");
  }

  const nextNotes = payload.notes
    ? [decision.notes, payload.notes].filter(Boolean).join("\n\n")
    : decision.notes ?? null;

  await updateGMDecisionRecord(payload.decisionId, {
    status: "cancelled",
    notes: nextNotes,
  });

  const detail = await getGMDecisionById(payload.decisionId);

  if (!detail) {
    throw new Error("Failed to reload cancelled GM decision");
  }

  return detail;
}

export function computeNextDecisionStatus(current: GmDecisionStatus, action: "apply" | "cancel"): GmDecisionStatus {
  if (action === "cancel") {
    return "cancelled";
  }

  if (current === "cancelled") {
    throw new Error("A cancelled GM decision cannot be applied");
  }

  if (current === "applied") {
    return "applied";
  }

  return "applied";
}

export function assertSameSession(entity: { session_id: string }, expectedSessionId: string, label: string): void {
  if (entity.session_id !== expectedSessionId) {
    throw new Error(`${label}.session_id must match gm_decision.session_id`);
  }
}

export function resolveTargetParticipantForImpacts(decision: Pick<GMDecision, "target_participant_id" | "score_impact" | "token_impact">):
  | string
  | null {
  const scoreImpact = decision.score_impact ?? 0;
  const tokenImpact = decision.token_impact ?? 0;

  if (scoreImpact === 0 && tokenImpact === 0) {
    return decision.target_participant_id ?? null;
  }

  if (!decision.target_participant_id) {
    throw new Error("target_participant_id is required when score_impact or token_impact is non-zero");
  }

  return decision.target_participant_id;
}

export function assertMadeByParticipantSession(participant: Participant, sessionId: string): void {
  assertSameSession(participant, sessionId, "made_by_participant");
}
