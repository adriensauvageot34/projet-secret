import test from "node:test";
import assert from "node:assert/strict";
import { assertVisibleReserveOfferUniqueness } from "@/lib/game/rules/reserve";

test("réserve visible: interdit un template visible chez un autre participant de la même session", () => {
  const existing = [
    { session_id: "s-1", participant_id: "p-a", element_template_id: "t-1" },
  ];

  assert.throws(
    () =>
      assertVisibleReserveOfferUniqueness(existing, {
        sessionId: "s-1",
        participantId: "p-b",
        templateId: "t-1",
      }),
    /reserve_template_already_visible_for_other_participant/,
  );
});

test("réserve visible: autorise le même template dans une autre session", () => {
  const existing = [
    { session_id: "s-1", participant_id: "p-a", element_template_id: "t-1" },
  ];

  assert.doesNotThrow(() =>
    assertVisibleReserveOfferUniqueness(existing, {
      sessionId: "s-2",
      participantId: "p-b",
      templateId: "t-1",
    }),
  );
});

test("réserve visible: interdit le doublon template/participant dans la même session", () => {
  const existing = [
    { session_id: "s-1", participant_id: "p-a", element_template_id: "t-1" },
  ];

  assert.throws(
    () =>
      assertVisibleReserveOfferUniqueness(existing, {
        sessionId: "s-1",
        participantId: "p-a",
        templateId: "t-1",
      }),
    /reserve_template_already_visible_for_participant/,
  );
});
