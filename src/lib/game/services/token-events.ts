import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TokenEvent } from "@/types/domain";
import type { TokenEventType } from "@/lib/game/enums";
import { enrichTokenEventRow, getTokenEventById } from "@/lib/db/queries/token-events";
import { assertSessionIsLiveById } from "@/lib/game/rules/session";

const createTokenEventSchema = z.object({
  participantId: z.string().uuid(),
  sessionId: z.string().uuid(),
  eventType: z.enum([
    "accusation_correct",
    "shop_purchase",
    "refund",
    "fake_bait_bonus",
    "manual_adjustment",
    "bonus_effect",
    "cancellation",
    "other",
  ]),
  deltaTokens: z.number().int().refine((value) => value !== 0, "delta_tokens must be non-zero"),
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  relatedAccusationId: z.string().uuid().nullable().optional(),
  relatedAdvantageInstanceId: z.string().uuid().nullable().optional(),
  relatedGmDecisionId: z.string().uuid().nullable().optional(),
  relatedElementInstanceId: z.string().uuid().nullable().optional(),
});

export type CreateTokenEventInput = z.input<typeof createTokenEventSchema>;

type CreateTokenEventPayload = z.output<typeof createTokenEventSchema>;

type SessionScopedRecord = {
  id: string;
  session_id: string;
};

export function assertEventTypeDeltaConsistency(eventType: TokenEventType, deltaTokens: number): void {
  const strictSignMap: Partial<Record<TokenEventType, 1 | -1>> = {
    accusation_correct: 1,
    shop_purchase: -1,
    refund: 1,
    fake_bait_bonus: 1,
  };

  const expectedSign = strictSignMap[eventType];

  if (!expectedSign) {
    return;
  }

  if (expectedSign > 0 && deltaTokens < 0) {
    throw new Error(`${eventType} must use a positive delta_tokens`);
  }

  if (expectedSign < 0 && deltaTokens > 0) {
    throw new Error(`${eventType} must use a negative delta_tokens`);
  }
}

function toUtcISOString(value?: Date): string {
  return (value ?? new Date()).toISOString();
}

async function loadSessionScopedRecord(table: "accusations" | "advantage_instances" | "gm_decisions" | "element_instances", id: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from(table).select("id, session_id").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(`Failed to load ${table} ${id}: ${error.message}`);
  }

  return (data as SessionScopedRecord | null) ?? null;
}

async function assertRelatedRecordSession(table: "accusations" | "advantage_instances" | "gm_decisions" | "element_instances", id: string, sessionId: string) {
  const record = await loadSessionScopedRecord(table, id);

  if (!record) {
    throw new Error(`Related ${table} ${id} not found`);
  }

  if (record.session_id !== sessionId) {
    throw new Error(`Related ${table} ${id} belongs to another session`);
  }
}

export async function computeParticipantTokensFromLedger(participantId: string): Promise<number> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("token_events")
    .select("delta_tokens")
    .eq("participant_id", participantId);

  if (error) {
    throw new Error(`Failed to compute ledger tokens for participant ${participantId}: ${error.message}`);
  }

  return ((data ?? []) as Pick<TokenEvent, "delta_tokens">[]).reduce((total, row) => total + row.delta_tokens, 0);
}

export async function reconcileParticipantCurrentTokens(participantId: string): Promise<number> {
  const ledgerTotal = await computeParticipantTokensFromLedger(participantId);

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("participants").update({ current_tokens: ledgerTotal }).eq("id", participantId);

  if (error) {
    throw new Error(`Failed to reconcile participant.current_tokens: ${error.message}`);
  }

  return ledgerTotal;
}

async function validateCreateInput(payload: CreateTokenEventPayload): Promise<void> {
  await assertSessionIsLiveById(payload.sessionId);
  assertEventTypeDeltaConsistency(payload.eventType, payload.deltaTokens);

  const supabase = createServerSupabaseClient();
  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, session_id, current_tokens")
    .eq("id", payload.participantId)
    .maybeSingle();

  if (participantError) {
    throw new Error(`Failed to load participant: ${participantError.message}`);
  }

  if (!participant) {
    throw new Error("Participant not found");
  }

  if (participant.session_id !== payload.sessionId) {
    throw new Error("participant.session_id must match token_event.session_id");
  }

  if (payload.relatedAccusationId) {
    await assertRelatedRecordSession("accusations", payload.relatedAccusationId, payload.sessionId);
  }

  if (payload.relatedAdvantageInstanceId) {
    await assertRelatedRecordSession("advantage_instances", payload.relatedAdvantageInstanceId, payload.sessionId);
  }

  if (payload.relatedGmDecisionId) {
    await assertRelatedRecordSession("gm_decisions", payload.relatedGmDecisionId, payload.sessionId);
  }

  if (payload.relatedElementInstanceId) {
    await assertRelatedRecordSession("element_instances", payload.relatedElementInstanceId, payload.sessionId);
  }

  const nextTokens = participant.current_tokens + payload.deltaTokens;

  if (nextTokens < 0) {
    throw new Error("Token event would make participant.current_tokens negative");
  }

  return;
}

export async function createTokenEvent(input: CreateTokenEventInput) {
  const payload = createTokenEventSchema.parse(input);
  await validateCreateInput(payload);

  const supabase = createServerSupabaseClient();
  const createdAt = toUtcISOString(payload.createdAt);

  const { data, error } = await supabase
    .from("token_events")
    .insert({
      participant_id: payload.participantId,
      session_id: payload.sessionId,
      event_type: payload.eventType,
      delta_tokens: payload.deltaTokens,
      notes: payload.notes ?? null,
      created_at: createdAt,
      related_accusation_id: payload.relatedAccusationId ?? null,
      related_advantage_instance_id: payload.relatedAdvantageInstanceId ?? null,
      related_gm_decision_id: payload.relatedGmDecisionId ?? null,
      related_element_instance_id: payload.relatedElementInstanceId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create token event: ${error?.message ?? "unknown error"}`);
  }

  await reconcileParticipantCurrentTokens(payload.participantId);

  const enriched = await getTokenEventById((data as TokenEvent).id);

  return enriched ?? enrichTokenEventRow(data as TokenEvent);
}

export async function hasAccusationCorrectRewardTokenEvent(accusationId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("token_events")
    .select("id")
    .eq("related_accusation_id", accusationId)
    .eq("event_type", "accusation_correct")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify accusation reward token event: ${error.message}`);
  }

  return Boolean(data);
}
