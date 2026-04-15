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
export type AccusationStatus = "draft" | "submitted" | "under_review" | "resolved" | "cancelled";
export type AccusationDecision = "pending" | "accepted" | "rejected";
export type AccusationVerdict = "correct" | "incorrect" | "inconclusive" | "none";
export type GmDecisionType = "accusation_adjudication" | "element_validation" | "manual_adjustment";
export type GmDecisionStatus = "draft" | "recorded" | "applied" | "void";
export type ScoreEventType =
  | "element_success"
  | "element_failure"
  | "mission_success"
  | "mission_fail"
  | "mission_broken"
  | "constraint_success"
  | "constraint_fail"
  | "constraint_broken"
  | "accusation"
  | "gm_adjustment";
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
