import { createScoreEvent, type CreateScoreEventInput } from "@/lib/game/services/score-events";

export async function applyScoreEvent(input: CreateScoreEventInput) {
  return createScoreEvent(input);
}
