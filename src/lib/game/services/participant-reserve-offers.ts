import { createReserveOffer, revokeReserveOffer } from "@/lib/db/mutations/participant-reserve-offers";
import {
  getVisibleReserveOfferById,
  listVisibleReserveOffersByParticipant,
  listVisibleReserveOffersBySession,
} from "@/lib/db/queries/participant-reserve-offers";
import { getParticipantById } from "@/lib/db/queries/participants";
import { getElementTemplateById } from "@/lib/db/queries/element-templates";
import { listSuccessfulElementTemplateIdsForParticipantInSession } from "@/lib/db/queries/element-instances";
import { assertVisibleReserveOfferUniqueness } from "@/lib/game/rules/reserve";
import { isTemplateGloballyUnavailableInSession } from "@/lib/game/services/template-global-availability";
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
  listVisibleReserveOffersBySession: typeof listVisibleReserveOffersBySession;
  createReserveOffer: typeof createReserveOffer;
  getVisibleReserveOfferById: typeof getVisibleReserveOfferById;
  revokeReserveOffer: typeof revokeReserveOffer;
  isTemplateGloballyUnavailableInSession: typeof isTemplateGloballyUnavailableInSession;
  listSuccessfulElementTemplateIdsForParticipantInSession: typeof listSuccessfulElementTemplateIdsForParticipantInSession;
};

const defaultDependencies: ParticipantReserveOfferDependencies = {
  getParticipantById,
  getElementTemplateById,
  listVisibleReserveOffersBySession,
  createReserveOffer,
  getVisibleReserveOfferById,
  revokeReserveOffer,
  isTemplateGloballyUnavailableInSession,
  listSuccessfulElementTemplateIdsForParticipantInSession,
};

export async function listVisibleReserveForParticipant(participantId: string): Promise<ParticipantReserveOfferWithTemplate[]> {
  return listVisibleReserveOffersByParticipant(participantId);
}

export async function createVisibleReserveOffer(
  input: CreateVisibleReserveOfferInput,
  dependencies: ParticipantReserveOfferDependencies = defaultDependencies,
): Promise<ParticipantReserveOffer> {
  const participant = await dependencies.getParticipantById(input.participantId);

  if (!participant) {
    throw new Error("participant_not_found");
  }

  const template = await dependencies.getElementTemplateById(input.templateId);

  if (!template) {
    throw new Error("element_template_not_found");
  }

  if (!template.is_active || !template.can_appear_in_reserve) {
    throw new Error("element_template_not_eligible_for_reserve");
  }

  const templateUnavailable = await dependencies.isTemplateGloballyUnavailableInSession(
    participant.session_id,
    template.id,
    { requesterParticipantId: participant.id },
  );

  if (templateUnavailable) {
    throw new Error("element_template_globally_unavailable");
  }

  const successfulTemplateIds = await dependencies.listSuccessfulElementTemplateIdsForParticipantInSession(
    participant.id,
    participant.session_id,
  );
  if (successfulTemplateIds.includes(template.id)) {
    throw new Error("element_template_blacklisted_for_participant_success");
  }

  const visibleOffersInSession = await dependencies.listVisibleReserveOffersBySession(participant.session_id);

  assertVisibleReserveOfferUniqueness(visibleOffersInSession, {
    sessionId: participant.session_id,
    participantId: participant.id,
    templateId: template.id,
  });

  return dependencies.createReserveOffer({
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
  dependencies: ParticipantReserveOfferDependencies = defaultDependencies,
): Promise<{ revoked: ParticipantReserveOffer; replacement: ParticipantReserveOffer }> {
  return replaceVisibleReserveOfferWithDependenciesInternal(input, dependencies);
}

async function replaceVisibleReserveOfferWithDependenciesInternal(
  input: ReplaceVisibleReserveOfferInput,
  dependencies: ParticipantReserveOfferDependencies,
): Promise<{ revoked: ParticipantReserveOffer; replacement: ParticipantReserveOffer }> {
  const existing = await dependencies.getVisibleReserveOfferById(input.offerId);

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

  const revoked = await dependencies.revokeReserveOffer(existing.id, {
    revokedAt: input.replacedAt,
    replacedByOfferId: replacement.id,
  });

  return { revoked, replacement };
}
