export type SessionStatus = "preparation" | "live" | "finished" | "archived";
export type ParticipantRole = "player" | "gm";
export type ParticipantStatus = "ready" | "active" | "waiting" | "investigating" | "finished" | "gm";
export type ElementType = "mission" | "constraint";

export type ElementInstanceState =
  | "active"
  | "cooldown"
  | "completed"
  | "failed"
  | "broken"
  | "skipped"
  | "expired"
  | "cancelled"
  | "bait_triggered"
  | "gm_voided";

export type ClaimedResult = "success" | "fail" | "broken" | "skipped";

export type FinalResult =
  | "success"
  | "fail"
  | "broken"
  | "skipped"
  | "cancelled"
  | "bait_triggered"
  | "gm_voided";

export type ProofStatus = "not_required" | "pending" | "provided" | "denied";
export type AccusationStatus = "submitted" | "under_review" | "validated" | "rejected" | "cancelled";
export type AccusationDecision = "correct" | "incorrect" | "fake_bait_triggered" | "not_receivable" | "cancelled_by_gm";
export type AccusationVerdict = "reçue" | "irrecevable" | "en arbitrage" | "juste" | "fausse" | "annulée";
export type GmDecisionType =
  | "validation_override"
  | "accusation_arbitration"
  | "retro_cancel"
  | "fake_element_resolution"
  | "abuse_correction"
  | "manual_bonus"
  | "manual_penalty"
  | "other";
export type GmDecisionStatus = "logged" | "applied" | "cancelled";
export type ScoreEventType =
  | "mission_success"
  | "constraint_success"
  | "combo_2"
  | "combo_3"
  | "mission_constraint_bonus"
  | "skip_penalty"
  | "constraint_break_penalty"
  | "fake_bait_bonus"
  | "manual_adjustment"
  | "retro_validation_cancel"
  | "other";
export type TokenEventType =
  | "accusation_correct"
  | "shop_purchase"
  | "refund"
  | "fake_bait_bonus"
  | "manual_adjustment"
  | "bonus_effect"
  | "cancellation"
  | "other";
export type AdvantageInstanceSource = "shop" | "bonus" | "fake_bait" | "manual";
export type AdvantageInstanceState = "owned" | "active" | "consumed" | "expired" | "cancelled";
export type ValidationMode = "auto" | "proof" | "gm";
export type SkipUnlockRule = "always" | "after_delay" | "with_token" | "disabled";
export type TargetType = "self" | "participant" | "element_instance" | "session";
export type EffectFamily = "score" | "token" | "cooldown" | "reveal" | "protection";

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
