export function ScoreDeltaChip({ delta }: { delta: number }) {
  return <span className="text-xs text-emerald-300">Score {delta >= 0 ? `+${delta}` : delta}</span>;
}
