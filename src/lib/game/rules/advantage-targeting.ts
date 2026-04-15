import type { AdvantageTargetType } from "@/types/domain";

type TargetingInput = {
  target_type: AdvantageTargetType;
  participant_id: string;
  target_participant_id?: string | null;
  target_element_instance_id?: string | null;
};

export function validateAdvantageTargeting(input: TargetingInput): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (input.target_type === "self") {
    return { ok: true, reasons };
  }

  if (input.target_type === "other_participant" || input.target_type === "other_player") {
    if (!input.target_participant_id) {
      reasons.push("missing_target_participant_id");
    }

    if (input.target_participant_id === input.participant_id) {
      reasons.push("target_participant_must_be_other");
    }

    return { ok: reasons.length === 0, reasons };
  }

  if (input.target_type === "element") {
    if (!input.target_element_instance_id) {
      reasons.push("missing_target_element_instance_id");
    }

    return { ok: reasons.length === 0, reasons };
  }

  if (input.target_type === "none") {
    return { ok: true, reasons };
  }

  reasons.push("unsupported_target_type");
  return { ok: false, reasons };
}
