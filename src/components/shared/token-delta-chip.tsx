export function TokenDeltaChip({ delta }: { delta: number }) {
  return <span className="text-xs text-amber-300">Jetons {delta >= 0 ? `+${delta}` : delta}</span>;
}
