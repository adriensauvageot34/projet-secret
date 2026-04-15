import type { AdvantageTemplate } from "@/types/domain";
import type { AdvantageInstance } from "@/types/domain";

const ACTIVE_STATES = new Set(["owned", "active"]);

export function computeAdvantageTheoreticalExpiresAt(
  activatedAt: string | Date | null | undefined,
  durationSeconds: number,
): Date | null {
  if (!activatedAt) {
    return null;
  }

  if (durationSeconds <= 0) {
    return null;
  }

  const activatedDate = activatedAt instanceof Date ? activatedAt : new Date(activatedAt);

  if (Number.isNaN(activatedDate.getTime())) {
    return null;
  }

  return new Date(activatedDate.getTime() + durationSeconds * 1_000);
}

export function getAdvantageEffectiveExpiresAt(
  instance: Pick<AdvantageInstance, "expires_at" | "activated_at">,
  template: Pick<AdvantageTemplate, "duration_seconds">,
): Date | null {
  if (instance.expires_at) {
    return new Date(instance.expires_at);
  }

  return computeAdvantageTheoreticalExpiresAt(instance.activated_at, template.duration_seconds);
}

export function isAdvantageExpired(
  instance: Pick<AdvantageInstance, "expires_at" | "activated_at">,
  template: Pick<AdvantageTemplate, "duration_seconds">,
  now = new Date(),
): boolean {
  const expiresAt = getAdvantageEffectiveExpiresAt(instance, template);

  if (!expiresAt) {
    return false;
  }

  return expiresAt.getTime() <= now.getTime();
}

export function getAdvantageEffectiveRemainingUses(
  instance: Pick<AdvantageInstance, "remaining_uses"> & Partial<Record<"remaining_uses", number | null | undefined>>,
  template: Pick<AdvantageTemplate, "max_uses">,
): number {
  if (instance.remaining_uses === null || instance.remaining_uses === undefined) {
    return template.max_uses;
  }

  return instance.remaining_uses;
}

export function isAdvantageOwned(instance: Pick<AdvantageInstance, "state">): boolean {
  return instance.state === "owned";
}

export function isAdvantageActive(instance: Pick<AdvantageInstance, "state">): boolean {
  return instance.state === "active";
}

export function isAdvantageConsumed(instance: Pick<AdvantageInstance, "state">): boolean {
  return instance.state === "consumed";
}

export function isAdvantageCancelled(instance: Pick<AdvantageInstance, "state">): boolean {
  return instance.state === "cancelled";
}

export function isAdvantageUsable(
  instance: Pick<AdvantageInstance, "state" | "remaining_uses" | "expires_at" | "activated_at">,
  template: Pick<AdvantageTemplate, "duration_seconds" | "max_uses" | "is_active">,
  now = new Date(),
): boolean {
  if (!template.is_active) {
    return false;
  }

  if (!ACTIVE_STATES.has(instance.state)) {
    return false;
  }

  if (isAdvantageCancelled(instance)) {
    return false;
  }

  if (isAdvantageExpired(instance, template, now)) {
    return false;
  }

  return getAdvantageEffectiveRemainingUses(instance, template) > 0;
}

export function canActivateAdvantageInstance(
  instance: Pick<AdvantageInstance, "state" | "remaining_uses" | "expires_at" | "activated_at">,
  template: Pick<AdvantageTemplate, "duration_seconds" | "max_uses" | "is_active">,
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (!template.is_active) {
    reasons.push("template_inactive");
  }

  if (!["owned", "active"].includes(instance.state)) {
    reasons.push("invalid_state");
  }

  if (getAdvantageEffectiveRemainingUses(instance, template) <= 0) {
    reasons.push("no_remaining_uses");
  }

  if (isAdvantageExpired(instance, template)) {
    reasons.push("already_expired");
  }

  return { ok: reasons.length === 0, reasons };
}

export function canConsumeAdvantageUse(
  instance: Pick<AdvantageInstance, "state" | "remaining_uses" | "expires_at" | "activated_at">,
  template: Pick<AdvantageTemplate, "duration_seconds" | "max_uses" | "is_active">,
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (!ACTIVE_STATES.has(instance.state)) {
    reasons.push("invalid_state");
  }

  if (isAdvantageExpired(instance, template)) {
    reasons.push("expired");
  }

  if (getAdvantageEffectiveRemainingUses(instance, template) <= 0) {
    reasons.push("no_remaining_uses");
  }

  return { ok: reasons.length === 0, reasons };
}

export function buildAdvantageInstanceLabel(
  instance: Pick<AdvantageInstance, "state" | "remaining_uses">,
  template: Pick<AdvantageTemplate, "name">,
  participantDisplayName: string,
): string {
  return `${template.name} · ${participantDisplayName} · ${instance.state} · uses:${instance.remaining_uses}`;
}
