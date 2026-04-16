import { getAdvantageTemplateById } from "@/lib/db/queries/advantage-templates";
import { getLevelById, getLevelByNumber } from "@/lib/db/queries/levels";
import {
  getActiveTimedAdvantagesExpiringBefore,
  getAdvantageInstanceWithTemplateById,
} from "@/lib/db/queries/advantage-instances";
import { getParticipantById } from "@/lib/db/queries/participants";
import {
  activateAdvantageInstance,
  cancelAdvantageInstance,
  consumeAdvantageInstanceUse,
  createAdvantageInstance,
  markAdvantageInstanceExpired,
} from "@/lib/db/mutations/advantage-instances";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdvantageEffectHandler } from "@/lib/game/engine/advantage-effect-registry";
import {
  canActivateAdvantageInstance,
  canConsumeAdvantageUse,
  computeAdvantageTheoreticalExpiresAt,
  getAdvantageEffectiveExpiresAt,
  isAdvantageExpired,
} from "@/lib/game/rules/advantage-instances";
import { canParticipantBuyAdvantage } from "@/lib/game/rules/advantages";
import { validateAdvantageTargeting } from "@/lib/game/rules/advantage-targeting";
import { compensateLatestSkipPenalty, getLatestCompensableSkipPenalty } from "@/lib/game/services/armed-advantages";
import { assertSessionIsLiveById } from "@/lib/game/rules/session";
import type { AdvantageInstance, AdvantageTemplate } from "@/types/domain";
import type { Level, Participant } from "@/types/domain";

type PurchaseContext = {
  participant: Participant;
  template: AdvantageTemplate;
  level: Level;
  levelNumber: number;
};

function assertAtomicPurchaseResult(
  instance: AdvantageInstance,
  context: Pick<PurchaseContext, "participant" | "template">,
): AdvantageInstance {
  if (instance.source !== "shop") {
    throw new Error("Atomic shop purchase returned non-shop source");
  }

  if (instance.state !== "owned") {
    throw new Error("Atomic shop purchase must create an owned advantage instance");
  }

  if (instance.participant_id !== context.participant.id) {
    throw new Error("Atomic shop purchase returned an instance linked to another participant");
  }

  if (instance.session_id !== context.participant.session_id) {
    throw new Error("Atomic shop purchase returned an instance linked to another session");
  }

  if (instance.assigned_player_id !== context.participant.player_id) {
    throw new Error("Atomic shop purchase returned an instance linked to another assigned player");
  }

  if (instance.advantage_template_id !== context.template.id) {
    throw new Error("Atomic shop purchase returned an instance for another template");
  }

  if (instance.cost_paid !== context.template.cost_tokens) {
    throw new Error("Atomic shop purchase returned incoherent cost_paid");
  }

  if (instance.target_participant_id !== null || instance.target_element_instance_id !== null) {
    throw new Error("Atomic shop purchase should not set targets on owned inventory instance");
  }

  return instance;
}

export type PurchaseAdvantageDeps = {
  assertSessionIsLiveByIdEntry: typeof assertSessionIsLiveById;
  loadParticipant: (participantId: string) => Promise<Participant | null>;
  loadTemplate: (templateId: string) => Promise<AdvantageTemplate | null>;
  loadLevelById: (levelId: string) => Promise<Level | null>;
  loadDefaultLevel: () => Promise<Level | null>;
  runAtomicPurchase: (input: {
    participantId: string;
    templateId: string;
    gmNotes?: string;
  }) => Promise<AdvantageInstance>;
};

function createPurchaseDeps(): PurchaseAdvantageDeps {
  return {
    assertSessionIsLiveByIdEntry: assertSessionIsLiveById,
    loadParticipant: getParticipantById,
    loadTemplate: getAdvantageTemplateById,
    loadLevelById: getLevelById,
    loadDefaultLevel: () => getLevelByNumber(1),
    runAtomicPurchase: async (input) => {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.rpc("purchase_advantage_shop", {
        p_participant_id: input.participantId,
        p_template_id: input.templateId,
        p_gm_notes: input.gmNotes ?? null,
      });

      if (error || !data) {
        throw new Error(`Failed to purchase advantage: ${error?.message ?? "unknown error"}`);
      }

      return data as AdvantageInstance;
    },
  };
}

