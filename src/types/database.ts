import type {
  AdvantageEffectFamily,
  AdvantageInstance,
  AdvantageInstanceSource,
  AdvantageInstanceWithTemplate,
  AdvantageTargetType,
  AdvantageTemplate,
  Participant,
} from "@/types/domain";

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

export interface AdvantageInstanceRow extends AdvantageInstance {}

export type AdvantageInstanceInsert = Omit<AdvantageInstance, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type AdvantageInstanceUpdate = Partial<Omit<AdvantageInstanceInsert, "session_id" | "assigned_player_id">>;

export type AdvantageGrantInsert = Omit<
  AdvantageInstanceInsert,
  "source" | "cost_paid" | "state" | "remaining_uses" | "activated_at" | "expires_at"
> & {
  source: Exclude<AdvantageInstanceSource, "shop">;
  cost_paid?: number;
  state?: "owned" | "active";
  remaining_uses?: number;
  activated_at?: string | null;
  expires_at?: string | null;
};

export type AdvantagePurchaseInsert = Omit<
  AdvantageInstanceInsert,
  "source" | "state" | "cost_paid" | "remaining_uses"
> & {
  cost_paid: number;
  remaining_uses: number;
  state?: "owned";
};

export type AdvantageInstanceWithTemplateRow = AdvantageInstanceWithTemplate;

export interface ParticipantRow extends Participant {}

export type ParticipantInsert = Omit<Participant, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ParticipantUpdate = Partial<Omit<ParticipantInsert, "session_id" | "player_id">>;
