import test from "node:test";
import assert from "node:assert/strict";
import { buildVisibleReserveTemplates } from "@/lib/game/services/reserve-templates";
import type { ElementTemplate, Level } from "@/types/domain";

const BASE_LEVEL: Pick<
  Level,
  "mission_difficulty_max" | "constraint_difficulty_max" | "missions_visible_per_difficulty" | "constraints_visible_per_difficulty"
> = {
  mission_difficulty_max: 2,
  constraint_difficulty_max: 2,
  missions_visible_per_difficulty: 1,
  constraints_visible_per_difficulty: 2,
};

function makeTemplate(overrides: Partial<ElementTemplate>): ElementTemplate {
  return {
    id: "id",
    code: "code",
    name: "name",
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

test("réserve: applique filtres actifs/réserve + plafond de difficulté par type", () => {
  const templates = [
    makeTemplate({ id: "m-ok", code: "m-ok", element_type: "mission", difficulty: 2 }),
    makeTemplate({ id: "m-hard", code: "m-hard", element_type: "mission", difficulty: 3 }),
    makeTemplate({ id: "c-ok", code: "c-ok", element_type: "constraint", difficulty: 2 }),
    makeTemplate({ id: "c-hard", code: "c-hard", element_type: "constraint", difficulty: 4 }),
    makeTemplate({ id: "m-off", code: "m-off", element_type: "mission", is_active: false }),
    makeTemplate({ id: "c-no-reserve", code: "c-no-reserve", element_type: "constraint", can_appear_in_reserve: false }),
  ];

  const result = buildVisibleReserveTemplates(templates, BASE_LEVEL);
  assert.deepEqual(
    result.map((template) => template.id),
    ["m-ok", "c-ok"],
  );
});

test("réserve: limite visible par difficulté séparée mission/contrainte", () => {
  const templates = [
    makeTemplate({ id: "m-1-a", code: "m-1-a", element_type: "mission", difficulty: 1 }),
    makeTemplate({ id: "m-1-b", code: "m-1-b", element_type: "mission", difficulty: 1 }),
    makeTemplate({ id: "c-1-a", code: "c-1-a", element_type: "constraint", difficulty: 1 }),
    makeTemplate({ id: "c-1-b", code: "c-1-b", element_type: "constraint", difficulty: 1 }),
    makeTemplate({ id: "c-1-c", code: "c-1-c", element_type: "constraint", difficulty: 1 }),
  ];

  const result = buildVisibleReserveTemplates(templates, BASE_LEVEL);

  assert.deepEqual(
    result.map((template) => template.id),
    ["m-1-a", "c-1-a", "c-1-b"],
  );
});

test("réserve: conserve mission + contrainte visibles quand les deux types existent", () => {
  const templates = [
    makeTemplate({ id: "m-2", code: "m-2", element_type: "mission", difficulty: 2 }),
    makeTemplate({ id: "c-2", code: "c-2", element_type: "constraint", difficulty: 2 }),
  ];

  const result = buildVisibleReserveTemplates(templates, BASE_LEVEL);

  assert.equal(result.some((template) => template.element_type === "mission"), true);
  assert.equal(result.some((template) => template.element_type === "constraint"), true);
});
