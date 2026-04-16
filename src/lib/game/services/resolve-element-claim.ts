import { claimResult, createScoreEventFromInstance, resolveElement } from "@/lib/db/mutations/element-instances";
import { recomputeParticipantSlots, updateCombo, updateParticipantLevel } from "@/lib/db/mutations/participants";
import { listScoreEvents } from "@/lib/db/queries/score-events";
import { getElementTemplateById } from "@/lib/db/queries/element-templates";
import { createScoreEvent } from "@/lib/game/services/score-events";
import type { ClaimedResult, FinalResult, ScoreEventType, ValidationMode } from "@/lib/game/enums";
import type { ElementInstance, ElementTemplate } from "@/types/domain";

type ClaimTemplateContext = Pick<ElementTemplate, "validation_mode" | "duration_seconds" | "base_points" | "element_type">;

type ResolveElementClaimDependencies = {
  claimResult: (instanceId: string, claimedResult: ClaimedResult) => Promise<ElementInstance>;
  resolveElement: (
    instanceId: string,
    finalResult: FinalResult,
    options?: { skippedCooldownMinutes?: number },
  ) => Promise<ElementInstance>;
  getElementTemplateById: (templateId: string) => Promise<ElementTemplate | null>;
  createScoreEvent: (input: {
    participantId: string;
    sessionId: string;
    eventType: ScoreEventType;
    deltaPoints: number;
    relatedElementInstanceId: string;
    notes?: string;
  }) => Promise<unknown>;
  listResolutionScoreEvents: (instanceId: string) => Promise<ScoreEventType[]>;
  getLatestSuccessScoreEventType: (
    participantId: string,
    excludedElementInstanceId: string,
  ) => Promise<Extract<ScoreEventType, "mission_success" | "constraint_success"> | null>;
  recomputeParticipantSlots: (participantId: string) => Promise<unknown>;
  updateCombo: (participantId: string, success: boolean) => Promise<number>;
  updateParticipantLevel: (participantId: string) => Promise<string | null>;
  now: () => Date;
};

export type ElementClaimFlow = "auto_resolved" | "proof_pending" | "gm_pending";

export type ResolveElementClaimOutput = {
  ok: true;
  claimedInstance: ElementInstance;
  instance: ElementInstance;
  flow: ElementClaimFlow;
  finalResolved: boolean;
};

const RESOLUTION_SCORE_EVENTS: readonly ScoreEventType[] = [
  "mission_success",
  "constraint_success",
  "skip_penalty",
  "constraint_break_penalty",
  "combo_2",
  "combo_3",
  "mission_constraint_bonus",
] as const;

const defaultDependencies: ResolveElementClaimDependencies = {
  claimResult,
  resolveElement,
  getElementTemplateById,
  createScoreEvent,
  listResolutionScoreEvents: async (instanceId) => {
    const events = await listScoreEvents({ relatedElementInstanceId: instanceId });
    return events
      .map((event) => event.event_type)
      .filter((eventType): eventType is ScoreEventType => RESOLUTION_SCORE_EVENTS.includes(eventType));
  },
  getLatestSuccessScoreEventType: async (participantId, excludedElementInstanceId) => {
    const [missionEvents, constraintEvents] = await Promise.all([
      listScoreEvents({ participantId, eventType: "mission_success" }),
      listScoreEvents({ participantId, eventType: "constraint_success" }),
    ]);

    const latestSuccess = [...missionEvents, ...constraintEvents]
      .filter((event) => event.related_element_instance_id !== excludedElementInstanceId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

    if (!latestSuccess) {
      return null;
    }

    return latestSuccess.event_type === "mission_success" ? "mission_success" : "constraint_success";
  },
  recomputeParticipantSlots,
  updateCombo,
  updateParticipantLevel,
  now: () => new Date(),
};

function assertTemplate(template: ElementTemplate | null, templateId: string): ElementTemplate {
  if (!template) {
    throw new Error(`Element template not found for instance template ${templateId}`);
  }

  return template;
}

function mapClaimedToFinalResult(claimedResult: ClaimedResult): FinalResult {
  return claimedResult;
}

function assertNotAlreadyFinalized(instance: Pick<ElementInstance, "final_result">): void {
  if (instance.final_result !== null) {
    throw new Error("Element instance is already terminally resolved");
  }
}

function assertSkipAvailable(instance: Pick<ElementInstance, "skip_available_at">, now: Date): void {
  if (!instance.skip_available_at) {
    throw new Error("Skip is not available for this element instance");
  }

  if (new Date(instance.skip_available_at).getTime() > now.getTime()) {
    throw new Error("Skip is not available yet");
  }
}

function computeSkippedCooldownMinutes(template: ClaimTemplateContext): number {
  return Math.max(0, Math.ceil(template.duration_seconds / 60));
}

function getPendingFlow(validationMode: ValidationMode): ElementClaimFlow {
  if (validationMode === "proof") {
    return "proof_pending";
  }

  return "gm_pending";
}

function computeResolutionDeltaPoints(template: ClaimTemplateContext, eventType: ScoreEventType): number {
  const basePoints = Math.abs(template.base_points);
  if (basePoints <= 0) {
    throw new Error(`base_points must be > 0 to create ${eventType}`);
  }

  if (eventType === "skip_penalty" || eventType === "constraint_break_penalty") {
    return -basePoints;
  }

  return basePoints;
}

function isDuplicateResolutionScoreEventError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("duplicate key") || message.includes("unique constraint");
}

