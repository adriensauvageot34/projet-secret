import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildLiveRanking, buildLocalRankingWindow } from "@/lib/game/services/live-ranking";

test("ranking live: reflète current_score et ordonne correctement", () => {
  const ranking = buildLiveRanking([
    { id: "p3", display_name: "Charlie", current_score: 12, current_tokens: 2 },
    { id: "p1", display_name: "Alice", current_score: 20, current_tokens: 5 },
    { id: "p2", display_name: "Bob", current_score: 12, current_tokens: 7 },
  ]);

  assert.deepEqual(ranking.map((entry) => [entry.position, entry.participantId, entry.currentScore]), [
    [1, "p1", 20],
    [2, "p2", 12],
    [3, "p3", 12],
  ]);
});

test("ranking live: position joueur + mini-classement local (au-dessus/soi/en-dessous)", () => {
  const ranking = buildLiveRanking([
    { id: "p1", display_name: "Alice", current_score: 30, current_tokens: 5 },
    { id: "p2", display_name: "Bob", current_score: 25, current_tokens: 7 },
    { id: "p3", display_name: "Charlie", current_score: 20, current_tokens: 1 },
  ]);

  const local = buildLocalRankingWindow(ranking, "p2");
  assert.ok(local);
  assert.equal(local?.self.position, 2);
  assert.equal(local?.above?.participantId, "p1");
  assert.equal(local?.below?.participantId, "p3");
});

test("ranking live: mini-classement gère les bords (premier/dernier)", () => {
  const ranking = buildLiveRanking([
    { id: "p1", display_name: "Alice", current_score: 30, current_tokens: 5 },
    { id: "p2", display_name: "Bob", current_score: 25, current_tokens: 7 },
  ]);

  const first = buildLocalRankingWindow(ranking, "p1");
  assert.equal(first?.above, null);
  assert.equal(first?.below?.participantId, "p2");

  const last = buildLocalRankingWindow(ranking, "p2");
  assert.equal(last?.above?.participantId, "p1");
  assert.equal(last?.below, null);
});

test("cohérence UI GM: scoreboard dérive le classement via le même moteur live-ranking", () => {
  const gmScoreboard = readFileSync("src/components/gm/gm-scoreboard.tsx", "utf8");
  assert.match(gmScoreboard, /buildLiveRanking/);
});
