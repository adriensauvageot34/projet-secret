import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("console GM: blocs manuels retirés du dashboard", () => {
  const dashboard = readFileSync("src/components/gm/gm-dashboard.tsx", "utf8");

  assert.doesNotMatch(dashboard, /GmAccusationsQueue/);
  assert.doesNotMatch(dashboard, /GmDecisionsPanel/);
  assert.match(dashboard, /onMarkCaught=\{gm\.markElementCaught\}/);
});

test("action grillé: enchaîne create \+ adjudicate correct", () => {
  const hook = readFileSync("src/hooks/use-gm-runtime.ts", "utf8");

  assert.match(hook, /const markElementCaught = useCallback/);
  assert.match(hook, /"\/api\/accusations\/create"/);
  assert.match(hook, /"\/api\/accusations\/adjudicate"/);
  assert.match(hook, /decision: "correct"/);
});

test("vue live GM: structure joueurs puis éléments actifs", () => {
  const live = readFileSync("src/components/gm/gm-live-elements.tsx", "utf8");

  assert.match(live, /Joueurs → éléments actifs/);
  assert.match(live, /participantName: element\.participant_display_name \?\? "Joueur"/);
  assert.match(live, /element\.template_name \?\? "Élément actif"/);
  assert.match(live, /toElementTypeLabel/);
  assert.match(live, /chrono restant/);
  assert.match(live, /Valider Grillé/);
});
