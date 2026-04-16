import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("SQL atomique: achat boutique crée instance + token_event + maj current_tokens", () => {
  const sql = readFileSync("supabase/migrations/0012_shop_purchase_atomic.sql", "utf8");

  assert.match(sql, /create or replace function purchase_advantage_shop/s);
  assert.match(sql, /insert into advantage_instances/s);
  assert.match(sql, /insert into token_events/s);
  assert.match(sql, /'shop_purchase'/s);
  assert.match(sql, /update participants\s+set current_tokens = v_next_tokens/s);
});

test("route + service achat: l'API buy délègue au service d'achat", () => {
  const buyRoute = readFileSync("src/app/api/advantages/buy/route.ts", "utf8");
  const buyService = readFileSync("src/lib/game/services/buy-advantage.ts", "utf8");

  assert.match(buyRoute, /buyAdvantage\(body\)/);
  assert.match(buyService, /purchaseAdvantageForParticipant\(input\)/);
});
