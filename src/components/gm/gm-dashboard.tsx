"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGmRuntime } from "@/hooks/use-gm-runtime";
import { GmSessionHeader } from "@/components/gm/gm-session-header";
import { GmParticipantList } from "@/components/gm/gm-participant-list";
import { GmLiveElements } from "@/components/gm/gm-live-elements";
import { GmScoreboard } from "@/components/gm/gm-scoreboard";
import { GmActiveTicketQueue } from "@/components/gm/gm-active-ticket-queue";

export function GmDashboard() {
  const gm = useGmRuntime();

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
        isFinishing={gm.pendingActionKey === "finish-session"}
        onFinishSession={() => void gm.finishSession()}
      />
      <GmParticipantList participants={gm.runtime.participants} />
      <GmActiveTicketQueue tickets={gm.runtime.activeGmTickets} />
      <GmLiveElements
        liveElements={gm.runtime.liveElements}
        participants={gm.runtime.participants}
        pendingActionKey={gm.pendingActionKey}
        onMarkCaught={gm.markElementCaught}
      />
      {gm.runtime.session.status === "finished" ? (
        <Card className="text-xs text-slate-300">Session terminée: actions GM gameplay verrouillées.</Card>
      ) : null}
      <GmScoreboard
        participants={gm.runtime.participants}
        sessionStatus={gm.runtime.session.status}
        finalSummary={gm.runtime.finalSummary}
      />
    </div>
  );
}
