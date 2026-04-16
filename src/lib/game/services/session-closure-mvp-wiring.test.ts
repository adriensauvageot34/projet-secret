import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("blocage post-clôture: activate/claim/proof vérifient la session live", () => {
  const activateElement = readFileSync("src/lib/game/services/activate-element.ts", "utf8");
  const resolveClaim = readFileSync("src/lib/game/services/resolve-element-claim.ts", "utf8");
  const submitProof = readFileSync("src/lib/game/services/submit-proof.ts", "utf8");

  assert.match(activateElement, /assertSessionAllowsGameplay\(session\.status \?\? "live"\)/);
  assert.match(resolveClaim, /assertSessionIsLiveById\(existingInstance\.session_id\)/);
  assert.match(submitProof, /assertSessionIsLiveById\(instance\.session_id\)/);
});

test("blocage post-clôture: achats/accusations/décisions GM vérifient session live", () => {
  const advantageService = readFileSync("src/lib/game/services/advantage-instance-service.ts", "utf8");
  const accusations = readFileSync("src/lib/game/services/accusations.ts", "utf8");
  const decisions = readFileSync("src/lib/game/services/gm-decisions.ts", "utf8");

  assert.match(advantageService, /assertSessionIsLiveByIdEntry: assertSessionIsLiveById/);
  assert.match(advantageService, /await deps\.assertSessionIsLiveByIdEntry\(participant\.session_id\)/);
  assert.match(accusations, /assertSessionIsLiveById\(payload\.sessionId\)/);
  assert.match(decisions, /assertSessionIsLiveById\(payload\.sessionId\)/);
});
