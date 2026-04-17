import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { PlayerReserveTemplate } from "@/hooks/use-player-runtime";

type ReservePanelProps = {
  templates: PlayerReserveTemplate[];
  pendingTemplateId: string | null;
  onActivate: (reserveOfferId: string) => Promise<void>;
};

function createReserveActivateClickHandler(params: {
  displayedReserveOfferId: string;
  onActivate: (reserveOfferId: string) => Promise<void>;
}) {
  const { displayedReserveOfferId, onActivate } = params;

  return () => {
    console.info("[reserve-panel] activate click", {
      displayedReserveOfferId,
      sentReserveOfferId: displayedReserveOfferId,
    });
    void onActivate(displayedReserveOfferId);
  };
}

export function ReservePanel({ templates, pendingTemplateId, onActivate }: ReservePanelProps) {
  console.info("[reserve-panel] render", {
    reserveOfferIds: templates.map((template) => template.reserveOfferId),
  });

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">Réserve visible</h3>
      {templates.length === 0 ? (
        <EmptyState message="Aucun élément disponible dans la réserve." />
      ) : (
        <div className="space-y-2">
          {templates.map((template) => {
            const displayedReserveOfferId = template.reserveOfferId;
            const handleActivateClick = createReserveActivateClickHandler({
              displayedReserveOfferId,
              onActivate,
            });

            return (
              <div key={displayedReserveOfferId} className="rounded border border-slate-700 p-2" data-reserve-offer-id={displayedReserveOfferId}>
                <p className="text-sm font-medium">{template.name}</p>
                <p className="text-xs text-slate-400">{template.code} · {template.elementType} · diff {template.difficulty}</p>
                <p className="text-xs text-slate-400">Durée {template.durationSeconds}s · validation {template.validationMode}</p>
                <p className="text-[10px] text-slate-500">offerId: {displayedReserveOfferId}</p>
                <Button
                  className="mt-2 w-full"
                  disabled={pendingTemplateId === displayedReserveOfferId}
                  onClick={handleActivateClick}
                >
                  {pendingTemplateId === displayedReserveOfferId ? "Activation..." : "Activer"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export { createReserveActivateClickHandler };
