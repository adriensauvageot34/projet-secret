import type { ClaimedResult } from "@/lib/game/enums";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/utils/formatting";
import type { PlayerActiveElement } from "@/hooks/use-player-runtime";
import { canClaimRuntimeElement } from "@/lib/game/services/player-runtime-client-state";
import { useCountdown } from "@/hooks/use-countdown";

const MISSION_CLAIMS: ClaimedResult[] = ["success", "fail", "skipped"];
const CONSTRAINT_CLAIMS: ClaimedResult[] = ["fail", "broken", "skipped"];

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

export function ActiveElementsPanel({
  activeElements,
  pendingInstanceId,
  lastClaimFlowByInstanceId,
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
            const flow = lastClaimFlowByInstanceId[instance.id];
            const canClaim = canClaimRuntimeElement(instance, pendingInstanceId);
            const claims = getClaimButtonsForElement(template?.elementType);

            return (
              <div key={instance.id} className="rounded border border-slate-700 p-2 text-xs text-slate-300">
                <p className="text-sm font-medium text-slate-100">{template?.name ?? instance.element_template_id}</p>
                <p>type: {template?.elementType ?? "-"}</p>
                <p>state: {instance.state}</p>
                <p>activeSlotIndex: {instance.active_slot_index ?? "-"}</p>
                <p>activatedAt: {formatDate(instance.activated_at)}</p>
                <p>skipAvailableAt: {formatDate(instance.skip_available_at)}</p>
                <p>endsAt: {formatDate(instance.ends_at)}</p>
                <p>
                  countdown: <CountdownValue endsAt={instance.ends_at} />
                </p>
                <p>flow: {flow ?? "-"}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {claims.map((claim) => (
                    <Button
                      key={claim}
                      className="w-full"
                      disabled={!canClaim}
                      onClick={() => void onClaim(instance.id, claim)}
                    >
                      {!canClaim && pendingInstanceId === instance.id ? "Envoi..." : `Claim ${claim}`}
                    </Button>
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
