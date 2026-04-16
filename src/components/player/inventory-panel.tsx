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
import type { PlayerAdvantageElementTarget } from "@/hooks/use-player-runtime";

type ParticipantOption = {
  id: string;
  displayName: string;
};

const AUTOMATIC_EFFECT_CODES = new Set([
  "halve_slot_cooldown",
  "unlock_slot_now",
  "accelerate_slot_unlock",
  "shorten_own_constraint_timer",
  "reduce_other_mission_timer",
  "double_other_constraint_timer",
]);
const PLAYER_ACTIVATION_EFFECT_CODES = new Set([
  "free_skip",
  "cancel_skip_penalty",
  "next_correct_accusation_bonus_3",
  "double_next_mission_value",
]);

function getElementTargetFilter(effectCode: string, selfParticipantId: string) {
  if (effectCode === "halve_slot_cooldown" || effectCode === "unlock_slot_now" || effectCode === "accelerate_slot_unlock") {
    return (target: PlayerAdvantageElementTarget) =>
      target.participantId === selfParticipantId && target.state === "cooldown";
  }

  if (effectCode === "shorten_own_constraint_timer") {
    return (target: PlayerAdvantageElementTarget) =>
      target.participantId === selfParticipantId && target.state === "active" && target.elementType === "constraint";
  }

  if (effectCode === "reduce_other_mission_timer") {
    return (target: PlayerAdvantageElementTarget) =>
      target.participantId !== selfParticipantId && target.state === "active" && target.elementType === "mission";
  }

  if (effectCode === "double_other_constraint_timer") {
    return (target: PlayerAdvantageElementTarget) =>
      target.participantId !== selfParticipantId && target.state === "active" && target.elementType === "constraint";
  }

  return () => false;
}

export function InventoryPanel({
  inventory,
  targets,
  elementTargets,
  selfParticipantId,
  pendingAdvantageActionId,
  onActivateAdvantage,
  onUseAdvantage,
}: {
  inventory: AdvantageInstanceWithTemplate[];
  targets: ParticipantOption[];
  elementTargets: PlayerAdvantageElementTarget[];
  selfParticipantId: string;
  pendingAdvantageActionId: string | null;
  onActivateAdvantage: (params: {
    advantageInstanceId: string;
    targetParticipantId?: string | null;
    targetElementInstanceId?: string | null;
  }) => Promise<void>;
  onUseAdvantage: (params: {
    advantageInstanceId: string;
    targetElementInstanceId?: string | null;
    targetParticipantId?: string | null;
  }) => Promise<void>;
}) {
  const [targetByInstanceId, setTargetByInstanceId] = useState<Record<string, string>>({});
  const [elementTargetByInstanceId, setElementTargetByInstanceId] = useState<Record<string, string>>({});

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
            const isAutomaticEffect = AUTOMATIC_EFFECT_CODES.has(item.template.effect_code);
            const isPlayerActivable = PLAYER_ACTIVATION_EFFECT_CODES.has(item.template.effect_code);
            const selectedTarget = targetByInstanceId[item.id] ?? defaultTargetId;
            const compatibleElementTargets = elementTargets.filter(
              getElementTargetFilter(item.template.effect_code, selfParticipantId),
            );
            const selectedElementTarget = elementTargetByInstanceId[item.id] ?? compatibleElementTargets[0]?.id ?? "";
            const selectedElement = compatibleElementTargets.find((target) => target.id === selectedElementTarget) ?? null;
            const isBusy = pendingAdvantageActionId === item.id;

            return (
              <div key={item.id} className="space-y-2 rounded border border-slate-700 p-2">
                <p className="text-sm font-medium text-slate-100">{item.template.name}</p>
                <p>{item.template.description_player}</p>
                <p>état: {toPlayerAdvantageStateLabel(item.state, isGmTicket, item.template.effect_code)} · utilisations: {item.remaining_uses}</p>
                <p>coût payé: {item.cost_paid} · créé le: {formatDate(item.created_at)}</p>
                <p>activé le: {formatDate(item.activated_at)}</p>
                <p>cible: {item.target_participant_id ? targets.find((target) => target.id === item.target_participant_id)?.displayName ?? "participant" : "—"}</p>
                {item.state === "active" && isPlayerActivable ? (
                  <p className="text-emerald-300">En attente de déclenchement automatique sur le prochain événement compatible.</p>
                ) : null}

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
                        targetElementInstanceId: null,
                      })}
                    >
                      {isBusy ? "Activation…" : "Activer le ticket GM"}
                    </Button>
                  </div>
                ) : null}

                {isAutomaticEffect && item.state === "owned" ? (
                  <div className="space-y-2">
                    {compatibleElementTargets.length > 0 ? (
                      <select
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
                        value={selectedElementTarget}
                        onChange={(event) => {
                          setElementTargetByInstanceId((current) => ({ ...current, [item.id]: event.target.value }));
                        }}
                      >
                        {compatibleElementTargets.map((target) => (
                          <option key={target.id} value={target.id}>
                            {target.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-amber-300">Aucune cible compatible actuellement.</p>
                    )}
                    <Button
                      className="py-1 text-xs"
                      disabled={isBusy || !selectedElementTarget}
                      onClick={() => void onActivateAdvantage({
                        advantageInstanceId: item.id,
                        targetParticipantId: selectedElement?.participantId ?? null,
                        targetElementInstanceId: selectedElementTarget,
                      })}
                    >
                      {isBusy ? "Activation…" : "Activer l’avantage"}
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

                {isAutomaticEffect && item.state === "active" ? (
                  <Button
                    className="bg-slate-100 py-1 text-xs text-slate-950"
                    disabled={isBusy}
                    onClick={() => void onUseAdvantage({
                      advantageInstanceId: item.id,
                      targetElementInstanceId: item.target_element_instance_id,
                      targetParticipantId: item.target_participant_id,
                    })}
                  >
                    {isBusy ? "Application…" : "Appliquer maintenant"}
                  </Button>
                ) : null}

                {isPlayerActivable && item.state === "owned" ? (
                  <Button
                    className="py-1 text-xs"
                    disabled={isBusy}
                    onClick={() => void onActivateAdvantage({
                      advantageInstanceId: item.id,
                      targetParticipantId: null,
                      targetElementInstanceId: null,
                    })}
                  >
                    {isBusy ? "Activation…" : "Armer l’avantage"}
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
