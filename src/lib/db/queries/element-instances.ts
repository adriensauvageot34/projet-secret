import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ElementInstance } from "@/types/domain";

export async function getElementInstanceById(instanceId: string): Promise<ElementInstance | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("element_instances").select("*").eq("id", instanceId).maybeSingle();

  if (error) {
    throw new Error(`Failed to load element instance: ${error.message}`);
  }

  return (data as ElementInstance | null) ?? null;
}

export async function listElementInstancesByParticipant(participantId: string): Promise<ElementInstance[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("element_instances")
    .select("*")
    .eq("participant_id", participantId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list participant element instances: ${error.message}`);
  }

  return (data as ElementInstance[] | null) ?? [];
}
