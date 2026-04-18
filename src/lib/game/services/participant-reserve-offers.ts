import { attachReplacementToReserveOffer, createReserveOffer, revokeReserveOffer } from "@/lib/db/mutations/participant-reserve-offers";
import {
  getLatestRevokedReserveOfferForTemplate,
  getReserveOfferById,
  getVisibleReserveOfferById,
  listVisibleReserveOffersByParticipantInSession,
  listVisibleReserveOffersByParticipant,
  listVisibleReserveOffersBySession,
} from "@/lib/db/queries/participant-reserve-offers";
import { getParticipantById } from "@/lib/db/queries/participants";
import { getElementTemplateById } from "@/lib/db/queries/element-templates";
import { listSuccessfulElementTemplateIdsForParticipantInSession } from "@/lib/db/queries/element-instances";
import { assertVisibleReserveOfferUniqueness } from "@/lib/game/rules/reserve";
import { isTemplateGloballyUnavailableInSession } from "@/lib/game/services/template-global-availability";
import { getLevelById, getLevelByNumber } from "@/lib/db/queries/levels";
import { getTemplatesForParticipant } from "@/lib/db/queries/element-templates";
import type { ParticipantReserveOffer, ParticipantReserveOfferWithTemplate } from "@/types/domain";

type CreateVisibleReserveOfferInput = {
  participantId: string;
  templateId: string;
  offeredAt?: string;
};

type ReplaceVisibleReserveOfferInput = {
  offerId: string;
  replacementTemplateId: string;
  replacedAt?: string;
};

type ParticipantReserveOfferDependencies = {
  getParticipantById: typeof getParticipantById;
  getElementTemplateById: typeof getElementTemplateById;
  getReserveOfferById: typeof getReserveOfferById;
  getLatestRevokedReserveOfferForTemplate: typeof getLatestRevokedReserveOfferForTemplate;
  getLevelById: typeof getLevelById;
  getLevelByNumber: typeof getLevelByNumber;
  getTemplatesForParticipant: typeof getTemplatesForParticipant;
  listVisibleReserveOffersByParticipant: typeof listVisibleReserveOffersByParticipant;
  listVisibleReserveOffersByParticipantInSession: typeof listVisibleReserveOffersByParticipantInSession;
  listVisibleReserveOffersBySession: typeof listVisibleReserveOffersBySession;
  createReserveOffer: typeof createReserveOffer;
  getVisibleReserveOfferById: typeof getVisibleReserveOfferById;
  revokeReserveOffer: typeof revokeReserveOffer;
  attachReplacementToReserveOffer: typeof attachReplacementToReserveOffer;
  isTemplateGloballyUnavailableInSession: typeof isTemplateGloballyUnavailableInSession;
  listSuccessfulElementTemplateIdsForParticipantInSession: typeof listSuccessfulElementTemplateIdsForParticipantInSession;
};

const defaultDependencies: ParticipantReserveOfferDependencies = {
  getParticipantById,
  getElementTemplateById,
  getReserveOfferById,
  getLatestRevokedReserveOfferForTemplate,
  getLevelById,
  getLevelByNumber,
  getTemplatesForParticipant,
  listVisibleReserveOffersByParticipant,
  listVisibleReserveOffersByParticipantInSession,
  listVisibleReserveOffersBySession,
  createReserveOffer,
  getVisibleReserveOfferById,
  revokeReserveOffer,
  attachReplacementToReserveOffer,
  isTemplateGloballyUnavailableInSession,
  listSuccessfulElementTemplateIdsForParticipantInSession,
};

export const PLAYER_VISIBLE_RESERVE_TARGET = 4;

export type ReserveTopUpResult = {
  participantId: string;
  sessionId: string;
  targetVisible: number;
  visibleBefore: number;
  visibleAfter: number;
  offersCreated: number;
  reason:
    | "topped_up"
    | "already_full"
    | "participant_not_found_or_cross_session"
    | "level_not_found"
    | "no_eligible_replacement_template";
};

