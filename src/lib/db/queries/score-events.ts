import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ScoreEvent, ScoreEventDetail } from "@/types/domain";
import type { GmDecisionStatus, GmDecisionType, ScoreEventType } from "@/lib/game/enums";

type RawTargetingGmDecision = {
  id: string;
  decision_label: string;
  decision_type: GmDecisionType;
  status: GmDecisionStatus;
  created_at: string;
};

type RawScoreEventDetailRow = ScoreEvent & {
  participants: { display_name: string; session_id: string } | null;
  sessions: { name: string } | null;
  element_instances: {
    state: string;
    element_templates: { element_type: string } | null;
  } | null;
  accusations: { status: string } | null;
  gm_decisions: { decision_label: string } | null;
  targeted_by_gm_decisions: RawTargetingGmDecision[] | null;
};

const SCORE_EVENT_DETAIL_SELECT = `
  *,
  participants!score_events_participant_id_fkey(display_name, session_id),
  sessions!score_events_session_id_fkey(name),
  element_instances!score_events_related_element_instance_id_fkey(
    state,
    element_templates(element_type)
  ),
  accusations!score_events_related_accusation_id_fkey(status),
  gm_decisions!score_events_related_gm_decision_id_fkey(decision_label),
  targeted_by_gm_decisions:gm_decisions!gm_decisions_target_score_event_id_fkey(
    id,
    decision_label,
    decision_type,
    status,
    created_at
  )
`;

function mapTargetingDecision(row: RawTargetingGmDecision) {
  return {
    id: row.id,
    decision_label: row.decision_label,
    decision_type: row.decision_type,
    status: row.status,
    created_at: row.created_at,
  };
}

export function enrichScoreEventRow(row: ScoreEvent, relations?: Omit<RawScoreEventDetailRow, keyof ScoreEvent>): ScoreEventDetail {
  const participantDisplayName = relations?.participants?.display_name ?? null;

  return {
    ...row,
    session_name: relations?.sessions?.name ?? null,
    participant_display_name: participantDisplayName,
    related_element_state: relations?.element_instances?.state ?? null,
    related_accusation_status: relations?.accusations?.status ?? null,
    related_gm_decision_label: relations?.gm_decisions?.decision_label ?? null,
    related_element_type: relations?.element_instances?.element_templates?.element_type ?? null,
    score_event_label: `${participantDisplayName ?? "Unknown"} — ${row.event_type} — ${row.delta_points}`,
    is_positive_score_event: row.delta_points > 0,
    is_negative_score_event: row.delta_points < 0,
    targeted_by_gm_decisions: (relations?.targeted_by_gm_decisions ?? []).map(mapTargetingDecision),
  };
}

function mapScoreEventRow(row: RawScoreEventDetailRow): ScoreEventDetail {
  return enrichScoreEventRow(row, row);
}

export async function getScoreEventById(id: string): Promise<ScoreEventDetail | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("score_events")
    .select(SCORE_EVENT_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load score event ${id}: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapScoreEventRow(data as RawScoreEventDetailRow);
}

export async function listScoreEvents(filters: {
  sessionId?: string;
  participantId?: string;
  eventType?: ScoreEventType;
  from?: Date;
  to?: Date;
  relatedElementInstanceId?: string;
  relatedAccusationId?: string;
  relatedGmDecisionId?: string;
}): Promise<ScoreEventDetail[]> {
  const supabase = createServerSupabaseClient();

  let query = supabase.from("score_events").select(SCORE_EVENT_DETAIL_SELECT).order("created_at", { ascending: false });

  if (filters.sessionId) {
    query = query.eq("session_id", filters.sessionId);
  }

  if (filters.participantId) {
    query = query.eq("participant_id", filters.participantId);
  }

  if (filters.eventType) {
    query = query.eq("event_type", filters.eventType);
  }

  if (filters.relatedElementInstanceId) {
    query = query.eq("related_element_instance_id", filters.relatedElementInstanceId);
  }

  if (filters.relatedAccusationId) {
    query = query.eq("related_accusation_id", filters.relatedAccusationId);
  }

  if (filters.relatedGmDecisionId) {
    query = query.eq("related_gm_decision_id", filters.relatedGmDecisionId);
  }

  if (filters.from) {
    query = query.gte("created_at", filters.from.toISOString());
  }

  if (filters.to) {
    query = query.lte("created_at", filters.to.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list score events: ${error.message}`);
  }

  return ((data ?? []) as RawScoreEventDetailRow[]).map(mapScoreEventRow);
}
