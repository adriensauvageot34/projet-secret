import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/db/queries/sessions";
import { listAccusations, type AccusationDetail } from "@/lib/db/queries/accusations";
import { listGMDecisions, type GMDecisionDetail } from "@/lib/db/queries/gm-decisions";
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
  is_fake: boolean;
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
  accusations: AccusationDetail[];
  decisions: GMDecisionDetail[];
  liveElements: GmRuntimeElement[];
};

type RawElementRuntimeRow = {
  id: string;
  participant_id: string;
  element_template_id: string;
  state: string;
  proof_status: string;
  is_fake: boolean;
  activated_at: string | null;
  ends_at: string | null;
  claimed_result: string | null;
  final_result: string | null;
  participants: { display_name: string }[] | null;
  element_templates: {
    name: string;
    element_type: string;
    validation_mode: string;
  }[] | null;
};

export function mapGmRuntimeElement(row: RawElementRuntimeRow): GmRuntimeElement {
  const validationMode = row.element_templates?.[0]?.validation_mode ?? null;
  const isPendingResolution = row.claimed_result !== null && row.final_result === null;

  return {
    id: row.id,
    participant_id: row.participant_id,
    participant_display_name: row.participants?.[0]?.display_name ?? null,
    element_template_id: row.element_template_id,
    template_name: row.element_templates?.[0]?.name ?? null,
    element_type: row.element_templates?.[0]?.element_type ?? null,
    validation_mode: validationMode,
    state: row.state,
    proof_status: row.proof_status,
    is_fake: row.is_fake,
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
      is_fake,
      activated_at,
      ends_at,
      claimed_result,
      final_result,
      participants(display_name),
      element_templates(name, element_type, validation_mode)
    `)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    throw new Error(`Failed to load session elements: ${error.message}`);
  }

  return ((data ?? []) as RawElementRuntimeRow[]).map(mapGmRuntimeElement);
}

export async function getGmRuntimeView(): Promise<GmRuntimeData> {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Aucune session active ou préparée pour le runtime GM");
  }

  const [participants, accusations, decisions, liveElements] = await Promise.all([
    listParticipantsBySessionId(session.id),
    listAccusations({ sessionId: session.id }),
    listGMDecisions({ sessionId: session.id }),
    listSessionLiveElements(session.id),
  ]);

  return {
    session,
    participants,
    accusations,
    decisions,
    liveElements,
  };
}
