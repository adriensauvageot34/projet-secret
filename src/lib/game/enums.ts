export type SessionStatus = "preparation" | "live" | "finished" | "archived";
export type ParticipantRole = "player" | "gm";
export type ParticipantStatus = "ready" | "active" | "waiting" | "investigating" | "finished" | "gm";
export type ElementType = "mission" | "constraint";
export type ElementInstanceState = "reserve" | "active" | "claimed" | "resolved" | "expired" | "cancelled";
export type ClaimedResult = "success" | "failure" | "skip" | "none";
export type FinalResult = "success" | "failure" | "skipped" | "void" | "pending";
export type ProofStatus = "not_required" | "pending" | "submitted" | "validated" | "rejected";
export type AccusationStatus = "draft" | "submitted" | "under_review" | "resolved" | "cancelled";
export type AccusationDecision = "pending" | "accepted" | "rejected";
export type AccusationVerdict = "correct" | "incorrect" | "inconclusive" | "none";
export type GmDecisionType = "accusation_adjudication" | "element_validation" | "manual_adjustment";
export type GmDecisionStatus = "draft" | "recorded" | "applied" | "void";
export type ScoreEventType = "element_success" | "element_failure" | "accusation" | "gm_adjustment";
export type TokenEventType = "reward" | "purchase" | "penalty" | "gm_adjustment";
export type AdvantageSource = "shop" | "gm_grant" | "session_bonus";
export type AdvantageInstanceState = "owned" | "active" | "consumed" | "expired" | "cancelled";
export type ValidationMode = "auto" | "proof" | "gm";
export type SkipUnlockRule = "always" | "after_delay" | "with_token" | "disabled";

export type AdvantageTargetType = "self" | "other_player" | "other_participant" | "element" | "none";

export type AdvantageEffectFamily =
  | "info"
  | "tempo"
  | "protection"
  | "pressure"
  | "value"
  | "social"
  | "investigation"
  | "wager"
  | "other"
  | "defense"
  | "exposure";
