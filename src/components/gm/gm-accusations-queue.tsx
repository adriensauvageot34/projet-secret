"use client";

import { useState } from "react";
import type { AccusationDetail } from "@/lib/db/queries/accusations";
import type { AccusationDecision } from "@/lib/game/enums";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/utils/formatting";

const DECISIONS: AccusationDecision[] = ["correct", "incorrect", "not_receivable", "fake_bait_triggered", "cancelled_by_gm"];

type ParticipantOption = { id: string; label: string };

type GmAccusationsQueueProps = {
  accusations: AccusationDetail[];
  participantOptions: ParticipantOption[];
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

export function GmAccusationsQueue({ accusations, participantOptions, pendingActionKey, onCreate, onAdjudicate }: GmAccusationsQueueProps) {
  const [accuserParticipantId, setAccuserParticipantId] = useState(participantOptions[0]?.id ?? "");
  const [accusedParticipantId, setAccusedParticipantId] = useState(participantOptions[1]?.id ?? participantOptions[0]?.id ?? "");
  const [suspectedType, setSuspectedType] = useState<"mission" | "constraint">("mission");
  const [suspectedTemplateId, setSuspectedTemplateId] = useState("");
  const [justification, setJustification] = useState("");

  const submitted = accusations.filter((accusation) => accusation.status === "submitted");
  const underReview = accusations.filter((accusation) => accusation.status === "under_review");
  const finalized = accusations.filter((accusation) => ["validated", "rejected", "cancelled"].includes(accusation.status));

  const canCreate = Boolean(accuserParticipantId && accusedParticipantId && suspectedTemplateId && justification.trim());

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">File accusations</h3>

      <div className="space-y-2 rounded border border-slate-700 p-2 text-xs text-slate-300">
        <p className="font-medium text-slate-100">Créer accusation (MVP)</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select value={accuserParticipantId} onChange={(event) => setAccuserParticipantId(event.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
            <option value="">Accusateur</option>
            {participantOptions.map((participant) => <option key={participant.id} value={participant.id}>{participant.label}</option>)}
          </select>
          <select value={accusedParticipantId} onChange={(event) => setAccusedParticipantId(event.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
            <option value="">Accusé</option>
            {participantOptions.map((participant) => <option key={participant.id} value={participant.id}>{participant.label}</option>)}
          </select>
          <select value={suspectedType} onChange={(event) => setSuspectedType(event.target.value as "mission" | "constraint")} className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
            <option value="mission">mission</option>
            <option value="constraint">constraint</option>
          </select>
          <input value={suspectedTemplateId} onChange={(event) => setSuspectedTemplateId(event.target.value)} placeholder="suspected_template_id (uuid)" className="rounded border border-slate-700 bg-slate-900 px-2 py-1" />
        </div>
        <textarea value={justification} onChange={(event) => setJustification(event.target.value)} placeholder="justification" className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1" rows={2} />
        <Button
          className="w-full"
          disabled={!canCreate || pendingActionKey === "create-accusation"}
          onClick={() => void onCreate({ accuserParticipantId, accusedParticipantId, suspectedType, suspectedTemplateId, justification })}
        >
          {pendingActionKey === "create-accusation" ? "Création…" : "Créer accusation"}
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
