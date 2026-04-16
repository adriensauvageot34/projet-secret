import { submitProof as submitProofMutation } from "@/lib/db/mutations/element-instances";
import { getElementInstanceById } from "@/lib/db/queries/element-instances";
import { getElementTemplateById } from "@/lib/db/queries/element-templates";
import { assertSessionIsLiveById } from "@/lib/game/rules/session";
import type { ElementInstance, ElementTemplate } from "@/types/domain";

type SubmitProofDependencies = {
  assertSessionIsLiveById: (sessionId: string) => Promise<void>;
  getElementInstanceById: (instanceId: string) => Promise<ElementInstance | null>;
  getElementTemplateById: (templateId: string) => Promise<ElementTemplate | null>;
  submitProof: (instanceId: string) => Promise<ElementInstance>;
};

const defaultDependencies: SubmitProofDependencies = {
  assertSessionIsLiveById,
  getElementInstanceById,
  getElementTemplateById,
  submitProof: submitProofMutation,
};

export type SubmitProofOutput = {
  ok: true;
  flow: "proof_submitted" | "already_provided";
  instance: ElementInstance;
};

function assertProofSubmittable(instance: ElementInstance, template: ElementTemplate): void {
  if (template.validation_mode !== "proof") {
    throw new Error("Proof submission is only available for proof validation mode");
  }

  if (instance.state !== "active" || instance.final_result) {
    throw new Error("Proof cannot be submitted for a resolved element instance");
  }

  if (!instance.claimed_result) {
    throw new Error("Proof cannot be submitted before claiming a result");
  }

  if (instance.proof_status === "denied") {
    throw new Error("Proof has already been denied for this element instance");
  }
}

export async function submitProof(
  instanceId: string,
  dependencies: Partial<SubmitProofDependencies> = {},
): Promise<SubmitProofOutput> {
  const resolvedDependencies = { ...defaultDependencies, ...dependencies };
  const instance = await resolvedDependencies.getElementInstanceById(instanceId);

  if (!instance) {
    throw new Error("Element instance not found");
  }
  await resolvedDependencies.assertSessionIsLiveById(instance.session_id);

  const template = await resolvedDependencies.getElementTemplateById(instance.element_template_id);

  if (!template) {
    throw new Error(`Element template not found for instance template ${instance.element_template_id}`);
  }

  assertProofSubmittable(instance, template);

  if (instance.proof_status === "provided") {
    return {
      ok: true,
      flow: "already_provided",
      instance,
    };
  }

  if (instance.proof_status !== "pending") {
    throw new Error(`Proof cannot be submitted from status ${instance.proof_status}`);
  }

  const updatedInstance = await resolvedDependencies.submitProof(instanceId);

  return {
    ok: true,
    flow: "proof_submitted",
    instance: updatedInstance,
  };
}
