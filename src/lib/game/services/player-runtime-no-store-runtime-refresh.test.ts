import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("player-runtime route force le mode dynamique sans cache", () => {
  const route = readFileSync("src/app/api/player-runtime/[participantId]/route.ts", "utf8");

  assert.match(route, /export const dynamic = "force-dynamic"/);
  assert.match(route, /export const revalidate = 0/);
  assert.match(route, /export const fetchCache = "force-no-store"/);
  assert.match(route, /"Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"/);
  assert.match(route, /NextResponse\.json\([\s\S]*headers: NO_STORE_HEADERS/);
});

test("usePlayerRuntime recharge le runtime avec une requête client no-store", () => {
  const hook = readFileSync("src/hooks/use-player-runtime.ts", "utf8");

  assert.match(hook, /fetch\(`\/api\/player-runtime\/\$\{participantId\}`, \{/);
  assert.match(hook, /cache: "no-store"/);
  assert.match(hook, /"Cache-Control": "no-cache"/);
  assert.match(hook, /Pragma: "no-cache"/);
  assert.match(hook, /next: \{[\s\S]*revalidate: 0/);
});
