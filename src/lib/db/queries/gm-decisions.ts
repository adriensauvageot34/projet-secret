import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { GMDecision, ScoreEvent, TokenEvent } from "@/types/domain";
import type { GmDecisionStatus, GmDecisionType } from "@/lib/game/enums";

export interface GMDecisionDetail extends GMDecision {
  session_name: string | null;
  made_by_display_name: string | null;
  assigned_player_display_name: string | null;
  target_participant_display_name: string | null;
  other_target_participant_display_name: string | null;
  produced_score_events_count: number;
  produced_token_events_count: number;
  produced_score_events: ScoreEvent[];
  produced_token_events: TokenEvent[];
  decision_label_full: string;
}

type RawGMDecisionDetailRow = GMDecision & {
  sessions: { name: string } | null;
  made_by_participant: { display_name: string } | null;
  assigned_player: { display_name: string } | null;
  target_participant: { display_name: string } | null;
  other_target_participant: { display_name: string } | null;
  produced_score_events: ScoreEvent[] | null;
  produced_token_events: TokenEvent[] | null;
};

const GM_DECISION_DETAIL_SELECT = `
  *,
  sessions!gm_decisions_session_id_fkey(name),
  made_by_participant:participants!gm_decisions_made_by_participant_id_fkey(display_name),
  assigned_player:players!gm_decisions_assigned_player_id_fkey(display_name),
  target_participant:participants!gm_decisions_target_participant_id_fkey(display_name),
  other_target_participant:participants!gm_decisions_other_target_participant_id_fkey(display_name),
  produced_score_events:score_events!score_events_related_gm_decision_id_fkey(*),
  produced_token_events:token_events!token_events_related_gm_decision_id_fkey(*)
`;

function mapGMDecisionRow(row: RawGMDecisionDetailRow): GMDecisionDetail {
  const producedScoreEvents = row.produced_score_events ?? [];
  const producedTokenEvents = row.produced_token_events ?? [];

  return {
    ...row,
    session_name: row.sessions?.name ?? null,
    made_by_display_name: row.made_by_participant?.display_name ?? null,
    assigned_player_display_name: row.assigned_player?.display_name ?? null,
    target_participant_display_name: row.target_participant?.display_name ?? null,
    other_target_participant_display_name: row.other_target_participant?.display_name ?? null,
    produced_score_events_count: producedScoreEvents.length,
    produced_token_events_count: producedTokenEvents.length,
    produced_score_events: producedScoreEvents,
    produced_token_events: producedTokenEvents,
    decision_label_full: `[${row.decision_type}] ${row.decision_label}`,
  };
}

export async function getGMDecisionById(id: string): Promise<GMDecisionDetail | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("gm_decisions")
    .select(GM_DECISION_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load GM decision ${id}: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapGMDecisionRow(data as RawGMDecisionDetailRow);
}

export async function listGMDecisions(filters: {
  sessionId?: string;
  decisionType?: GmDecisionType;
  status?: GmDecisionStatus;
  madeByParticipantId?: string;
  targetParticipantId?: string;
  from?: Date;
  to?: Date;
}): Promise<GMDecisionDetail[]> {
  const supabase = createServerSupabaseClient();

  let query = supabase.from("gm_decisions").select(GM_DECISION_DETAIL_SELECT).order("created_at", { ascending: false });

  if (filters.sessionId) {
    query = query.eq("session_id", filters.sessionId);
  }

  if (filters.decisionType) {
    query = query.eq("decision_type", filters.decisionType);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.madeByParticipantId) {
    query = query.eq("made_by_participant_id", filters.madeByParticipantId);
  }

  if (filters.targetParticipantId) {
    query = query.eq("target_participant_id", filters.targetParticipantId);
  }

  if (filters.from) {
    query = query.gte("created_at", filters.from.toISOString());
  }

  if (filters.to) {
    query = query.lte("created_at", filters.to.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list GM decisions: ${error.message}`);
  }

  return ((data ?? []) as RawGMDecisionDetailRow[]).map(mapGMDecisionRow);
}
