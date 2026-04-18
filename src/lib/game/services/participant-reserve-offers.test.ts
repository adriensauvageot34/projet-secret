import test from "node:test";
import assert from "node:assert/strict";
import {
  createVisibleReserveOffer,
  refillVisibleReserveOfferForResolvedElement,
  replaceVisibleReserveOfferWithDependencies,
  topUpVisibleReserveOffersForParticipant,
} from "@/lib/game/services/participant-reserve-offers";
import type { ElementTemplate, Participant, ParticipantReserveOffer } from "@/types/domain";

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: "participant-a",
    session_id: "session-1",
    player_id: "player-a",
    public_slug: "participant-a",
    current_level_id: null,
    display_name: "A",
    role: "player",
    current_status: "active",
    current_score: 0,
    current_tokens: 0,
    combo_streak_current: 0,
    mission_slot_max: 2,
    constraint_slot_max: 2,
    completed_elements_count: 0,
    waiting_slot_count: 0,
    blocked_slot_count: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeTemplate(overrides: Partial<ElementTemplate> = {}): ElementTemplate {
  return {
    id: "template-1",
    code: "TMP-1",
    name: "Template",
    element_type: "mission",
    category: "social",
    difficulty: 1,
    base_points: 1,
    duration_seconds: 300,
    skip_unlock_rule: "one_third",
    validation_mode: "auto",
    proof_required: false,
    can_be_fake: false,
    can_appear_in_reserve: true,
    is_active: true,
    player_display_text: "",
    ui_tag_1: "",
    ui_tag_2: "",
    success_button_label: "Réussi",
    failure_button_label: "Raté",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeOffer(overrides: Partial<ParticipantReserveOffer> = {}): ParticipantReserveOffer {
  return {
    id: "offer-1",
    session_id: "session-1",
    participant_id: "participant-a",
    element_template_id: "template-1",
    offered_at: "2026-01-01T10:00:00.000Z",
    revoked_at: null,
    replaced_by_offer_id: null,
    created_at: "2026-01-01T10:00:00.000Z",
    updated_at: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

test("reserve offer creation: template active chez A n'est pas proposé à B", async () => {
  await assert.rejects(
    () => createVisibleReserveOffer(
      { participantId: "participant-b", templateId: "template-1" },
      {
        getParticipantById: async () => makeParticipant({ id: "participant-b", display_name: "B" }),
        getElementTemplateById: async () => makeTemplate({ id: "template-1" }),
        listVisibleReserveOffersBySession: async () => [],
        createReserveOffer: async () => makeOffer({ participant_id: "participant-b" }),
        getVisibleReserveOfferById: async () => null,
        revokeReserveOffer: async () => makeOffer(),
        isTemplateGloballyUnavailableInSession: async () => true,
        listSuccessfulElementTemplateIdsForParticipantInSession: async () => [],
      },
    ),
    /element_template_globally_unavailable/,
  );
});

test("reserve offer replacement: template encore bloquant chez A n'est pas proposé à B", async () => {
  await assert.rejects(
    () => replaceVisibleReserveOfferWithDependencies(
      { offerId: "offer-b", replacementTemplateId: "template-1" },
      {
        getVisibleReserveOfferById: async () => makeOffer({ id: "offer-b", participant_id: "participant-b" }),
        getReserveOfferById: async () => makeOffer({ id: "offer-b", participant_id: "participant-b" }),
        getParticipantById: async () => makeParticipant({ id: "participant-b", display_name: "B" }),
        getElementTemplateById: async () => makeTemplate({ id: "template-1" }),
        listVisibleReserveOffersBySession: async () => [],
        createReserveOffer: async () => makeOffer({ id: "offer-new", participant_id: "participant-b" }),
        revokeReserveOffer: async () => makeOffer({ id: "offer-b", participant_id: "participant-b", revoked_at: "2026-01-01T10:01:00.000Z" }),
        isTemplateGloballyUnavailableInSession: async () => true,
        listSuccessfulElementTemplateIdsForParticipantInSession: async () => [],
      },
    ),
    /element_template_globally_unavailable/,
  );
});

test("reserve offer creation: template redevient éligible quand sorti du flux", async () => {
  const created = await createVisibleReserveOffer(
    { participantId: "participant-b", templateId: "template-1" },
    {
      getParticipantById: async () => makeParticipant({ id: "participant-b", display_name: "B" }),
      getElementTemplateById: async () => makeTemplate({ id: "template-1" }),
      listVisibleReserveOffersBySession: async () => [],
      createReserveOffer: async (payload) =>
        makeOffer({
          id: "offer-created",
          participant_id: payload.participant_id,
          element_template_id: payload.element_template_id,
          offered_at: payload.offered_at,
        }),
      getVisibleReserveOfferById: async () => null,
      revokeReserveOffer: async () => makeOffer(),
      isTemplateGloballyUnavailableInSession: async () => false,
      listSuccessfulElementTemplateIdsForParticipantInSession: async () => [],
    },
  );

  assert.equal(created.id, "offer-created");
  assert.equal(created.participant_id, "participant-b");
});

test("reserve offer creation: succès chez A => template blacklisté chez A", async () => {
  await assert.rejects(
    () => createVisibleReserveOffer(
      { participantId: "participant-a", templateId: "template-1" },
      {
        getParticipantById: async () => makeParticipant({ id: "participant-a", display_name: "A" }),
        getElementTemplateById: async () => makeTemplate({ id: "template-1" }),
        listVisibleReserveOffersBySession: async () => [],
        createReserveOffer: async () => makeOffer(),
        getVisibleReserveOfferById: async () => null,
        revokeReserveOffer: async () => makeOffer(),
        isTemplateGloballyUnavailableInSession: async () => false,
        listSuccessfulElementTemplateIdsForParticipantInSession: async (participantId) =>
          participantId === "participant-a" ? ["template-1"] : [],
      },
    ),
    /element_template_blacklisted_for_participant_success/,
  );
});

test("reserve offer creation: succès chez A => template toujours possible pour B", async () => {
  const created = await createVisibleReserveOffer(
    { participantId: "participant-b", templateId: "template-1" },
    {
      getParticipantById: async () => makeParticipant({ id: "participant-b", display_name: "B" }),
      getElementTemplateById: async () => makeTemplate({ id: "template-1" }),
      listVisibleReserveOffersBySession: async () => [],
      createReserveOffer: async (payload) => makeOffer({ id: "offer-b", participant_id: payload.participant_id }),
      getVisibleReserveOfferById: async () => null,
      revokeReserveOffer: async () => makeOffer(),
      isTemplateGloballyUnavailableInSession: async () => false,
      listSuccessfulElementTemplateIdsForParticipantInSession: async (participantId) =>
        participantId === "participant-a" ? ["template-1"] : [],
    },
  );

  assert.equal(created.id, "offer-b");
  assert.equal(created.participant_id, "participant-b");
});

test("reserve offer creation: fail chez A => template peut revenir chez A", async () => {
  const created = await createVisibleReserveOffer(
    { participantId: "participant-a", templateId: "template-1" },
    {
      getParticipantById: async () => makeParticipant({ id: "participant-a", display_name: "A" }),
      getElementTemplateById: async () => makeTemplate({ id: "template-1" }),
      listVisibleReserveOffersBySession: async () => [],
      createReserveOffer: async (payload) => makeOffer({ id: "offer-fail", participant_id: payload.participant_id }),
      getVisibleReserveOfferById: async () => null,
      revokeReserveOffer: async () => makeOffer(),
      isTemplateGloballyUnavailableInSession: async () => false,
      listSuccessfulElementTemplateIdsForParticipantInSession: async () => [],
    },
  );

  assert.equal(created.id, "offer-fail");
});

test("reserve offer creation: skipped chez A => template peut revenir chez A", async () => {
  const created = await createVisibleReserveOffer(
    { participantId: "participant-a", templateId: "template-1" },
    {
      getParticipantById: async () => makeParticipant({ id: "participant-a", display_name: "A" }),
      getElementTemplateById: async () => makeTemplate({ id: "template-1" }),
      listVisibleReserveOffersBySession: async () => [],
      createReserveOffer: async (payload) => makeOffer({ id: "offer-skipped", participant_id: payload.participant_id }),
      getVisibleReserveOfferById: async () => null,
      revokeReserveOffer: async () => makeOffer(),
      isTemplateGloballyUnavailableInSession: async () => false,
      listSuccessfulElementTemplateIdsForParticipantInSession: async () => [],
    },
  );

  assert.equal(created.id, "offer-skipped");
});

test("reserve refill: succès => remplacement immédiat via offre consommée", async () => {
  const result = await refillVisibleReserveOfferForResolvedElement(
    {
      participantId: "participant-a",
      sessionId: "session-1",
      consumedTemplateId: "template-consumed",
    },
    {
      getParticipantById: async () => makeParticipant({ id: "participant-a" }),
      getElementTemplateById: async (templateId: string) => makeTemplate({ id: templateId }),
      getReserveOfferById: async () => makeOffer({ id: "offer-consumed", revoked_at: "2026-01-01T10:01:00.000Z" }),
      getLatestRevokedReserveOfferForTemplate: async () => makeOffer({ id: "offer-consumed", element_template_id: "template-consumed", revoked_at: "2026-01-01T10:01:00.000Z" }),
      getLevelById: async () => ({ id: "level-1", level_number: 1, label: "L1", min_score: 0, max_score: 99, shop_tier_max: 1, mission_difficulty_max: 2, constraint_difficulty_max: 2, fake_elements_unlocked: false, missions_visible_per_difficulty: 1, constraints_visible_per_difficulty: 1, privilege_text: "", visible_order: 1, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }),
      getLevelByNumber: async () => ({ id: "level-1", level_number: 1, label: "L1", min_score: 0, max_score: 99, shop_tier_max: 1, mission_difficulty_max: 2, constraint_difficulty_max: 2, fake_elements_unlocked: false, missions_visible_per_difficulty: 1, constraints_visible_per_difficulty: 1, privilege_text: "", visible_order: 1, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }),
      getTemplatesForParticipant: async () => [
        makeTemplate({ id: "template-consumed" }),
        makeTemplate({ id: "template-replacement", code: "TMP-2" }),
      ],
      listVisibleReserveOffersByParticipant: async () => [],
      listVisibleReserveOffersBySession: async () => [],
      createReserveOffer: async (payload) => makeOffer({ id: "offer-new", participant_id: payload.participant_id, element_template_id: payload.element_template_id }),
      getVisibleReserveOfferById: async () => null,
      revokeReserveOffer: async () => makeOffer({ id: "offer-consumed", revoked_at: "2026-01-01T10:01:00.000Z", replaced_by_offer_id: "offer-new" }),
      attachReplacementToReserveOffer: async () => makeOffer({ id: "offer-consumed", revoked_at: "2026-01-01T10:01:00.000Z", replaced_by_offer_id: "offer-new" }),
      isTemplateGloballyUnavailableInSession: async () => false,
      listSuccessfulElementTemplateIdsForParticipantInSession: async () => [],
    },
  );

  assert.equal(result.replaced, true);
  assert.equal(result.replacementOfferId, "offer-new");
  assert.equal(result.reason, "replaced");
});

test("reserve refill: aucun candidat => pas de crash", async () => {
  const result = await refillVisibleReserveOfferForResolvedElement(
    {
      participantId: "participant-a",
      sessionId: "session-1",
      consumedTemplateId: "template-consumed",
    },
    {
      getParticipantById: async () => makeParticipant({ id: "participant-a" }),
      getElementTemplateById: async (templateId: string) => makeTemplate({ id: templateId }),
      getReserveOfferById: async () => makeOffer({ id: "offer-consumed", revoked_at: "2026-01-01T10:01:00.000Z" }),
      getLatestRevokedReserveOfferForTemplate: async () => makeOffer({ id: "offer-consumed", element_template_id: "template-consumed", revoked_at: "2026-01-01T10:01:00.000Z" }),
      getLevelById: async () => ({ id: "level-1", level_number: 1, label: "L1", min_score: 0, max_score: 99, shop_tier_max: 1, mission_difficulty_max: 2, constraint_difficulty_max: 2, fake_elements_unlocked: false, missions_visible_per_difficulty: 1, constraints_visible_per_difficulty: 1, privilege_text: "", visible_order: 1, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }),
      getLevelByNumber: async () => ({ id: "level-1", level_number: 1, label: "L1", min_score: 0, max_score: 99, shop_tier_max: 1, mission_difficulty_max: 2, constraint_difficulty_max: 2, fake_elements_unlocked: false, missions_visible_per_difficulty: 1, constraints_visible_per_difficulty: 1, privilege_text: "", visible_order: 1, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }),
      getTemplatesForParticipant: async () => [makeTemplate({ id: "template-consumed" })],
      listVisibleReserveOffersByParticipant: async () => [],
      listVisibleReserveOffersBySession: async () => [],
      createReserveOffer: async () => makeOffer(),
      getVisibleReserveOfferById: async () => null,
      revokeReserveOffer: async () => makeOffer(),
      attachReplacementToReserveOffer: async () => makeOffer(),
      isTemplateGloballyUnavailableInSession: async () => false,
      listSuccessfulElementTemplateIdsForParticipantInSession: async () => ["template-consumed"],
    },
  );

  assert.equal(result.replaced, false);
  assert.equal(result.replacementOfferId, null);
  assert.equal(result.reason, "no_eligible_replacement_template");
  assert.match(result.debugMessage, /no reserve-eligible replacement template/i);
});

test("reserve refill: erreur de remplacement => raison explicite (pas silencieux)", async () => {
  const result = await refillVisibleReserveOfferForResolvedElement(
    {
      participantId: "participant-a",
      sessionId: "session-1",
      consumedTemplateId: "template-consumed",
    },
    {
      getParticipantById: async () => makeParticipant({ id: "participant-a" }),
      getElementTemplateById: async (templateId: string) => makeTemplate({ id: templateId }),
      getReserveOfferById: async () => makeOffer({ id: "offer-consumed", revoked_at: "2026-01-01T10:01:00.000Z" }),
      getLatestRevokedReserveOfferForTemplate: async () => makeOffer({ id: "offer-consumed", element_template_id: "template-consumed", revoked_at: "2026-01-01T10:01:00.000Z" }),
      getLevelById: async () => ({ id: "level-1", level_number: 1, label: "L1", min_score: 0, max_score: 99, shop_tier_max: 1, mission_difficulty_max: 2, constraint_difficulty_max: 2, fake_elements_unlocked: false, missions_visible_per_difficulty: 1, constraints_visible_per_difficulty: 1, privilege_text: "", visible_order: 1, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }),
      getLevelByNumber: async () => ({ id: "level-1", level_number: 1, label: "L1", min_score: 0, max_score: 99, shop_tier_max: 1, mission_difficulty_max: 2, constraint_difficulty_max: 2, fake_elements_unlocked: false, missions_visible_per_difficulty: 1, constraints_visible_per_difficulty: 1, privilege_text: "", visible_order: 1, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }),
      getTemplatesForParticipant: async () => [makeTemplate({ id: "template-replacement", code: "TMP-2" })],
      listVisibleReserveOffersByParticipant: async () => [],
      listVisibleReserveOffersBySession: async () => [],
      createReserveOffer: async () => {
        throw new Error("db_insert_failed");
      },
      getVisibleReserveOfferById: async () => null,
      revokeReserveOffer: async () => makeOffer(),
      attachReplacementToReserveOffer: async () => makeOffer(),
      isTemplateGloballyUnavailableInSession: async () => false,
      listSuccessfulElementTemplateIdsForParticipantInSession: async () => [],
    },
  );

  assert.equal(result.replaced, false);
  assert.equal(result.reason, "replacement_failed");
  assert.match(result.debugMessage, /db_insert_failed/);
});

test("reserve top-up: plusieurs consommations successives maintiennent 4 visibles si stock disponible", async () => {
  const visibleOffers: ParticipantReserveOffer[] = [
    makeOffer({ id: "offer-a", element_template_id: "template-a" }),
    makeOffer({ id: "offer-b", element_template_id: "template-b" }),
    makeOffer({ id: "offer-c", element_template_id: "template-c" }),
    makeOffer({ id: "offer-d", element_template_id: "template-d" }),
  ];

  const createReserveOffer = async (payload: { participant_id: string; element_template_id: string; offered_at?: string }) => {
    const created = makeOffer({
      id: `offer-${payload.element_template_id}`,
      participant_id: payload.participant_id,
      element_template_id: payload.element_template_id,
      offered_at: payload.offered_at ?? "2026-01-01T10:02:00.000Z",
    });
    visibleOffers.push(created);
    return created;
  };

  const commonDeps = {
    getParticipantById: async () => makeParticipant({ id: "participant-a", current_level_id: "level-1" }),
    getElementTemplateById: async (templateId: string) => makeTemplate({ id: templateId, code: templateId }),
    getLevelById: async () => ({ id: "level-1", level_number: 1, label: "L1", min_score: 0, max_score: 99, shop_tier_max: 1, mission_difficulty_max: 2, constraint_difficulty_max: 2, fake_elements_unlocked: false, missions_visible_per_difficulty: 1, constraints_visible_per_difficulty: 1, privilege_text: "", visible_order: 1, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }),
    getLevelByNumber: async () => ({ id: "level-1", level_number: 1, label: "L1", min_score: 0, max_score: 99, shop_tier_max: 1, mission_difficulty_max: 2, constraint_difficulty_max: 2, fake_elements_unlocked: false, missions_visible_per_difficulty: 1, constraints_visible_per_difficulty: 1, privilege_text: "", visible_order: 1, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }),
    getTemplatesForParticipant: async () => [
      makeTemplate({ id: "template-a", code: "A" }),
      makeTemplate({ id: "template-b", code: "B" }),
      makeTemplate({ id: "template-c", code: "C" }),
      makeTemplate({ id: "template-d", code: "D" }),
      makeTemplate({ id: "template-e", code: "E" }),
      makeTemplate({ id: "template-f", code: "F" }),
      makeTemplate({ id: "template-g", code: "G" }),
    ],
    listVisibleReserveOffersByParticipant: async () => visibleOffers.filter((offer) => offer.revoked_at === null),
    listVisibleReserveOffersBySession: async () => visibleOffers.filter((offer) => offer.revoked_at === null),
    createReserveOffer,
    getVisibleReserveOfferById: async () => null,
    revokeReserveOffer: async (offerId: string, opts?: { revokedAt?: string; replacedByOfferId?: string }) => {
      const index = visibleOffers.findIndex((offer) => offer.id === offerId);
      const current = visibleOffers[index];
      const updated = makeOffer({
        ...current,
        revoked_at: opts?.revokedAt ?? "2026-01-01T10:03:00.000Z",
        replaced_by_offer_id: opts?.replacedByOfferId ?? null,
      });
      visibleOffers[index] = updated;
      return updated;
    },
    attachReplacementToReserveOffer: async (offerId: string, replacementId: string) => {
      const index = visibleOffers.findIndex((offer) => offer.id === offerId);
      const current = visibleOffers[index];
      const updated = makeOffer({
        ...current,
        revoked_at: current.revoked_at ?? "2026-01-01T10:03:00.000Z",
        replaced_by_offer_id: replacementId,
      });
      visibleOffers[index] = updated;
      return updated;
    },
    getReserveOfferById: async (offerId: string) => visibleOffers.find((offer) => offer.id === offerId) ?? null,
    isTemplateGloballyUnavailableInSession: async () => false,
    listSuccessfulElementTemplateIdsForParticipantInSession: async () => [],
  };

  for (const consumedTemplateId of ["template-a", "template-b", "template-c"]) {
    const visibleBefore = visibleOffers.filter((offer) => offer.revoked_at === null);
    const consumedVisible = visibleBefore.find((offer) => offer.element_template_id === consumedTemplateId);
    assert.ok(consumedVisible);

    const consumedIndex = visibleOffers.findIndex((offer) => offer.id === consumedVisible.id);
    visibleOffers[consumedIndex] = makeOffer({ ...visibleOffers[consumedIndex], revoked_at: "2026-01-01T10:01:00.000Z" });

    const refillResult = await refillVisibleReserveOfferForResolvedElement(
      {
        participantId: "participant-a",
        sessionId: "session-1",
        consumedTemplateId,
      },
      {
        ...commonDeps,
        getLatestRevokedReserveOfferForTemplate: async (_participantId: string, _sessionId: string, templateId: string) =>
          visibleOffers.find((offer) => offer.element_template_id === templateId && offer.revoked_at !== null) ?? null,
      },
    );

    assert.equal(refillResult.replaced, true);
    assert.equal(visibleOffers.filter((offer) => offer.revoked_at === null).length, 4);
  }
});

test("reserve top-up: stock insuffisant => moins de 4 sans erreur", async () => {
  const visibleOffers: ParticipantReserveOffer[] = [makeOffer({ id: "offer-a", element_template_id: "template-a" })];
  const createdTemplates: string[] = [];
  const result = await topUpVisibleReserveOffersForParticipant(
    {
      participantId: "participant-a",
      sessionId: "session-1",
      targetVisible: 4,
    },
    {
      getParticipantById: async () => makeParticipant({ id: "participant-a", current_level_id: "level-1" }),
      getElementTemplateById: async (templateId: string) => makeTemplate({ id: templateId, code: templateId }),
      getReserveOfferById: async () => null,
      getLatestRevokedReserveOfferForTemplate: async () => null,
      getLevelById: async () => ({ id: "level-1", level_number: 1, label: "L1", min_score: 0, max_score: 99, shop_tier_max: 1, mission_difficulty_max: 2, constraint_difficulty_max: 2, fake_elements_unlocked: false, missions_visible_per_difficulty: 1, constraints_visible_per_difficulty: 1, privilege_text: "", visible_order: 1, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }),
      getLevelByNumber: async () => ({ id: "level-1", level_number: 1, label: "L1", min_score: 0, max_score: 99, shop_tier_max: 1, mission_difficulty_max: 2, constraint_difficulty_max: 2, fake_elements_unlocked: false, missions_visible_per_difficulty: 1, constraints_visible_per_difficulty: 1, privilege_text: "", visible_order: 1, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }),
      getTemplatesForParticipant: async () => [
        makeTemplate({ id: "template-a", code: "A" }),
        makeTemplate({ id: "template-b", code: "B" }),
        makeTemplate({ id: "template-c", code: "C" }),
      ],
      listVisibleReserveOffersByParticipant: async () => visibleOffers.filter((offer) => offer.revoked_at === null),
      listVisibleReserveOffersByParticipantInSession: async () => [],
      listVisibleReserveOffersBySession: async () => visibleOffers.filter((offer) => offer.revoked_at === null),
      createReserveOffer: async (payload) => {
        createdTemplates.push(payload.element_template_id);
        const created = makeOffer({
          id: `offer-${payload.element_template_id}`,
          participant_id: payload.participant_id,
          element_template_id: payload.element_template_id,
        });
        visibleOffers.push(created);
        return created;
      },
      getVisibleReserveOfferById: async () => null,
      revokeReserveOffer: async () => makeOffer(),
      attachReplacementToReserveOffer: async () => makeOffer(),
      isTemplateGloballyUnavailableInSession: async () => false,
      listSuccessfulElementTemplateIdsForParticipantInSession: async () => [],
    },
  );

  assert.equal(result.visibleBefore, 1);
  assert.equal(result.visibleAfter, 3);
  assert.equal(result.offersCreated, 2);
  assert.deepEqual(createdTemplates, ["template-b", "template-c"]);
});
