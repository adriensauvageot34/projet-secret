import { purchaseAdvantageForParticipant } from "@/lib/game/services/advantage-instance-service";

export async function buyAdvantage(input: {
  templateId: string;
  participantId: string;
  gmNotes?: string;
}) {
  const instance = await purchaseAdvantageForParticipant(input);
  return { ok: true, instance };
}
