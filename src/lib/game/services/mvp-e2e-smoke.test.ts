// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { activateElement } from "@/lib/game/services/activate-element";
import { resolveElementClaim } from "@/lib/game/services/resolve-element-claim";
import { createAccusation, adjudicateAccusation } from "@/lib/game/services/accusations";
import { purchaseAdvantageForParticipant } from "@/lib/game/services/advantage-instance-service";
import { finishSessionForMvp } from "@/lib/game/services/finish-session";
import { buildLiveRanking } from "@/lib/game/services/live-ranking";
import { bootstrapInitialSessionReserves } from "@/lib/game/services/session-reserve-bootstrap";
import { createVisibleReserveOffer, refillVisibleReserveOfferForResolvedElement } from "@/lib/game/services/participant-reserve-offers";
import { isTemplateGloballyUnavailableInSession } from "@/lib/game/services/template-global-availability";
import type { AccusationDetail, AdvantageInstance, AdvantageTemplate, ElementInstance, ElementTemplate, Level, Participant, ParticipantReserveOffer, ScoreEventDetail, Session, TokenEventDetail } from "@/types/domain";

const ids = {
  session: "00000000-0000-0000-0000-000000000001",
  gm: "00000000-0000-0000-0000-000000000011",
  accuser: "00000000-0000-0000-0000-000000000012",
  accused: "00000000-0000-0000-0000-000000000013",
  missionTemplate: "00000000-0000-0000-0000-000000000101",
  missionTemplate2: "00000000-0000-0000-0000-000000000102",
  missionTemplate3: "00000000-0000-0000-0000-000000000103",
  advantageTemplate: "00000000-0000-0000-0000-000000000201",
  level: "00000000-0000-0000-0000-000000000301",
};

