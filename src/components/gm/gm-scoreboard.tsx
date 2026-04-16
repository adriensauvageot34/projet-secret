import type { GmRuntimeParticipant } from "@/lib/game/services/get-gm-runtime-view";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { buildLiveRanking } from "@/lib/game/services/live-ranking";

type GmScoreboardProps = {
  participants: GmRuntimeParticipant[];
};

export function GmScoreboard({ participants }: GmScoreboardProps) {
  const sorted = buildLiveRanking(participants);

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">Scoreboard</h3>
      {sorted.length === 0 ? (
        <EmptyState message="Aucun score disponible." />
      ) : (
        <div className="space-y-2">
          {sorted.map((participant) => (
            <div key={participant.participantId} className="rounded border border-slate-700 p-2 text-xs text-slate-300">
              <p className="text-sm font-medium text-slate-100">#{participant.position} · {participant.displayName}</p>
              <p>score={participant.currentScore} · tokens={participant.currentTokens}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
