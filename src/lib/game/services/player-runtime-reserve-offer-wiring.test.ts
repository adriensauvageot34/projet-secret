import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("player-runtime mappe chaque carte réserve avec participant_reserve_offers.id", () => {
  const route = readFileSync("src/app/api/player-runtime/[participantId]/route.ts", "utf8");

  assert.match(route, /const reserveTemplates = visibleReserveOffers\.map\(\(offer\) => \(\{/);
  assert.match(route, /reserveOfferId: offer\.id/);
  assert.match(route, /templateId: offer\.template\.id/);
});

test("reserve panel rend et active les cartes via reserveOfferId exact", () => {
  const panel = readFileSync("src/components/player/reserve-panel.tsx", "utf8");

  assert.match(panel, /key=\{template\.reserveOfferId\}/);
  assert.match(panel, /data-reserve-offer-id=\{template\.reserveOfferId\}/);
  assert.match(panel, /onClick=\{\(\) => void onActivate\(template\.reserveOfferId\)\}/);
});

test("hook joueur envoie reserveOfferId vers l'API d'activation", () => {
  const hook = readFileSync("src/hooks/use-player-runtime.ts", "utf8");
  const activationCallMatch = hook.match(/await postJson\("\/api\/elements\/activate", \{[\s\S]*?\}\);/);

  assert.ok(activationCallMatch, "activation call block should exist");
  const activationCallBlock = activationCallMatch[0];
  assert.match(activationCallBlock, /participantId,/);
  assert.match(activationCallBlock, /reserveOfferId,/);
  assert.doesNotMatch(activationCallBlock, /offerId:/);
  assert.doesNotMatch(activationCallBlock, /templateId:/);
});

test("route d'activation refuse les alias legacy et exige reserveOfferId", () => {
  const route = readFileSync("src/app/api/elements/activate/route.ts", "utf8");

  assert.match(route, /reserveOfferId = body\.reserveOfferId \?\? ""/);
  assert.doesNotMatch(route, /body\.offerId \?\? body\.templateId/);
});
