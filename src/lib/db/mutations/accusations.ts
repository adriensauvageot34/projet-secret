import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Accusation } from "@/types/domain";

export type AccusationInsert = Omit<Accusation, "id"> & { id?: string };

export type AccusationUpdate = Partial<
  Pick<
    Accusation,
    | "status"
    | "decision"
    | "verdict"
    | "adjudicated_at"
    | "adjudicated_by_participant_id"
    | "is_receivable"
    | "triggered_fake_bait"
    | "reward_tokens"
    | "cancelled_previous_validation"
    | "notes_admin"
  >
>;

export async function createAccusationRecord(input: AccusationInsert): Promise<Accusation> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("accusations").insert(input).select("*").single();

  if (error || !data) {
    throw new Error(`Failed to create accusation: ${error?.message ?? "unknown error"}`);
  }

  return data as Accusation;
}

export async function updateAccusationRecord(id: string, patch: AccusationUpdate): Promise<Accusation> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("accusations").update(patch).eq("id", id).select("*").single();

  if (error || !data) {
    throw new Error(`Failed to update accusation ${id}: ${error?.message ?? "unknown error"}`);
  }

  return data as Accusation;
}