async function buildPurchaseContext(
  input: {
    templateId: string;
    participantId: string;
  },
  deps: PurchaseAdvantageDeps,
): Promise<PurchaseContext> {
  const participant = await deps.loadParticipant(input.participantId);

  if (!participant) {
    throw new Error("Participant not found");
  }
  await deps.assertSessionIsLiveByIdEntry(participant.session_id);

  const template = await deps.loadTemplate(input.templateId);

  if (!template) {
    throw new Error("Advantage template not found");
  }

  const level = participant.current_level_id
    ? await deps.loadLevelById(participant.current_level_id)
    : await deps.loadDefaultLevel();

  if (!level) {
    throw new Error("Participant level not found");
  }

  return {
    participant,
    template,
    level,
    levelNumber: level.level_number,
  };
}

export async function grantAdvantageToParticipant(input: {
  templateId: string;
  sessionId: string;
  participantId: string;
  assignedPlayerId: string;
  source: "bonus" | "fake_bait" | "manual";
  costPaid?: number;
  gmNotes?: string;
}): Promise<AdvantageInstance> {
  await assertSessionIsLiveById(input.sessionId);
  const template = await getAdvantageTemplateById(input.templateId);

  if (!template) {
    throw new Error("Advantage template not found");
  }

  return createAdvantageInstance({
    source: input.source,
    cost_paid: input.costPaid ?? 0,
    state: "owned",
    activated_at: null,
    expires_at: null,
    remaining_uses: template.max_uses,
    gm_notes: input.gmNotes ?? "",
    advantage_template_id: template.id,
    session_id: input.sessionId,
    assigned_player_id: input.assignedPlayerId,
    participant_id: input.participantId,
    target_participant_id: null,
    target_element_instance_id: null,
  });
}

export async function purchaseAdvantageForParticipant(input: {
  templateId: string;
  participantId: string;
  gmNotes?: string;
}, deps: PurchaseAdvantageDeps = createPurchaseDeps()): Promise<AdvantageInstance> {
  const context = await buildPurchaseContext(input, deps);
  const purchaseCheck = canParticipantBuyAdvantage(
    context.template,
    context.levelNumber,
    context.participant.current_tokens,
    context.level.shop_tier_max,
  );

  if (!purchaseCheck.ok) {
    throw new Error(`Cannot purchase advantage: ${purchaseCheck.reasons.join(", ")}`);
  }

  const instance = await deps.runAtomicPurchase(input);
  return assertAtomicPurchaseResult(instance, context);
}

export async function activateParticipantAdvantage(input: {
  advantageInstanceId: string;
  targetParticipantId?: string | null;
  targetElementInstanceId?: string | null;
  activatedAt?: Date;
  forcedExpiresAt?: Date | null;
}): Promise<AdvantageInstance> {
  const instance = await getAdvantageInstanceWithTemplateById(input.advantageInstanceId);

  if (!instance) {
    throw new Error("Advantage instance not found");
  }
  await assertSessionIsLiveById(instance.session_id);

  const activationCheck = canActivateAdvantageInstance(instance, { ...instance.template, is_active: true });

  if (!activationCheck.ok) {
    throw new Error(`Cannot activate advantage: ${activationCheck.reasons.join(", ")}`);
  }

  const targetingCheck = validateAdvantageTargeting({
    target_type: instance.template.target_type,
    participant_id: instance.participant_id,
    target_participant_id: input.targetParticipantId,
    target_element_instance_id: input.targetElementInstanceId,
  });

  if (!targetingCheck.ok) {
    throw new Error(`Invalid target: ${targetingCheck.reasons.join(", ")}`);
  }

  const activatedAt = input.activatedAt ?? new Date();

  const expiresAt =
    input.forcedExpiresAt ??
    computeAdvantageTheoreticalExpiresAt(activatedAt, instance.template.duration_seconds);

  if (instance.template.effect_code === "cancel_skip_penalty") {
    const latestSkipPenalty = await getLatestCompensableSkipPenalty(instance.participant_id);

    if (!latestSkipPenalty) {
      throw new Error("Aucun malus de skip à compenser pour le moment.");
    }
  }

  const activated = await activateAdvantageInstance(instance.id, {
    activated_at: activatedAt.toISOString(),
    expires_at: expiresAt ? expiresAt.toISOString() : null,
    target_participant_id: input.targetParticipantId ?? null,
    target_element_instance_id: input.targetElementInstanceId ?? null,
  });

  if (instance.template.effect_code === "cancel_skip_penalty") {
    await compensateLatestSkipPenalty({
      advantageInstanceId: activated.id,
      participantId: activated.participant_id,
      sessionId: activated.session_id,
    });
  }

  return activated;
}

