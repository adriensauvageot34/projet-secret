import { getLevelByNumber } from "@/lib/db/queries/levels";
import { getActiveTemplates } from "@/lib/db/queries/element-templates";
import type { ElementTemplate, Participant } from "@/types/domain";

export function isMission(template: Pick<ElementTemplate, "element_type">): boolean {
  return template.element_type === "mission";
}

export function isConstraint(template: Pick<ElementTemplate, "element_type">): boolean {
  return template.element_type === "constraint";
}

export function canAutoValidate(template: Pick<ElementTemplate, "validation_mode">): boolean {
  return template.validation_mode === "auto";
}

export function requiresProof(template: Pick<ElementTemplate, "validation_mode">): boolean {
  return template.validation_mode === "proof";
}

export function requiresGM(template: Pick<ElementTemplate, "validation_mode">): boolean {
  return template.validation_mode === "gm";
}

export function canBeFake(template: Pick<ElementTemplate, "can_be_fake">): boolean {
  return template.can_be_fake;
}

export function isEligibleForReserve(
  template: Pick<ElementTemplate, "is_active" | "can_appear_in_reserve">,
): boolean {
  return template.is_active && template.can_appear_in_reserve;
}

export function getEndTime(
  template: Pick<ElementTemplate, "duration_seconds">,
  activatedAt: string | Date,
): Date {
  const start = typeof activatedAt === "string" ? new Date(activatedAt) : activatedAt;
  return new Date(start.getTime() + template.duration_seconds * 1_000);
}

export function getSkipUnlockTime(
  template: Pick<ElementTemplate, "duration_seconds" | "skip_unlock_rule">,
  activatedAt: string | Date,
): Date {
  const start = typeof activatedAt === "string" ? new Date(activatedAt) : activatedAt;
  const ratio = template.skip_unlock_rule === "one_half" ? 0.5 : 1 / 3;
  return new Date(start.getTime() + Math.ceil(template.duration_seconds * ratio) * 1_000);
}

export const computeEndTime = getEndTime;
export const computeSkipTime = getSkipUnlockTime;

export async function getAvailableTemplatesForParticipant(participant: { current_level: number }): Promise<ElementTemplate[]> {
  const [level, templates] = await Promise.all([
    getLevelByNumber(participant.current_level),
    getActiveTemplates(),
  ]);

  if (!level) {
    return [];
  }

  return templates.filter((template) => {
    if (isMission(template)) {
      return template.difficulty <= level.mission_difficulty_max;
    }

    if (isConstraint(template)) {
      return template.difficulty <= level.constraint_difficulty_max;
    }

    return false;
  });
}
