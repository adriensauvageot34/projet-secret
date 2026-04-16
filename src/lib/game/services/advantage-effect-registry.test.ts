import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getAdvantageEffectHandler, type AdvantageEffectRuntime } from "@/lib/game/engine/advantage-effect-registry";
import type { AdvantageEffectFamily } from "@/lib/game/enums";

function makeRuntimeSpy() {
  const calls = {
    grantTokens: [] as Array<{ deltaTokens: number; participantId: string }>,
    grantScore: [] as Array<{ deltaPoints: number; participantId: string }>,
    setSkipAvailableNow: [] as Array<{ elementInstanceId: string }>,
    reduceElementTimer: [] as Array<{ elementInstanceId: string; reductionSeconds: number }>,
  };

  const runtime: AdvantageEffectRuntime = {
    now: () => new Date("2026-01-01T00:00:00.000Z"),
    grantTokens: async (input) => {
      calls.grantTokens.push({ deltaTokens: input.deltaTokens, participantId: input.participantId });
    },
    grantScore: async (input) => {
      calls.grantScore.push({ deltaPoints: input.deltaPoints, participantId: input.participantId });
    },
    setSkipAvailableNow: async (input) => {
      calls.setSkipAvailableNow.push({ elementInstanceId: input.elementInstanceId });
    },
    reduceElementTimer: async (input) => {
      calls.reduceElementTimer.push({ elementInstanceId: input.elementInstanceId, reductionSeconds: input.reductionSeconds });
    },
  };

  return { runtime, calls };
}

function makeContext(overrides: Partial<Parameters<ReturnType<typeof getAdvantageEffectHandler>>[0]> = {}) {
  return {
    instance: {
      id: "adv-1",
      participant_id: "part-1",
      session_id: "sess-1",
      target_element_instance_id: "elem-1",
    },
    template: {
      effect_code: "unknown",
      effect_family: "info" as AdvantageEffectFamily,
    },
    context: {},
    ...overrides,
  };
}

test("famille info: reveal_mission_hint produit un effet runtime observable", async () => {
  const { runtime, calls } = makeRuntimeSpy();
  const handler = getAdvantageEffectHandler("reveal_mission_hint");

  await handler(makeContext({ runtime, template: { effect_code: "reveal_mission_hint", effect_family: "info" as AdvantageEffectFamily } }));

  assert.deepEqual(calls.grantTokens, [{ deltaTokens: 1, participantId: "part-1" }]);
});

test("famille value: next_correct_accusation_bonus_3 crédite +3", async () => {
  const { runtime, calls } = makeRuntimeSpy();
  const handler = getAdvantageEffectHandler("next_correct_accusation_bonus_3");

  await handler(makeContext({ runtime, template: { effect_code: "next_correct_accusation_bonus_3", effect_family: "value" as AdvantageEffectFamily } }));

  assert.deepEqual(calls.grantTokens, [{ deltaTokens: 3, participantId: "part-1" }]);
});

test("famille defense: accusation_shield_3m applique un effet score", async () => {
  const { runtime, calls } = makeRuntimeSpy();
  const handler = getAdvantageEffectHandler("accusation_shield_3m");

  await handler(makeContext({ runtime, template: { effect_code: "accusation_shield_3m", effect_family: "defense" as AdvantageEffectFamily } }));

  assert.deepEqual(calls.grantScore, [{ deltaPoints: 1, participantId: "part-1" }]);
});

test("famille tempo: free_skip déverrouille le skip de la cible", async () => {
  const { runtime, calls } = makeRuntimeSpy();
  const handler = getAdvantageEffectHandler("free_skip");

  await handler(makeContext({ runtime, template: { effect_code: "free_skip", effect_family: "tempo" as AdvantageEffectFamily } }));

  assert.deepEqual(calls.setSkipAvailableNow, [{ elementInstanceId: "elem-1" }]);
});

test("famille pressure: reduce_other_mission_timer réduit bien le timer cible", async () => {
  const { runtime, calls } = makeRuntimeSpy();
  const handler = getAdvantageEffectHandler("reduce_other_mission_timer");

  await handler(makeContext({ runtime, template: { effect_code: "reduce_other_mission_timer", effect_family: "pressure" as AdvantageEffectFamily } }));

  assert.deepEqual(calls.reduceElementTimer, [{ elementInstanceId: "elem-1", reductionSeconds: 120 }]);
});

test("ciblage: les effets element-target refusent une cible absente", async () => {
  const { runtime } = makeRuntimeSpy();
  const handler = getAdvantageEffectHandler("free_skip");

  await assert.rejects(() =>
    handler(
      makeContext({
        runtime,
        instance: { id: "adv-1", participant_id: "part-1", session_id: "sess-1", target_element_instance_id: null },
        template: { effect_code: "free_skip", effect_family: "tempo" as AdvantageEffectFamily },
      }),
    ),
  );
});

test("routes avantages: activate/use branchent bien les services (pas de stub)", () => {
  const activateRoute = readFileSync("src/app/api/advantages/activate/route.ts", "utf8");
  const useRoute = readFileSync("src/app/api/advantages/use/route.ts", "utf8");

  assert.match(activateRoute, /activateAdvantage\(/);
  assert.match(useRoute, /applyAdvantageUse\(/);
});
