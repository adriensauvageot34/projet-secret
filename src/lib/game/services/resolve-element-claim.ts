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
  recomputeParticipantSlots: (participantId: string) => Promise<unknown>;
  updateCombo: (participantId: string, success: boolean) => Promise<number>;
  updateParticipantLevel: (participantId: string) => Promise<string | null>;
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
  recomputeParticipantSlots,
  updateCombo,
  updateParticipantLevel,
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

async function applyFinalResolutionEffects(
  resolvedInstance: ElementInstance,
  template: ClaimTemplateContext,
  dependencies: ResolveElementClaimDependencies,
): Promise<void> {
  const scoreEventType = createScoreEventFromInstance(resolvedInstance, template);

  if (scoreEventType) {
    const existingScoreEventTypes = await dependencies.listResolutionScoreEvents(resolvedInstance.id);
    if (!existingScoreEventTypes.includes(scoreEventType)) {
      await dependencies.createScoreEvent({
        participantId: resolvedInstance.participant_id,
        sessionId: resolvedInstance.session_id,
        eventType: scoreEventType,
        deltaPoints: computeResolutionDeltaPoints(template, scoreEventType),
        relatedElementInstanceId: resolvedInstance.id,
        notes: "auto_resolution",
      });
    }
  }

  await dependencies.updateCombo(resolvedInstance.participant_id, resolvedInstance.final_result === "success");
  await dependencies.recomputeParticipantSlots(resolvedInstance.participant_id);
  await dependencies.updateParticipantLevel(resolvedInstance.participant_id);
}

export async function resolveElementClaim(
  instanceId: string,
  claimedResult: ClaimedResult,
  dependencies: ResolveElementClaimDependencies = defaultDependencies,
): Promise<ResolveElementClaimOutput> {
  const claimedInstance = await dependencies.claimResult(instanceId, claimedResult);
  const template = assertTemplate(
    await dependencies.getElementTemplateById(claimedInstance.element_template_id),
    claimedInstance.element_template_id,
  );

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
