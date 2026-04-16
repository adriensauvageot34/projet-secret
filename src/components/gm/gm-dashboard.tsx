"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGmRuntime } from "@/hooks/use-gm-runtime";
import { GmSessionHeader } from "@/components/gm/gm-session-header";
import { GmParticipantList } from "@/components/gm/gm-participant-list";
import { GmLiveElements } from "@/components/gm/gm-live-elements";
import { GmAccusationsQueue } from "@/components/gm/gm-accusations-queue";
import { GmDecisionsPanel } from "@/components/gm/gm-decisions-panel";
import { GmScoreboard } from "@/components/gm/gm-scoreboard";
import { GmActiveTicketQueue } from "@/components/gm/gm-active-ticket-queue";

export function GmDashboard() {
  const gm = useGmRuntime();

  const participantOptions = useMemo(
    () => gm.runtime?.participants.map((p) => ({ id: p.id, label: p.display_name })) ?? [],
    [gm.runtime?.participants],
  );

  if (gm.isLoading && !gm.runtime) {
    return <Card className="text-sm text-slate-300">Chargement du runtime GM…</Card>;
  }

  if (gm.error && !gm.runtime) {
    return (
      <Card className="space-y-3">
        <p className="text-sm text-red-300">{gm.error}</p>
        <Button onClick={() => void gm.refresh()}>Réessayer</Button>
      </Card>
    );
  }

  if (!gm.runtime) {
    return <Card className="text-sm text-red-300">Aucune donnée runtime GM disponible.</Card>;
  }

  return (
    <div className="space-y-4">
      <GmSessionHeader
        session={gm.runtime.session}
        isRefreshing={gm.isRefreshing}
        successMessage={gm.successMessage}
        actionError={gm.actionError}
      />
      <GmParticipantList participants={gm.runtime.participants} />
      <GmActiveTicketQueue tickets={gm.runtime.activeGmTickets} />
      <GmLiveElements liveElements={gm.runtime.liveElements} />
      <GmAccusationsQueue
        accusations={gm.runtime.accusations}
        participantOptions={participantOptions}
        pendingActionKey={gm.pendingActionKey}
        onCreate={gm.createAccusation}
        onAdjudicate={gm.adjudicateAccusation}
      />
      <GmDecisionsPanel
        decisions={gm.runtime.decisions}
        participantOptions={participantOptions}
        accusationOptions={gm.runtime.accusations.map((accusation) => ({ id: accusation.id, label: accusation.justification }))}
        pendingActionKey={gm.pendingActionKey}
        onCreate={gm.createDecision}
        onApply={gm.applyDecision}
        onCancel={gm.cancelDecision}
      />
      <GmScoreboard participants={gm.runtime.participants} />
    </div>
  );
}
