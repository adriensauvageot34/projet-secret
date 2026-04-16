import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Participant } from "@/types/domain";

export async function getParticipantById(participantId: string): Promise<Participant | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("id", participantId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Participant | null) ?? null;
}

export async function getParticipantByPublicSlug(publicSlug: string): Promise<Participant | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("public_slug", publicSlug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Participant | null) ?? null;
}
