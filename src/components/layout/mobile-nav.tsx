import Link from "next/link";

export function MobileNav() {
  return (
    <nav className="sticky bottom-2 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-panel p-2">
      <Link className="rounded bg-slate-800 px-2 py-1 text-center" href="/">Accueil</Link>
      <Link className="rounded bg-slate-800 px-2 py-1 text-center" href="/gm">GM</Link>
    </nav>
  );
}
