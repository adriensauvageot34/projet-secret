import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ScoreEvent, ScoreEventDetail } from "@/types/domain";
import type { ScoreEventType } from "@/lib/game/enums";
import { enrichScoreEventRow, getScoreEventById } from "@/lib/db/queries/score-events";

export const createScoreEventSchema = z.object({
  participantId: z.string().uuid(),
  sessionId: z.string().uuid(),
  eventType: z.enum([
    "mission_success",
    "constraint_success",
    "combo_2",
    "combo_3",
    "mission_constraint_bonus",
    "skip_penalty",
    "constraint_break_penalty",
    "fake_bait_bonus",
    "manual_adjustment",
    "retro_validation_cancel",
    "other",
  ]),
  deltaPoints: z.number().int().refine((value) => value !== 0, "delta_points must be non-zero"),
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  relatedElementInstanceId: z.string().uuid().nullable().optional(),
  relatedAccusationId: z.string().uuid().nullable().optional(),
  relatedGmDecisionId: z.string().uuid().nullable().optional(),
});

export type CreateScoreEventInput = z.input<typeof createScoreEventSchema>;
type CreateScoreEventPayload = z.output<typeof createScoreEventSchema>;

type SessionScopedRecord = {
  id: string;
  session_id: string;
};

const strictSignMap: Partial<Record<ScoreEventType, 1 | -1>> = {
  mission_success: 1,
  constraint_success: 1,
  combo_2: 1,
  combo_3: 1,
  mission_constraint_bonus: 1,
  skip_penalty: -1,
  constraint_break_penalty: -1,
  fake_bait_bonus: 1,
};

export function assertScoreEventTypeDeltaConsistency(eventType: ScoreEventType, deltaPoints: number): void {
  const expectedSign = strictSignMap[eventType];

  if (!expectedSign) {
    return;
  }

  if (expectedSign > 0 && deltaPoints < 0) {
    throw new Error(`${eventType} should use a positive delta_points`);
  }

  if (expectedSign < 0 && deltaPoints > 0) {
    throw new Error(`${eventType} should use a negative delta_points`);
  }
}

function toUtcISOString(value?: Date): string {
  return (value ?? new Date()).toISOString();
}

async function loadSessionScopedRecord(table: "element_instances" | "accusations" | "gm_decisions", id: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from(table).select("id, session_id").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(`Failed to load ${table} ${id}: ${error.message}`);
  }

  return (data as SessionScopedRecord | null) ?? null;
}

async function assertRelatedRecordSession(table: "element_instances" | "accusations" | "gm_decisions", id: string, sessionId: string) {
  const record = await loadSessionScopedRecord(table, id);

  if (!record) {
    throw new Error(`Related ${table} ${id} not found`);
  }

  if (record.session_id !== sessionId) {
    throw new Error(`Related ${table} ${id} belongs to another session`);
  }
}

export async function computeParticipantScoreFromLedger(participantId: string): Promise<number> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("score_events")
    .select("delta_points")
    .eq("participant_id", participantId);

  if (error) {
    throw new Error(`Failed to compute ledger score for participant ${participantId}: ${error.message}`);
  }

  return ((data ?? []) as Pick<ScoreEvent, "delta_points">[]).reduce((total, row) => total + row.delta_points, 0);
}

export async function reconcileParticipantCurrentScore(participantId: string): Promise<number> {
  const ledgerTotal = await computeParticipantScoreFromLedger(participantId);

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("participants").update({ current_score: ledgerTotal }).eq("id", participantId);

  if (error) {
    throw new Error(`Failed to reconcile participant.current_score: ${error.message}`);
  }

  return ledgerTotal;
}

async function validateCreateInput(payload: CreateScoreEventPayload): Promise<{ nextScore: number }> {
  assertScoreEventTypeDeltaConsistency(payload.eventType, payload.deltaPoints);

  const supabase = createServerSupabaseClient();
  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, session_id, current_score")
    .eq("id", payload.participantId)
    .maybeSingle();

  if (participantError) {
    throw new Error(`Failed to load participant: ${participantError.message}`);
  }

  if (!participant) {
    throw new Error("Participant not found");
  }

  if (participant.session_id !== payload.sessionId) {
    throw new Error("participant.session_id must match score_event.session_id");
  }

  if (payload.relatedElementInstanceId) {
    await assertRelatedRecordSession("element_instances", payload.relatedElementInstanceId, payload.sessionId);
  }

  if (payload.relatedAccusationId) {
    await assertRelatedRecordSession("accusations", payload.relatedAccusationId, payload.sessionId);
  }

  if (payload.relatedGmDecisionId) {
    await assertRelatedRecordSession("gm_decisions", payload.relatedGmDecisionId, payload.sessionId);
  }

  const nextScore = participant.current_score + payload.deltaPoints;

  if (nextScore < 0) {
    throw new Error("Score event would make participant.current_score negative");
  }

  return { nextScore };
}

export async function createScoreEvent(input: CreateScoreEventInput): Promise<ScoreEventDetail> {
  const payload = createScoreEventSchema.parse(input);
  const { nextScore } = await validateCreateInput(payload);

  const supabase = createServerSupabaseClient();
  const createdAt = toUtcISOString(payload.createdAt);

  const { data, error } = await supabase
    .from("score_events")
    .insert({
      participant_id: payload.participantId,
      session_id: payload.sessionId,
      event_type: payload.eventType,
      delta_points: payload.deltaPoints,
      notes: payload.notes ?? null,
      created_at: createdAt,
      related_element_instance_id: payload.relatedElementInstanceId ?? null,
      related_accusation_id: payload.relatedAccusationId ?? null,
      related_gm_decision_id: payload.relatedGmDecisionId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create score event: ${error?.message ?? "unknown error"}`);
  }

  const { error: participantUpdateError } = await supabase
    .from("participants")
    .update({ current_score: nextScore })
    .eq("id", payload.participantId);

  if (participantUpdateError) {
    throw new Error(`Failed to update participant.current_score: ${participantUpdateError.message}`);
  }

  const enriched = await getScoreEventById((data as ScoreEvent).id);

  return enriched ?? enrichScoreEventRow(data as ScoreEvent);
}
