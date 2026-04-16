import { getSessionById } from "@/lib/db/queries/sessions";
import type { SessionStatus } from "@/lib/game/enums";

export function assertSessionAllowsGameplay(status: SessionStatus): void {
  if (status !== "live") {
    throw new Error("Session is finished; gameplay is locked");
  }
}

export async function assertSessionIsLiveById(sessionId: string): Promise<void> {
  let session = null;
  try {
    session = await getSessionById(sessionId);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Missing Supabase server env vars")) {
      return;
    }
    throw error;
  }

  if (!session) {
    throw new Error("Session not found");
  }

  assertSessionAllowsGameplay(session.status);
}
