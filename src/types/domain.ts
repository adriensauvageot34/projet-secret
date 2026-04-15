import type {
  AccusationDecision,
  AccusationStatus,
  AccusationVerdict,
  AdvantageEffectFamily,
  AdvantageInstanceState,
  AdvantageSource,
  AdvantageTargetType,
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
  bottom_count_for_wheel: number;
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
  points: number;
  duration_minutes: number;
  skip_unlock_minutes: number;
  validation_mode: ValidationMode;
  proof_required: boolean;
  can_be_fake: boolean;
  can_appear_in_reserve: boolean;
  is_active: boolean;
  player_description: string;
  short_label: string;
  ui_tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ElementInstance {
  id: string;
  session_id: string;
  participant_id: string;
  template_id: string;
  slot_index: number;
  state: ElementInstanceState;
  claimed_result: ClaimedResult;
  final_result: FinalResult;
  proof_status: ProofStatus;
  activated_at?: string | null;
  skip_available_at?: string | null;
  ends_at?: string | null;
  cooldown_until?: string | null;
  points_gained: number;
  points_lost: number;
  tokens_gained: number;
  created_at: string;
  updated_at: string;
}

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

export type AdvantageTemplateRow = AdvantageTemplate;

export type AdvantageTemplateInsert = Omit<AdvantageTemplate, "id" | "created_at" | "updated_at">;

export type AdvantageTemplateUpdate = Partial<Omit<AdvantageTemplateInsert, "effect_code">>;

export interface AdvantageInstance {
  id: string;
  session_id: string;
  owner_participant_id: string;
  target_participant_id: string | null;
  advantage_template_id: string;
  source: AdvantageSource;
  state: AdvantageInstanceState;
  remaining_uses: number;
  activated_at?: string | null;
  expires_at?: string | null;
  created_at: string;
}

export interface Accusation {
  id: string;
  session_id: string;
  accuser_participant_id: string;
  accused_participant_id: string;
  adjudicated_by_participant_id?: string | null;
  suspect_element_type?: ElementType | null;
  suspect_template_id?: string | null;
  linked_element_instance_id?: string | null;
  status: AccusationStatus;
  decision: AccusationDecision;
  verdict: AccusationVerdict;
  justification?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface GMDecision {
  id: string;
  session_id: string;
  decision_type: GmDecisionType;
  status: GmDecisionStatus;
  made_by_participant_id?: string | null;
  target_participant_id?: string | null;
  other_target_participant_id?: string | null;
  accusation_id?: string | null;
  element_instance_id?: string | null;
  rationale?: string | null;
  created_at: string;
  applied_at?: string | null;
}

export interface ScoreEvent {
  id: string;
  session_id: string;
  participant_id: string;
  event_type: ScoreEventType;
  delta: number;
  source_table?: string | null;
  source_id?: string | null;
  created_at: string;
}

export interface TokenEvent {
  id: string;
  session_id: string;
  participant_id: string;
  event_type: TokenEventType;
  delta: number;
  source_table?: string | null;
  source_id?: string | null;
  created_at: string;
}

export interface FinalWheelSpin {
  id: string;
  session_id: string;
  participant_id: string;
  outcome_template_id: string;
  spun_at: string;
  notes?: string | null;
}
