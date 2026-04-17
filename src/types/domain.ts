import type {
  AccusationDecision,
  AccusationStatus,
  AccusationVerdict,
  ClaimedResult,
  ElementInstanceState,
  ElementType,
  FinalResult,
  GmDecisionStatus,
  GmDecisionType,
  ParticipantRole,
  ParticipantStatus,
  ProofStatus,
  ScoreEventType,
  SessionStatus,
  TokenEventType,
  ValidationMode,
} from "@/lib/game/enums";

export interface Session {
  id: string;
  name: string;
  session_date: string;
  location: string;
  status: SessionStatus;
  rules_announced_at: string;
  game_start_at: string;
  game_end_at: string;
  max_active_missions: number;
  max_active_constraints: number;
  reserve_per_difficulty: number;
  fake_unlock_level: number;
  fake_cycle_every_n_completed: number;
  game_mode: string;
  notes: string;
  gm_session_notes: string;
  session_gm_participant_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface Player {
  id: string;
  display_name: string;
  nickname: string | null;
  photo_url: string | null;
  notes_profile: string | null;
  is_active: boolean;
  can_play: boolean;
  can_be_gm: boolean;
  role_tag: string | null;
  created_at: string;
  updated_at: string;
}
export interface Participant {
  id: string;
  session_id: string;
  player_id: string;
  public_slug: string;
  current_level_id: string | null;
  display_name: string;
  role: ParticipantRole;
  current_status: ParticipantStatus;
  current_score: number;
  current_tokens: number;
  combo_streak_current: number;
  mission_slot_max: number;
  constraint_slot_max: number;
  completed_elements_count: number;
  waiting_slot_count: number;
  blocked_slot_count: number;
  created_at: string;
  updated_at: string;
}
export interface Level {
  id: string;
  level_number: number;
  label: string;
  min_score: number;
  max_score: number;
  mission_difficulty_max: number;
  constraint_difficulty_max: number;
  shop_tier_max: number;
  fake_elements_unlocked: boolean;
  missions_visible_per_difficulty: number;
  constraints_visible_per_difficulty: number;
  privilege_text: string;
  visible_order: number;
  created_at: string;
  updated_at: string;
}
export interface ElementTemplate {
  id: string;
  code: string;
  name: string;
  element_type: ElementType;
  category: string;
  difficulty: number;
  base_points: number;
  duration_seconds: number;
  skip_unlock_rule: "one_third" | "one_half";
  validation_mode: ValidationMode;
  proof_required: boolean;
  can_be_fake: boolean;
  can_appear_in_reserve: boolean;
  is_active: boolean;
  player_display_text: string;
  ui_tag_1: string;
  ui_tag_2: string;
  success_button_label: string;
  failure_button_label: string;
  created_at: string;
  updated_at: string;
}
export interface ElementInstance {
  id: string;
  participant_id: string;
  session_id: string;
  element_template_id: string;
  state: ElementInstanceState;
  active_slot_index?: number | null;
  is_fake: boolean;
  claimed_result?: ClaimedResult | null;
  final_result?: FinalResult | null;
  proof_status: ProofStatus;
  activated_at?: string | null;
  skip_available_at?: string | null;
  ends_at?: string | null;
  cooldown_until?: string | null;
  points_gained: number;
  points_lost: number;
  tokens_gained: number;
  was_retroactively_invalidated: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParticipantReserveOffer {
  id: string;
  session_id: string;
  participant_id: string;
  element_template_id: string;
  offered_at: string;
  revoked_at: string | null;
  replaced_by_offer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParticipantReserveOfferWithTemplate extends ParticipantReserveOffer {
  template: Pick<
    ElementTemplate,
    "id" | "name" | "code" | "element_type" | "difficulty" | "duration_seconds" | "validation_mode"
  >;
}

export type AdvantageEffectFamily =
  | "investigation"
  | "tempo"
  | "defense"
  | "value"
  | "wager"
  | "pressure"
  | "exposure"
  | "info"
  | "protection"
  | "social"
  | "other";

export type AdvantageTargetType =
  | "self"
  | "other_participant"
  | "other_player"
  | "element"
  | "none";

export interface AdvantageTemplate {
  id: string;
  name: string;

  tier: number;
  min_player_level: number;
  cost_tokens: number;
  visible_if_locked: boolean;
  is_active: boolean;

  effect_family: AdvantageEffectFamily;
  effect_code: string;
  target_type: AdvantageTargetType;
  duration_seconds: number;

  is_consumable: boolean;
  max_uses: number;

  description_player: string;
  description_admin: string;

  created_at: string;
  updated_at: string;
}
export type AdvantageInstanceSource = "shop" | "bonus" | "fake_bait" | "manual";

export type AdvantageInstanceState =
  | "owned"
  | "active"
  | "consumed"
  | "expired"
  | "cancelled";

export interface AdvantageInstance {
  id: string;

  source: AdvantageInstanceSource;
  cost_paid: number;
  state: AdvantageInstanceState;

  activated_at: string | null;
  expires_at: string | null;

  remaining_uses: number;
  gm_notes: string;

  advantage_template_id: string;
  session_id: string;
  assigned_player_id: string;
  participant_id: string;

  target_participant_id: string | null;
  target_element_instance_id: string | null;

  created_at: string;
  updated_at: string;
}

export interface AdvantageInstanceWithTemplate extends AdvantageInstance {
  template: Pick<
    AdvantageTemplate,
    | "name"
    | "effect_code"
    | "effect_family"
    | "target_type"
    | "duration_seconds"
    | "max_uses"
    | "cost_tokens"
    | "description_player"
  >;
}

export interface AdvantageInstanceWithResolvedContext extends AdvantageInstanceWithTemplate {
  participant_display_name?: string | null;
  target_participant_display_name?: string | null;
  target_element_template_name?: string | null;
}
export interface Accusation {
  id: string;
  session_id: string;
  accuser_participant_id: string;
  accused_participant_id: string;
  adjudicated_by_participant_id?: string | null;
  suspected_type: ElementType;
  suspected_template_id: string;
  related_element_instance_id?: string | null;
  status: AccusationStatus;
  decision?: AccusationDecision | null;
  verdict?: AccusationVerdict | null;
  justification: string;
  created_at: string;
  adjudicated_at?: string | null;
  is_receivable?: boolean | null;
  triggered_fake_bait: boolean;
  reward_tokens: number;
  cancelled_previous_validation: boolean;
  notes_admin?: string | null;
}
export interface GMDecision {
  id: string;
  session_id: string;
  decision_type: GmDecisionType;
  decision_label: string;
  reason: string;
  notes?: string | null;
  score_impact?: number | null;
  token_impact?: number | null;
  is_retroactive: boolean;
  status: GmDecisionStatus;
  made_by_participant_id: string;
  assigned_player_id?: string | null;
  target_participant_id?: string | null;
  other_target_participant_id?: string | null;
  related_element_instance_id?: string | null;
  target_element_instance_id?: string | null;
  target_accusation_id?: string | null;
  target_score_event_id?: string | null;
  target_token_event_id?: string | null;
  created_at: string;
}
export interface ScoreEvent {
  id: string;
  session_id: string;
  participant_id: string;
  event_type: ScoreEventType;
  delta_points: number;
  notes?: string | null;
  related_element_instance_id?: string | null;
  related_accusation_id?: string | null;
  related_gm_decision_id?: string | null;
  created_at: string;
}

export interface ScoreEventDetail extends ScoreEvent {
  session_name: string | null;
  participant_display_name: string | null;
  related_element_state: string | null;
  related_accusation_status: string | null;
  related_gm_decision_label: string | null;
  related_element_type: string | null;
  score_event_label: string;
  is_positive_score_event: boolean;
  is_negative_score_event: boolean;
  targeted_by_gm_decisions: Pick<GMDecision, "id" | "decision_label" | "decision_type" | "status" | "created_at">[];
}
export interface TokenEvent {
  id: string;
  session_id: string;
  participant_id: string;
  event_type: TokenEventType;
  delta_tokens: number;
  created_at: string;
  notes?: string | null;
  related_accusation_id?: string | null;
  related_advantage_instance_id?: string | null;
  related_gm_decision_id?: string | null;
  related_element_instance_id?: string | null;
}

export interface TokenEventDetail extends TokenEvent {
  session_name: string | null;
  participant_display_name: string | null;
  related_accusation_status: string | null;
  related_advantage_name: string | null;
  related_gm_decision_label: string | null;
  token_event_label: string;
  is_positive: boolean;
  is_negative: boolean;
}
export interface FinalWheelSpin { id: string; session_id: string; participant_id: string; outcome_template_id: string; spun_at: string; notes?: string | null; }
