import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TokenEvent, TokenEventDetail } from "@/types/domain";
import type { TokenEventType } from "@/lib/game/enums";

type RawTokenEventDetailRow = TokenEvent & {
  participants: { display_name: string; session_id: string } | null;
  sessions: { name: string } | null;
  accusations: { status: string } | null;
  advantage_instances: {
    advantage_templates: { name: string } | null;
  } | null;
  gm_decisions: { decision_label: string } | null;
  element_instances: { id: string } | null;
};

const TOKEN_EVENT_DETAIL_SELECT = `
  *,
  participants!token_events_participant_id_fkey(display_name, session_id),
  sessions!token_events_session_id_fkey(name),
  accusations!token_events_related_accusation_id_fkey(status),
  advantage_instances!token_events_related_advantage_instance_id_fkey(
    advantage_templates(name)
  ),
  gm_decisions!token_events_related_gm_decision_id_fkey(decision_label),
  element_instances!token_events_related_element_instance_id_fkey(id)
`;

function toBooleanDelta(direction: "positive" | "negative", deltaTokens: number): boolean {
  return direction === "positive" ? deltaTokens > 0 : deltaTokens < 0;
}

export function enrichTokenEventRow(row: TokenEvent, relations?: Omit<RawTokenEventDetailRow, keyof TokenEvent>): TokenEventDetail {
  const participantDisplayName = relations?.participants?.display_name ?? null;
  const sessionName = relations?.sessions?.name ?? null;

  return {
    ...row,
    session_name: sessionName,
    participant_display_name: participantDisplayName,
    related_accusation_status: relations?.accusations?.status ?? null,
    related_advantage_name: relations?.advantage_instances?.advantage_templates?.name ?? null,
    related_gm_decision_label: relations?.gm_decisions?.decision_label ?? null,
    token_event_label: `${participantDisplayName ?? "Unknown"} — ${row.event_type} — ${row.delta_tokens}`,
    is_positive: toBooleanDelta("positive", row.delta_tokens),
    is_negative: toBooleanDelta("negative", row.delta_tokens),
  };
}

function mapTokenEventRow(row: RawTokenEventDetailRow): TokenEventDetail {
  return enrichTokenEventRow(row, row);
}

export async function getTokenEventById(id: string): Promise<TokenEventDetail | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("token_events")
    .select(TOKEN_EVENT_DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load token event ${id}: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapTokenEventRow(data as RawTokenEventDetailRow);
}

export async function listTokenEvents(filters: {
  sessionId?: string;
  participantId?: string;
  eventType?: TokenEventType;
  from?: Date;
  to?: Date;
}): Promise<TokenEventDetail[]> {
  const supabase = createServerSupabaseClient();

  let query = supabase.from("token_events").select(TOKEN_EVENT_DETAIL_SELECT).order("created_at", { ascending: false });

  if (filters.sessionId) {
    query = query.eq("session_id", filters.sessionId);
  }

  if (filters.participantId) {
    query = query.eq("participant_id", filters.participantId);
  }

  if (filters.eventType) {
    query = query.eq("event_type", filters.eventType);
  }

  if (filters.from) {
    query = query.gte("created_at", filters.from.toISOString());
  }

  if (filters.to) {
    query = query.lte("created_at", filters.to.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list token events: ${error.message}`);
  }

  return ((data ?? []) as RawTokenEventDetailRow[]).map(mapTokenEventRow);
}
