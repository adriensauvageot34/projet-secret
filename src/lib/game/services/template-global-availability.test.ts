import test from "node:test";
import assert from "node:assert/strict";
import {
  isElementInstanceBlockingTemplate,
  isTemplateGloballyUnavailableInSession,
  listGloballyUnavailableTemplateIdsForSession,
} from "@/lib/game/services/template-global-availability";
import type { ElementInstance } from "@/types/domain";

function makeInstance(overrides: Partial<ElementInstance>): ElementInstance {
  return {
    id: "instance-id",
    participant_id: "participant-a",
    session_id: "session-1",
    element_template_id: "template-1",
    state: "active",
    active_slot_index: 0,
    is_fake: false,
    claimed_result: null,
    final_result: null,
    proof_status: "not_required",
    activated_at: "2026-01-01T10:00:00.000Z",
    skip_available_at: "2026-01-01T10:01:00.000Z",
    ends_at: "2026-01-01T10:05:00.000Z",
    cooldown_until: null,
    points_gained: 0,
    points_lost: 0,
    tokens_gained: 0,
    was_retroactively_invalidated: false,
    created_at: "2026-01-01T10:00:00.000Z",
    updated_at: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

test("active instance always blocks template", () => {
  const now = new Date("2026-01-01T10:02:00.000Z");
  assert.equal(isElementInstanceBlockingTemplate(makeInstance({ state: "active" }), now), true);
});

test("cooldown instance blocks only while cooldown is still running", () => {
  const now = new Date("2026-01-01T10:02:00.000Z");

  assert.equal(
    isElementInstanceBlockingTemplate(
      makeInstance({ state: "cooldown", cooldown_until: "2026-01-01T10:03:00.000Z" }),
      now,
    ),
    true,
  );

  assert.equal(
    isElementInstanceBlockingTemplate(
      makeInstance({ state: "cooldown", cooldown_until: "2026-01-01T10:01:59.000Z" }),
      now,
    ),
    false,
  );
});

test("global unavailability excludes requester's own instances", async () => {
  const instances = [
    makeInstance({ participant_id: "participant-a", element_template_id: "template-a", state: "active" }),
    makeInstance({ participant_id: "participant-b", element_template_id: "template-b", state: "active" }),
    makeInstance({
      participant_id: "participant-c",
      element_template_id: "template-c",
      state: "cooldown",
      cooldown_until: "2026-01-01T10:03:00.000Z",
    }),
  ];

  const unavailableIds = await listGloballyUnavailableTemplateIdsForSession(
    "session-1",
    { requesterParticipantId: "participant-a" },
    {
      listElementInstancesBySession: async () => instances,
      now: () => new Date("2026-01-01T10:02:00.000Z"),
    },
  );

  assert.equal(unavailableIds.has("template-a"), false);
  assert.equal(unavailableIds.has("template-b"), true);
  assert.equal(unavailableIds.has("template-c"), true);
});

test("template becomes eligible again after cooldown end", async () => {
  const isUnavailable = await isTemplateGloballyUnavailableInSession(
    "session-1",
    "template-z",
    { requesterParticipantId: "participant-b" },
    {
      listElementInstancesBySession: async () => [
        makeInstance({
          participant_id: "participant-a",
          element_template_id: "template-z",
          state: "cooldown",
          cooldown_until: "2026-01-01T10:00:00.000Z",
        }),
      ],
      now: () => new Date("2026-01-01T10:02:00.000Z"),
    },
  );

  assert.equal(isUnavailable, false);
});
