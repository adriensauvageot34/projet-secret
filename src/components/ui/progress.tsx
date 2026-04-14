export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded bg-slate-800">
      <div className="h-2 rounded bg-accent" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
