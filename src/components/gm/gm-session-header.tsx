import type { Session } from "@/types/domain";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type GmSessionHeaderProps = {
  session: Session;
  isRefreshing: boolean;
  successMessage: string | null;
  actionError: string | null;
  isFinishing: boolean;
  onFinishSession: () => void;
};

export function GmSessionHeader({ session, isRefreshing, successMessage, actionError, isFinishing, onFinishSession }: GmSessionHeaderProps) {
  const statusLabel = session.status === "live"
    ? "Live"
    : session.status === "finished"
      ? "Terminée"
      : session.status === "preparation"
        ? "Préparation"
        : "Archivée";

  return (
    <Card className="space-y-1 text-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Session GM · {session.name}</h3>
        <span className="text-xs text-slate-400">{isRefreshing ? "Sync…" : statusLabel}</span>
      </div>
      <p className="text-xs text-slate-400">Statut: {session.status} · GM participant: {session.session_gm_participant_id ?? "non configuré"}</p>
      <Button
        className="h-8 px-3 text-xs"
        disabled={session.status === "finished" || isFinishing}
        onClick={onFinishSession}
      >
        {session.status === "finished" ? "Partie terminée" : isFinishing ? "Clôture..." : "Terminer la partie"}
      </Button>
      {successMessage ? <p className="text-xs text-emerald-300">{successMessage}</p> : null}
      {actionError ? <p className="text-xs text-red-300">{actionError}</p> : null}
    </Card>
  );
}
