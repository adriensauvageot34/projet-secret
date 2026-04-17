type VisibleReserveOffer = {
  session_id: string;
  participant_id: string;
  element_template_id: string;
};

type NewVisibleReserveOffer = {
  sessionId: string;
  participantId: string;
  templateId: string;
};

export function assertVisibleReserveOfferUniqueness(
  existingOffers: VisibleReserveOffer[],
  nextOffer: NewVisibleReserveOffer,
): void {
  const sameSessionOffers = existingOffers.filter((offer) => offer.session_id === nextOffer.sessionId);

  const conflictOnOtherParticipant = sameSessionOffers.some(
    (offer) =>
      offer.element_template_id === nextOffer.templateId &&
      offer.participant_id !== nextOffer.participantId,
  );

  if (conflictOnOtherParticipant) {
    throw new Error("reserve_template_already_visible_for_other_participant");
  }

  const duplicateForParticipant = sameSessionOffers.some(
    (offer) =>
      offer.element_template_id === nextOffer.templateId &&
      offer.participant_id === nextOffer.participantId,
  );

  if (duplicateForParticipant) {
    throw new Error("reserve_template_already_visible_for_participant");
  }
}
