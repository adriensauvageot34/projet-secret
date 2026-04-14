import type { ParticipantRole, ParticipantStatus } from "@/lib/game/enums";
import type { Participant, Player } from "@/types/domain";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ElementInstanceSlotRow = {
  state: string;
  final_result: string;
  proof_status: string;
  cooldown_until: string | null;
};

function assertNonNegativeResult(value: number, label: string): void {
  if (value < 0) {
    throw new Error(`${label} cannot be negative`);
  }
}

export async function addScore(participantId: string, delta: number, reason: string): Promise<number> {
  const supabase = createServerSupabaseClient();

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, session_id, current_score")
    .eq("id", participantId)
    .single();

  if (participantError || !participant) {
    throw new Error(`Failed to load participant: ${participantError?.message ?? "not found"}`);
  }

  const nextScore = participant.current_score + delta;
  assertNonNegativeResult(nextScore, "Participant current_score");

  const { error: scoreEventError } = await supabase.from("score_events").insert({
    session_id: participant.session_id,
    participant_id: participant.id,
    event_type: "gm_adjustment",
    delta,
    meta: { reason },
  });

  if (scoreEventError) {
    throw new Error(`Failed to insert score event: ${scoreEventError.message}`);
  }

  const { error: participantUpdateError } = await supabase
    .from("participants")
    .update({ current_score: nextScore })
    .eq("id", participantId);

  if (participantUpdateError) {
    throw new Error(`Failed to update participant score: ${participantUpdateError.message}`);
  }

  return nextScore;
}

export async function addTokens(participantId: string, delta: number, reason: string): Promise<number> {
  const supabase = createServerSupabaseClient();

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, session_id, current_tokens")
    .eq("id", participantId)
    .single();

  if (participantError || !participant) {
    throw new Error(`Failed to load participant: ${participantError?.message ?? "not found"}`);
  }

  const nextTokens = participant.current_tokens + delta;
  assertNonNegativeResult(nextTokens, "Participant current_tokens");

  const { error: tokenEventError } = await supabase.from("token_events").insert({
    session_id: participant.session_id,
    participant_id: participant.id,
    event_type: "gm_adjustment",
    delta,
    meta: { reason },
  });

  if (tokenEventError) {
    throw new Error(`Failed to insert token event: ${tokenEventError.message}`);
  }

  const { error: participantUpdateError } = await supabase
    .from("participants")
    .update({ current_tokens: nextTokens })
    .eq("id", participantId);

  if (participantUpdateError) {
    throw new Error(`Failed to update participant tokens: ${participantUpdateError.message}`);
  }

  return nextTokens;
}

export async function computeLevelFromScore(score: number): Promise<string | null> {
  const supabase = createServerSupabaseClient();

  const { data: level, error } = await supabase
    .from("levels")
    .select("id")
    .lte("min_score", score)
    .gte("max_score", score)
    .order("visible_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to compute level from score: ${error.message}`);
  }

  return level?.id ?? null;
}

export async function updateParticipantLevel(participantId: string): Promise<string | null> {
  const supabase = createServerSupabaseClient();

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, current_score")
    .eq("id", participantId)
    .single();

  if (participantError || !participant) {
    throw new Error(`Failed to load participant: ${participantError?.message ?? "not found"}`);
  }

  const levelId = await computeLevelFromScore(participant.current_score);

  const { error: updateError } = await supabase
    .from("participants")
    .update({ current_level_id: levelId })
    .eq("id", participantId);

  if (updateError) {
    throw new Error(`Failed to update participant level: ${updateError.message}`);
  }

  return levelId;
}

export function getParticipantDisplayName(
  participant: Pick<Participant, "display_name">,
  player: Pick<Player, "display_name">,
): string {
  return participant.display_name || player.display_name;
}

export async function recomputeParticipantSlots(participantId: string): Promise<{
  completed_elements_count: number;
  waiting_slot_count: number;
  blocked_slot_count: number;
}> {
  const supabase = createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .from("element_instances")
    .select("state, final_result, proof_status, cooldown_until")
    .eq("participant_id", participantId);

  if (error) {
    throw new Error(`Failed to load participant element instances: ${error.message}`);
  }

  const now = Date.now();
  const elementRows = (rows ?? []) as ElementInstanceSlotRow[];

  const completed_elements_count = elementRows.filter(
    (row) => row.final_result !== "pending" || row.state === "resolved",
  ).length;

  const waiting_slot_count = elementRows.filter((row) => {
    if (row.state === "reserve") {
      return true;
    }

    if (!row.cooldown_until) {
      return false;
    }

    return new Date(row.cooldown_until).getTime() > now;
  }).length;

  const blocked_slot_count = elementRows.filter(
    (row) => row.state === "claimed" || row.proof_status === "pending" || row.proof_status === "submitted",
  ).length;

  const { error: updateError } = await supabase
    .from("participants")
    .update({
      completed_elements_count,
      waiting_slot_count,
      blocked_slot_count,
    })
    .eq("id", participantId);

  if (updateError) {
    throw new Error(`Failed to update participant slot counters: ${updateError.message}`);
  }

  return { completed_elements_count, waiting_slot_count, blocked_slot_count };
}

type ComputeParticipantStatusInput = {
  role: ParticipantRole;
  current_status?: ParticipantStatus;
  is_finished?: boolean;
  active_elements_count?: number;
  cooldown_elements_count?: number;
};

export function computeParticipantStatus(participant: ComputeParticipantStatusInput): ParticipantStatus {
  if (participant.role === "gm") {
    return "gm";
  }

  if (participant.is_finished || participant.current_status === "finished") {
    return "finished";
  }

  if ((participant.active_elements_count ?? 0) > 0) {
    return "active";
  }

  if ((participant.cooldown_elements_count ?? 0) > 0) {
    return "waiting";
  }

  return "ready";
}

export async function updateCombo(participantId: string, success: boolean): Promise<number> {
  const supabase = createServerSupabaseClient();

  const { data: participant, error } = await supabase
    .from("participants")
    .select("id, combo_streak_current")
    .eq("id", participantId)
    .single();

  if (error || !participant) {
    throw new Error(`Failed to load participant: ${error?.message ?? "not found"}`);
  }

  const nextCombo = success ? participant.combo_streak_current + 1 : 0;

  const { error: updateError } = await supabase
    .from("participants")
    .update({ combo_streak_current: nextCombo })
    .eq("id", participantId);

  if (updateError) {
    throw new Error(`Failed to update participant combo streak: ${updateError.message}`);
  }

  return nextCombo;
}
