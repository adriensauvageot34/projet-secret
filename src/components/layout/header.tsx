export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle ? <p className="text-sm text-slate-400">{subtitle}</p> : null}
    </header>
  );
}
