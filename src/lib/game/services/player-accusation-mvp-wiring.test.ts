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
});

test("player dashboard branche accusation panel sur les props runtime", () => {
  const dashboard = readFileSync("src/components/player/player-dashboard.tsx", "utf8");

  assert.match(dashboard, /accusationTargets=\{runtime\.runtime\.accusationTargets\}/);
  assert.match(dashboard, /accusableTemplates=\{runtime\.runtime\.accusableTemplates\}/);
  assert.match(dashboard, /onCreateAccusation=\{runtime\.createAccusation\}/);
});