export async function listVisibleReserveForParticipant(
  participantId: string,
  sessionId?: string,
): Promise<ParticipantReserveOfferWithTemplate[]> {
  if (sessionId) {
    return listVisibleReserveOffersByParticipantInSession(participantId, sessionId);
  }

  return listVisibleReserveOffersByParticipant(participantId);
}

export async function createVisibleReserveOffer(
  input: CreateVisibleReserveOfferInput,
  dependencies: Partial<ParticipantReserveOfferDependencies> = {},
): Promise<ParticipantReserveOffer> {
  const resolvedDependencies = { ...defaultDependencies, ...dependencies };
  const participant = await resolvedDependencies.getParticipantById(input.participantId);

  if (!participant) {
    throw new Error("participant_not_found");
  }

  const template = await resolvedDependencies.getElementTemplateById(input.templateId);

  if (!template) {
    throw new Error("element_template_not_found");
  }

  if (!template.is_active || !template.can_appear_in_reserve) {
    throw new Error("element_template_not_eligible_for_reserve");
  }

  const templateUnavailable = await resolvedDependencies.isTemplateGloballyUnavailableInSession(
    participant.session_id,
    template.id,
    { requesterParticipantId: participant.id },
  );

  if (templateUnavailable) {
    throw new Error("element_template_globally_unavailable");
  }

  const successfulTemplateIds = await resolvedDependencies.listSuccessfulElementTemplateIdsForParticipantInSession(
    participant.id,
    participant.session_id,
  );
  if (successfulTemplateIds.includes(template.id)) {
    throw new Error("element_template_blacklisted_for_participant_success");
  }

  const visibleOffersInSession = await resolvedDependencies.listVisibleReserveOffersBySession(participant.session_id);

  assertVisibleReserveOfferUniqueness(visibleOffersInSession, {
    sessionId: participant.session_id,
    participantId: participant.id,
    templateId: template.id,
  });

  return resolvedDependencies.createReserveOffer({
    session_id: participant.session_id,
    participant_id: participant.id,
    element_template_id: template.id,
    offered_at: input.offeredAt,
  });
}

export async function removeVisibleReserveOffer(offerId: string, revokedAt?: string): Promise<ParticipantReserveOffer> {
  const existing = await getVisibleReserveOfferById(offerId);

  if (!existing) {
    throw new Error("reserve_offer_not_found_or_already_revoked");
  }

  return revokeReserveOffer(offerId, { revokedAt });
}

export async function replaceVisibleReserveOffer(input: ReplaceVisibleReserveOfferInput): Promise<{
  revoked: ParticipantReserveOffer;
  replacement: ParticipantReserveOffer;
}>
{
  return replaceVisibleReserveOfferWithDependenciesInternal(input, defaultDependencies);
}

export async function replaceVisibleReserveOfferWithDependencies(
  input: ReplaceVisibleReserveOfferInput,
  dependencies: Partial<ParticipantReserveOfferDependencies> = {},
): Promise<{ revoked: ParticipantReserveOffer; replacement: ParticipantReserveOffer }> {
  return replaceVisibleReserveOfferWithDependenciesInternal(input, { ...defaultDependencies, ...dependencies });
}

async function replaceVisibleReserveOfferWithDependenciesInternal(
  input: ReplaceVisibleReserveOfferInput,
  dependencies: ParticipantReserveOfferDependencies,
): Promise<{ revoked: ParticipantReserveOffer; replacement: ParticipantReserveOffer }> {
  const existing = await dependencies.getReserveOfferById(input.offerId);

  if (!existing) {
    throw new Error("reserve_offer_not_found_or_already_revoked");
  }

  const participant = await dependencies.getParticipantById(existing.participant_id);
  if (!participant) {
    throw new Error("participant_not_found");
  }

  const replacementTemplate = await dependencies.getElementTemplateById(input.replacementTemplateId);

  if (!replacementTemplate) {
    throw new Error("element_template_not_found");
  }

  if (!replacementTemplate.is_active || !replacementTemplate.can_appear_in_reserve) {
    throw new Error("element_template_not_eligible_for_reserve");
  }

  const replacement = await createVisibleReserveOffer({
    participantId: participant.id,
    templateId: replacementTemplate.id,
    offeredAt: input.replacedAt,
  }, dependencies);

  const revoked = existing.revoked_at
    ? await dependencies.attachReplacementToReserveOffer(existing.id, replacement.id)
    : await dependencies.revokeReserveOffer(existing.id, {
      revokedAt: input.replacedAt,
      replacedByOfferId: replacement.id,
    });

  return { revoked, replacement };
}

