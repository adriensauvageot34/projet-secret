import assert from "node:assert/strict";
import test from "node:test";
import { activateElement, buildActivationPlan } from "@/lib/game/services/activate-element";
import type { ElementInstance } from "@/types/domain";

const participant = {
  id: "participant-1",
  session_id: "session-1",
  mission_slot_max: 2,
  constraint_slot_max: 1,
  current_level_id: "level-1",
} as const;

const session = {
  id: "session-1",
  max_active_missions: 3,
  max_active_constraints: 2,
} as const;

const level = {
  id: "level-1",
  level_number: 1,
  mission_difficulty_max: 2,
  constraint_difficulty_max: 1,
} as const;

const missionTemplate = {
  id: "template-1",
  element_type: "mission",
  difficulty: 2,
  duration_seconds: 125,
  skip_unlock_rule: "one_third",
  proof_required: false,
  is_active: true,
  can_appear_in_reserve: true,
  can_be_fake: false,
} as const;

const constraintTemplate = {
  id: "template-constraint",
  element_type: "constraint",
  difficulty: 1,
  duration_seconds: 125,
  skip_unlock_rule: "one_third",
  proof_required: false,
  is_active: true,
  can_appear_in_reserve: true,
  can_be_fake: false,
} as const;

const oneHalfTemplate = {
  ...missionTemplate,
  id: "template-one-half",
  skip_unlock_rule: "one_half",
} as const;

