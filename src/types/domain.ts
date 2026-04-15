import type {
  AccusationDecision,
  AccusationStatus,
  AccusationVerdict,
  AdvantageInstanceState,
  AdvantageSource,
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
export interface AdvantageTemplate { id: string; code: string; title: string; description: string; effect_code: string; price_tokens: number; tier: number; }
export interface AdvantageInstance { id: string; session_id: string; owner_participant_id: string; target_participant_id: string | null; template_id: string; source: AdvantageSource; state: AdvantageInstanceState; remaining_uses: number; activated_at?: string | null; expires_at?: string | null; created_at: string; }
export interface Accusation { id: string; session_id: string; accuser_participant_id: string; accused_participant_id: string; adjudicated_by_participant_id?: string | null; suspect_element_type?: ElementType | null; suspect_template_id?: string | null; linked_element_instance_id?: string | null; status: AccusationStatus; decision: AccusationDecision; verdict: AccusationVerdict; justification?: string | null; created_at: string; resolved_at?: string | null; }
export interface GMDecision { id: string; session_id: string; decision_type: GmDecisionType; status: GmDecisionStatus; made_by_participant_id?: string | null; target_participant_id?: string | null; other_target_participant_id?: string | null; accusation_id?: string | null; element_instance_id?: string | null; rationale?: string | null; created_at: string; applied_at?: string | null; }
export interface ScoreEvent { id: string; session_id: string; participant_id: string; event_type: ScoreEventType; delta: number; source_table?: string | null; source_id?: string | null; created_at: string; }
export interface TokenEvent { id: string; session_id: string; participant_id: string; event_type: TokenEventType; delta: number; source_table?: string | null; source_id?: string | null; created_at: string; }
export interface FinalWheelSpin { id: string; session_id: string; participant_id: string; outcome_template_id: string; spun_at: string; notes?: string | null; }
