import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("gm-runtime route force le mode dynamique sans cache", () => {
  const route = readFileSync("src/app/api/gm-runtime/route.ts", "utf8");

  assert.match(route, /export const dynamic = "force-dynamic"/);
  assert.match(route, /export const revalidate = 0/);
  assert.match(route, /export const fetchCache = "force-no-store"/);
  assert.match(route, /"Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"/);
  assert.match(route, /NextResponse\.json\(\{ ok: true, data \}, \{ headers: NO_STORE_HEADERS \}\)/);
});

test("runtime GM lit les champs live score\/tokens des participants", () => {
  const runtime = readFileSync("src/lib/game/services/get-gm-runtime-view.ts", "utf8");

  assert.match(runtime, /select\("id, session_id, display_name, role, current_status, current_score, current_tokens,/);
});

test("runtime GM ne retourne que les element_instances actives", () => {
  const runtime = readFileSync("src/lib/game/services/get-gm-runtime-view.ts", "utf8");

  assert.match(runtime, /\.eq\("state", "active"\)/);
});

test("scoreboard GM aligne le classement sur les joueurs \(GM exclu\)", () => {
  const scoreboard = readFileSync("src/components/gm/gm-scoreboard.tsx", "utf8");

  assert.match(scoreboard, /participants\.filter\(\(participant\) => participant\.role !== "gm"\)/);
});

test("header GM affiche un badge cohérent avec session.status", () => {
  const header = readFileSync("src/components/gm/gm-session-header.tsx", "utf8");

  assert.match(header, /session\.status === "live"/);
  assert.match(header, /session\.status === "preparation"/);
  assert.match(header, /session\.status === "finished"/);
});
