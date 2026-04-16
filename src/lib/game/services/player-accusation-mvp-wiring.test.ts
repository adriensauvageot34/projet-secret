import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("player-runtime expose accusationTargets et accusableTemplates", () => {
  const playerRuntimeRoute = readFileSync("src/app/api/player-runtime/[participantId]/route.ts", "utf8");

  assert.match(playerRuntimeRoute, /accusationTargets/);
  assert.match(playerRuntimeRoute, /accusableTemplates/);
  assert.match(playerRuntimeRoute, /\.neq\("id", selfParticipantId\)/);
  assert.match(playerRuntimeRoute, /\.neq\("role", "gm"\)/);
});

test("hook joueur fournit createAccusation avec pending dédié", () => {
  const hook = readFileSync("src/hooks/use-player-runtime.ts", "utf8");

  assert.match(hook, /const \[isCreatingAccusation, setIsCreatingAccusation\]/);
  assert.match(hook, /const createAccusation = useCallback/);
  assert.match(hook, /postJson<Accusation>\("\/api\/accusations\/create"/);
  assert.match(hook, /setSuccessMessage\("Accusation envoyée au GM\."\)/);
  assert.match(hook, /if \(message\.includes\("justification"\)\)/);
});

test("player dashboard branche accusation panel sur les props runtime", () => {
  const dashboard = readFileSync("src/components/player/player-dashboard.tsx", "utf8");

  assert.match(dashboard, /accusationTargets=\{runtime\.runtime\.accusationTargets\}/);
  assert.match(dashboard, /accusableTemplates=\{runtime\.runtime\.accusableTemplates\}/);
  assert.match(dashboard, /onCreateAccusation=\{runtime\.createAccusation\}/);
});

test("accusation panel filtre les templates selon le type sélectionné", () => {
  const panel = readFileSync("src/components/player/accusation-panel.tsx", "utf8");

  assert.match(panel, /accusableTemplates\.filter\(\(template\) => template\.elementType === suspectedType\)/);
  assert.match(panel, /setSuspectedTemplateId\(""\)/);
});

test("runtime GM lit bien la liste des accusations session", () => {
  const gmRuntime = readFileSync("src/lib/game/services/get-gm-runtime-view.ts", "utf8");

  assert.match(gmRuntime, /listAccusations\(\{ sessionId: session\.id \}\)/);
});
