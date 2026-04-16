import test from "node:test";
import assert from "node:assert/strict";
import { compensateLatestSkipPenalty, consumeFirstArmedAdvantage } from "@/lib/game/services/armed-advantages";
import type { AdvantageInstanceWithTemplate } from "@/types/domain";

function makeActiveAdvantage(effectCode: string): AdvantageInstanceWithTemplate {
  return {
    id: "00000000-0000-0000-0000-000000000011",
    source: "shop",
    cost_paid: 2,
    state: "active",
    activated_at: "2026-01-01T00:00:00.000Z",
    expires_at: null,
    remaining_uses: 1,
    gm_notes: "",
    advantage_template_id: "00000000-0000-0000-0000-000000000012",
    session_id: "00000000-0000-0000-0000-000000000013",
    assigned_player_id: "00000000-0000-0000-0000-000000000014",
    participant_id: "00000000-0000-0000-0000-000000000015",
    target_participant_id: null,
    target_element_instance_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    template: {
      name: "Buff",
      effect_code: effectCode,
      effect_family: "value",
      target_type: "none",
      duration_seconds: 0,
      max_uses: 1,
      cost_tokens: 2,
      description_player: "desc",
    },
  };
}

test("consumeFirstArmedAdvantage: consomme uniquement le buff armé correspondant", async () => {
  const consumedIds: string[] = [];

  const found = await consumeFirstArmedAdvantage(
    { participantId: "p1", effectCode: "free_skip" },
    {
      getParticipantActiveAdvantages: async () => [
        makeActiveAdvantage("double_next_mission_value"),
        makeActiveAdvantage("free_skip"),
      ],
      consumeAdvantageInstanceUse: async (id) => {
        consumedIds.push(id);
        return {} as never;
      },
    },
  );

  assert.equal(found?.template.effect_code, "free_skip");
  assert.deepEqual(consumedIds, ["00000000-0000-0000-0000-000000000011"]);
});

test("compensateLatestSkipPenalty: crée une compensation inverse et consomme l'avantage", async () => {
  const calls: Array<string> = [];

  await compensateLatestSkipPenalty(
    {
      advantageInstanceId: "adv-1",
      participantId: "p1",
      sessionId: "s1",
    },
    {
      listScoreEvents: async () => [{
        id: "se-1",
        participant_id: "p1",
        session_id: "s1",
        event_type: "skip_penalty",
        delta_points: -2,
        notes: null,
        created_at: "2026-01-01T00:01:00.000Z",
        related_element_instance_id: "el-1",
        related_accusation_id: null,
        related_gm_decision_id: null,
        session_name: null,
        participant_display_name: null,
        related_element_state: null,
        related_accusation_status: null,
        related_gm_decision_label: null,
        related_element_type: null,
        score_event_label: "skip",
        is_positive_score_event: false,
        is_negative_score_event: true,
        targeted_by_gm_decisions: [],
      }],
      createScoreEvent: async (input) => {
        calls.push(`score:${input.deltaPoints}`);
        return {} as never;
      },
      consumeAdvantageInstanceUse: async () => {
        calls.push("consume");
        return {} as never;
      },
    },
  );

  assert.deepEqual(calls, ["score:2", "consume"]);
});