export async function applyAdvantageUse(input: {
  advantageInstanceId: string;
  context?: Record<string, unknown>;
  gmNotes?: string;
}): Promise<AdvantageInstance> {
  const instance = await getAdvantageInstanceWithTemplateById(input.advantageInstanceId);

  if (!instance) {
    throw new Error("Advantage instance not found");
  }
  await assertSessionIsLiveById(instance.session_id);

  const consumeCheck = canConsumeAdvantageUse(instance, { ...instance.template, is_active: true });

  if (!consumeCheck.ok) {
    throw new Error(`Cannot consume advantage use: ${consumeCheck.reasons.join(", ")}`);
  }

  const contextTargetElementId =
    typeof input.context?.targetElementInstanceId === "string" ? input.context.targetElementInstanceId : null;
  const contextTargetParticipantId =
    typeof input.context?.targetParticipantId === "string" ? input.context.targetParticipantId : null;

  const effectInstance = {
    ...instance,
    target_element_instance_id: contextTargetElementId ?? instance.target_element_instance_id,
    target_participant_id: contextTargetParticipantId ?? instance.target_participant_id,
  };

  const handler = getAdvantageEffectHandler(instance.template.effect_code);
  await handler({
    instance: effectInstance,
    template: instance.template,
    context: input.context ?? {},
  });

  return consumeAdvantageInstanceUse(instance.id, {
    gm_notes: input.gmNotes,
  });
}

export async function expireAdvantageIfNeeded(input: {
  instance: Pick<AdvantageInstance, "id" | "state" | "activated_at" | "expires_at">;
  template: Pick<AdvantageTemplate, "duration_seconds">;
  now?: Date;
}): Promise<AdvantageInstance | null> {
  if (!["owned", "active"].includes(input.instance.state)) {
    return null;
  }

  if (!isAdvantageExpired(input.instance, input.template, input.now)) {
    return null;
  }

  return markAdvantageInstanceExpired(input.instance.id);
}

export async function expireAllOverdueAdvantagesForSession(sessionId: string): Promise<number> {
  const expiring = await getActiveTimedAdvantagesExpiringBefore(new Date());
  const sessionItems = expiring.filter((item) => item.session_id === sessionId);

  let expiredCount = 0;

  for (const item of sessionItems) {
    const effectiveExpiresAt = getAdvantageEffectiveExpiresAt(item, item.template);

    if (!effectiveExpiresAt || effectiveExpiresAt.getTime() > Date.now()) {
      continue;
    }

    await markAdvantageInstanceExpired(item.id);
    expiredCount += 1;
  }

  return expiredCount;
}

export async function expireAllOverdueAdvantagesGlobally(): Promise<number> {
  const expiring = await getActiveTimedAdvantagesExpiringBefore(new Date());

  for (const item of expiring) {
    await markAdvantageInstanceExpired(item.id);
  }

  return expiring.length;
}

export async function cancelAdvantage(advantageInstanceId: string, notes?: string): Promise<AdvantageInstance> {
  return cancelAdvantageInstance(advantageInstanceId, notes);
}
