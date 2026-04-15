import type { ParticipantRole, ParticipantStatus } from "@/lib/game/enums";
import type { Participant, Player } from "@/types/domain";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createTokenEvent } from "@/lib/game/services/token-events";
import { createScoreEvent } from "@/lib/game/services/score-events";

type ElementInstanceSlotRow = {
  state: string;
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

  assertNonNegativeResult(participant.current_score + delta, "Participant current_score");

  await createScoreEvent({
    participantId: participant.id,
    sessionId: participant.session_id,
    eventType: "manual_adjustment",
    deltaPoints: delta,
    notes: reason,
  });

  return participant.current_score + delta;
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

  await createTokenEvent({
    participantId: participant.id,
    sessionId: participant.session_id,
    eventType: "manual_adjustment",
    deltaTokens: delta,
    notes: reason,
  });

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
    .select("state, cooldown_until")
    .eq("participant_id", participantId);

  if (error) {
    throw new Error(`Failed to load participant element instances: ${error.message}`);
  }

  const now = Date.now();
  const elementRows = (rows ?? []) as ElementInstanceSlotRow[];

  const completed_elements_count = elementRows.filter((row) =>
    ["completed", "failed", "broken", "skipped", "expired"].includes(row.state),
  ).length;

  const waiting_slot_count = elementRows.filter((row) => row.state === "cooldown").length;

  const blocked_slot_count = elementRows.filter((row) => {
    if (row.state !== "cooldown") {
      return false;
    }

    return row.cooldown_until ? new Date(row.cooldown_until).getTime() > now : false;
  }).length;

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
