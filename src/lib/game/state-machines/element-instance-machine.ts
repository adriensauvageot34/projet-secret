import type { ElementInstanceState, FinalResult } from "@/lib/game/enums";
import type { ElementInstance } from "@/types/domain";

export const ELEMENT_INSTANCE_TERMINAL_STATES: readonly ElementInstanceState[] = [
  "completed",
  "failed",
  "broken",
  "skipped",
  "expired",
  "cancelled",
  "bait_triggered",
  "gm_voided",
] as const;

export function isActive(instance: Pick<ElementInstance, "state">): boolean {
  return instance.state === "active";
}

export function isCooldown(instance: Pick<ElementInstance, "state">): boolean {
  return instance.state === "cooldown";
}

export function isTerminal(instance: Pick<ElementInstance, "state">): boolean {
  return ELEMENT_INSTANCE_TERMINAL_STATES.includes(instance.state);
}

export function mapFinalResultToState(finalResult: FinalResult): ElementInstanceState {
  switch (finalResult) {
    case "success":
      return "completed";
    case "fail":
      return "failed";
    case "broken":
      return "broken";
    case "skipped":
      return "cooldown";
    case "cancelled":
      return "cancelled";
    case "bait_triggered":
      return "bait_triggered";
    case "gm_voided":
      return "gm_voided";
    default: {
      const exhaustiveCheck: never = finalResult;
      return exhaustiveCheck;
    }
  }
}
