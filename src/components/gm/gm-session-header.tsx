import type { Session } from "@/types/domain";
import { Card } from "@/components/ui/card";

type GmSessionHeaderProps = {
  session: Session;
  isRefreshing: boolean;
  successMessage: string | null;
  actionError: string | null;
};

export function GmSessionHeader({ session, isRefreshing, successMessage, actionError }: GmSessionHeaderProps) {
  return (
    <Card className="space-y-1 text-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Session GM · {session.name}</h3>
        <span className="text-xs text-slate-400">{isRefreshing ? "Sync…" : "Live"}</span>
      </div>
      <p className="text-xs text-slate-400">Statut: {session.status} · GM participant: {session.session_gm_participant_id ?? "non configuré"}</p>
      {successMessage ? <p className="text-xs text-emerald-300">{successMessage}</p> : null}
      {actionError ? <p className="text-xs text-red-300">{actionError}</p> : null}
    </Card>
  );
}