export async function refillVisibleReserveOfferForResolvedElement(
  input: { participantId: string; sessionId: string; consumedTemplateId: string; replacedAt?: string },
  dependencies: Partial<ParticipantReserveOfferDependencies> = {},
): Promise<{
  replaced: boolean;
  replacementOfferId: string | null;
  reason:
    | "replaced"
    | "topped_up"
    | "already_full"
    | "participant_not_found_or_cross_session"
    | "level_not_found"
    | "no_eligible_replacement_template"
    | "consumed_offer_not_found"
    | "replacement_failed";
  debugMessage: string;
}> {
  const resolvedDependencies = { ...defaultDependencies, ...dependencies };
  const participant = await resolvedDependencies.getParticipantById(input.participantId);
  if (!participant || participant.session_id !== input.sessionId) {
    return {
      replaced: false,
      replacementOfferId: null,
      reason: "participant_not_found_or_cross_session",
      debugMessage: "participant is missing or linked to another session",
    };
  }

  const level = participant.current_level_id
    ? await resolvedDependencies.getLevelById(participant.current_level_id)
    : await resolvedDependencies.getLevelByNumber(1);

  if (!level) {
    return {
      replaced: false,
      replacementOfferId: null,
      reason: "level_not_found",
      debugMessage: "participant level is missing; refill cannot compute eligible templates",
    };
  }

  const [eligibleTemplates, visibleOffers] = await Promise.all([
    resolvedDependencies.getTemplatesForParticipant(level.level_number),
    resolvedDependencies.listVisibleReserveOffersByParticipant(participant.id),
  ]);

  const visibleTemplateIds = new Set(visibleOffers.map((offer) => offer.element_template_id));

  const replacementTemplate = eligibleTemplates.find((template) =>
    template.can_appear_in_reserve
    && template.is_active
    && template.id !== input.consumedTemplateId
    && !visibleTemplateIds.has(template.id));

  const consumedOffer = await resolvedDependencies.getLatestRevokedReserveOfferForTemplate(
    participant.id,
    input.sessionId,
    input.consumedTemplateId,
  );
  let primaryRefill: {
    replaced: boolean;
    replacementOfferId: string | null;
    reason: "replaced" | "no_eligible_replacement_template" | "consumed_offer_not_found" | "replacement_failed";
    debugMessage: string;
  } = {
    replaced: false,
    replacementOfferId: null,
    reason: replacementTemplate ? "consumed_offer_not_found" : "no_eligible_replacement_template",
    debugMessage: replacementTemplate
      ? "no consumed reserve offer found for the resolved template"
      : "no reserve-eligible replacement template matches current participant constraints",
  };

  if (replacementTemplate && consumedOffer) {
    try {
      const { replacement } = await replaceVisibleReserveOfferWithDependencies({
        offerId: consumedOffer.id,
        replacementTemplateId: replacementTemplate.id,
        replacedAt: input.replacedAt,
      }, resolvedDependencies);

      primaryRefill = {
        replaced: true,
        replacementOfferId: replacement.id,
        reason: "replaced",
        debugMessage: "replacement offer created successfully",
      };
    } catch (error) {
      primaryRefill = {
        replaced: false,
        replacementOfferId: null,
        reason: "replacement_failed",
        debugMessage: error instanceof Error ? error.message : "unknown replacement error",
      };
    }
  }

  const topUp = await topUpVisibleReserveOffersForParticipant(
    {
      participantId: input.participantId,
      sessionId: input.sessionId,
      targetVisible: PLAYER_VISIBLE_RESERVE_TARGET,
    },
    resolvedDependencies,
  );

  if (primaryRefill.replaced) {
    return primaryRefill;
  }

  if (topUp.offersCreated > 0 || topUp.reason === "already_full") {
    return {
      replaced: true,
      replacementOfferId: null,
      reason: topUp.reason,
      debugMessage: `reserve topped up to ${topUp.visibleAfter}/${topUp.targetVisible}`,
    };
  }

  return primaryRefill;
}

