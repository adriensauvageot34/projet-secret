import type { AdvantageTemplate } from "@/types/domain";

export function isInstantAdvantage(template: Pick<AdvantageTemplate, "duration_seconds">): boolean {
  return template.duration_seconds === 0;
}

export function isTimedAdvantage(template: Pick<AdvantageTemplate, "duration_seconds">): boolean {
  return template.duration_seconds > 0;
}

export function isPurchasableAtLevel(
  template: Pick<AdvantageTemplate, "min_player_level">,
  levelNumber: number,
): boolean {
  return levelNumber >= template.min_player_level;
}

export function isVisibleInShop(
  template: Pick<AdvantageTemplate, "is_active" | "min_player_level" | "visible_if_locked">,
  levelNumber: number,
): boolean {
  return template.is_active && (levelNumber >= template.min_player_level || template.visible_if_locked);
}

export function requiresTarget(template: Pick<AdvantageTemplate, "target_type">): boolean {
  return template.target_type !== "none";
}

export function targetsParticipant(template: Pick<AdvantageTemplate, "target_type">): boolean {
  return template.target_type === "other_participant";
}

export function targetsPlayer(template: Pick<AdvantageTemplate, "target_type">): boolean {
  return template.target_type === "other_player";
}

export function targetsElement(template: Pick<AdvantageTemplate, "target_type">): boolean {
  return template.target_type === "element";
}

export function targetsSelf(template: Pick<AdvantageTemplate, "target_type">): boolean {
  return template.target_type === "self";
}

export function canParticipantSeeAdvantage(
  template: Pick<AdvantageTemplate, "is_active" | "min_player_level" | "visible_if_locked">,
  levelNumber: number,
): boolean {
  return template.is_active && (levelNumber >= template.min_player_level || template.visible_if_locked);
}

export function canParticipantBuyAdvantage(
  template: Pick<AdvantageTemplate, "is_active" | "min_player_level" | "cost_tokens">,
  levelNumber: number,
  availableTokens: number,
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (!template.is_active) {
    reasons.push("template_inactive");
  }

  if (levelNumber < template.min_player_level) {
    reasons.push("insufficient_level");
  }

  if (availableTokens < template.cost_tokens) {
    reasons.push("insufficient_tokens");
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}

export function getAdvantageDurationMs(template: Pick<AdvantageTemplate, "duration_seconds">): number {
  return template.duration_seconds * 1_000;
}

export function getDefaultRemainingUses(template: Pick<AdvantageTemplate, "max_uses">): number {
  return template.max_uses;
}

export type ShopTemplateView = {
  template: AdvantageTemplate;
  is_visible: boolean;
  is_unlocked: boolean;
  can_buy: boolean;
  missing_level: number;
  missing_tokens: number;
};

export function buildShopViewForLevel(
  templates: AdvantageTemplate[],
  levelNumber: number,
  availableTokens: number,
): ShopTemplateView[] {
  return templates.map((template) => {
    const isUnlocked = levelNumber >= template.min_player_level;
    const isVisible = canParticipantSeeAdvantage(template, levelNumber);
    const canBuy = template.is_active && isUnlocked && availableTokens >= template.cost_tokens;

    return {
      template,
      is_visible: isVisible,
      is_unlocked: isUnlocked,
      can_buy: canBuy,
      missing_level: Math.max(0, template.min_player_level - levelNumber),
      missing_tokens: Math.max(0, template.cost_tokens - availableTokens),
    };
  });
}
