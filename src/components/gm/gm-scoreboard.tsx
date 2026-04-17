import type { GmRuntimeParticipant } from "@/lib/game/services/get-gm-runtime-view";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { buildLiveRanking } from "@/lib/game/services/live-ranking";
import type { GmFinalSummary } from "@/lib/game/services/get-gm-runtime-view";

type GmScoreboardProps = {
  participants: GmRuntimeParticipant[];
  sessionStatus: string;
  finalSummary: GmFinalSummary;
};

export function GmScoreboard({ participants, sessionStatus, finalSummary }: GmScoreboardProps) {
  const sorted = buildLiveRanking(participants.filter((participant) => participant.role !== "gm"));

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
      {sessionStatus === "finished" ? (
        <div className="space-y-2 rounded border border-emerald-700/70 bg-emerald-950/30 p-3 text-xs text-emerald-100">
          <p className="font-semibold">Clôture finale (GM exclu du classement)</p>
          <p>Vainqueur: {finalSummary.winner ? `#${finalSummary.winner.position} ${finalSummary.winner.displayName}` : "aucun"}</p>
          <p>Podium: {finalSummary.podium.map((entry) => `${entry.position}. ${entry.displayName}`).join(" · ") || "n/a"}</p>
          <p>Bottom 5: {finalSummary.bottomFive.map((entry) => `${entry.position}. ${entry.displayName}`).join(" · ") || "n/a"}</p>
          <div className="space-y-1">
            {finalSummary.ranking.map((entry) => (
              <p key={entry.participantId}>
                #{entry.position} {entry.displayName} · score={entry.currentScore} · tokens={entry.currentTokens}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
