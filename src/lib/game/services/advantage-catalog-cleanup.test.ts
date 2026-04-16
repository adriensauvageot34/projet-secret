import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const FRIDAY_MVP_EFFECT_CODES = [
  "targeted_person_hint",
  "reveal_exact_mission_5m",
  "reveal_exact_constraint_5m",
  "force_public_hint_reveal",
  "freeze_timer_60s",
  "halve_slot_cooldown",
  "unlock_slot_now",
  "accelerate_slot_unlock",
  "shorten_own_constraint_timer",
  "reduce_other_mission_timer",
  "double_other_constraint_timer",
  "free_skip",
  "cancel_skip_penalty",
  "next_correct_accusation_bonus_3",
  "double_next_mission_value",
] as const;

test("seed cleanup force un catalogue boutique MVP strict", () => {
  const seedSql = readFileSync("supabase/seed/seed.sql", "utf8");

  assert.match(seedSql, /Friday MVP shop cleanup: keep only the approved active catalog\./);

  for (const effectCode of FRIDAY_MVP_EFFECT_CODES) {
    assert.match(seedSql, new RegExp(`'${effectCode}'`));
  }
});

test("migration cleanup force le même catalogue MVP", () => {
  const migrationSql = readFileSync("supabase/migrations/0019_advantage_catalog_mvp_friday_cleanup.sql", "utf8");

  for (const effectCode of FRIDAY_MVP_EFFECT_CODES) {
    assert.match(migrationSql, new RegExp(`'${effectCode}'`));
  }

  assert.match(migrationSql, /else false/);
});
