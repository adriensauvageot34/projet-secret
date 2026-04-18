import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const MVP_SHOP_EFFECT_CODES = [
  "targeted_person_hint",
  "reveal_exact_mission_5m",
  "reveal_exact_constraint_5m",
  "force_public_hint_reveal",
  "freeze_timer_60s",
  "halve_slot_cooldown",
  "accelerate_slot_unlock",
  "shorten_own_constraint_timer",
  "reduce_other_mission_timer",
  "double_other_constraint_timer",
] as const;

test("seed cleanup force un catalogue boutique MVP strict", () => {
  const seedSql = readFileSync("supabase/seed/seed.sql", "utf8");

  assert.match(seedSql, /Friday MVP shop cleanup: keep only the approved active catalog\./);

  for (const effectCode of MVP_SHOP_EFFECT_CODES) {
    assert.match(seedSql, new RegExp(`'${effectCode}'`));
  }
});

test("migration tomorrow hotfix désactive les avantages retirés de la boutique", () => {
  const migrationSql = readFileSync("supabase/migrations/0020_shop_mvp_hide_selected_advantages.sql", "utf8");

  for (const effectCode of [
    "free_skip",
    "cancel_skip_penalty",
    "double_next_mission_value",
    "next_correct_accusation_bonus_3",
    "unlock_slot_now",
  ]) {
    assert.match(migrationSql, new RegExp(`'${effectCode}'`));
  }

  assert.match(migrationSql, /is_active = false/);
});
