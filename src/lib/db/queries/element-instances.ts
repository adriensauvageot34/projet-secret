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

export async function listElementInstancesBySession(sessionId: string): Promise<ElementInstance[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("element_instances")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list session element instances: ${error.message}`);
  }

  return (data as ElementInstance[] | null) ?? [];
}

export async function listSuccessfulElementTemplateIdsForParticipantInSession(
  participantId: string,
  sessionId: string,
): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("element_instances")
    .select("element_template_id")
    .eq("participant_id", participantId)
    .eq("session_id", sessionId)
    .eq("final_result", "success");

  if (error) {
    throw new Error(`Failed to list successful element template ids for participant in session: ${error.message}`);
  }

  const templateIds = (data ?? []).map((row) => row.element_template_id as string);
  return Array.from(new Set(templateIds));
}
