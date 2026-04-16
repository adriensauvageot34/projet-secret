import test from "node:test";
import assert from "node:assert/strict";
import { purchaseAdvantageForParticipant, type PurchaseAdvantageDeps } from "@/lib/game/services/advantage-instance-service";
import type { AdvantageInstance, AdvantageTemplate, Level, Participant } from "@/types/domain";

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: "00000000-0000-0000-0000-000000000101",
    session_id: "00000000-0000-0000-0000-000000000201",
    player_id: "00000000-0000-0000-0000-000000000301",
    public_slug: "player-a",
    current_level_id: "00000000-0000-0000-0000-000000000401",
    display_name: "Alice",
    role: "player",
    current_status: "active",
    current_score: 10,
    current_tokens: 5,
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

function makeTemplate(overrides: Partial<AdvantageTemplate> = {}): AdvantageTemplate {
  return {
    id: "00000000-0000-0000-0000-000000000501",
    name: "Boost",
    tier: 1,
    min_player_level: 1,
    cost_tokens: 3,
    visible_if_locked: true,
    is_active: true,
    effect_family: "value",
    effect_code: "boost",
    target_type: "none",
    duration_seconds: 0,
    is_consumable: true,
    max_uses: 1,
    description_player: "desc",
    description_admin: "desc",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeLevel(overrides: Partial<Level> = {}): Level {
  return {
    id: "00000000-0000-0000-0000-000000000401",
    level_number: 2,
    label: "L2",
    min_score: 0,
    max_score: 100,
    mission_difficulty_max: 2,
    constraint_difficulty_max: 2,
    shop_tier_max: 1,
    fake_elements_unlocked: false,
    missions_visible_per_difficulty: 1,
    constraints_visible_per_difficulty: 1,
    privilege_text: "",
    visible_order: 2,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeInstance(overrides: Partial<AdvantageInstance> = {}): AdvantageInstance {
  return {
    id: "00000000-0000-0000-0000-000000000601",
    source: "shop",
    cost_paid: 3,
    state: "owned",
    activated_at: null,
    expires_at: null,
    remaining_uses: 1,
    gm_notes: "",
    advantage_template_id: "00000000-0000-0000-0000-000000000501",
    session_id: "00000000-0000-0000-0000-000000000201",
    assigned_player_id: "00000000-0000-0000-0000-000000000301",
    participant_id: "00000000-0000-0000-0000-000000000101",
    target_participant_id: null,
    target_element_instance_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeDeps(input?: {
  participant?: Participant | null;
  template?: AdvantageTemplate | null;
  levelById?: Level | null;
  defaultLevel?: Level | null;
  runAtomicPurchase?: PurchaseAdvantageDeps["runAtomicPurchase"];
}) {
  const calls = { atomic: 0 };

  const deps: PurchaseAdvantageDeps = {
    assertSessionIsLiveByIdEntry: async () => undefined,
    loadParticipant: async () => input?.participant ?? makeParticipant(),
    loadTemplate: async () => input?.template ?? makeTemplate(),
    loadLevelById: async () => input?.levelById ?? makeLevel(),
    loadDefaultLevel: async () => input?.defaultLevel ?? makeLevel({ level_number: 1, visible_order: 1 }),
    runAtomicPurchase: async (payload) => {
      calls.atomic += 1;
      if (input?.runAtomicPurchase) {
        return input.runAtomicPurchase(payload);
      }
      return makeInstance({ gm_notes: payload.gmNotes ?? "" });
    },
  };

  return { deps, calls };
}

test("achat valide: vérifie le flux MVP (owned/shop + liens participant/session/player)", async () => {
  const { deps, calls } = makeDeps();
  const instance = await purchaseAdvantageForParticipant(
    {
      templateId: "00000000-0000-0000-0000-000000000501",
      participantId: "00000000-0000-0000-0000-000000000101",
      gmNotes: "shop buy",
    },
    deps,
  );

  assert.equal(calls.atomic, 1);
  assert.equal(instance.source, "shop");
  assert.equal(instance.state, "owned");
  assert.equal(instance.participant_id, "00000000-0000-0000-0000-000000000101");
  assert.equal(instance.assigned_player_id, "00000000-0000-0000-0000-000000000301");
  assert.equal(instance.session_id, "00000000-0000-0000-0000-000000000201");
  assert.equal(instance.target_participant_id, null);
  assert.equal(instance.target_element_instance_id, null);
});

test("niveau insuffisant: utilise le vrai level_number chargé depuis current_level_id (pas de hack 999)", async () => {
  const { deps, calls } = makeDeps({
    template: makeTemplate({ min_player_level: 3 }),
    levelById: makeLevel({ level_number: 2 }),
  });

  await assert.rejects(
    () =>
      purchaseAdvantageForParticipant(
        {
          templateId: "00000000-0000-0000-0000-000000000501",
          participantId: "00000000-0000-0000-0000-000000000101",
        },
        deps,
      ),
    /insufficient_level/,
  );

  assert.equal(calls.atomic, 0);
});

test("jetons insuffisants: bloque l'achat avant mutation", async () => {
  const { deps, calls } = makeDeps({
    participant: makeParticipant({ current_tokens: 1 }),
    template: makeTemplate({ cost_tokens: 4 }),
  });

  await assert.rejects(
    () =>
      purchaseAdvantageForParticipant(
        {
          templateId: "00000000-0000-0000-0000-000000000501",
          participantId: "00000000-0000-0000-0000-000000000101",
        },
        deps,
      ),
    /insufficient_tokens/,
  );

  assert.equal(calls.atomic, 0);
});

test("template inactif: bloque l'achat", async () => {
  const { deps, calls } = makeDeps({
    template: makeTemplate({ is_active: false }),
  });

  await assert.rejects(
    () =>
      purchaseAdvantageForParticipant(
        {
          templateId: "00000000-0000-0000-0000-000000000501",
          participantId: "00000000-0000-0000-0000-000000000101",
        },
        deps,
      ),
    /template_inactive/,
  );

  assert.equal(calls.atomic, 0);
});

test("template non achetable pour le palier boutique courant", async () => {
  const { deps, calls } = makeDeps({
    template: makeTemplate({ tier: 3 }),
    levelById: makeLevel({ shop_tier_max: 2 }),
  });

  await assert.rejects(
    () =>
      purchaseAdvantageForParticipant(
        {
          templateId: "00000000-0000-0000-0000-000000000501",
          participantId: "00000000-0000-0000-0000-000000000101",
        },
        deps,
      ),
    /template_not_purchasable/,
  );

  assert.equal(calls.atomic, 0);
});

test("anti demi-achat: la mutation comptable est unique et atomique côté service", async () => {
  const { deps, calls } = makeDeps({
    runAtomicPurchase: async () => {
      throw new Error("atomic_purchase_failed");
    },
  });

  await assert.rejects(
    () =>
      purchaseAdvantageForParticipant(
        {
          templateId: "00000000-0000-0000-0000-000000000501",
          participantId: "00000000-0000-0000-0000-000000000101",
        },
        deps,
      ),
    /atomic_purchase_failed/,
  );

  assert.equal(calls.atomic, 1);
});

test("garde-fou: rejette une réponse atomique incohérente (instance liée à un autre participant)", async () => {
  const { deps, calls } = makeDeps({
    runAtomicPurchase: async () =>
      makeInstance({
        participant_id: "00000000-0000-0000-0000-000000000999",
      }),
  });

  await assert.rejects(
    () =>
      purchaseAdvantageForParticipant(
        {
          templateId: "00000000-0000-0000-0000-000000000501",
          participantId: "00000000-0000-0000-0000-000000000101",
        },
        deps,
      ),
    /another participant/,
  );

  assert.equal(calls.atomic, 1);
});
