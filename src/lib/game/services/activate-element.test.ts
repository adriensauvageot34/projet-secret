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
    activeSlots: [{ active_slot_index: 0 }],
    isFake: false,
    now,
  });

  assert.equal(plan.slotIndex, 1);
  assert.equal(plan.activatedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(plan.endsAt, "2026-01-01T00:02:05.000Z");
  assert.equal(plan.skipAvailableAt, "2026-01-01T00:00:42.000Z");
  assert.equal(plan.proofStatus, "not_required");
});

test("activateElement refuse quand tous les slots sont occupés", async () => {
  await assert.rejects(
    () =>
      activateElement("participant-1", "template-1", undefined, false, {
        loadParticipant: async () => ({ ...participant }),
        loadSession: async () => ({ ...session }),
        loadTemplate: async () => ({ ...missionTemplate }),
        loadLevel: async () => ({ ...level }),
        listActiveSlots: async () => [{ active_slot_index: 0 }, { active_slot_index: 1 }],
        createInstance: async () => makeInstance(),
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    /No free slot available for activation/,
  );
});

test("activateElement refuse un template inactif", async () => {
  await assert.rejects(
    () =>
      activateElement("participant-1", "template-1", undefined, false, {
        loadParticipant: async () => ({ ...participant }),
        loadSession: async () => ({ ...session }),
        loadTemplate: async () => ({ ...missionTemplate, is_active: false }),
        loadLevel: async () => ({ ...level }),
        listActiveSlots: async () => [],
        createInstance: async () => makeInstance(),
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    /Template is inactive/,
  );
});

test("activateElement refuse un template non éligible au niveau", async () => {
  await assert.rejects(
    () =>
      activateElement("participant-1", "template-1", undefined, false, {
        loadParticipant: async () => ({ ...participant }),
        loadSession: async () => ({ ...session }),
        loadTemplate: async () => ({ ...missionTemplate, difficulty: 3 }),
        loadLevel: async () => ({ ...level }),
        listActiveSlots: async () => [],
        createInstance: async () => makeInstance(),
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    /Template is not eligible for participant level/,
  );
});

test("activateElement retourne un résultat UI-ready", async () => {
  const result = await activateElement("participant-1", "template-1", undefined, false, {
    loadParticipant: async () => ({ ...participant }),
    loadSession: async () => ({ ...session }),
    loadTemplate: async () => ({ ...missionTemplate }),
    loadLevel: async () => ({ ...level }),
    listActiveSlots: async () => [],
    createInstance: async (input) =>
      makeInstance({
        active_slot_index: input.slotIndex,
        activated_at: input.activatedAt,
        ends_at: input.endsAt,
        skip_available_at: input.skipAvailableAt,
      }),
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
