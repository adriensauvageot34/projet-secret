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

export interface Session { id: string; name: string; status: SessionStatus; date: string; location?: string | null; gm_player_id?: string | null; starts_at?: string | null; ends_at?: string | null; notes?: string | null; created_at: string; updated_at: string; }
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
export interface Participant { id: string; session_id: string; player_id: string; role: ParticipantRole; current_status: ParticipantStatus; current_score: number; current_tokens: number; current_level: number; combo_count: number; mission_slots: number; constraint_slots: number; created_at: string; updated_at: string; }
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
export interface ElementTemplate { id: string; element_type: ElementType; code: string; title: string; difficulty: number; validation_mode: ValidationMode; can_be_fake: boolean; in_reserve_pool: boolean; player_display_text: string; success_button_label: string; failure_button_label: string; }
export interface ElementInstance { id: string; session_id: string; participant_id: string; template_id: string; slot_index: number; state: ElementInstanceState; claimed_result: ClaimedResult; final_result: FinalResult; proof_status: ProofStatus; activated_at?: string | null; skip_available_at?: string | null; ends_at?: string | null; cooldown_until?: string | null; points_gained: number; points_lost: number; tokens_gained: number; created_at: string; updated_at: string; }
export interface AdvantageTemplate { id: string; code: string; title: string; description: string; effect_code: string; price_tokens: number; tier: number; }
export interface AdvantageInstance { id: string; session_id: string; participant_id: string; template_id: string; source: AdvantageSource; state: AdvantageInstanceState; remaining_uses: number; activated_at?: string | null; expires_at?: string | null; created_at: string; }
export interface Accusation { id: string; session_id: string; accuser_participant_id: string; accused_participant_id: string; suspect_element_type?: ElementType | null; suspect_template_id?: string | null; linked_element_instance_id?: string | null; status: AccusationStatus; decision: AccusationDecision; verdict: AccusationVerdict; justification?: string | null; created_at: string; resolved_at?: string | null; }
export interface GMDecision { id: string; session_id: string; decision_type: GmDecisionType; status: GmDecisionStatus; actor_participant_id?: string | null; accusation_id?: string | null; element_instance_id?: string | null; rationale?: string | null; created_at: string; applied_at?: string | null; }
export interface ScoreEvent { id: string; session_id: string; participant_id: string; event_type: ScoreEventType; delta: number; source_table?: string | null; source_id?: string | null; created_at: string; }
export interface TokenEvent { id: string; session_id: string; participant_id: string; event_type: TokenEventType; delta: number; source_table?: string | null; source_id?: string | null; created_at: string; }
export interface FinalWheelSpin { id: string; session_id: string; participant_id: string; outcome_template_id: string; spun_at: string; notes?: string | null; }
