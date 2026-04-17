import type { ClaimedResult } from "@/lib/game/enums";
import type { ElementInstance } from "@/types/domain";

type RuntimeLike = {
  activeElements: Array<{
    instance: ElementInstance;
  }>;
};

type RuntimeWithReserve = RuntimeLike & {
  reserveTemplates: Array<{
    reserveOfferId: string;
    templateId: string;
    name: string;
    code: string;
    elementType: string;
    validationMode: string;
  }>;
  activeElements: Array<{
    instance: ElementInstance;
    template: {
      id: string;
      name: string;
      code: string;
      elementType: string;
      validationMode: string;
    } | null;
  }>;
};

function isTerminalRuntimeElement(instance: RuntimeLike["activeElements"][number]["instance"]): boolean {
  return instance.state !== "active" || instance.final_result !== null;
}

export function sanitizeRuntimeActiveElements<T extends RuntimeLike>(runtime: T): T {
  return {
    ...runtime,
    activeElements: runtime.activeElements.filter(({ instance }) => !isTerminalRuntimeElement(instance)),
  } as T;
}

export function applyServerRuntimeSnapshot<T extends RuntimeLike>(runtime: T): T {
  return sanitizeRuntimeActiveElements(runtime);
}

export function applyClaimRuntimeOptimisticUpdate<T extends RuntimeLike>(
  runtime: T | null,
  params: { instanceId: string; claimedResult: ClaimedResult; finalResolved: boolean },
): T | null {
  if (!runtime) {
    return runtime;
  }

  const activeElements = runtime.activeElements
    .map((element) => {
      if (element.instance.id !== params.instanceId) {
        return element;
      }

      if (params.finalResolved) {
        return null;
      }

      return {
        ...element,
        instance: {
          ...element.instance,
          claimed_result: params.claimedResult,
        },
      };
    })
    .filter((element): element is T["activeElements"][number] => element !== null);

  return sanitizeRuntimeActiveElements({ ...runtime, activeElements } as T);
}

export function applyActivationRuntimeOptimisticUpdate<T extends RuntimeWithReserve>(
  runtime: T | null,
  params: { reserveOfferId: string; instance: ElementInstance },
): T | null {
  if (!runtime) {
    return runtime;
  }

  const activatedReserveTemplate = runtime.reserveTemplates.find((template) => template.reserveOfferId === params.reserveOfferId);
  const activeElements = [
    {
      instance: params.instance,
      template: activatedReserveTemplate
        ? {
            id: activatedReserveTemplate.templateId,
            name: activatedReserveTemplate.name,
            code: activatedReserveTemplate.code,
            elementType: activatedReserveTemplate.elementType,
            validationMode: activatedReserveTemplate.validationMode,
          }
        : null,
    },
    ...runtime.activeElements.filter((element) => element.instance.id !== params.instance.id),
  ];

  const reserveTemplates = runtime.reserveTemplates.filter((template) => template.reserveOfferId !== params.reserveOfferId);

  return applyServerRuntimeSnapshot({
    ...runtime,
    activeElements,
    reserveTemplates,
  } as T);
}

export function canClaimRuntimeElement(
  instance: RuntimeLike["activeElements"][number]["instance"],
  pendingInstanceId: string | null,
): boolean {
  if (pendingInstanceId === instance.id) {
    return false;
  }

  return instance.state === "active" && instance.final_result === null && instance.claimed_result === null;
}
