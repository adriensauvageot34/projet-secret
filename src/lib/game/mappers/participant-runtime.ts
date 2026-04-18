import type { ElementInstance, ElementTemplate } from "@/types/domain";

export type PlayerRuntimeTemplateSummary = {
  id: string;
  name: string;
  elementType: ElementTemplate["element_type"];
};

export type PlayerRuntimeActiveElement = {
  instance: ElementInstance;
  template: PlayerRuntimeTemplateSummary | null;
};

export function mapPlayerActiveElements(
  activeInstances: ElementInstance[],
  templatesById: Map<string, ElementTemplate>,
): PlayerRuntimeActiveElement[] {
  return activeInstances.map((instance) => {
    const template = templatesById.get(instance.element_template_id);

    return {
      instance,
      template: template
        ? {
            id: template.id,
            name: template.name,
            elementType: template.element_type,
          }
        : null,
    };
  });
}
