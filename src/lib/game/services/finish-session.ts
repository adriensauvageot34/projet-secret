import { finishSession } from "@/lib/db/mutations/sessions";
import { getSessionById } from "@/lib/db/queries/sessions";
import type { Session } from "@/types/domain";

type FinishSessionDeps = {
  getSessionById: typeof getSessionById;
  finishSession: typeof finishSession;
};

const defaultDeps: FinishSessionDeps = {
  getSessionById,
  finishSession,
};

export async function finishSessionForMvp(sessionId: string, deps: FinishSessionDeps = defaultDeps): Promise<Session> {
  const session = await deps.getSessionById(sessionId);

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.status === "finished") {
    return session;
  }

  if (session.status === "archived") {
    throw new Error("Archived sessions cannot be finished");
  }

  return deps.finishSession(sessionId);
}
