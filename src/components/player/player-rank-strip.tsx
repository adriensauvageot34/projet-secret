import { Card } from "@/components/ui/card";

export function PlayerRankStrip({ level }: { level: { levelNumber: number; label: string; shopTierMax: number } }) {
  return (
    <Card>
      <h3 className="text-sm font-semibold">Progression</h3>
      <p className="text-xs text-slate-300">Niveau {level.levelNumber} · {level.label}</p>
      <p className="text-xs text-slate-400">Tier boutique max: {level.shopTierMax}</p>
    </Card>
  );
}
