import { createTokenEvent, type CreateTokenEventInput } from "@/lib/game/services/token-events";

export async function applyTokenEvent(input: CreateTokenEventInput) {
  const event = await createTokenEvent(input);
  return { ok: true, event };
}
