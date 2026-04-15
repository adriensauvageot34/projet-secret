import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Session } from "@/types/domain";

const CURRENT_SESSION_ORDER = ["live", "preparation", "finished", "archived"] as const;

export async function listSessions(): Promise<Session[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list sessions: ${error.message}`);
  }

  return (data as Session[] | null) ?? [];
}

export async function getCurrentSession(): Promise<Session | null> {
  const sessions = await listSessions();

  for (const status of CURRENT_SESSION_ORDER) {
    const match = sessions.find((session) => session.status === status);

    if (match) {
      return match;
    }
  }

  return sessions[0] ?? null;
}
