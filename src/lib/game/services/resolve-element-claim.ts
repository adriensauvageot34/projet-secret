import { resolveElement } from "@/lib/db/mutations/element-instances";
import type { FinalResult } from "@/lib/game/enums";

export async function resolveElementClaim(instanceId: string, finalResult: FinalResult) {
  const instance = await resolveElement(instanceId, finalResult);
  return { ok: true, instance };
}
