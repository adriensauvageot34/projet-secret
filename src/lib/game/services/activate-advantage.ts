import { activateParticipantAdvantage } from "@/lib/game/services/advantage-instance-service";

export async function activateAdvantage(input: {
  advantageInstanceId: string;
  targetParticipantId?: string | null;
  targetElementInstanceId?: string | null;
}) {
  const instance = await activateParticipantAdvantage(input);
  return { ok: true, instance };
}
