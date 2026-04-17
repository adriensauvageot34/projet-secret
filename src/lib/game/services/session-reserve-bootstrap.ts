import { createVisibleReserveOffer } from "@/lib/game/services/participant-reserve-offers";
import { getSessionById } from "@/lib/db/queries/sessions";
import { getActiveTemplates } from "@/lib/db/queries/element-templates";
import { getLevelById } from "@/lib/db/queries/levels";
import { listPlayerParticipantsBySession } from "@/lib/db/queries/participants";
import { listVisibleReserveOffersBySession } from "@/lib/db/queries/participant-reserve-offers";
import { listSuccessfulElementTemplateIdsForParticipantInSession } from "@/lib/db/queries/element-instances";
import { listGloballyUnavailableTemplateIdsForSession } from "@/lib/game/services/template-global-availability";
import type { ElementTemplate, Level, Participant, Session } from "@/types/domain";

type BootstrapBucketType = "mission" | "constraint";

type BootstrapDependencies = {
  getSessionById: typeof getSessionById;
  getActiveTemplates: typeof getActiveTemplates;
  getLevelById: typeof getLevelById;
  listPlayerParticipantsBySession: typeof listPlayerParticipantsBySession;
  listVisibleReserveOffersBySession: typeof listVisibleReserveOffersBySession;
  listSuccessfulElementTemplateIdsForParticipantInSession: typeof listSuccessfulElementTemplateIdsForParticipantInSession;
  listGloballyUnavailableTemplateIdsForSession: typeof listGloballyUnavailableTemplateIdsForSession;
  createVisibleReserveOffer: typeof createVisibleReserveOffer;
};

const defaultDependencies: BootstrapDependencies = {
  getSessionById,
  getActiveTemplates,
  getLevelById,
  listPlayerParticipantsBySession,
  listVisibleReserveOffersBySession,
  listSuccessfulElementTemplateIdsForParticipantInSession,
  listGloballyUnavailableTemplateIdsForSession,
  createVisibleReserveOffer,
};

export type ReserveBootstrapShortage = {
  bucket: `${BootstrapBucketType}:${number}`;
  requested: number;
  assigned: number;
  missing: number;
  candidateTemplates: number;
};

export type ReserveBootstrapResult = {
  sessionId: string;
  offersCreated: number;
  shortages: ReserveBootstrapShortage[];
};

type BootstrapParticipantState = {
  participant: Participant;
  level: Level;
  successfulTemplateIds: Set<string>;
  visibleTemplateIds: Set<string>;
  visibleByBucket: Map<string, number>;
};

function getDifficultyCap(level: Level, elementType: BootstrapBucketType): number {
  return elementType === "mission" ? level.mission_difficulty_max : level.constraint_difficulty_max;
}

function getVisiblePerDifficultyLimit(session: Session, level: Level, elementType: BootstrapBucketType): number {
  const levelLimit = elementType === "mission"
    ? level.missions_visible_per_difficulty
    : level.constraints_visible_per_difficulty;

  return Math.min(session.reserve_per_difficulty, levelLimit);
}

function buildBucketKey(elementType: BootstrapBucketType, difficulty: number): `${BootstrapBucketType}:${number}` {
  return `${elementType}:${difficulty}`;
}

function getVisibleCountForBucket(state: BootstrapParticipantState, bucketKey: string): number {
  return state.visibleByBucket.get(bucketKey) ?? 0;
}

