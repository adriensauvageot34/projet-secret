import Link from "next/link";

export default function PlayerNotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Participant introuvable</h1>
      <p className="text-slate-300">
        Ce lien joueur est invalide ou n&apos;est plus disponible. Vérifie l&apos;URL fournie par le GM.
      </p>
      <Link className="rounded bg-accent/20 px-3 py-2" href="/">
        Revenir à l&apos;accueil
      </Link>
    </main>
  );
}
