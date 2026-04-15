import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Accusation, GMDecision, ScoreEvent, TokenEvent } from "@/types/domain";
import type { AccusationDecision, AccusationStatus, AccusationVerdict } from "@/lib/game/enums";

export interface AccusationDetail extends Accusation {
  session_name: string | null;
  accuser_display_name: string | null;
  accused_display_name: string | null;
  adjudicated_by_display_name: string | null;
  suspected_template_name: string | null;
  related_element_is_fake: boolean | null;
  related_element_state: string | null;
  linked_token_events: TokenEvent[];
  linked_score_events: ScoreEvent[];
  linked_gm_decisions: GMDecision[];
}

type RawAccusationDetailRow = Accusation & {
  sessions: { name: string } | null;
  accuser: { display_name: string } | null;
  accused: { display_name: string } | null;
  adjudicated_by: { display_name: string } | null;
  suspected_template: { name: string } | null;
  related_element_instance: { is_fake: boolean; state: string } | null;
  linked_token_events: TokenEvent[] | null;
  linked_score_events: ScoreEvent[] | null;
  linked_gm_decisions: GMDecision[] | null;
};

const ACCUSATION_DETAIL_SELECT = `
  *,
  sessions!accusations_session_id_fkey(name),
  accuser:participants!accusations_accuser_participant_id_fkey(display_name),
  accused:participants!accusations_accused_participant_id_fkey(display_name),
  adjudicated_by:participants!accusations_adjudicated_by_participant_id_fkey(display_name),
  suspected_template:element_templates!accusations_suspected_template_id_fkey(name),
  related_element_instance:element_instances!accusations_related_element_instance_id_fkey(is_fake, state),
  linked_token_events:token_events!token_events_related_accusation_id_fkey(*),
  linked_score_events:score_events!score_events_related_accusation_id_fkey(*),
  linked_gm_decisions:gm_decisions!gm_decisions_target_accusation_id_fkey(*)
`;

function mapAccusationRow(row: RawAccusationDetailRow): AccusationDetail {
  return {
    ...row,
    session_name: row.sessions?.name ?? null,
    accuser_display_name: row.accuser?.display_name ?? null,
    accused_display_name: row.accused?.display_name ?? null,
    adjudicated_by_display_name: row.adjudicated_by?.display_name ?? null,
    suspected_template_name: row.suspected_template?.name ?? null,
    related_element_is_fake: row.related_element_instance?.is_fake ?? null,
    related_element_state: row.related_element_instance?.state ?? null,
    linked_token_events: row.linked_token_events ?? [],
    linked_score_events: row.linked_score_events ?? [],
    linked_gm_decisions: row.linked_gm_decisions ?? [],
  };
}

export async function getAccusationById(id: string): Promise<AccusationDetail | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("accusations").select(ACCUSATION_DETAIL_SELECT).eq("id", id).maybeSingle();

  if (error) {
    throw new Error(`Failed to load accusation ${id}: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapAccusationRow(data as RawAccusationDetailRow);
}

export async function listAccusations(filters: {
  sessionId?: string;
  status?: AccusationStatus;
  decision?: AccusationDecision;
  verdict?: AccusationVerdict;
  accuserParticipantId?: string;
  accusedParticipantId?: string;
  adjudicatedByParticipantId?: string;
  from?: Date;
  to?: Date;
}): Promise<AccusationDetail[]> {
  const supabase = createServerSupabaseClient();

  let query = supabase.from("accusations").select(ACCUSATION_DETAIL_SELECT).order("created_at", { ascending: false });

  if (filters.sessionId) {
    query = query.eq("session_id", filters.sessionId);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.decision) {
    query = query.eq("decision", filters.decision);
  }

  if (filters.verdict) {
    query = query.eq("verdict", filters.verdict);
  }

  if (filters.accuserParticipantId) {
    query = query.eq("accuser_participant_id", filters.accuserParticipantId);
  }

  if (filters.accusedParticipantId) {
    query = query.eq("accused_participant_id", filters.accusedParticipantId);
  }

  if (filters.adjudicatedByParticipantId) {
    query = query.eq("adjudicated_by_participant_id", filters.adjudicatedByParticipantId);
  }

  if (filters.from) {
    query = query.gte("created_at", filters.from.toISOString());
  }

  if (filters.to) {
    query = query.lte("created_at", filters.to.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list accusations: ${error.message}`);
  }

  return ((data ?? []) as RawAccusationDetailRow[]).map(mapAccusationRow);
}
