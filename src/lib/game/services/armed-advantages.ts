import { listScoreEvents } from "@/lib/db/queries/score-events";
import { getParticipantActiveAdvantages } from "@/lib/db/queries/advantage-instances";
import { consumeAdvantageInstanceUse } from "@/lib/db/mutations/advantage-instances";
import { createScoreEvent } from "@/lib/game/services/score-events";
import type { AdvantageInstanceWithTemplate, ScoreEventDetail } from "@/types/domain";

export const ARMED_ADVANTAGE_EFFECT_CODES = new Set([
  "free_skip",
  "next_correct_accusation_bonus_3",
  "double_next_mission_value",
]);

type ConsumeArmedAdvantageDeps = {
  getParticipantActiveAdvantages: (participantId: string) => Promise<AdvantageInstanceWithTemplate[]>;
  consumeAdvantageInstanceUse: typeof consumeAdvantageInstanceUse;
};

const defaultConsumeArmedAdvantageDeps: ConsumeArmedAdvantageDeps = {
  getParticipantActiveAdvantages,
  consumeAdvantageInstanceUse,
};

export async function consumeFirstArmedAdvantage(input: {
  participantId: string;
  effectCode: string;
}, deps: ConsumeArmedAdvantageDeps = defaultConsumeArmedAdvantageDeps): Promise<AdvantageInstanceWithTemplate | null> {
  const activeAdvantages = await deps.getParticipantActiveAdvantages(input.participantId);
  const armed = activeAdvantages.find((advantage) => advantage.template.effect_code === input.effectCode);

  if (!armed) {
    return null;
  }

  await deps.consumeAdvantageInstanceUse(armed.id, {
    gm_notes: `consommation_auto:${input.effectCode}`,
  });

  return armed;
}

type CancelSkipPenaltyDeps = {
  listScoreEvents: typeof listScoreEvents;
  createScoreEvent: typeof createScoreEvent;
  consumeAdvantageInstanceUse: typeof consumeAdvantageInstanceUse;
};

const defaultCancelSkipPenaltyDeps: CancelSkipPenaltyDeps = {
  listScoreEvents,
  createScoreEvent,
  consumeAdvantageInstanceUse,
};

function pickRelevantSkipPenalty(events: ScoreEventDetail[]): ScoreEventDetail | null {
  return events.find((event) => event.event_type === "skip_penalty" && event.delta_points < 0) ?? null;
}

export async function getLatestCompensableSkipPenalty(
  participantId: string,
  deps: Pick<CancelSkipPenaltyDeps, "listScoreEvents"> = defaultCancelSkipPenaltyDeps,
): Promise<ScoreEventDetail | null> {
  const skipPenalties = await deps.listScoreEvents({
    participantId,
    eventType: "skip_penalty",
  });

  return pickRelevantSkipPenalty(skipPenalties);
}

export async function compensateLatestSkipPenalty(input: {
  advantageInstanceId: string;
  participantId: string;
  sessionId: string;
}, deps: CancelSkipPenaltyDeps = defaultCancelSkipPenaltyDeps): Promise<void> {
  const latestSkipPenalty = await getLatestCompensableSkipPenalty(input.participantId, deps);

  if (!latestSkipPenalty) {
    throw new Error("Aucun malus de skip à compenser pour le moment.");
  }

  await deps.createScoreEvent({
    participantId: input.participantId,
    sessionId: input.sessionId,
    eventType: "manual_adjustment",
    deltaPoints: Math.abs(latestSkipPenalty.delta_points),
    notes: "Compensation malus skip (avantage)",
    relatedElementInstanceId: latestSkipPenalty.related_element_instance_id,
  });

  await deps.consumeAdvantageInstanceUse(input.advantageInstanceId, {
    gm_notes: "consommation_auto:cancel_skip_penalty",
  });
}
