import test from "node:test";
import assert from "node:assert/strict";
import { assertSessionAllowsGameplay } from "@/lib/game/rules/session";

test("session-rule: live autorise gameplay", () => {
  assert.doesNotThrow(() => assertSessionAllowsGameplay("live"));
});

test("session-rule: finished bloque gameplay", () => {
  assert.throws(() => assertSessionAllowsGameplay("finished"), /gameplay is locked/);
});
