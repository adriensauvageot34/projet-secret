import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pickLevelIdForScore } from "@/lib/db/mutations/participants";

test("pickLevelIdForScore: transitions de niveau correctes aux seuils", () => {
  const levels = [
    { id: "level-1", level_number: 1, min_score: 0, max_score: 9 },
    { id: "level-2", level_number: 2, min_score: 10, max_score: 19 },
    { id: "level-3", level_number: 3, min_score: 20, max_score: 29 },
  ];

  assert.equal(pickLevelIdForScore(0, levels), "level-1");
  assert.equal(pickLevelIdForScore(9, levels), "level-1");
  assert.equal(pickLevelIdForScore(10, levels), "level-2");
  assert.equal(pickLevelIdForScore(19, levels), "level-2");
  assert.equal(pickLevelIdForScore(20, levels), "level-3");
});

test("pickLevelIdForScore: retourne null si aucun palier levels ne couvre le score", () => {
  const levels = [{ id: "level-1", level_number: 1, min_score: 0, max_score: 9 }];

  assert.equal(pickLevelIdForScore(25, levels), null);
});

test("pickLevelIdForScore: rejette les ranges levels chevauchants", () => {
  const levels = [
    { id: "level-1", level_number: 1, min_score: 0, max_score: 10 },
    { id: "level-2", level_number: 2, min_score: 10, max_score: 20 },
  ];

  assert.throws(() => pickLevelIdForScore(10, levels), /Overlapping levels for score 10/);
});

test("cohérence propagation: score_event et resolve déclenchent bien updateParticipantLevel", () => {
  const scoreEventsService = readFileSync("src/lib/game/services/score-events.ts", "utf8");
  const resolveElementClaimService = readFileSync("src/lib/game/services/resolve-element-claim.ts", "utf8");

  assert.match(scoreEventsService, /await updateParticipantLevel\(payload\.participantId\);/);
  assert.match(resolveElementClaimService, /await dependencies\.updateParticipantLevel\(resolvedInstance\.participant_id\);/);
});

test("cohérence propagation: player-runtime utilise current_level pour réserve + boutique", () => {
  const playerRuntimeRoute = readFileSync("src/app/api/player-runtime/[participantId]/route.ts", "utf8");

  assert.match(playerRuntimeRoute, /participant\.current_level_id/);
  assert.match(playerRuntimeRoute, /getTemplatesForParticipant\(level\.level_number\)/);
  assert.match(playerRuntimeRoute, /getVisibleShopTemplatesForLevel\(level\.level_number\)/);
});
