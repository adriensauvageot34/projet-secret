import {
  activateElement as activateElementInstance,
  getEndsAt,
  getSkipAvailableAt,
} from "@/lib/db/mutations/element-instances";

export async function activateElement(participantId: string, templateId: string, slotIndex: number, isFake = false) {
  const instance = await activateElementInstance({ participantId, templateId, slotIndex, isFake });

  return {
    instance,
    endsAt: getEndsAt(instance),
    skipAvailableAt: getSkipAvailableAt(instance),
  };
}