async function createInstanceBoundScoreEvent(
  dependencies: ResolveElementClaimDependencies,
  input: {
    participantId: string;
    sessionId: string;
    relatedElementInstanceId: string;
    eventType: ScoreEventType;
    deltaPoints: number;
  },
): Promise<void> {
  try {
    await dependencies.createScoreEvent({
      participantId: input.participantId,
      sessionId: input.sessionId,
      eventType: input.eventType,
      deltaPoints: input.deltaPoints,
      relatedElementInstanceId: input.relatedElementInstanceId,
      notes: "auto_resolution",
    });
  } catch (error) {
    if (!isDuplicateResolutionScoreEventError(error)) {
      throw error;
    }
  }
}

async function applyFinalResolutionEffects(
  resolvedInstance: ElementInstance,
  template: ClaimTemplateContext,
  dependencies: ResolveElementClaimDependencies,
): Promise<void> {
  const existingScoreEventTypes = await dependencies.listResolutionScoreEvents(resolvedInstance.id);
  const scoreEventType = resolvedInstance.is_fake ? null : createScoreEventFromInstance(resolvedInstance, template);

  if (scoreEventType && !existingScoreEventTypes.includes(scoreEventType)) {
    await createInstanceBoundScoreEvent(dependencies, {
      participantId: resolvedInstance.participant_id,
      sessionId: resolvedInstance.session_id,
      eventType: scoreEventType,
      deltaPoints: computeResolutionDeltaPoints(template, scoreEventType),
      relatedElementInstanceId: resolvedInstance.id,
    });
  }

  const comboCountsAsSuccess = resolvedInstance.final_result === "success" && !resolvedInstance.is_fake;
  const nextCombo = await dependencies.updateCombo(resolvedInstance.participant_id, comboCountsAsSuccess);
  const comboBonusesToApply: ScoreEventType[] = [];

  if (comboCountsAsSuccess) {
    if (nextCombo === 2) {
      comboBonusesToApply.push("combo_2");

      const latestSuccessType = await dependencies.getLatestSuccessScoreEventType(
        resolvedInstance.participant_id,
        resolvedInstance.id,
      );

      if (
        (scoreEventType === "mission_success" && latestSuccessType === "constraint_success")
        || (scoreEventType === "constraint_success" && latestSuccessType === "mission_success")
      ) {
        comboBonusesToApply.push("mission_constraint_bonus");
      }
    }

    if (nextCombo === 3) {
      comboBonusesToApply.push("combo_3");
    }
  }

  for (const bonusEventType of comboBonusesToApply) {
    if (!existingScoreEventTypes.includes(bonusEventType)) {
      await createInstanceBoundScoreEvent(dependencies, {
        participantId: resolvedInstance.participant_id,
        sessionId: resolvedInstance.session_id,
        eventType: bonusEventType,
        deltaPoints: 1,
        relatedElementInstanceId: resolvedInstance.id,
      });
    }
  }

  await dependencies.recomputeParticipantSlots(resolvedInstance.participant_id);
  await dependencies.updateParticipantLevel(resolvedInstance.participant_id);
}

export async function resolveElementClaim(
  instanceId: string,
  claimedResult: ClaimedResult,
  dependencies: ResolveElementClaimDependencies = defaultDependencies,
): Promise<ResolveElementClaimOutput> {
  const claimedInstance = await dependencies.claimResult(instanceId, claimedResult);
  assertNotAlreadyFinalized(claimedInstance);

  const template = assertTemplate(
    await dependencies.getElementTemplateById(claimedInstance.element_template_id),
    claimedInstance.element_template_id,
  );

  if (claimedResult === "skipped") {
    assertSkipAvailable(claimedInstance, dependencies.now());
  }

  const shouldAutoResolve = claimedResult === "skipped" || template.validation_mode === "auto";

  if (!shouldAutoResolve) {
    return {
      ok: true,
      claimedInstance,
      instance: claimedInstance,
      flow: getPendingFlow(template.validation_mode),
      finalResolved: false,
    };
  }

  const finalResult = mapClaimedToFinalResult(claimedResult);
  const options = finalResult === "skipped" ? { skippedCooldownMinutes: computeSkippedCooldownMinutes(template) } : undefined;
  const resolvedInstance = await dependencies.resolveElement(instanceId, finalResult, options);
  await applyFinalResolutionEffects(resolvedInstance, template, dependencies);

  return {
    ok: true,
    claimedInstance,
    instance: resolvedInstance,
    flow: "auto_resolved",
    finalResolved: true,
  };
}

export { computeSkippedCooldownMinutes };
