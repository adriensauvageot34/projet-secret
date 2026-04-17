import { listElementInstancesBySession } from "@/lib/db/queries/element-instances";
import type { ElementInstance } from "@/types/domain";

type BlockingElementInstance = Pick<ElementInstance, "participant_id" | "element_template_id" | "state" | "cooldown_until">;

type TemplateGlobalAvailabilityDependencies = {
  listElementInstancesBySession: (sessionId: string) => Promise<BlockingElementInstance[]>;
  now: () => Date;
};

const defaultDependencies: TemplateGlobalAvailabilityDependencies = {
  listElementInstancesBySession,
  now: () => new Date(),
};

export function isElementInstanceBlockingTemplate(instance: BlockingElementInstance, now: Date): boolean {
  if (instance.state === "active") {
    return true;
  }

  if (instance.state !== "cooldown") {
    return false;
  }

  if (!instance.cooldown_until) {
    return false;
  }

  return new Date(instance.cooldown_until).getTime() > now.getTime();
}

export async function listGloballyUnavailableTemplateIdsForSession(
  sessionId: string,
  options: { requesterParticipantId?: string } = {},
  dependencies: TemplateGlobalAvailabilityDependencies = defaultDependencies,
): Promise<Set<string>> {
  const instances = await dependencies.listElementInstancesBySession(sessionId);
  const now = dependencies.now();

  const unavailableIds = instances
    .filter((instance) => {
      if (options.requesterParticipantId && instance.participant_id === options.requesterParticipantId) {
        return false;
      }

      return isElementInstanceBlockingTemplate(instance, now);
    })
    .map((instance) => instance.element_template_id);

  return new Set(unavailableIds);
}

export async function isTemplateGloballyUnavailableInSession(
  sessionId: string,
  templateId: string,
  options: { requesterParticipantId?: string } = {},
  dependencies: TemplateGlobalAvailabilityDependencies = defaultDependencies,
): Promise<boolean> {
  const unavailableTemplateIds = await listGloballyUnavailableTemplateIdsForSession(sessionId, options, dependencies);
  return unavailableTemplateIds.has(templateId);
}