test("smoke MVP e2e: soirée réelle de bout en bout", async () => {
  const session: Session = {
    id: ids.session,
    name: "Session smoke",
    session_date: "2026-04-16",
    location: "Paris",
    status: "live",
    rules_announced_at: null,
    game_start_at: "2026-04-16T20:00:00.000Z",
    game_end_at: null,
    max_active_missions: 2,
    max_active_constraints: 2,
    reserve_per_difficulty: 3,
    fake_unlock_level: 3,
    fake_cycle_every_n_completed: 3,
    game_mode: "mvp",
    notes: null,
    gm_session_notes: null,
    session_gm_participant_id: ids.gm,
    created_at: "2026-04-16T19:00:00.000Z",
    updated_at: "2026-04-16T19:00:00.000Z",
  };

  const level: Level = {
    id: ids.level,
    level_number: 2,
    label: "L2",
    min_score: 0,
    max_score: 99,
    mission_difficulty_max: 2,
    constraint_difficulty_max: 2,
    shop_tier_max: 1,
    fake_elements_unlocked: false,
    missions_visible_per_difficulty: 3,
    constraints_visible_per_difficulty: 3,
    privilege_text: "",
    visible_order: 2,
    created_at: "2026-04-16T19:00:00.000Z",
    updated_at: "2026-04-16T19:00:00.000Z",
  };

  const participants = new Map<string, Participant>([
    [
      ids.gm,
      {
        id: ids.gm,
        session_id: ids.session,
        player_id: "00000000-0000-0000-0000-000000000401",
        public_slug: "gm",
        current_level_id: ids.level,
        display_name: "GM",
        role: "gm",
        current_status: "gm",
        current_score: 0,
        current_tokens: 0,
        combo_streak_current: 0,
        mission_slot_max: 2,
        constraint_slot_max: 2,
        completed_elements_count: 0,
        waiting_slot_count: 0,
        blocked_slot_count: 0,
        created_at: "2026-04-16T19:00:00.000Z",
        updated_at: "2026-04-16T19:00:00.000Z",
      },
    ],
    [
      ids.accuser,
      {
        id: ids.accuser,
        session_id: ids.session,
        player_id: "00000000-0000-0000-0000-000000000402",
        public_slug: "alice",
        current_level_id: ids.level,
        display_name: "Alice",
        role: "player",
        current_status: "active",
        current_score: 0,
        current_tokens: 5,
        combo_streak_current: 0,
        mission_slot_max: 2,
        constraint_slot_max: 2,
        completed_elements_count: 0,
        waiting_slot_count: 0,
        blocked_slot_count: 0,
        created_at: "2026-04-16T19:00:00.000Z",
        updated_at: "2026-04-16T19:00:00.000Z",
      },
    ],
    [
      ids.accused,
      {
        id: ids.accused,
        session_id: ids.session,
        player_id: "00000000-0000-0000-0000-000000000403",
        public_slug: "bob",
        current_level_id: ids.level,
        display_name: "Bob",
        role: "player",
        current_status: "active",
        current_score: 0,
        current_tokens: 1,
        combo_streak_current: 0,
        mission_slot_max: 2,
        constraint_slot_max: 2,
        completed_elements_count: 0,
        waiting_slot_count: 0,
        blocked_slot_count: 0,
        created_at: "2026-04-16T19:00:00.000Z",
        updated_at: "2026-04-16T19:00:00.000Z",
      },
    ],
  ]);

  const templates = new Map<string, ElementTemplate>([
    [
      ids.missionTemplate2,
      {
        id: ids.missionTemplate2,
        code: "M-SMOKE-2",
        title: "Mission smoke 2",
        description_public: "Mission de test 2",
        description_private: "",
        element_type: "mission",
        category: "social",
        difficulty: 1,
        base_points: 2,
        duration_seconds: 120,
        skip_unlock_rule: "one_third",
        validation_mode: "auto",
        proof_required: false,
        cooldown_seconds: 0,
        max_simultaneous_global: 3,
        is_active: true,
        can_appear_in_reserve: true,
        can_be_fake: false,
        created_at: "2026-04-16T19:00:00.000Z",
        updated_at: "2026-04-16T19:00:00.000Z",
      },
    ],
    [
      ids.missionTemplate3,
      {
        id: ids.missionTemplate3,
        code: "M-SMOKE-3",
        title: "Mission smoke 3",
        description_public: "Mission de test 3",
        description_private: "",
        element_type: "mission",
        category: "social",
        difficulty: 1,
        base_points: 2,
        duration_seconds: 120,
        skip_unlock_rule: "one_third",
        validation_mode: "auto",
        proof_required: false,
        cooldown_seconds: 0,
        max_simultaneous_global: 3,
        is_active: true,
        can_appear_in_reserve: true,
        can_be_fake: false,
        created_at: "2026-04-16T19:00:00.000Z",
        updated_at: "2026-04-16T19:00:00.000Z",
      },
    ],
    [
      ids.missionTemplate,
      {
        id: ids.missionTemplate,
        code: "M-SMOKE",
        title: "Mission smoke",
        description_public: "Mission de test",
        description_private: "",
        element_type: "mission",
        category: "social",
        difficulty: 1,
        base_points: 2,
        duration_seconds: 120,
        skip_unlock_rule: "one_third",
        validation_mode: "auto",
        proof_required: false,
        cooldown_seconds: 0,
        max_simultaneous_global: 3,
        is_active: true,
        can_appear_in_reserve: true,
        can_be_fake: false,
        created_at: "2026-04-16T19:00:00.000Z",
        updated_at: "2026-04-16T19:00:00.000Z",
      },
    ],
  ]);

  const advantageTemplate: AdvantageTemplate = {
    id: ids.advantageTemplate,
    name: "Bonus accusation +3",
    tier: 1,
    min_player_level: 1,
    cost_tokens: 2,
    visible_if_locked: true,
    is_active: true,
    effect_family: "value",
    effect_code: "next_correct_accusation_bonus_3",
    target_type: "none",
    duration_seconds: 0,
    is_consumable: true,
    max_uses: 1,
    description_player: "Ajoute +3 jetons sur la prochaine accusation correcte",
    description_admin: "",
    created_at: "2026-04-16T19:00:00.000Z",
    updated_at: "2026-04-16T19:00:00.000Z",
  };

  const elementInstances: ElementInstance[] = [];
  const reserveOffers: ParticipantReserveOffer[] = [];
  const successfulTemplateIdsByParticipant = new Map<string, Set<string>>();
  const scoreEvents: ScoreEventDetail[] = [];
  const tokenEvents: TokenEventDetail[] = [];
  const accusations: AccusationDetail[] = [];
  const advantageInstances: AdvantageInstance[] = [];
  let seq = 0;

  const now = () => new Date(`2026-04-16T20:${String(10 + seq).padStart(2, "0")}:00.000Z`);
  const sessionGuard = async (sessionId: string) => {
    assert.equal(sessionId, session.id);
    if (session.status !== "live") {
      throw new Error("Gameplay is not allowed once session is finished");
    }
  };

  const getVisibleOffersByParticipant = async (participantId: string) =>
    reserveOffers.filter((offer) => offer.participant_id === participantId && offer.revoked_at === null);

  const bootstrapResult = await bootstrapInitialSessionReserves(ids.session, {
    getSessionById: async () => session,
    getActiveTemplates: async () => Array.from(templates.values()),
    getLevelById: async () => level,
    listPlayerParticipantsBySession: async () => Array.from(participants.values()).filter((participant) => participant.role === "player"),
    listVisibleReserveOffersBySession: async () => reserveOffers.filter((offer) => offer.revoked_at === null),
    listSuccessfulElementTemplateIdsForParticipantInSession: async (participantId) =>
      Array.from(successfulTemplateIdsByParticipant.get(participantId) ?? []),
    listGloballyUnavailableTemplateIdsForSession: async () => new Set<string>(),
    createVisibleReserveOffer: async ({ participantId, templateId }) => {
      seq += 1;
      const offer: ParticipantReserveOffer = {
        id: `offer-${seq}`,
        session_id: ids.session,
        participant_id: participantId,
        element_template_id: templateId,
        offered_at: now().toISOString(),
        revoked_at: null,
        replaced_by_offer_id: null,
        created_at: now().toISOString(),
        updated_at: now().toISOString(),
      };
      reserveOffers.push(offer);
      return offer;
    },
  });

  // 1) démarrage session / session exploitable
  assert.equal(session.status, "live");
  assert.equal(participants.get(ids.accuser)?.role, "player");
  assert.ok(bootstrapResult.shortages.length >= 1);

  const accusedVisibleOffer = reserveOffers.find((offer) => offer.participant_id === ids.accused && offer.revoked_at === null);
  assert.ok(accusedVisibleOffer);
  assert.ok(reserveOffers.length >= 2);
  assert.notEqual(
    reserveOffers.find((offer) => offer.participant_id === ids.accuser)?.element_template_id,
    reserveOffers.find((offer) => offer.participant_id === ids.accused)?.element_template_id,
  );

  // 2) activation d'une offre persistée
  const activation = await activateElement(ids.accused, accusedVisibleOffer.id, undefined, false, {
    loadParticipant: async (participantId) => participants.get(participantId) ?? null,
    loadSession: async () => session,
    loadVisibleOffer: async (offerId) => {
      const offer = reserveOffers.find((item) => item.id === offerId && item.revoked_at === null) ?? null;
      return offer
        ? { id: offer.id, session_id: offer.session_id, participant_id: offer.participant_id, element_template_id: offer.element_template_id }
        : null;
    },
    loadTemplate: async (templateId) => templates.get(templateId) ?? null,
    loadLevel: async () => level,
    listOccupiedSlots: async (participantId, elementType) =>
      elementInstances
        .filter((item) => item.participant_id === participantId)
        .filter((item) => templates.get(item.element_template_id)?.element_type === elementType)
        .map((item) => ({ active_slot_index: item.active_slot_index, state: item.state, cooldown_until: item.cooldown_until })),
    createInstance: async (input) => {
      seq += 1;
      const instance: ElementInstance = {
        id: `00000000-0000-0000-0000-${String(800 + seq).padStart(12, "0")}`,
        participant_id: input.participantId,
        session_id: input.sessionId,
        element_template_id: input.templateId,
        state: "active",
        active_slot_index: input.slotIndex,
        is_fake: input.isFake,
        claimed_result: null,
        final_result: null,
        proof_status: input.proofStatus,
        activated_at: input.activatedAt,
        skip_available_at: input.skipAvailableAt,
        ends_at: input.endsAt,
        cooldown_until: null,
        points_gained: 0,
        points_lost: 0,
        tokens_gained: 0,
        was_retroactively_invalidated: false,
        created_at: input.activatedAt,
        updated_at: input.activatedAt,
      };
      elementInstances.push(instance);
      return instance;
    },
    consumeOffer: async (offerId, revokedAt) => {
      const offer = reserveOffers.find((item) => item.id === offerId);
      if (!offer) throw new Error("reserve offer not found");
      offer.revoked_at = revokedAt;
      offer.updated_at = revokedAt;
    },
    now,
  });
  assert.equal(activation.instance.state, "active");
  assert.ok(reserveOffers.find((offer) => offer.id === accusedVisibleOffer.id)?.revoked_at);

  // 3) claim résultat
  const claim = await resolveElementClaim(activation.instance.id, "success", {
    getElementInstanceById: async (instanceId) => elementInstances.find((item) => item.id === instanceId) ?? null,
    claimResult: async (instanceId, claimedResult) => {
      const instance = elementInstances.find((item) => item.id === instanceId);
      if (!instance) throw new Error("Element instance not found");
      instance.claimed_result = claimedResult;
      instance.updated_at = now().toISOString();
      return instance;
    },
    resolveElement: async (instanceId, finalResult) => {
      const instance = elementInstances.find((item) => item.id === instanceId);
      if (!instance) throw new Error("Element instance not found");
      instance.final_result = finalResult;
      instance.state = "resolved";
      instance.updated_at = now().toISOString();
      return instance;
    },
    getElementTemplateById: async (templateId) => templates.get(templateId) ?? null,
    createScoreEvent: async (input) => {
      seq += 1;
      scoreEvents.push({
        id: `00000000-0000-0000-0000-${String(1500 + seq).padStart(12, "0")}`,
        participant_id: input.participantId,
        session_id: input.sessionId,
        event_type: input.eventType,
        delta_points: input.deltaPoints,
        notes: input.notes ?? null,
        created_at: now().toISOString(),
        related_element_instance_id: input.relatedElementInstanceId,
        related_accusation_id: null,
        related_gm_decision_id: null,
        session_name: session.name,
        participant_display_name: participants.get(input.participantId)?.display_name ?? null,
        related_element_state: null,
        related_accusation_status: null,
        related_gm_decision_label: null,
        related_element_type: null,
        score_event_label: `${input.eventType}:${input.deltaPoints}`,
        is_positive_score_event: input.deltaPoints > 0,
        is_negative_score_event: input.deltaPoints < 0,
        targeted_by_gm_decisions: [],
      });
      const participant = participants.get(input.participantId);
      if (participant) participant.current_score += input.deltaPoints;
      return null;
    },
    listResolutionScoreEvents: async (instanceId) =>
      scoreEvents.filter((event) => event.related_element_instance_id === instanceId).map((event) => event.event_type),
    getLatestSuccessScoreEventType: async () => null,
    recomputeParticipantSlots: async () => null,
    updateCombo: async (participantId, success) => {
      const participant = participants.get(participantId);
      if (!participant) return 0;
      participant.combo_streak_current = success ? participant.combo_streak_current + 1 : 0;
      return participant.combo_streak_current;
    },
    updateParticipantLevel: async () => null,
    consumeFirstArmedAdvantage: async () => null,
    refillVisibleReserveOfferForResolvedElement: async (input) =>
      refillVisibleReserveOfferForResolvedElement(input, {
        getParticipantById: async (participantId) => participants.get(participantId) ?? null,
        getElementTemplateById: async (templateId) => templates.get(templateId) ?? null,
        getReserveOfferById: async (offerId) => reserveOffers.find((offer) => offer.id === offerId) ?? null,
        getLatestRevokedReserveOfferForTemplate: async (participantId, sessionId, templateId) =>
          reserveOffers
            .filter((offer) => offer.participant_id === participantId && offer.session_id === sessionId && offer.element_template_id === templateId && offer.revoked_at !== null)
            .sort((a, b) => (b.revoked_at ?? "").localeCompare(a.revoked_at ?? ""))[0] ?? null,
        getLevelById: async () => level,
        getLevelByNumber: async () => level,
        getTemplatesForParticipant: async () => Array.from(templates.values()),
        listVisibleReserveOffersByParticipant: getVisibleOffersByParticipant,
        listVisibleReserveOffersBySession: async () => reserveOffers.filter((offer) => offer.revoked_at === null),
        createReserveOffer: async (payload) => {
          seq += 1;
          const offeredAt = payload.offered_at ?? now().toISOString();
          const offer: ParticipantReserveOffer = {
            id: `offer-${seq}`,
            session_id: payload.session_id,
            participant_id: payload.participant_id,
            element_template_id: payload.element_template_id,
            offered_at: offeredAt,
            revoked_at: null,
            replaced_by_offer_id: null,
            created_at: offeredAt,
            updated_at: offeredAt,
          };
          reserveOffers.push(offer);
          return offer;
        },
        getVisibleReserveOfferById: async (offerId) =>
          reserveOffers.find((offer) => offer.id === offerId && offer.revoked_at === null) ?? null,
        revokeReserveOffer: async (offerId, options) => {
          const offer = reserveOffers.find((item) => item.id === offerId);
          if (!offer) throw new Error("offer_not_found");
          const revokedAt = options?.revokedAt ?? now().toISOString();
          offer.revoked_at = revokedAt;
          offer.replaced_by_offer_id = options?.replacedByOfferId ?? null;
          offer.updated_at = revokedAt;
          return offer;
        },
        attachReplacementToReserveOffer: async (offerId, replacementId) => {
          const offer = reserveOffers.find((item) => item.id === offerId);
          if (!offer) throw new Error("offer_not_found");
          offer.replaced_by_offer_id = replacementId;
          offer.updated_at = now().toISOString();
          return offer;
        },
        isTemplateGloballyUnavailableInSession: async (sessionId, templateId, options) =>
          isTemplateGloballyUnavailableInSession(sessionId, templateId, options, {
            listElementInstancesBySession: async () => elementInstances,
            now,
          }),
        listSuccessfulElementTemplateIdsForParticipantInSession: async (participantId) =>
          Array.from(successfulTemplateIdsByParticipant.get(participantId) ?? []),
      }),
    now,
  });

  assert.equal(claim.finalResolved, true);
  assert.equal(claim.instance.final_result, "success");
  const refillOfferForAccused = reserveOffers.find((offer) => offer.participant_id === ids.accused && offer.revoked_at === null);
  assert.ok(refillOfferForAccused);

  successfulTemplateIdsByParticipant.set(ids.accused, new Set([activation.instance.element_template_id]));

  await assert.rejects(
    () =>
      createVisibleReserveOffer(
        { participantId: ids.accused, templateId: activation.instance.element_template_id },
        {
          getParticipantById: async (participantId) => participants.get(participantId) ?? null,
          getElementTemplateById: async (templateId) => templates.get(templateId) ?? null,
          listVisibleReserveOffersBySession: async () => reserveOffers.filter((offer) => offer.revoked_at === null),
          createReserveOffer: async () => {
            throw new Error("should_not_create_blacklisted_offer");
          },
          getVisibleReserveOfferById: async () => null,
          revokeReserveOffer: async () => {
            throw new Error("should_not_revoke_blacklisted_offer");
          },
          isTemplateGloballyUnavailableInSession: async () => false,
          listSuccessfulElementTemplateIdsForParticipantInSession: async (participantId) =>
            Array.from(successfulTemplateIdsByParticipant.get(participantId) ?? []),
        },
      ),
    /blacklisted/,
  );

  const reofferedToOtherPlayer = await createVisibleReserveOffer(
    { participantId: ids.accuser, templateId: activation.instance.element_template_id },
    {
      getParticipantById: async (participantId) => participants.get(participantId) ?? null,
      getElementTemplateById: async (templateId) => templates.get(templateId) ?? null,
      listVisibleReserveOffersBySession: async () => reserveOffers.filter((offer) => offer.revoked_at === null),
      createReserveOffer: async (payload) => {
        seq += 1;
        const offeredAt = payload.offered_at ?? now().toISOString();
        const offer: ParticipantReserveOffer = {
          id: `offer-${seq}`,
          session_id: payload.session_id,
          participant_id: payload.participant_id,
          element_template_id: payload.element_template_id,
          offered_at: offeredAt,
          revoked_at: null,
          replaced_by_offer_id: null,
          created_at: offeredAt,
          updated_at: offeredAt,
        };
        reserveOffers.push(offer);
        return offer;
      },
      getVisibleReserveOfferById: async () => null,
      revokeReserveOffer: async () => {
        throw new Error("should_not_revoke_created_offer");
      },
      isTemplateGloballyUnavailableInSession: async (sessionId, templateId, options) =>
        isTemplateGloballyUnavailableInSession(sessionId, templateId, options, {
          listElementInstancesBySession: async () => elementInstances,
          now,
        }),
      listSuccessfulElementTemplateIdsForParticipantInSession: async (participantId) =>
        Array.from(successfulTemplateIdsByParticipant.get(participantId) ?? []),
    },
  );
  assert.equal(reofferedToOtherPlayer.participant_id, ids.accuser);

  // 4) score monte correctement
  const missionScoreEvent = scoreEvents.find((event) => event.event_type === "mission_success");
  assert.ok(missionScoreEvent);
  assert.equal(participants.get(ids.accused)?.current_score, 2);

  // 7) achat boutique + création advantage_instance
  const boughtAdvantage = await purchaseAdvantageForParticipant(
    {
      templateId: ids.advantageTemplate,
      participantId: ids.accuser,
      gmNotes: "smoke-buy",
    },
    {
      assertSessionIsLiveByIdEntry: sessionGuard,
      loadParticipant: async () => participants.get(ids.accuser) ?? null,
      loadTemplate: async () => advantageTemplate,
      loadLevelById: async () => level,
      loadDefaultLevel: async () => level,
      runAtomicPurchase: async () => {
        const accuser = participants.get(ids.accuser);
        if (!accuser) throw new Error("Accuser not found");
        accuser.current_tokens -= advantageTemplate.cost_tokens;

        const instance: AdvantageInstance = {
          id: "00000000-0000-0000-0000-000000009001",
          source: "shop",
          cost_paid: advantageTemplate.cost_tokens,
          state: "owned",
          activated_at: null,
          expires_at: null,
          remaining_uses: 1,
          gm_notes: "smoke-buy",
          advantage_template_id: ids.advantageTemplate,
          session_id: ids.session,
          assigned_player_id: accuser.player_id,
          participant_id: ids.accuser,
          target_participant_id: null,
          target_element_instance_id: null,
          created_at: now().toISOString(),
          updated_at: now().toISOString(),
        };

        advantageInstances.push(instance);
        return instance;
      },
    },
  );

  assert.equal(boughtAdvantage.state, "owned");
  assert.equal(advantageInstances.length, 1);

  // 8) activation / usage avantage MVP (bonus accusation correcte)
  advantageInstances[0].state = "active";

  // 5) accusation correcte
  const accusation = await createAccusation(
    {
      sessionId: ids.session,
      accuserParticipantId: ids.accuser,
      accusedParticipantId: ids.accused,
      suspectedType: "mission",
      suspectedTemplateId: activation.instance.element_template_id,
      relatedElementInstanceId: activation.instance.id,
      justification: "Je pense que c'est la mission active de Bob",
    },
    {
      assertSessionIsLiveByIdEntry: sessionGuard,
      loadParticipantById: async (participantId) => {
        const participant = participants.get(participantId);
        if (!participant) throw new Error("Participant not found");
        return participant;
      },
      loadTemplateById: async (templateId) => templates.get(templateId) ?? templates.get(ids.missionTemplate)!,
      loadElementInstanceById: async (instanceId) => {
        const instance = elementInstances.find((item) => item.id === instanceId);
        if (!instance) throw new Error("Element instance not found");
        return instance;
      },
      createAccusationRow: async (payload) => {
        const created: AccusationDetail = {
          id: "00000000-0000-0000-0000-000000007001",
          session_id: payload.session_id,
          accuser_participant_id: payload.accuser_participant_id,
          accused_participant_id: payload.accused_participant_id,
          adjudicated_by_participant_id: payload.adjudicated_by_participant_id,
          suspected_type: payload.suspected_type,
          suspected_template_id: payload.suspected_template_id,
          related_element_instance_id: payload.related_element_instance_id,
          justification: payload.justification,
          status: payload.status,
          decision: payload.decision,
          verdict: payload.verdict,
          created_at: payload.created_at,
          adjudicated_at: payload.adjudicated_at,
          is_receivable: payload.is_receivable,
          triggered_fake_bait: payload.triggered_fake_bait,
          reward_tokens: payload.reward_tokens,
          cancelled_previous_validation: payload.cancelled_previous_validation,
          notes_admin: payload.notes_admin,
          accuser_display_name: participants.get(payload.accuser_participant_id)?.display_name ?? null,
          accused_display_name: participants.get(payload.accused_participant_id)?.display_name ?? null,
          adjudicator_display_name: null,
          related_element_state: claim.instance.state,
          related_element_final_result: claim.instance.final_result,
          related_element_is_fake: false,
          suspected_template_code: "M-SMOKE",
          suspected_template_title: "Mission smoke",
        };
        accusations.push(created);
        return created;
      },
      getAccusationDetailById: async (accusationId) => accusations.find((item) => item.id === accusationId) ?? null,
    },
  );

  const adjudicated = await adjudicateAccusation(
    {
      accusationId: accusation.id,
      sessionId: ids.session,
      adjudicatedByParticipantId: ids.gm,
      decision: "correct",
      notesAdmin: "Accusation exacte",
    },
    {
      assertSessionIsLiveByIdEntry: sessionGuard,
      getAccusationDetailById: async (accusationId) => accusations.find((item) => item.id === accusationId) ?? null,
      loadParticipantById: async (participantId) => {
        const participant = participants.get(participantId);
        if (!participant) throw new Error("Participant not found");
        return participant;
      },
      updateAccusationRow: async (accusationId, patch) => {
        const current = accusations.find((item) => item.id === accusationId);
        if (!current) throw new Error("Accusation not found");
        Object.assign(current, patch);
        return current;
      },
      createTokenEventEntry: async (input) => {
        seq += 1;
        tokenEvents.push({
          id: `00000000-0000-0000-0000-${String(2500 + seq).padStart(12, "0")}`,
          session_id: input.sessionId,
          participant_id: input.participantId,
          event_type: input.eventType,
          delta_tokens: input.deltaTokens,
          created_at: now().toISOString(),
          notes: input.notes ?? null,
          related_accusation_id: input.relatedAccusationId ?? null,
          related_advantage_instance_id: input.relatedAdvantageInstanceId ?? null,
          related_gm_decision_id: null,
          related_element_instance_id: input.relatedElementInstanceId ?? null,
          participant_display_name: participants.get(input.participantId)?.display_name ?? null,
          session_name: session.name,
          related_advantage_name: null,
          related_gm_decision_label: null,
          related_element_state: null,
          token_event_label: `${input.eventType}:${input.deltaTokens}`,
          is_positive: input.deltaTokens > 0,
          is_negative: input.deltaTokens < 0,
        });
        const participant = participants.get(input.participantId);
        if (participant) participant.current_tokens += input.deltaTokens;
        return null;
      },
      createScoreEventEntry: async () => null,
      createArbitrationDecision: async () => undefined,
      hasAccusationCorrectRewardTokenEventEntry: async (accusationId) =>
        tokenEvents.some((event) => event.related_accusation_id === accusationId && event.event_type === "accusation_correct"),
      consumeFirstArmedAdvantageEntry: async ({ participantId, effectCode }) => {
        const match = advantageInstances.find(
          (item) =>
            item.participant_id === participantId
            && item.state === "active"
            && item.remaining_uses > 0
            && advantageTemplate.effect_code === effectCode,
        );

        if (!match) {
          return null;
        }

        match.remaining_uses = 0;
        match.state = "consumed";
        return {
          ...match,
          template: {
            name: advantageTemplate.name,
            effect_code: advantageTemplate.effect_code,
            effect_family: advantageTemplate.effect_family,
            target_type: advantageTemplate.target_type,
            duration_seconds: advantageTemplate.duration_seconds,
            max_uses: advantageTemplate.max_uses,
            cost_tokens: advantageTemplate.cost_tokens,
            description_player: advantageTemplate.description_player,
          },
        };
      },
    },
  );

  // 6) jeton attribué correctement
  assert.equal(adjudicated.decision, "correct");
  assert.equal(tokenEvents.filter((event) => event.event_type === "accusation_correct").length, 1);
  assert.equal(tokenEvents.filter((event) => event.event_type === "bonus_effect").length, 1);
  assert.equal(participants.get(ids.accuser)?.current_tokens, 7);
  assert.equal(advantageInstances[0].state, "consumed");

  // 9) clôture session
  const closed = await finishSessionForMvp(ids.session, {
    getSessionById: async () => session,
    finishSession: async () => {
      session.status = "finished";
      return session;
    },
  });
  assert.equal(closed.status, "finished");

  // 10) classement final affiché
  const finalRanking = buildLiveRanking(Array.from(participants.values()).filter((p) => p.role === "player"));
  assert.equal(finalRanking.length, 2);
  assert.equal(finalRanking[0].participantId, ids.accused);
  assert.equal(finalRanking[0].position, 1);

  // 11) impossibilité d'agir après fin
  await assert.rejects(
    () =>
      activateElement(ids.accuser, reofferedToOtherPlayer.id, undefined, false, {
        loadParticipant: async () => participants.get(ids.accuser) ?? null,
        loadSession: async () => session,
        loadVisibleOffer: async () => ({
          id: reofferedToOtherPlayer.id,
          session_id: ids.session,
          participant_id: ids.accuser,
          element_template_id: reofferedToOtherPlayer.element_template_id,
        }),
        loadTemplate: async () => templates.get(reofferedToOtherPlayer.element_template_id) ?? null,
        loadLevel: async () => level,
        listOccupiedSlots: async () => [],
        createInstance: async () => {
          throw new Error("should_not_create_instance");
        },
        consumeOffer: async () => undefined,
        now,
      }),
    /Session is finished; gameplay is locked/,
  );

  await assert.rejects(
    () =>
      createAccusation(
        {
          sessionId: ids.session,
          accuserParticipantId: ids.accuser,
          accusedParticipantId: ids.accused,
          suspectedType: "mission",
          suspectedTemplateId: activation.instance.element_template_id,
          relatedElementInstanceId: activation.instance.id,
          justification: "Test post-close",
        },
        {
          assertSessionIsLiveByIdEntry: sessionGuard,
          loadParticipantById: async (participantId) => participants.get(participantId)!,
          loadTemplateById: async () => templates.get(activation.instance.element_template_id)!,
          loadElementInstanceById: async () => activation.instance,
          createAccusationRow: async () => {
            throw new Error("should_not_create_accusation");
          },
          getAccusationDetailById: async () => null,
        },
      ),
    /Gameplay is not allowed once session is finished/,
  );
});
