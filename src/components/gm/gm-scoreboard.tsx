import type { GmRuntimeParticipant } from "@/lib/game/services/get-gm-runtime-view";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

type GmScoreboardProps = {
  participants: GmRuntimeParticipant[];
};

export function GmScoreboard({ participants }: GmScoreboardProps) {
  const sorted = [...participants].sort((a, b) => b.current_score - a.current_score);

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">Scoreboard</h3>
      {sorted.length === 0 ? (
        <EmptyState message="Aucun score disponible." />
      ) : (
        <div className="space-y-2">
          {sorted.map((participant, index) => (
            <div key={participant.id} className="rounded border border-slate-700 p-2 text-xs text-slate-300">
              <p className="text-sm font-medium text-slate-100">#{index + 1} · {participant.display_name}</p>
              <p>score={participant.current_score} · tokens={participant.current_tokens}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
