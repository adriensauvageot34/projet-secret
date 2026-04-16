import type { ElementTemplate, Level } from "@/types/domain";

export type ReserveTemplateCandidate = Pick<
  ElementTemplate,
  "id" | "name" | "code" | "element_type" | "difficulty" | "duration_seconds" | "validation_mode" | "is_active" | "can_appear_in_reserve"
>;

export type ReserveLevelPolicy = Pick<
  Level,
  "mission_difficulty_max" | "constraint_difficulty_max" | "missions_visible_per_difficulty" | "constraints_visible_per_difficulty"
>;

function getPerDifficultyLimit(level: ReserveLevelPolicy, elementType: "mission" | "constraint"): number {
  return elementType === "mission" ? level.missions_visible_per_difficulty : level.constraints_visible_per_difficulty;
}

function getDifficultyCap(level: ReserveLevelPolicy, elementType: "mission" | "constraint"): number {
  return elementType === "mission" ? level.mission_difficulty_max : level.constraint_difficulty_max;
}

export function buildVisibleReserveTemplates(
  templates: ReserveTemplateCandidate[],
  level: ReserveLevelPolicy,
): ReserveTemplateCandidate[] {
  const byBucket = new Map<string, number>();

  return templates.filter((template) => {
    if (!template.is_active || !template.can_appear_in_reserve) {
      return false;
    }

    if (template.element_type !== "mission" && template.element_type !== "constraint") {
      return false;
    }

    const difficultyCap = getDifficultyCap(level, template.element_type);
    if (template.difficulty > difficultyCap) {
      return false;
    }

    const bucket = `${template.element_type}:${template.difficulty}`;
    const currentCount = byBucket.get(bucket) ?? 0;
    const limit = getPerDifficultyLimit(level, template.element_type);

    if (currentCount >= limit) {
      return false;
    }

    byBucket.set(bucket, currentCount + 1);
    return true;
  });
}
