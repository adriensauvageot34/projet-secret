import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const seedSqlPath = join(process.cwd(), "supabase/seed/seed.sql");
const migrationPath = join(process.cwd(), "supabase/migrations/0014_participants_gm_role_status_guards.sql");

function loadFile(path: string): string {
  return readFileSync(path, "utf8").replace(/\s+/g, " ");
}

test("session seed bootstrap: participants are initialized with clean runtime counters", () => {
  const seed = loadFile(seedSqlPath);

  assert.match(
    seed,
    /insert into participants \( session_id, player_id, public_slug, current_level_id, display_name, role, current_status, current_score, current_tokens, combo_streak_current, mission_slot_max, constraint_slot_max, completed_elements_count, waiting_slot_count, blocked_slot_count \) select .*? pfs\.current_status, 0, 1, 0, 2, 2, 0, 0, 0 from players_for_session/s,
  );

  assert.match(seed, /on conflict \(session_id, player_id\) do update set .*?current_score = excluded\.current_score,/s);
  assert.match(seed, /current_tokens = excluded\.current_tokens,/);
  assert.match(seed, /combo_streak_current = excluded\.combo_streak_current,/);
  assert.match(seed, /completed_elements_count = excluded\.completed_elements_count,/);
  assert.match(seed, /waiting_slot_count = excluded\.waiting_slot_count,/);
  assert.match(seed, /blocked_slot_count = excluded\.blocked_slot_count,/);
  assert.match(seed, /insert into token_events \(/);
  assert.match(seed, /'level_reward:level_1'/);
});

test("session seed bootstrap: GM participant is explicit and attached to session", () => {
  const seed = loadFile(seedSqlPath);

  assert.match(seed, /when p\.display_name = 'Adrien' then 'gm' else 'player' end as role/);
  assert.match(seed, /when p\.display_name = 'Adrien' then 'gm' else 'ready' end as current_status/);
  assert.match(seed, /update sessions s set session_gm_participant_id = gm_participant\.id/s);
  assert.match(seed, /gm_player\.display_name = 'Adrien'/);
});

test("session seed bootstrap: Greg and Alexis are excluded from canonical session participants", () => {
  const seed = loadFile(seedSqlPath);

  assert.match(seed, /when p\.display_name in \('Greg', 'Alexis'\) then false when p\.can_play = true or p\.can_be_gm = true then true else false end as include_in_session/);
  assert.doesNotMatch(seed, /delete from participants existing/);
  assert.match(seed, /where pfs\.include_in_session = true/);
});

test("session seed bootstrap: canonical roster includes Alyson and Louis display name", () => {
  const seed = loadFile(seedSqlPath);

  assert.match(seed, /\('Alyson', null, null, null, true, true, false, null\)/);
  assert.match(seed, /\('Louis', null, null, null, true, true, false, null\)/);
  assert.match(seed, /when 'Alyson' then 'alyson-a2l7'/);
  assert.match(seed, /when 'Louis' then 'mec-de-lou-m5s4'/);
  assert.doesNotMatch(seed, /'Mec de Lou'/);
});

test("schema guardrails: one GM max per session and role/status coherence", () => {
  const migration = loadFile(migrationPath);

  assert.match(migration, /participants_role_status_coherence_check/);
  assert.match(migration, /\(role = 'gm' and current_status = 'gm'\)/);
  assert.match(migration, /\(role = 'player' and current_status in \('ready', 'active', 'waiting', 'investigating', 'finished'\)\)/);
  assert.match(migration, /create unique index if not exists uq_participants_one_gm_per_session/);
  assert.match(migration, /where role = 'gm'/);
});
