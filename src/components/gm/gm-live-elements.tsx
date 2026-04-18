"use client";

import { useMemo, useState } from "react";
import type { GmRuntimeElement, GmRuntimeParticipant } from "@/lib/game/services/get-gm-runtime-view";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useCountdown } from "@/hooks/use-countdown";

type GmLiveElementsProps = {
  liveElements: GmRuntimeElement[];
  participants: GmRuntimeParticipant[];
  pendingActionKey: string | null;
  onMarkCaught: (params: {
    element: GmRuntimeElement;
    accuserParticipantId: string;
  }) => Promise<void>;
};

function toElementTypeLabel(type: string | null): string {
  if (type === "constraint") {
    return "Contrainte";
  }

  if (type === "mission") {
    return "Mission";
  }

  return "Élément";
}

function RemainingTime({ endsAt }: { endsAt: string | null }) {
  const secondsLeft = useCountdown(endsAt ?? undefined);

  if (!endsAt) {
    return <span className="text-slate-400">—</span>;
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return <span className={secondsLeft === 0 ? "font-semibold text-amber-300" : "font-semibold text-emerald-300"}>{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>;
}

export function GmLiveElements({ liveElements, participants, pendingActionKey, onMarkCaught }: GmLiveElementsProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedAccuserId, setSelectedAccuserId] = useState<string>("");

  const activeByParticipant = useMemo(() => {
    const grouped = new Map<string, { participantId: string; participantName: string; elements: GmRuntimeElement[] }>();

    for (const element of liveElements.filter((item) => item.state === "active" && !item.final_result)) {
      const current = grouped.get(element.participant_id);

      if (current) {
        current.elements.push(element);
        continue;
      }

      grouped.set(element.participant_id, {
        participantId: element.participant_id,
        participantName: element.participant_display_name ?? "Joueur",
        elements: [element],
      });
    }

    return Array.from(grouped.values()).sort((a, b) => a.participantName.localeCompare(b.participantName, "fr"));
  }, [liveElements]);

  const participantsById = useMemo(() => new Map(participants.map((participant) => [participant.id, participant])), [participants]);

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">Joueurs → éléments actifs</h3>
      {activeByParticipant.length === 0 ? (
        <EmptyState message="Aucun élément actif." />
      ) : (
        <div className="space-y-3">
          {activeByParticipant.map((player) => (
            <div key={player.participantId} className="rounded border border-slate-700 p-3">
              <p className="text-sm font-semibold text-slate-100">{player.participantName}</p>
              <div className="mt-2 space-y-2">
                {player.elements.map((element) => {
                  const isSelected = selectedElementId === element.id;
                  const accuserOptions = participants.filter((participant) => participant.role !== "gm" && participant.id !== player.participantId);

                  return (
                    <div key={element.id} className="rounded border border-slate-700/70 bg-slate-900/40 p-2 text-xs text-slate-200">
                      <p className="text-sm font-medium text-slate-50">{element.template_name ?? "Élément actif"}</p>
                      <p className="mt-0.5 text-slate-300">{toElementTypeLabel(element.element_type)} · chrono restant: <RemainingTime endsAt={element.ends_at} /></p>

                      {!isSelected ? (
                        <Button className="mt-2" onClick={() => {
                          const firstAccuser = accuserOptions[0]?.id ?? "";
                          setSelectedElementId(element.id);
                          setSelectedAccuserId(firstAccuser);
                        }}>
                          Grillé
                        </Button>
                      ) : (
                        <div className="mt-2 space-y-2">
                          <select
                            value={selectedAccuserId}
                            onChange={(event) => setSelectedAccuserId(event.target.value)}
                            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                          >
                            {accuserOptions.length === 0 ? <option value="">Aucun accusateur possible</option> : null}
                            {accuserOptions.map((participant) => (
                              <option key={participant.id} value={participant.id}>
                                {participant.display_name}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <Button
                              disabled={!selectedAccuserId || pendingActionKey === `caught-${element.id}`}
                              onClick={() => {
                                if (!selectedAccuserId) {
                                  return;
                                }

                                void onMarkCaught({
                                  element,
                                  accuserParticipantId: selectedAccuserId,
                                }).then(() => {
                                  setSelectedElementId(null);
                                  setSelectedAccuserId("");
                                });
                              }}
                            >
                              {pendingActionKey === `caught-${element.id}` ? "Validation…" : "Valider Grillé"}
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedElementId(null);
                                setSelectedAccuserId("");
                              }}
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      )}

                      <p className="mt-2 text-[11px] text-slate-400">
                        Statut: {participantsById.get(element.participant_id)?.current_status ?? "active"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
