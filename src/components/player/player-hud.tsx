import { Card } from "@/components/ui/card";
import type { Participant } from "@/types/domain";

type PlayerHudProps = {
  participant: Participant;
  level: {
    levelNumber: number;
    label: string;
  };
  isRefreshing: boolean;
  successMessage: string | null;
  actionError: string | null;
};

export function PlayerHud({ participant, level, isRefreshing, successMessage, actionError }: PlayerHudProps) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">HUD joueur</h3>
        <span className="text-xs text-slate-400">{isRefreshing ? "Sync…" : "À jour"}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded border border-slate-700 p-2">
          <p className="text-xs text-slate-400">Score</p>
          <p className="text-lg font-semibold">{participant.current_score}</p>
        </div>
        <div className="rounded border border-slate-700 p-2">
          <p className="text-xs text-slate-400">Jetons</p>
          <p className="text-lg font-semibold">{participant.current_tokens}</p>
        </div>
      </div>
      <p className="text-xs text-slate-300">Niveau {level.levelNumber} · {level.label}</p>
      {successMessage ? <p className="text-xs text-emerald-300">{successMessage}</p> : null}
      {actionError ? <p className="text-xs text-red-300">{actionError}</p> : null}
    </Card>
  );
}
