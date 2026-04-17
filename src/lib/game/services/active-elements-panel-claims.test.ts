import test from "node:test";
import assert from "node:assert/strict";
import { getClaimButtonsForElement } from "@/components/player/active-elements-panel";

test("UI mission affiche Success + Fail + Skip", () => {
  assert.deepEqual(getClaimButtonsForElement("mission"), ["success", "fail", "skipped"]);
});

test("UI contrainte affiche seulement Fail/Broken + Skip", () => {
  assert.deepEqual(getClaimButtonsForElement("constraint"), ["fail", "broken", "skipped"]);
});