export async function bootstrapInitialSessionReserves(
  sessionId: string,
  dependencies: BootstrapDependencies = defaultDependencies,
): Promise<ReserveBootstrapResult> {
  const session = await dependencies.getSessionById(sessionId);

  if (!session) {
    throw new Error("session_not_found");
  }

  const participants = (await dependencies.listPlayerParticipantsBySession(sessionId))
    .sort((a, b) => a.display_name.localeCompare(b.display_name) || a.id.localeCompare(b.id));

  const [allTemplates, visibleOffers, globallyUnavailableTemplateIds] = await Promise.all([
    dependencies.getActiveTemplates(),
    dependencies.listVisibleReserveOffersBySession(sessionId),
    dependencies.listGloballyUnavailableTemplateIdsForSession(sessionId),
  ]);

  const createdTemplateIds = new Set<string>(visibleOffers.map((offer) => offer.element_template_id));

  const levels = new Map<string, Level>();
  const participantStates: BootstrapParticipantState[] = [];

  for (const participant of participants) {
    if (!participant.current_level_id) {
      continue;
    }

    let level = levels.get(participant.current_level_id);

    if (!level) {
      const loaded = await dependencies.getLevelById(participant.current_level_id);
      if (!loaded) {
        continue;
      }

      levels.set(participant.current_level_id, loaded);
      level = loaded;
    }

    const successfulTemplateIds = new Set(
      await dependencies.listSuccessfulElementTemplateIdsForParticipantInSession(participant.id, sessionId),
    );

    const visibleForParticipant = visibleOffers.filter((offer) => offer.participant_id === participant.id);
    const visibleByBucket = new Map<string, number>();

    for (const offer of visibleForParticipant) {
      const template = allTemplates.find((candidate) => candidate.id === offer.element_template_id);

      if (!template || (template.element_type !== "mission" && template.element_type !== "constraint")) {
        continue;
      }

      const bucketKey = buildBucketKey(template.element_type, template.difficulty);
      visibleByBucket.set(bucketKey, (visibleByBucket.get(bucketKey) ?? 0) + 1);
    }

    participantStates.push({
      participant,
      level,
      successfulTemplateIds,
      visibleTemplateIds: new Set(visibleForParticipant.map((offer) => offer.element_template_id)),
      visibleByBucket,
    });
  }

  const templates = allTemplates
    .filter((template) => template.can_appear_in_reserve)
    .filter((template) => (template.element_type === "mission" || template.element_type === "constraint"))
    .filter((template) => !globallyUnavailableTemplateIds.has(template.id))
    .sort((a, b) => a.code.localeCompare(b.code) || a.id.localeCompare(b.id));

  const buckets = new Set<`${BootstrapBucketType}:${number}`>();

  for (const state of participantStates) {
    for (const elementType of ["mission", "constraint"] as const) {
      const maxDifficulty = getDifficultyCap(state.level, elementType);
      for (let difficulty = 1; difficulty <= maxDifficulty; difficulty += 1) {
        buckets.add(buildBucketKey(elementType, difficulty));
      }
    }
  }

  const bucketList = Array.from(buckets).sort();
  const shortages: ReserveBootstrapShortage[] = [];
  let offersCreated = 0;

  for (const bucket of bucketList) {
    const [elementType, difficultyRaw] = bucket.split(":") as [BootstrapBucketType, string];
    const difficulty = Number(difficultyRaw);

    const bucketTemplates = templates.filter(
      (template) => template.element_type === elementType && template.difficulty === difficulty,
    );

    const participantNeeds = participantStates
      .map((state) => {
        const maxDifficulty = getDifficultyCap(state.level, elementType);

        if (difficulty > maxDifficulty) {
          return { state, missing: 0 };
        }

        const target = getVisiblePerDifficultyLimit(session, state.level, elementType);
        const current = getVisibleCountForBucket(state, bucket);
        return { state, missing: Math.max(0, target - current) };
      })
      .filter((entry) => entry.missing > 0);

    if (participantNeeds.length === 0) {
      continue;
    }

    let bucketAssigned = 0;
    const bucketRequested = participantNeeds.reduce((sum, entry) => sum + entry.missing, 0);

    let round = 0;
    while (participantNeeds.some((entry) => entry.missing > 0)) {
      let assignedInRound = 0;

      for (let index = 0; index < participantNeeds.length; index += 1) {
        const entry = participantNeeds[(index + round) % participantNeeds.length];

        if (entry.missing <= 0) {
          continue;
        }

        const candidate = bucketTemplates.find((template) => {
          if (createdTemplateIds.has(template.id)) {
            return false;
          }

          if (entry.state.successfulTemplateIds.has(template.id)) {
            return false;
          }

          if (entry.state.visibleTemplateIds.has(template.id)) {
            return false;
          }

          return true;
        });

        if (!candidate) {
          continue;
        }

        await dependencies.createVisibleReserveOffer({
          participantId: entry.state.participant.id,
          templateId: candidate.id,
        });

        createdTemplateIds.add(candidate.id);
        entry.state.visibleTemplateIds.add(candidate.id);
        entry.state.visibleByBucket.set(bucket, getVisibleCountForBucket(entry.state, bucket) + 1);
        entry.missing -= 1;
        offersCreated += 1;
        bucketAssigned += 1;
        assignedInRound += 1;
      }

      if (assignedInRound === 0) {
        break;
      }

      round += 1;
    }

    if (bucketAssigned < bucketRequested) {
      shortages.push({
        bucket,
        requested: bucketRequested,
        assigned: bucketAssigned,
        missing: bucketRequested - bucketAssigned,
        candidateTemplates: bucketTemplates.length,
      });
    }
  }

  return {
    sessionId,
    offersCreated,
    shortages,
  };
}
