import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PlayerDashboard } from "@/components/player/player-dashboard";
import { getParticipantByPublicSlug } from "@/lib/db/queries/participants";

export default async function PlayerPage({ params }: { params: { slug: string } }) {
  const participant = await getParticipantByPublicSlug(params.slug);

  if (!participant) {
    notFound();
  }

  return (
    <AppShell>
      <Header title={`Joueur ${participant.display_name}`} subtitle={`Accès: ${participant.public_slug}`} />
      <PlayerDashboard participantId={participant.id} />
      <MobileNav />
    </AppShell>
  );
}
