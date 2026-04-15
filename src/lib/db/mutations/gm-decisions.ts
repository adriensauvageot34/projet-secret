import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { GMDecision } from "@/types/domain";

export type GMDecisionInsert = Omit<GMDecision, "id"> & { id?: string };

export type GMDecisionUpdate = Partial<
  Pick<
    GMDecision,
    | "status"
    | "notes"
    | "score_impact"
    | "token_impact"
    | "is_retroactive"
    | "target_score_event_id"
    | "target_token_event_id"
  >
>;

export async function createGMDecisionRecord(input: GMDecisionInsert): Promise<GMDecision> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("gm_decisions").insert(input).select("*").single();

  if (error || !data) {
    throw new Error(`Failed to create GM decision: ${error?.message ?? "unknown error"}`);
  }

  return data as GMDecision;
}

export async function updateGMDecisionRecord(id: string, patch: GMDecisionUpdate): Promise<GMDecision> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("gm_decisions").update(patch).eq("id", id).select("*").single();

  if (error || !data) {
    throw new Error(`Failed to update GM decision ${id}: ${error?.message ?? "unknown error"}`);
  }

  return data as GMDecision;
}
