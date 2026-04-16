import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4">
      <h1 className="text-3xl font-bold">projet-secret</h1>
      <p className="text-slate-300">MVP prêt à brancher sur Supabase pour une partie live.</p>
      <Card className="space-y-2">
        <h2 className="text-xl font-semibold">Entrées rapides</h2>
        <div className="flex flex-col gap-2">
          <Link className="rounded bg-accent/20 px-3 py-2" href="/player/manon-x4k9">
            Interface joueur (demo)
          </Link>
          <Link className="rounded bg-accent/20 px-3 py-2" href="/gm">
            Interface GM
          </Link>
        </div>
      </Card>
    </main>
  );
}
