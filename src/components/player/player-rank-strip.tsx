import { Card } from "@/components/ui/card";
import type { LiveRankingEntry } from "@/lib/game/services/live-ranking";

type PlayerRankStripProps = {
  level: { levelNumber: number; label: string; shopTierMax: number };
  ranking: {
    self: LiveRankingEntry;
    above: LiveRankingEntry | null;
    below: LiveRankingEntry | null;
  };
};

export function PlayerRankStrip({ level, ranking }: PlayerRankStripProps) {
  return (
    <Card className="space-y-2">
      <h3 className="text-sm font-semibold">Progression</h3>
      <p className="text-xs text-slate-300">Niveau {level.levelNumber} · {level.label}</p>
      <p className="text-xs text-slate-400">Tier boutique max: {level.shopTierMax}</p>
      <div className="rounded border border-slate-700 p-2 text-xs text-slate-300">
        <p className="text-slate-100">Classement live: #{ranking.self.position} · {ranking.self.displayName}</p>
        <p>Score: {ranking.self.currentScore}</p>
        <p>Au-dessus: {ranking.above ? `#${ranking.above.position} ${ranking.above.displayName} (${ranking.above.currentScore})` : "-"}</p>
        <p>En-dessous: {ranking.below ? `#${ranking.below.position} ${ranking.below.displayName} (${ranking.below.currentScore})` : "-"}</p>
      </div>
    </Card>
  );
}
