"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/utils/formatting";
import {
  isGmTicketEffectCode,
  isGmTicketParticipantTargetRequired,
  toPlayerAdvantageStateLabel,
} from "@/lib/game/gm-ticket-advantages";
import type { AdvantageInstanceWithTemplate } from "@/types/domain";

type ParticipantOption = {
  id: string;
  displayName: string;
};

export function InventoryPanel({
  inventory,
  targets,
  pendingAdvantageActionId,
  onActivateAdvantage,
  onUseAdvantage,
}: {
  inventory: AdvantageInstanceWithTemplate[];
  targets: ParticipantOption[];
  pendingAdvantageActionId: string | null;
  onActivateAdvantage: (params: { advantageInstanceId: string; targetParticipantId?: string | null }) => Promise<void>;
  onUseAdvantage: (params: { advantageInstanceId: string }) => Promise<void>;
}) {
  const [targetByInstanceId, setTargetByInstanceId] = useState<Record<string, string>>({});

  const defaultTargetId = useMemo(() => targets[0]?.id ?? "", [targets]);

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">Inventaire</h3>
      {inventory.length === 0 ? (
        <EmptyState message="Aucun avantage en inventaire." />
      ) : (
        <div className="space-y-2 text-xs text-slate-300">
          {inventory.map((item) => {
            const isGmTicket = isGmTicketEffectCode(item.template.effect_code);
            const isTargetRequired = isGmTicketParticipantTargetRequired(item.template.effect_code);
            const selectedTarget = targetByInstanceId[item.id] ?? defaultTargetId;
            const isBusy = pendingAdvantageActionId === item.id;

            return (
              <div key={item.id} className="space-y-2 rounded border border-slate-700 p-2">
                <p className="text-sm font-medium text-slate-100">{item.template.name}</p>
                <p>{item.template.description_player}</p>
                <p>état: {toPlayerAdvantageStateLabel(item.state, isGmTicket)} · utilisations: {item.remaining_uses}</p>
                <p>coût payé: {item.cost_paid} · créé le: {formatDate(item.created_at)}</p>
                <p>activé le: {formatDate(item.activated_at)}</p>
                <p>cible: {item.target_participant_id ? targets.find((target) => target.id === item.target_participant_id)?.displayName ?? "participant" : "—"}</p>

                {isGmTicket && item.state === "owned" ? (
                  <div className="space-y-2">
                    {isTargetRequired ? (
                      <select
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
                        value={selectedTarget}
                        onChange={(event) => {
                          setTargetByInstanceId((current) => ({ ...current, [item.id]: event.target.value }));
                        }}
                      >
                        {targets.map((target) => (
                          <option key={target.id} value={target.id}>
                            {target.displayName}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <Button
                      className="py-1 text-xs"
                      disabled={isBusy || (isTargetRequired && !selectedTarget)}
                      onClick={() => void onActivateAdvantage({
                        advantageInstanceId: item.id,
                        targetParticipantId: isTargetRequired ? selectedTarget : null,
                      })}
                    >
                      {isBusy ? "Activation…" : "Activer le ticket GM"}
                    </Button>
                  </div>
                ) : null}

                {isGmTicket && item.state === "active" ? (
                  <Button
                    className="bg-slate-100 py-1 text-xs text-slate-950"
                    disabled={isBusy}
                    onClick={() => void onUseAdvantage({ advantageInstanceId: item.id })}
                  >
                    {isBusy ? "Consommation…" : "Marquer comme consommé"}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
