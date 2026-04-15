import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ScoreEvent } from "@/types/domain";

export type ScoreEventInsert = Omit<ScoreEvent, "id"> & { id?: string };

export async function createScoreEventRecord(input: ScoreEventInsert): Promise<ScoreEvent> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("score_events").insert(input).select("*").single();

  if (error || !data) {
    throw new Error(`Failed to create score event: ${error?.message ?? "unknown error"}`);
  }

  return data as ScoreEvent;
}
