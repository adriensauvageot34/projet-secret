import assert from "node:assert/strict";
import test from "node:test";
import { mapPlayerActiveElements } from "@/lib/game/mappers/participant-runtime";
import type { ElementInstance, ElementTemplate } from "@/types/domain";

function makeTemplate(overrides: Partial<ElementTemplate>): ElementTemplate {
  return {
    id: "template-id",
    code: "M-001",
    name: "Template",
    element_type: "mission",
    category: "core",
    difficulty: 1,
    base_points: 10,
    duration_seconds: 120,
    skip_unlock_rule: "one_third",
    validation_mode: "auto",
    proof_required: false,
    can_be_fake: false,
    can_appear_in_reserve: true,
    is_active: true,
    player_display_text: "",
    ui_tag_1: "",
    ui_tag_2: "",
    success_button_label: "Succès",
    failure_button_label: "Échec",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeActiveInstance(overrides: Partial<ElementInstance>): ElementInstance {
  return {
    id: "instance-id",
    participant_id: "participant-1",
    session_id: "session-1",
    element_template_id: "template-id",
    state: "active",
    active_slot_index: 0,
    is_fake: false,
    claimed_result: null,
    final_result: null,
    proof_status: "not_required",
    activated_at: "2026-01-01T00:00:00.000Z",
    skip_available_at: "2026-01-01T00:00:30.000Z",
    ends_at: "2026-01-01T00:02:00.000Z",
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

test("mapPlayerActiveElements remonte mission + contrainte actives, même slot index si scope par type", () => {
  const missionTemplate = makeTemplate({
    id: "template-mission",
    code: "M-001",
    name: "Mission active",
    element_type: "mission",
  });
  const constraintTemplate = makeTemplate({
    id: "template-constraint",
    code: "C-001",
    name: "Contrainte active",
    element_type: "constraint",
  });

  const missionInstance = makeActiveInstance({
    id: "instance-mission",
    element_template_id: missionTemplate.id,
    active_slot_index: 0,
  });
  const constraintInstance = makeActiveInstance({
    id: "instance-constraint",
    element_template_id: constraintTemplate.id,
    active_slot_index: 0,
  });

  const mapped = mapPlayerActiveElements(
    [missionInstance, constraintInstance],
    new Map([
      [missionTemplate.id, missionTemplate],
      [constraintTemplate.id, constraintTemplate],
    ]),
  );

  assert.equal(mapped.length, 2);
  assert.equal(mapped[0].instance.id, missionInstance.id);
  assert.equal(mapped[0].template?.elementType, "mission");
  assert.equal(mapped[1].instance.id, constraintInstance.id);
  assert.equal(mapped[1].template?.elementType, "constraint");
});
