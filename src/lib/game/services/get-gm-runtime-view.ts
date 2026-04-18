import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/db/queries/sessions";
import { listAccusations, type AccusationDetail } from "@/lib/db/queries/accusations";
import { listGMDecisions, type GMDecisionDetail } from "@/lib/db/queries/gm-decisions";
import { isGmTicketEffectCode } from "@/lib/game/gm-ticket-advantages";
import { buildLiveRanking, type LiveRankingEntry } from "@/lib/game/services/live-ranking";
import type { Participant, Session } from "@/types/domain";

export type GmRuntimeParticipant = Pick<
  Participant,
  | "id"
  | "session_id"
  | "display_name"
  | "role"
  | "current_status"
  | "current_score"
  | "current_tokens"
  | "completed_elements_count"
  | "waiting_slot_count"
  | "blocked_slot_count"
>;

export type GmRuntimeElement = {
  id: string;
  participant_id: string;
  participant_display_name: string | null;
  element_template_id: string;
  template_name: string | null;
  element_type: string | null;
  validation_mode: string | null;
  state: string;
  proof_status: string;
  is_proof_pending: boolean;
  is_gm_pending: boolean;
  activated_at: string | null;
  ends_at: string | null;
  claimed_result: string | null;
  final_result: string | null;
};

export type GmRuntimeData = {
  session: Session;
  participants: GmRuntimeParticipant[];
  finalSummary: GmFinalSummary;
  accusations: AccusationDetail[];
  decisions: GMDecisionDetail[];
  liveElements: GmRuntimeElement[];
  activeGmTickets: GmRuntimeActiveTicket[];
};

export type GmFinalSummary = {
  ranking: LiveRankingEntry[];
  winner: LiveRankingEntry | null;
  podium: LiveRankingEntry[];
  bottomFive: LiveRankingEntry[];
};

export function buildGmFinalSummary(participants: GmRuntimeParticipant[]): GmFinalSummary {
  const ranking = buildLiveRanking(participants.filter((participant) => participant.role !== "gm"));

  return {
    ranking,
    winner: ranking[0] ?? null,
    podium: ranking.slice(0, 3),
    bottomFive: ranking.slice(-5),
  };
}

export type GmRuntimeActiveTicket = {
  id: string;
  participant_id: string;
  participant_display_name: string | null;
  target_participant_id: string | null;
  target_participant_display_name: string | null;
  effect_code: string;
  template_name: string | null;
  activated_at: string | null;
  updated_at: string;
};

type RawElementRuntimeRow = {
  id: string;
  participant_id: string;
  element_template_id: string;
  state: string;
  proof_status: string;
  activated_at: string | null;
  ends_at: string | null;
  claimed_result: string | null;
  final_result: string | null;
  participants: { display_name: string } | { display_name: string }[] | null;
  element_templates: {
    name: string;
    element_type: string;
    validation_mode: string;
  } | {
    name: string;
    element_type: string;
    validation_mode: string;
  }[] | null;
};

type RawActiveTicketRow = {
  id: string;
  participant_id: string;
  target_participant_id: string | null;
  activated_at: string | null;
  updated_at: string;
  participants: { display_name: string }[] | null;
  target_participants: { display_name: string }[] | null;
  advantage_templates: { effect_code: string; name: string }[] | null;
};

export function mapGmRuntimeElement(row: RawElementRuntimeRow): GmRuntimeElement {
  const participant = Array.isArray(row.participants) ? row.participants[0] : row.participants;
  const template = Array.isArray(row.element_templates) ? row.element_templates[0] : row.element_templates;
  const validationMode = template?.validation_mode ?? null;
  const isPendingResolution = row.claimed_result !== null && row.final_result === null;

  return {
    id: row.id,
    participant_id: row.participant_id,
    participant_display_name: participant?.display_name ?? null,
    element_template_id: row.element_template_id,
    template_name: template?.name ?? null,
    element_type: template?.element_type ?? null,
    validation_mode: validationMode,
    state: row.state,
    proof_status: row.proof_status,
    is_proof_pending: validationMode === "proof" && isPendingResolution && row.proof_status === "pending",
    is_gm_pending: validationMode === "gm" && isPendingResolution && row.state === "active",
    activated_at: row.activated_at,
    ends_at: row.ends_at,
    claimed_result: row.claimed_result,
    final_result: row.final_result,
  };
}

async function listParticipantsBySessionId(sessionId: string): Promise<GmRuntimeParticipant[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, session_id, display_name, role, current_status, current_score, current_tokens, completed_elements_count, waiting_slot_count, blocked_slot_count")
    .eq("session_id", sessionId)
    .order("display_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load session participants: ${error.message}`);
  }

  return ((data ?? []) as GmRuntimeParticipant[]);
}

async function listSessionLiveElements(sessionId: string): Promise<GmRuntimeElement[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("element_instances")
    .select(`
      id,
      participant_id,
      element_template_id,
      state,
      proof_status,
      activated_at,
      ends_at,
      claimed_result,
      final_result,
      participants(display_name),
      element_templates(name, element_type, validation_mode)
    `)
    .eq("session_id", sessionId)
    .eq("state", "active")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    throw new Error(`Failed to load session elements: ${error.message}`);
  }

  return ((data ?? []) as RawElementRuntimeRow[]).map(mapGmRuntimeElement);
}

async function listSessionActiveGmTickets(sessionId: string): Promise<GmRuntimeActiveTicket[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("advantage_instances")
    .select(`
      id,
      participant_id,
      target_participant_id,
      activated_at,
      updated_at,
      participants!advantage_instances_participant_id_fkey(display_name),
      target_participants:participants!advantage_instances_target_participant_id_fkey(display_name),
      advantage_templates!inner(effect_code, name)
    `)
    .eq("session_id", sessionId)
    .eq("state", "active")
    .order("updated_at", { ascending: false })
    .limit(40);

  if (error) {
    throw new Error(`Failed to load session active GM tickets: ${error.message}`);
  }

  return ((data ?? []) as RawActiveTicketRow[])
    .filter((row) => isGmTicketEffectCode(row.advantage_templates?.[0]?.effect_code ?? ""))
    .map((row) => ({
      id: row.id,
      participant_id: row.participant_id,
      participant_display_name: row.participants?.[0]?.display_name ?? null,
      target_participant_id: row.target_participant_id,
      target_participant_display_name: row.target_participants?.[0]?.display_name ?? null,
      effect_code: row.advantage_templates?.[0]?.effect_code ?? "unknown",
      template_name: row.advantage_templates?.[0]?.name ?? null,
      activated_at: row.activated_at,
      updated_at: row.updated_at,
    }));
}

export async function getGmRuntimeView(): Promise<GmRuntimeData> {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Aucune session active ou préparée pour le runtime GM");
  }

  const [participants, accusations, decisions, liveElements, activeGmTickets] = await Promise.all([
    listParticipantsBySessionId(session.id),
    listAccusations({ sessionId: session.id }),
    listGMDecisions({ sessionId: session.id }),
    listSessionLiveElements(session.id),
    listSessionActiveGmTickets(session.id),
  ]);

  return {
    session,
    participants,
    finalSummary: buildGmFinalSummary(participants),
    accusations,
    decisions,
    liveElements,
    activeGmTickets,
  };
}
