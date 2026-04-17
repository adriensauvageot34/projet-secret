import type { ClaimedResult } from "@/lib/game/enums";
import type { ElementInstance } from "@/types/domain";

type RuntimeLike = {
  activeElements: Array<{
    instance: ElementInstance;
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

export function canClaimRuntimeElement(
  instance: RuntimeLike["activeElements"][number]["instance"],
  pendingInstanceId: string | null,
): boolean {
  if (pendingInstanceId === instance.id) {
    return false;
  }

  return instance.state === "active" && instance.final_result === null && instance.claimed_result === null;
}
