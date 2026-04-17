import test from "node:test";
import assert from "node:assert/strict";
import { bootstrapInitialSessionReserves } from "@/lib/game/services/session-reserve-bootstrap";
import type { ElementTemplate, Level, Participant, ParticipantReserveOffer, Session } from "@/types/domain";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "session-1",
    name: "Session",
    session_date: "2026-01-01",
    location: "Paris",
    status: "preparation",
    rules_announced_at: "2026-01-01T08:00:00.000Z",
    game_start_at: "2026-01-01T09:00:00.000Z",
    game_end_at: "2026-01-01T11:00:00.000Z",
    max_active_missions: 2,
    max_active_constraints: 2,
    reserve_per_difficulty: 1,
    fake_unlock_level: 3,
    fake_cycle_every_n_completed: 3,
    game_mode: "mvp",
    notes: "",
    gm_session_notes: "",
    session_gm_participant_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeLevel(overrides: Partial<Level> = {}): Level {
  return {
    id: "level-1",
    level_number: 1,
    label: "L1",
    min_score: 0,
    max_score: 99,
    mission_difficulty_max: 1,
    constraint_difficulty_max: 1,
    shop_tier_max: 1,
    fake_elements_unlocked: false,
    missions_visible_per_difficulty: 1,
    constraints_visible_per_difficulty: 1,
    privilege_text: "",
    visible_order: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeParticipant(id: string, levelId = "level-1", displayName = id): Participant {
  return {
    id,
    session_id: "session-1",
    player_id: `player-${id}`,
    public_slug: id,
    current_level_id: levelId,
    display_name: displayName,
    role: "player",
    current_status: "ready",
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
  };
}

function makeTemplate(id: string, element_type: "mission" | "constraint", difficulty = 1): ElementTemplate {
  return {
    id,
    code: id,
    name: id,
    element_type,
    category: "social",
    difficulty,
    base_points: 10,
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
    success_button_label: "ok",
    failure_button_label: "ko",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function makeOffer(participantId: string, templateId: string): ParticipantReserveOffer {
  return {
    id: `${participantId}-${templateId}`,
    session_id: "session-1",
    participant_id: participantId,
    element_template_id: templateId,
    offered_at: "2026-01-01T09:00:00.000Z",
    revoked_at: null,
    replaced_by_offer_id: null,
    created_at: "2026-01-01T09:00:00.000Z",
    updated_at: "2026-01-01T09:00:00.000Z",
  };
}

type Captured = Array<{ participantId: string; templateId: string }>;

function depsFactory(input: {
  participants: Participant[];
  levels?: Record<string, Level>;
  templates: ElementTemplate[];
  visibleOffers?: ParticipantReserveOffer[];
  successful?: Record<string, string[]>;
  session?: Session;
}) {
  const captured: Captured = [];

  const deps = {
    getSessionById: async () => input.session ?? makeSession(),
    getActiveTemplates: async () => input.templates,
    getLevelById: async (levelId: string) => input.levels?.[levelId] ?? makeLevel({ id: levelId }),
    listPlayerParticipantsBySession: async () => input.participants,
    listVisibleReserveOffersBySession: async () => input.visibleOffers ?? [],
    listSuccessfulElementTemplateIdsForParticipantInSession: async (participantId: string) => input.successful?.[participantId] ?? [],
    listGloballyUnavailableTemplateIdsForSession: async () => new Set<string>(),
    createVisibleReserveOffer: async ({ participantId, templateId }: { participantId: string; templateId: string }) => {
      captured.push({ participantId, templateId });
      return makeOffer(participantId, templateId);
    },
  };

  return { deps, captured };
}

test("bootstrap réserve: plusieurs joueurs n'ont pas exactement les mêmes offres si le catalogue le permet", async () => {
  const participants = [makeParticipant("p1", "level-1", "Alice"), makeParticipant("p2", "level-1", "Bob")];
  const templates = [
    makeTemplate("m1", "mission", 1),
    makeTemplate("m2", "mission", 1),
    makeTemplate("c1", "constraint", 1),
    makeTemplate("c2", "constraint", 1),
  ];

  const { deps, captured } = depsFactory({ participants, templates });

  await bootstrapInitialSessionReserves("session-1", deps);

  const p1 = captured.filter((item) => item.participantId === "p1").map((item) => item.templateId).sort();
  const p2 = captured.filter((item) => item.participantId === "p2").map((item) => item.templateId).sort();

  assert.equal(p1.length, 2);
  assert.equal(p2.length, 2);
  assert.notDeepEqual(p1, p2);
});

test("bootstrap réserve: pas de doublon simultané inter-joueurs", async () => {
  const participants = [makeParticipant("p1", "level-1", "Alice"), makeParticipant("p2", "level-1", "Bob")];
  const templates = [
    makeTemplate("m1", "mission", 1),
    makeTemplate("m2", "mission", 1),
    makeTemplate("c1", "constraint", 1),
    makeTemplate("c2", "constraint", 1),
  ];

  const { deps, captured } = depsFactory({ participants, templates });

  await bootstrapInitialSessionReserves("session-1", deps);

  const uniqueTemplateIds = new Set(captured.map((item) => item.templateId));
  assert.equal(uniqueTemplateIds.size, captured.length);
});

test("bootstrap réserve: respecte les quotas par bucket", async () => {
  const participants = [makeParticipant("p1", "level-2", "Alice")];
  const levels = {
    "level-2": makeLevel({
      id: "level-2",
      mission_difficulty_max: 2,
      constraint_difficulty_max: 2,
      missions_visible_per_difficulty: 1,
      constraints_visible_per_difficulty: 1,
    }),
  };

  const templates = [
    makeTemplate("m1d1", "mission", 1),
    makeTemplate("m2d1", "mission", 1),
    makeTemplate("m1d2", "mission", 2),
    makeTemplate("m2d2", "mission", 2),
    makeTemplate("c1d1", "constraint", 1),
    makeTemplate("c2d1", "constraint", 1),
    makeTemplate("c1d2", "constraint", 2),
    makeTemplate("c2d2", "constraint", 2),
  ];

  const { deps, captured } = depsFactory({
    participants,
    levels,
    templates,
    session: makeSession({ reserve_per_difficulty: 1 }),
  });

  await bootstrapInitialSessionReserves("session-1", deps);

  const expectedBuckets = new Set(["mission:1", "mission:2", "constraint:1", "constraint:2"]);
  const actualBuckets = new Set(
    captured.map((item) => {
      const template = templates.find((t) => t.id === item.templateId);
      return `${template?.element_type}:${template?.difficulty}`;
    }),
  );

  assert.deepEqual(actualBuckets, expectedBuckets);
  assert.equal(captured.length, 4);
});

test("bootstrap réserve: dégrade proprement si un bucket est insuffisant", async () => {
  const participants = [
    makeParticipant("p1", "level-1", "Alice"),
    makeParticipant("p2", "level-1", "Bob"),
    makeParticipant("p3", "level-1", "Charly"),
  ];

  const templates = [
    makeTemplate("m1", "mission", 1),
    makeTemplate("m2", "mission", 1),
    makeTemplate("c1", "constraint", 1),
    makeTemplate("c2", "constraint", 1),
    makeTemplate("c3", "constraint", 1),
  ];

  const { deps, captured } = depsFactory({ participants, templates });

  const result = await bootstrapInitialSessionReserves("session-1", deps);

  assert.equal(captured.length, 5);
  assert.equal(result.shortages.length, 1);
  assert.equal(result.shortages[0]?.bucket, "mission:1");
  assert.equal(result.shortages[0]?.missing, 1);
});
