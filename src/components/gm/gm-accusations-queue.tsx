"use client";

import { useState } from "react";
import type { AccusationDetail } from "@/lib/db/queries/accusations";
import type { AccusationDecision } from "@/lib/game/enums";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/utils/formatting";
import type { GmRuntimeElement } from "@/lib/game/services/get-gm-runtime-view";

const DECISIONS: AccusationDecision[] = ["correct", "incorrect"];

type ParticipantOption = { id: string; label: string };

type GmAccusationsQueueProps = {
  accusations: AccusationDetail[];
  participantOptions: ParticipantOption[];
  liveElements: GmRuntimeElement[];
  pendingActionKey: string | null;
  onCreate: (params: {
    accuserParticipantId: string;
    accusedParticipantId: string;
    suspectedType: "mission" | "constraint";
    suspectedTemplateId: string;
    justification: string;
    relatedElementInstanceId?: string;
  }) => Promise<void>;
  onAdjudicate: (params: {
    accusationId: string;
    decision: AccusationDecision;
    notesAdmin?: string;
    rewardTokens?: number;
  }) => Promise<void>;
};

export function GmAccusationsQueue({ accusations, participantOptions, liveElements, pendingActionKey, onCreate, onAdjudicate }: GmAccusationsQueueProps) {
  const [accuserParticipantId, setAccuserParticipantId] = useState(participantOptions[0]?.id ?? "");
  const [selectedElementId, setSelectedElementId] = useState("");
  const [justification, setJustification] = useState("");

  const submitted = accusations.filter((accusation) => accusation.status === "submitted");
  const underReview = accusations.filter((accusation) => accusation.status === "under_review");
  const finalized = accusations.filter((accusation) => ["validated", "rejected", "cancelled"].includes(accusation.status));

  const activeElements = liveElements.filter((element) => element.state === "active" && !element.final_result);
  const selectedElement = activeElements.find((element) => element.id === selectedElementId) ?? null;
  const canCreate = Boolean(accuserParticipantId && selectedElement && selectedElement.element_type && selectedElement.element_template_id && justification.trim());

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">File accusations</h3>

      <div className="space-y-2 rounded border border-slate-700 p-2 text-xs text-slate-300">
        <p className="font-medium text-slate-100">Saisir accusation orale</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select value={accuserParticipantId} onChange={(event) => setAccuserParticipantId(event.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
            <option value="">Accusateur</option>
            {participantOptions.map((participant) => <option key={participant.id} value={participant.id}>{participant.label}</option>)}
          </select>
          <select value={selectedElementId} onChange={(event) => setSelectedElementId(event.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
            <option value="">Élément actif ciblé</option>
            {activeElements.map((element) => (
              <option key={element.id} value={element.id}>
                {(element.participant_display_name ?? element.participant_id)} · {(element.element_type ?? "element")} · {element.template_name ?? element.element_template_id}
              </option>
            ))}
          </select>
          <input
            value={selectedElement?.participant_display_name ?? ""}
            placeholder="Joueur ciblé"
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
            disabled
            readOnly
          />
          <input
            value={selectedElement?.element_type ?? ""}
            placeholder="Type élément"
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
            disabled
            readOnly
          />
        </div>
        <textarea value={justification} onChange={(event) => setJustification(event.target.value)} placeholder="justification" className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1" rows={2} />
        <Button
          className="w-full"
          disabled={!canCreate || pendingActionKey === "create-accusation"}
          onClick={() => {
            if (!selectedElement || !selectedElement.element_type) {
              return;
            }
            void onCreate({
              accuserParticipantId,
              accusedParticipantId: selectedElement.participant_id,
              suspectedType: selectedElement.element_type as "mission" | "constraint",
              suspectedTemplateId: selectedElement.element_template_id,
              relatedElementInstanceId: selectedElement.id,
              justification,
            });
          }}
        >
          {pendingActionKey === "create-accusation" ? "Création…" : "Enregistrer accusation"}
        </Button>
      </div>

      <p className="text-xs text-slate-400">submitted: {submitted.length} · under_review: {underReview.length} · finalisées: {finalized.length}</p>
      {accusations.length === 0 ? (
        <EmptyState message="Aucune accusation en base." />
      ) : (
        <div className="space-y-2">
          {accusations.map((accusation) => {
            const isFinal = ["validated", "rejected", "cancelled"].includes(accusation.status);

            return (
              <div key={accusation.id} className="rounded border border-slate-700 p-2 text-xs text-slate-300">
                <p className="text-sm font-medium text-slate-100">{accusation.accuser_display_name ?? accusation.accuser_participant_id} → {accusation.accused_display_name ?? accusation.accused_participant_id}</p>
                <p>status={accusation.status} · verdict={accusation.verdict ?? "-"} · decision={accusation.decision ?? "-"}</p>
                <p>is_receivable={String(accusation.is_receivable)} · reward={accusation.reward_tokens} · fake_bait={String(accusation.triggered_fake_bait)}</p>
                <p>reward_already_granted={String(accusation.linked_token_events.some((event) => event.event_type === "accusation_correct" && event.delta_tokens > 0))}</p>
                <p>ledger score/token: {accusation.linked_score_events.length}/{accusation.linked_token_events.length}</p>
                <p>created={formatDate(accusation.created_at)} · adjudicated={formatDate(accusation.adjudicated_at)}</p>
                <p className="text-slate-400">justification: {accusation.justification}</p>

                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {DECISIONS.map((decision) => (
                    <Button
                      key={decision}
                      className="w-full"
                      disabled={isFinal || pendingActionKey === `adjudicate-${accusation.id}`}
                      onClick={() => void onAdjudicate({ accusationId: accusation.id, decision, rewardTokens: decision === "correct" ? 1 : 0 })}
                    >
                      {pendingActionKey === `adjudicate-${accusation.id}` ? "Adjudication…" : `Adjudicate ${decision}`}
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