function makeInstance(overrides: Partial<ElementInstance> = {}): ElementInstance {
  return {
    id: "instance-1",
    participant_id: participant.id,
    session_id: participant.session_id,
    element_template_id: missionTemplate.id,
    state: "active",
    active_slot_index: 0,
    is_fake: false,
    claimed_result: null,
    final_result: null,
    proof_status: "not_required",
    activated_at: "2026-01-01T00:00:00.000Z",
    skip_available_at: "2026-01-01T00:00:42.000Z",
    ends_at: "2026-01-01T00:02:05.000Z",
    cooldown_until: null,
    points_gained: 0,
    points_lost: 0,
    tokens_gained: 0,
    was_retroactively_invalidated: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("buildActivationPlan calcule timestamps et slot auto", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  const plan = buildActivationPlan({
    participant,
    session,
    template: missionTemplate,
    level,
    occupiedSlots: [{ active_slot_index: 0, state: "active", cooldown_until: null }],
    isFake: false,
    now,
  });

  assert.equal(plan.slotIndex, 1);
  assert.equal(plan.activatedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(plan.endsAt, "2026-01-01T00:02:05.000Z");
  assert.equal(plan.skipAvailableAt, "2026-01-01T00:00:42.000Z");
  assert.equal(plan.proofStatus, "not_required");
});

test("buildActivationPlan respecte skip_unlock_rule one_half", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  const plan = buildActivationPlan({
    participant,
    session,
    template: oneHalfTemplate,
    level,
    occupiedSlots: [],
    isFake: false,
    now,
  });

  assert.equal(plan.skipAvailableAt, "2026-01-01T00:01:03.000Z");
});

test("activateElement refuse quand tous les slots sont occupés", async () => {
  await assert.rejects(
    () =>
      activateElement("participant-1", "offer-1", undefined, false, {
        loadParticipant: async () => ({ ...participant }),
        loadSession: async () => ({ ...session }),
        loadVisibleOffer: async () => ({ id: "offer-1", session_id: "session-1", participant_id: "participant-1", element_template_id: "template-1" }),
        loadTemplate: async () => ({ ...missionTemplate }),
        loadLevel: async () => ({ ...level }),
        listOccupiedSlots: async () => [
          { active_slot_index: 0, state: "active", cooldown_until: null },
          { active_slot_index: 1, state: "active", cooldown_until: null },
        ],
        createInstance: async () => makeInstance(),
        consumeOffer: async () => undefined,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    /No free slot available for activation/,
  );
});

test("activateElement refuse un template inactif", async () => {
  await assert.rejects(
    () =>
      activateElement("participant-1", "offer-1", undefined, false, {
        loadParticipant: async () => ({ ...participant }),
        loadSession: async () => ({ ...session }),
        loadVisibleOffer: async () => ({ id: "offer-1", session_id: "session-1", participant_id: "participant-1", element_template_id: "template-1" }),
        loadTemplate: async () => ({ ...missionTemplate, is_active: false }),
        loadLevel: async () => ({ ...level }),
        listOccupiedSlots: async () => [],
        createInstance: async () => makeInstance(),
        consumeOffer: async () => undefined,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    /Template is inactive/,
  );
});

test("activateElement refuse un template non éligible au niveau", async () => {
  await assert.rejects(
    () =>
      activateElement("participant-1", "offer-1", undefined, false, {
        loadParticipant: async () => ({ ...participant }),
        loadSession: async () => ({ ...session }),
        loadVisibleOffer: async () => ({ id: "offer-1", session_id: "session-1", participant_id: "participant-1", element_template_id: "template-1" }),
        loadTemplate: async () => ({ ...missionTemplate, difficulty: 3 }),
        loadLevel: async () => ({ ...level }),
        listOccupiedSlots: async () => [],
        createInstance: async () => makeInstance(),
        consumeOffer: async () => undefined,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    /Template is not eligible for participant level/,
  );
});

test("activateElement impose un plafond MVP de 2 slots missions", async () => {
  await assert.rejects(
    () =>
      activateElement("participant-1", "offer-1", undefined, false, {
        loadParticipant: async () => ({ ...participant, mission_slot_max: 4 }),
        loadSession: async () => ({ ...session, max_active_missions: 4 }),
        loadVisibleOffer: async () => ({ id: "offer-1", session_id: "session-1", participant_id: "participant-1", element_template_id: "template-1" }),
        loadTemplate: async () => ({ ...missionTemplate }),
        loadLevel: async () => ({ ...level }),
        listOccupiedSlots: async () => [
          { active_slot_index: 0, state: "active", cooldown_until: null },
          { active_slot_index: 1, state: "active", cooldown_until: null },
        ],
        createInstance: async () => makeInstance(),
        consumeOffer: async () => undefined,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    /No free slot available for activation/,
  );
});

test("activateElement refuse si les 2 slots contraintes sont occupés", async () => {
  await assert.rejects(
    () =>
      activateElement("participant-1", "offer-constraint", undefined, false, {
        loadParticipant: async () => ({ ...participant, constraint_slot_max: 3 }),
        loadSession: async () => ({ ...session, max_active_constraints: 3 }),
        loadVisibleOffer: async () => ({ id: "offer-constraint", session_id: "session-1", participant_id: "participant-1", element_template_id: "template-constraint" }),
        loadTemplate: async () => ({ ...constraintTemplate }),
        loadLevel: async () => ({ ...level }),
        listOccupiedSlots: async () => [
          { active_slot_index: 0, state: "active", cooldown_until: null },
          { active_slot_index: 1, state: "active", cooldown_until: null },
        ],
        createInstance: async () => makeInstance(),
        consumeOffer: async () => undefined,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    /No free slot available for activation/,
  );
});

test("activateElement bloque un slot en cooldown non expiré", async () => {
  await assert.rejects(
    () =>
      activateElement("participant-1", "offer-1", undefined, false, {
        loadParticipant: async () => ({ ...participant }),
        loadSession: async () => ({ ...session }),
        loadVisibleOffer: async () => ({ id: "offer-1", session_id: "session-1", participant_id: "participant-1", element_template_id: "template-1" }),
        loadTemplate: async () => ({ ...missionTemplate }),
        loadLevel: async () => ({ ...level }),
        listOccupiedSlots: async () => [
          { active_slot_index: 0, state: "cooldown", cooldown_until: "2026-01-01T00:10:00.000Z" },
          { active_slot_index: 1, state: "active", cooldown_until: null },
        ],
        createInstance: async () => makeInstance(),
        consumeOffer: async () => undefined,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    /No free slot available for activation/,
  );
});

test("activateElement autorise un slot dont le cooldown est expiré", async () => {
  const result = await activateElement("participant-1", "offer-1", undefined, false, {
    loadParticipant: async () => ({ ...participant }),
    loadSession: async () => ({ ...session }),
    loadVisibleOffer: async () => ({ id: "offer-1", session_id: "session-1", participant_id: "participant-1", element_template_id: "template-1" }),
    loadTemplate: async () => ({ ...missionTemplate }),
    loadLevel: async () => ({ ...level }),
    listOccupiedSlots: async () => [
      { active_slot_index: 0, state: "cooldown", cooldown_until: "2025-12-31T23:00:00.000Z" },
    ],
    createInstance: async (input) =>
      makeInstance({
        active_slot_index: input.slotIndex,
        activated_at: input.activatedAt,
        ends_at: input.endsAt,
        skip_available_at: input.skipAvailableAt,
      }),
    consumeOffer: async () => undefined,
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });

  assert.equal(result.activeSlotIndex, 0);
});


test("activateElement retourne un résultat UI-ready", async () => {
  const result = await activateElement("participant-1", "offer-1", undefined, false, {
    loadParticipant: async () => ({ ...participant }),
    loadSession: async () => ({ ...session }),
    loadVisibleOffer: async () => ({ id: "offer-1", session_id: "session-1", participant_id: "participant-1", element_template_id: "template-1" }),
    loadTemplate: async () => ({ ...missionTemplate }),
    loadLevel: async () => ({ ...level }),
    listOccupiedSlots: async () => [],
    createInstance: async (input) =>
      makeInstance({
        active_slot_index: input.slotIndex,
        activated_at: input.activatedAt,
        ends_at: input.endsAt,
        skip_available_at: input.skipAvailableAt,
      }),
    consumeOffer: async () => undefined,
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });

  assert.equal(result.instance.participant_id, "participant-1");
  assert.equal(result.instance.session_id, "session-1");
  assert.equal(result.instance.element_template_id, "template-1");
  assert.equal(result.activeSlotIndex, 0);
  assert.equal(result.state, "active");
  assert.equal(result.activatedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(result.skipAvailableAt, "2026-01-01T00:00:42.000Z");
  assert.equal(result.endsAt, "2026-01-01T00:02:05.000Z");
});

test("activateElement: faux éléments bloqués avant le niveau 3", async () => {
  await assert.rejects(
    () =>
      activateElement("participant-1", "offer-1", undefined, true, {
        loadParticipant: async () => ({ ...participant }),
        loadSession: async () => ({ ...session }),
        loadVisibleOffer: async () => ({ id: "offer-1", session_id: "session-1", participant_id: "participant-1", element_template_id: "template-1" }),
        loadTemplate: async () => ({ ...missionTemplate, can_be_fake: true }),
        loadLevel: async () => ({ ...level, level_number: 2 }),
        listOccupiedSlots: async () => [],
        createInstance: async () => makeInstance(),
        consumeOffer: async () => undefined,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    /Fake elements unlock at level 3/,
  );
});

test("activateElement refuse une offre visible d'un autre participant", async () => {
  await assert.rejects(
    () =>
      activateElement("participant-1", "offer-1", undefined, false, {
        loadParticipant: async () => ({ ...participant }),
        loadSession: async () => ({ ...session }),
        loadVisibleOffer: async () => ({ id: "offer-1", session_id: "session-1", participant_id: "participant-2", element_template_id: "template-1" }),
        loadTemplate: async () => ({ ...missionTemplate }),
        loadLevel: async () => ({ ...level }),
        listOccupiedSlots: async () => [],
        createInstance: async () => makeInstance(),
        consumeOffer: async () => undefined,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    /Reserve offer does not belong to participant/,
  );
});

test("activateElement refuse une offre visible d'une autre session", async () => {
  await assert.rejects(
    () =>
      activateElement("participant-1", "offer-1", undefined, false, {
        loadParticipant: async () => ({ ...participant }),
        loadSession: async () => ({ ...session }),
        loadVisibleOffer: async () => ({ id: "offer-1", session_id: "session-2", participant_id: "participant-1", element_template_id: "template-1" }),
        loadTemplate: async () => ({ ...missionTemplate }),
        loadLevel: async () => ({ ...level }),
        listOccupiedSlots: async () => [],
        createInstance: async () => makeInstance(),
        consumeOffer: async () => undefined,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    /Reserve offer does not belong to participant session/,
  );
});

test("activateElement refuse une offre déjà prise (non visible)", async () => {
  await assert.rejects(
    () =>
      activateElement("participant-1", "offer-1", undefined, false, {
        loadParticipant: async () => ({ ...participant }),
        loadSession: async () => ({ ...session }),
        loadVisibleOffer: async () => null,
        loadTemplate: async () => ({ ...missionTemplate }),
        loadLevel: async () => ({ ...level }),
        listOccupiedSlots: async () => [],
        createInstance: async () => makeInstance(),
        consumeOffer: async () => undefined,
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    /Visible reserve offer not found/,
  );
});

test("activation depuis une offre visible runtime consomme exactement le reserveOfferId", async () => {
  const runtimeVisibleOffer = {
    reserveOfferId: "offer-runtime-1",
    templateId: "template-1",
  } as const;
  const consumedOfferIds: string[] = [];
  const createdTemplateIds: string[] = [];

  const result = await activateElement("participant-1", runtimeVisibleOffer.reserveOfferId, undefined, false, {
    loadParticipant: async () => ({ ...participant }),
    loadSession: async () => ({ ...session }),
    loadVisibleOffer: async (offerId) => (
      offerId === runtimeVisibleOffer.reserveOfferId
        ? {
            id: runtimeVisibleOffer.reserveOfferId,
            session_id: "session-1",
            participant_id: "participant-1",
            element_template_id: runtimeVisibleOffer.templateId,
          }
        : null
    ),
    loadTemplate: async () => ({ ...missionTemplate }),
    loadLevel: async () => ({ ...level }),
    listOccupiedSlots: async () => [],
    createInstance: async (input) => {
      createdTemplateIds.push(input.templateId);
      return makeInstance({
        id: "instance-runtime-1",
        element_template_id: input.templateId,
        active_slot_index: input.slotIndex,
      });
    },
    consumeOffer: async (offerId) => {
      consumedOfferIds.push(offerId);
    },
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });

  assert.equal(result.instance.id, "instance-runtime-1");
  assert.equal(result.instance.element_template_id, runtimeVisibleOffer.templateId);
  assert.deepEqual(createdTemplateIds, [runtimeVisibleOffer.templateId]);
  assert.deepEqual(consumedOfferIds, [runtimeVisibleOffer.reserveOfferId]);
});

test("un reserveOfferId issu du runtime est activable immédiatement dans le même scope participant/session", async () => {
  const runtimeReserveOffers = [
    {
      id: "offer-live-1",
      session_id: "session-1",
      participant_id: "participant-1",
      element_template_id: "template-1",
    },
    {
      id: "offer-old-session",
      session_id: "session-legacy",
      participant_id: "participant-1",
      element_template_id: "template-1",
    },
  ] as const;

  const lookupCalls: Array<{ offerId: string; participantId: string; sessionId: string }> = [];

  const result = await activateElement("participant-1", runtimeReserveOffers[0].id, undefined, false, {
    loadParticipant: async () => ({ ...participant }),
    loadSession: async () => ({ ...session }),
    loadVisibleOffer: async (offerId, participantId, sessionId) => {
      lookupCalls.push({ offerId, participantId, sessionId });
      return runtimeReserveOffers.find((offer) =>
        offer.id === offerId
        && offer.participant_id === participantId
        && offer.session_id === sessionId) ?? null;
    },
    loadTemplate: async () => ({ ...missionTemplate }),
    loadLevel: async () => ({ ...level }),
    listOccupiedSlots: async () => [],
    createInstance: async (input) =>
      makeInstance({
        id: "instance-scoped-lookup",
        element_template_id: input.templateId,
        active_slot_index: input.slotIndex,
      }),
    consumeOffer: async () => undefined,
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });

  assert.equal(result.instance.id, "instance-scoped-lookup");
  assert.deepEqual(lookupCalls, [
    {
      offerId: "offer-live-1",
      participantId: "participant-1",
      sessionId: "session-1",
    },
  ]);
});

test("activateElement remplit immédiatement la réserve après consommation de l'offre activée", async () => {
  const visibleReserve = [
    { id: "offer-1", session_id: "session-1", participant_id: "participant-1", element_template_id: "template-1", revoked_at: null as string | null },
    { id: "offer-2", session_id: "session-1", participant_id: "participant-1", element_template_id: "template-2", revoked_at: null as string | null },
    { id: "offer-3", session_id: "session-1", participant_id: "participant-1", element_template_id: "template-3", revoked_at: null as string | null },
    { id: "offer-4", session_id: "session-1", participant_id: "participant-1", element_template_id: "template-4", revoked_at: null as string | null },
  ];
  const expectedReserveSize = visibleReserve.length;
  const operationOrder: string[] = [];

  await activateElement("participant-1", "offer-1", undefined, false, {
    loadParticipant: async () => ({ ...participant }),
    loadSession: async () => ({ ...session }),
    loadVisibleOffer: async (offerId) => (
      visibleReserve.find((offer) => offer.id === offerId && offer.revoked_at === null) ?? null
    ),
    loadTemplate: async () => ({ ...missionTemplate }),
    loadLevel: async () => ({ ...level }),
    listOccupiedSlots: async () => [],
    createInstance: async (input) =>
      makeInstance({
        id: "instance-refill-now",
        element_template_id: input.templateId,
        active_slot_index: input.slotIndex,
      }),
    consumeOffer: async (offerId, revokedAt) => {
      operationOrder.push(`consume:${offerId}`);
      const consumed = visibleReserve.find((offer) => offer.id === offerId);
      if (!consumed) throw new Error("missing consumed offer");
      consumed.revoked_at = revokedAt;
    },
    refillOfferAfterActivation: async () => {
      operationOrder.push("refill");
      visibleReserve.push({
        id: "offer-5",
        session_id: "session-1",
        participant_id: "participant-1",
        element_template_id: "template-5",
        revoked_at: null,
      });

      return {
        replaced: true,
        replacementOfferId: "offer-5",
        reason: "replaced",
        debugMessage: "replacement created immediately",
      };
    },
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });

  const visibleCountAfterActivation = visibleReserve.filter((offer) => offer.revoked_at === null).length;
  assert.equal(visibleCountAfterActivation, expectedReserveSize);
  assert.equal(visibleReserve.some((offer) => offer.id === "offer-1" && offer.revoked_at !== null), true);
  assert.equal(visibleReserve.some((offer) => offer.id === "offer-5" && offer.revoked_at === null), true);
  assert.deepEqual(operationOrder, ["consume:offer-1", "refill"]);
});
