import { claimResult, resolveElement } from "@/lib/db/mutations/element-instances";
import { getElementTemplateById } from "@/lib/db/queries/element-templates";
import type { ClaimedResult, FinalResult, ValidationMode } from "@/lib/game/enums";
import type { ElementInstance, ElementTemplate } from "@/types/domain";

type ClaimTemplateContext = Pick<ElementTemplate, "validation_mode" | "duration_seconds">;

type ResolveElementClaimDependencies = {
  claimResult: (instanceId: string, claimedResult: ClaimedResult) => Promise<ElementInstance>;
  resolveElement: (
    instanceId: string,
    finalResult: FinalResult,
    options?: { skippedCooldownMinutes?: number },
  ) => Promise<ElementInstance>;
  getElementTemplateById: (templateId: string) => Promise<ElementTemplate | null>;
};

export type ElementClaimFlow = "auto_resolved" | "proof_pending" | "gm_pending";

export type ResolveElementClaimOutput = {
  ok: true;
  claimedInstance: ElementInstance;
  instance: ElementInstance;
  flow: ElementClaimFlow;
  finalResolved: boolean;
};

const defaultDependencies: ResolveElementClaimDependencies = {
  claimResult,
  resolveElement,
  getElementTemplateById,
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

  return {
    ok: true,
    claimedInstance,
    instance: resolvedInstance,
    flow: "auto_resolved",
    finalResolved: true,
  };
}

export { computeSkippedCooldownMinutes };
