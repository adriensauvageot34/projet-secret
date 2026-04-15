import type { AdvantageTemplate } from "@/types/domain";

export interface AdvantageBuyResult {
  ok: boolean;
  reasons: string[];
}

export interface AdvantageShopViewItem {
  template: AdvantageTemplate;
  is_visible: boolean;
  is_unlocked: boolean;
  can_buy: boolean;
  missing_level: number;
  missing_tokens: number;
}

export function isInstantAdvantage(template: AdvantageTemplate): boolean {
  return template.duration_seconds === 0;
}

export function isTimedAdvantage(template: AdvantageTemplate): boolean {
  return template.duration_seconds > 0;
}

export function isPurchasableAtLevel(template: AdvantageTemplate, levelNumber: number): boolean {
  return levelNumber >= template.min_player_level;
}

export function isVisibleInShop(template: AdvantageTemplate, levelNumber: number): boolean {
  return template.is_active && (isPurchasableAtLevel(template, levelNumber) || template.visible_if_locked);
}

export function requiresTarget(template: AdvantageTemplate): boolean {
  return template.target_type !== "none";
}

export function targetsParticipant(template: AdvantageTemplate): boolean {
  return template.target_type === "other_participant";
}

export function targetsPlayer(template: AdvantageTemplate): boolean {
  return template.target_type === "other_player";
}

export function targetsElement(template: AdvantageTemplate): boolean {
  return template.target_type === "element";
}

export function targetsSelf(template: AdvantageTemplate): boolean {
  return template.target_type === "self";
}

export function canParticipantSeeAdvantage(template: AdvantageTemplate, levelNumber: number): boolean {
  return isVisibleInShop(template, levelNumber);
}

export function canParticipantBuyAdvantage(
  template: AdvantageTemplate,
  levelNumber: number,
  availableTokens: number,
): AdvantageBuyResult {
  const reasons: string[] = [];

  if (!template.is_active) {
    reasons.push("template_inactive");
  }

  if (!isPurchasableAtLevel(template, levelNumber)) {
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

export function getAdvantageDurationMs(template: AdvantageTemplate): number {
  return template.duration_seconds * 1000;
}

export function getDefaultRemainingUses(template: AdvantageTemplate): number {
  return template.max_uses;
}

export function buildShopViewForLevel(
  templates: AdvantageTemplate[],
  levelNumber: number,
  availableTokens: number,
): AdvantageShopViewItem[] {
  return templates.map((template) => {
    const isVisible = canParticipantSeeAdvantage(template, levelNumber);
    const isUnlocked = isPurchasableAtLevel(template, levelNumber);
    const buyResult = canParticipantBuyAdvantage(template, levelNumber, availableTokens);

    return {
      template,
      is_visible: isVisible,
      is_unlocked: isUnlocked,
      can_buy: buyResult.ok,
      missing_level: Math.max(0, template.min_player_level - levelNumber),
      missing_tokens: Math.max(0, template.cost_tokens - availableTokens),
    };
  });
}
