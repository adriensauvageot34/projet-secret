import type { AdvantageEffectFamily, AdvantageTargetType, AdvantageTemplate } from "@/types/domain";

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface AdvantageTemplateRow extends AdvantageTemplate {}

export type AdvantageTemplateInsert = Omit<
  AdvantageTemplate,
  "id" | "created_at" | "updated_at"
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type AdvantageTemplateUpdate = Partial<Omit<AdvantageTemplateInsert, "effect_code">> & {
  effect_code?: string;
};

export type AdvantageTemplateRuntimePatch = {
  is_active?: boolean;
  visible_if_locked?: boolean;
  min_player_level?: number;
  cost_tokens?: number;
  duration_seconds?: number;
  max_uses?: number;
  effect_family?: AdvantageEffectFamily;
  target_type?: AdvantageTargetType;
};