export async function topUpVisibleReserveOffersForParticipant(
  input: { participantId: string; sessionId: string; targetVisible?: number },
  dependencies: Partial<ParticipantReserveOfferDependencies> = {},
): Promise<ReserveTopUpResult> {
  const resolvedDependencies = { ...defaultDependencies, ...dependencies };
  const targetVisible = input.targetVisible ?? PLAYER_VISIBLE_RESERVE_TARGET;
  const participant = await resolvedDependencies.getParticipantById(input.participantId);

  if (!participant || participant.session_id !== input.sessionId) {
    return {
      participantId: input.participantId,
      sessionId: input.sessionId,
      targetVisible,
      visibleBefore: 0,
      visibleAfter: 0,
      offersCreated: 0,
      reason: "participant_not_found_or_cross_session",
    };
  }

  const level = participant.current_level_id
    ? await resolvedDependencies.getLevelById(participant.current_level_id)
    : await resolvedDependencies.getLevelByNumber(1);

  if (!level) {
    return {
      participantId: participant.id,
      sessionId: input.sessionId,
      targetVisible,
      visibleBefore: 0,
      visibleAfter: 0,
      offersCreated: 0,
      reason: "level_not_found",
    };
  }

  const [eligibleTemplates, visibleOffers, successfulTemplateIds] = await Promise.all([
    resolvedDependencies.getTemplatesForParticipant(level.level_number),
    resolvedDependencies.listVisibleReserveOffersByParticipant(participant.id),
    resolvedDependencies.listSuccessfulElementTemplateIdsForParticipantInSession(participant.id, input.sessionId),
  ]);

  const visibleTemplateIds = new Set(visibleOffers.map((offer) => offer.element_template_id));
  const successfulTemplateIdSet = new Set(successfulTemplateIds);
  let visibleCount = visibleOffers.length;
  const visibleBefore = visibleCount;
  let offersCreated = 0;

  if (visibleCount >= targetVisible) {
    return {
      participantId: participant.id,
      sessionId: input.sessionId,
      targetVisible,
      visibleBefore,
      visibleAfter: visibleCount,
      offersCreated,
      reason: "already_full",
    };
  }

  const refillCandidates = eligibleTemplates
    .filter((template) => template.is_active && template.can_appear_in_reserve)
    .sort((a, b) => a.code.localeCompare(b.code) || a.id.localeCompare(b.id));

  for (const candidate of refillCandidates) {
    if (visibleCount >= targetVisible) {
      break;
    }

    if (visibleTemplateIds.has(candidate.id) || successfulTemplateIdSet.has(candidate.id)) {
      continue;
    }

    try {
      await createVisibleReserveOffer(
        {
          participantId: participant.id,
          templateId: candidate.id,
        },
        resolvedDependencies,
      );
      visibleTemplateIds.add(candidate.id);
      visibleCount += 1;
      offersCreated += 1;
    } catch {
      continue;
    }
  }

  return {
    participantId: participant.id,
    sessionId: input.sessionId,
    targetVisible,
    visibleBefore,
    visibleAfter: visibleCount,
    offersCreated,
    reason: offersCreated > 0 ? "topped_up" : "no_eligible_replacement_template",
  };
}
