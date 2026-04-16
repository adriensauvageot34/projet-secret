import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Session } from "@/types/domain";

export async function finishSession(sessionId: string): Promise<Session> {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("sessions")
    .update({
      status: "finished",
      updated_at: now,
    })
    .eq("id", sessionId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Failed to finish session ${sessionId}: ${error?.message ?? "not found"}`);
  }

  const { error: participantError } = await supabase
    .from("participants")
    .update({
      current_status: "finished",
      updated_at: now,
    })
    .eq("session_id", sessionId)
    .neq("role", "gm");

  if (participantError) {
    throw new Error(`Failed to freeze participants for session ${sessionId}: ${participantError.message}`);
  }

  return data as Session;
}
