import test from "node:test";
import assert from "node:assert/strict";
import { finishSessionForMvp } from "@/lib/game/services/finish-session";

const baseSession = {
  id: "session-1",
  name: "S",
  session_date: "2026-01-01",
  location: "Paris",
  status: "live" as const,
  rules_announced_at: "",
  game_start_at: "",
  game_end_at: "",
  max_active_missions: 2,
  max_active_constraints: 2,
  reserve_per_difficulty: 3,
  fake_unlock_level: 3,
  fake_cycle_every_n_completed: 3,
  game_mode: "mvp",
  notes: "",
  gm_session_notes: "",
  session_gm_participant_id: null,
  created_at: "",
  updated_at: "",
};

test("finish-session: passe en finished", async () => {
  let finished = false;
  const result = await finishSessionForMvp("session-1", {
    getSessionById: async () => baseSession,
    finishSession: async () => {
      finished = true;
      return { ...baseSession, status: "finished" };
    },
  });

  assert.equal(finished, true);
  assert.equal(result.status, "finished");
});

test("finish-session: idempotent si déjà finished", async () => {
  let called = false;
  const result = await finishSessionForMvp("session-1", {
    getSessionById: async () => ({ ...baseSession, status: "finished" }),
    finishSession: async () => {
      called = true;
      return { ...baseSession, status: "finished" };
    },
  });

  assert.equal(called, false);
  assert.equal(result.status, "finished");
});
