import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("player-runtime ne renvoie plus les payloads accusation côté joueur", () => {
  const playerRuntimeRoute = readFileSync("src/app/api/player-runtime/[participantId]/route.ts", "utf8");

  assert.doesNotMatch(playerRuntimeRoute, /accusationTargets/);
  assert.doesNotMatch(playerRuntimeRoute, /accusableTemplates/);
  assert.match(playerRuntimeRoute, /participantTargets/);
});

test("hook joueur ne propose plus createAccusation", () => {
  const hook = readFileSync("src/hooks/use-player-runtime.ts", "utf8");

  assert.doesNotMatch(hook, /isCreatingAccusation/);
  assert.doesNotMatch(hook, /createAccusation/);
  assert.doesNotMatch(hook, /\/api\/accusations\/create/);
});

test("dashboard joueur n'affiche plus de panneau accusation", () => {
  const dashboard = readFileSync("src/components/player/player-dashboard.tsx", "utf8");

  assert.doesNotMatch(dashboard, /AccusationPanel/);
  assert.match(dashboard, /caughtNotification/);
});

test("notification joueur visible après accusation réussie", () => {
  const runtimeRoute = readFileSync("src/app/api/player-runtime/[participantId]/route.ts", "utf8");

  assert.match(runtimeRoute, /Tu as été grillé/);
  assert.match(runtimeRoute, /caughtNotification/);
});

test("runtime GM garde la liste des accusations session", () => {
  const gmRuntime = readFileSync("src/lib/game/services/get-gm-runtime-view.ts", "utf8");

  assert.match(gmRuntime, /listAccusations\(\{ sessionId: session\.id \}\)/);
});
