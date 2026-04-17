import test from "node:test";
import assert from "node:assert/strict";
import {
  formatMmSs,
  getClaimButtonsForElement,
  getSkipAvailability,
  getSkipRemainingSeconds,
} from "@/components/player/active-elements-panel";

test("UI mission affiche Success + Fail + Skip", () => {
  assert.deepEqual(getClaimButtonsForElement("mission"), ["success", "fail", "skipped"]);
});

test("UI contrainte affiche seulement Fail/Broken + Skip", () => {
  assert.deepEqual(getClaimButtonsForElement("constraint"), ["fail", "broken", "skipped"]);
});

test("skip countdown: format MM:SS", () => {
  assert.equal(formatMmSs(0), "00:00");
  assert.equal(formatMmSs(61), "01:01");
  assert.equal(formatMmSs(600), "10:00");
});

test("skip countdown: indisponible puis disponible à échéance", () => {
  const now = Date.parse("2026-01-01T00:00:00.000Z");
  const skipAvailableAt = "2026-01-01T00:01:30.000Z";

  assert.equal(getSkipRemainingSeconds(skipAvailableAt, now), 90);
  assert.deepEqual(getSkipAvailability(skipAvailableAt, now), {
    canSkipNow: false,
    label: "Skip dispo dans 01:30",
  });
  assert.deepEqual(getSkipAvailability(skipAvailableAt, Date.parse("2026-01-01T00:01:30.000Z")), {
    canSkipNow: true,
    label: "Skip disponible",
  });
});
