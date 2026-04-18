import test from "node:test";
import assert from "node:assert/strict";
import {
  formatMmSs,
  getClaimButtonLabel,
  getClaimButtonsForElement,
  getSkipAvailability,
  getSkipRemainingSeconds,
} from "@/components/player/active-elements-panel";

test("UI mission affiche Success + Fail + Skip", () => {
  assert.deepEqual(getClaimButtonsForElement("mission"), ["success", "fail", "skipped"]);
});

test("UI contrainte masque fail et garde broken + skip", () => {
  assert.deepEqual(getClaimButtonsForElement("constraint"), ["broken", "skipped"]);
});

test("UI libellé broken sur contrainte est métier", () => {
  assert.equal(getClaimButtonLabel("broken", "constraint"), "Contrainte rompue");
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
    label: "Passer dans 01:30",
  });
  assert.deepEqual(getSkipAvailability(skipAvailableAt, Date.parse("2026-01-01T00:01:30.000Z")), {
    canSkipNow: true,
    label: "Passer",
  });
});
