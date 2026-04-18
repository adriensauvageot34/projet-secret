import type { ClaimedResult } from "@/lib/game/enums";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { PlayerActiveElement } from "@/hooks/use-player-runtime";
import { canClaimRuntimeElement } from "@/lib/game/services/player-runtime-client-state";
import { useCountdown } from "@/hooks/use-countdown";
import type { ElementInstance } from "@/types/domain";

const MISSION_CLAIMS: ClaimedResult[] = ["success", "fail", "skipped"];
const CONSTRAINT_CLAIMS: ClaimedResult[] = ["broken", "skipped"];

type ActiveElementsPanelProps = {
  activeElements: PlayerActiveElement[];
  pendingInstanceId: string | null;
  lastClaimFlowByInstanceId: Record<string, string>;
  onClaim: (instanceId: string, claimedResult: ClaimedResult) => Promise<void>;
};

export function getClaimButtonsForElement(elementType: string | null | undefined): ClaimedResult[] {
  if (elementType === "constraint") {
    return CONSTRAINT_CLAIMS;
  }

  return MISSION_CLAIMS;
}

function CountdownValue({ endsAt }: { endsAt: string | null | undefined }) {
  const secondsLeft = useCountdown(endsAt ?? undefined);

  if (!endsAt) {
    return <span>-</span>;
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <span className={secondsLeft === 0 ? "font-semibold text-amber-300" : "font-semibold text-emerald-300"}>
      {formatted}
    </span>
  );
}

export function formatMmSs(totalSeconds: number): string {
  const safeTotalSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeTotalSeconds / 60);
  const seconds = safeTotalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getSkipRemainingSeconds(skipAvailableAt: string | null | undefined, nowMs = Date.now()): number | null {
  if (!skipAvailableAt) {
    return null;
  }

  const deltaMs = new Date(skipAvailableAt).getTime() - nowMs;
  return Math.max(0, Math.floor(deltaMs / 1000));
}

type SkipAvailability = {
  canSkipNow: boolean;
  label: string;
};

export function getSkipAvailability(skipAvailableAt: string | null | undefined, nowMs = Date.now()): SkipAvailability {
  const secondsLeft = getSkipRemainingSeconds(skipAvailableAt, nowMs);

  if (secondsLeft === null) {
    return { canSkipNow: false, label: "Passer indisponible" };
  }

  if (secondsLeft === 0) {
    return { canSkipNow: true, label: "Passer" };
  }

  return { canSkipNow: false, label: `Passer dans ${formatMmSs(secondsLeft)}` };
}

function ClaimButton({
  claim,
  elementType,
  instance,
  canClaim,
  pendingInstanceId,
  onClaim,
}: {
  claim: ClaimedResult;
  elementType: string | null | undefined;
  instance: ElementInstance;
  canClaim: boolean;
  pendingInstanceId: string | null;
  onClaim: (instanceId: string, claimedResult: ClaimedResult) => Promise<void>;
}) {
  const skipSecondsLeft = useCountdown(claim === "skipped" ? (instance.skip_available_at ?? undefined) : undefined);
  const skipAvailability = !instance.skip_available_at
    ? getSkipAvailability(instance.skip_available_at)
    : skipSecondsLeft === 0
      ? { canSkipNow: true, label: "Passer" }
      : { canSkipNow: false, label: `Passer dans ${formatMmSs(skipSecondsLeft)}` };
  const isSkipLocked = claim === "skipped" && !skipAvailability.canSkipNow;
  const disabled = !canClaim || isSkipLocked;

  let label = getClaimButtonLabel(claim, elementType);
  if (!canClaim && pendingInstanceId === instance.id) {
    label = "Envoi...";
  } else if (claim === "skipped" && isSkipLocked) {
    label = skipAvailability.label;
  }

  return (
    <Button className="w-full" disabled={disabled} onClick={() => void onClaim(instance.id, claim)}>
      {label}
    </Button>
  );
}

export function getClaimButtonLabel(claim: ClaimedResult, elementType: string | null | undefined): string {
  if (claim === "broken" && elementType === "constraint") {
    return "Contrainte rompue";
  }

  if (claim === "success") {
    return "Succès";
  }

  if (claim === "fail") {
    return "Échec";
  }

  if (claim === "skipped") {
    return "Passer";
  }

  return `Claim ${claim}`;
}

export function ActiveElementsPanel({
  activeElements,
  pendingInstanceId,
  lastClaimFlowByInstanceId: _lastClaimFlowByInstanceId,
  onClaim,
}: ActiveElementsPanelProps) {
  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">Éléments actifs</h3>
      {activeElements.length === 0 ? (
        <EmptyState message="Aucun élément actif." />
      ) : (
        <div className="space-y-3">
          {activeElements.map(({ instance, template }) => {
            const canClaim = canClaimRuntimeElement(instance, pendingInstanceId);
            const elementType = template?.elementType;
            const claims = getClaimButtonsForElement(elementType);

            return (
              <div key={instance.id} className="rounded border border-slate-700 p-2 text-xs text-slate-300">
                <p className="text-sm font-medium text-slate-100">{template?.name ?? "Élément actif"}</p>
                <p>
                  Temps restant : <CountdownValue endsAt={instance.ends_at} />
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {claims.map((claim) => (
                    <ClaimButton
                      key={claim}
                      claim={claim}
                      elementType={elementType}
                      instance={instance}
                      canClaim={canClaim}
                      pendingInstanceId={pendingInstanceId}
                      onClaim={onClaim}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
