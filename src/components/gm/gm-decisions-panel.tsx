"use client";

import { useState } from "react";
import type { GMDecisionDetail } from "@/lib/db/queries/gm-decisions";
import type { GmDecisionType } from "@/lib/game/enums";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/utils/formatting";

const DECISION_TYPES: GmDecisionType[] = [
  "validation_override",
  "accusation_arbitration",
  "retro_cancel",
  "fake_element_resolution",
  "abuse_correction",
  "manual_bonus",
  "manual_penalty",
  "other",
];

type EntityOption = { id: string; label: string };

type GmDecisionsPanelProps = {
  decisions: GMDecisionDetail[];
  participantOptions: EntityOption[];
  accusationOptions: EntityOption[];
  pendingActionKey: string | null;
  onCreate: (params: {
    decisionType: GmDecisionType;
    decisionLabel: string;
    reason: string;
    notes?: string;
    scoreImpact?: number;
    tokenImpact?: number;
    targetParticipantId?: string;
    targetAccusationId?: string;
  }) => Promise<void>;
  onApply: (decisionId: string) => Promise<void>;
  onCancel: (decisionId: string) => Promise<void>;
};

export function GmDecisionsPanel({
  decisions,
  participantOptions,
  accusationOptions,
  pendingActionKey,
  onCreate,
  onApply,
  onCancel,
}: GmDecisionsPanelProps) {
  const [decisionType, setDecisionType] = useState<GmDecisionType>("other");
  const [decisionLabel, setDecisionLabel] = useState("");
  const [reason, setReason] = useState("");
  const [scoreImpact, setScoreImpact] = useState("0");
  const [tokenImpact, setTokenImpact] = useState("0");
  const [targetParticipantId, setTargetParticipantId] = useState("");
  const [targetAccusationId, setTargetAccusationId] = useState("");

  const parsedScoreImpact = Number.parseInt(scoreImpact, 10) || 0;
  const parsedTokenImpact = Number.parseInt(tokenImpact, 10) || 0;
  const requiresTarget = parsedScoreImpact !== 0 || parsedTokenImpact !== 0;
  const isCreatable = Boolean(decisionLabel.trim() && reason.trim() && (!requiresTarget || targetParticipantId));

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">Panneau décisions GM</h3>

      <div className="space-y-2 rounded border border-slate-700 p-2 text-xs text-slate-300">
        <p className="font-medium text-slate-100">Créer décision</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select value={decisionType} onChange={(event) => setDecisionType(event.target.value as GmDecisionType)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
            {DECISION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select value={targetParticipantId} onChange={(event) => setTargetParticipantId(event.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
            <option value="">participant cible</option>
            {participantOptions.map((participant) => <option key={participant.id} value={participant.id}>{participant.label}</option>)}
          </select>
          <select value={targetAccusationId} onChange={(event) => setTargetAccusationId(event.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 sm:col-span-2">
            <option value="">accusation ciblée (optionnel)</option>
            {accusationOptions.map((accusation) => <option key={accusation.id} value={accusation.id}>{accusation.label}</option>)}
          </select>
          <input value={decisionLabel} onChange={(event) => setDecisionLabel(event.target.value)} placeholder="decision_label" className="rounded border border-slate-700 bg-slate-900 px-2 py-1" />
          <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="reason" className="rounded border border-slate-700 bg-slate-900 px-2 py-1" />
          <input value={scoreImpact} onChange={(event) => setScoreImpact(event.target.value)} placeholder="score impact" className="rounded border border-slate-700 bg-slate-900 px-2 py-1" />
          <input value={tokenImpact} onChange={(event) => setTokenImpact(event.target.value)} placeholder="token impact" className="rounded border border-slate-700 bg-slate-900 px-2 py-1" />
        </div>

        {requiresTarget && !targetParticipantId ? <p className="text-amber-300">target_participant_id requis si impact score/token non nul.</p> : null}
        <Button
          className="w-full"
          disabled={!isCreatable || pendingActionKey === "create-decision"}
          onClick={() => void onCreate({
            decisionType,
            decisionLabel,
            reason,
            scoreImpact: parsedScoreImpact,
            tokenImpact: parsedTokenImpact,
            targetParticipantId: targetParticipantId || undefined,
            targetAccusationId: targetAccusationId || undefined,
          })}
        >
          {pendingActionKey === "create-decision" ? "Création…" : "Créer décision"}
        </Button>
      </div>

      {decisions.length === 0 ? (
        <EmptyState message="Aucune décision GM enregistrée." />
      ) : (
        <div className="space-y-2">
          {decisions.map((decision) => {
            const canApply = decision.status === "logged";
            const canCancel = decision.status === "logged";

            return (
              <div key={decision.id} className="rounded border border-slate-700 p-2 text-xs text-slate-300">
                <p className="text-sm font-medium text-slate-100">{decision.decision_label_full}</p>
                <p>status={decision.status} · score/token impact={decision.score_impact ?? 0}/{decision.token_impact ?? 0}</p>
                <p>target={decision.target_participant_display_name ?? decision.target_participant_id ?? "-"} · accusation={decision.target_accusation_id ?? "-"}</p>
                <p>produced_score_events_count={decision.produced_score_events_count} · produced_token_events_count={decision.produced_token_events_count}</p>
                <p>created={formatDate(decision.created_at)}</p>
                <p className="text-slate-400">reason: {decision.reason}</p>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    className="w-full"
                    disabled={!canApply || pendingActionKey === `apply-${decision.id}`}
                    onClick={() => void onApply(decision.id)}
                  >
                    {decision.status === "applied" ? "Déjà applied" : pendingActionKey === `apply-${decision.id}` ? "Apply…" : "Apply"}
                  </Button>
                  <Button
                    className="w-full"
                    disabled={!canCancel || pendingActionKey === `cancel-${decision.id}`}
                    onClick={() => void onCancel(decision.id)}
                  >
                    {decision.status === "cancelled" ? "Déjà cancelled" : pendingActionKey === `cancel-${decision.id}` ? "Cancel…" : "Cancel"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
