import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PlayerHud } from "@/components/player/player-hud";
import { PlayerRankStrip } from "@/components/player/player-rank-strip";
import { ActiveElementsPanel } from "@/components/player/active-elements-panel";
import { ReservePanel } from "@/components/player/reserve-panel";
import { ShopPanel } from "@/components/player/shop-panel";
import { AccusationPanel } from "@/components/player/accusation-panel";
import { getParticipantByPublicSlug } from "@/lib/db/queries/participants";

export default async function PlayerPage({ params }: { params: { slug: string } }) {
  const participant = await getParticipantByPublicSlug(params.slug);

  if (!participant) {
    notFound();
  }

  return (
    <AppShell>
      <Header title={`Joueur ${participant.display_name}`} subtitle={`Accès: ${participant.public_slug}`} />
      <PlayerHud />
      <PlayerRankStrip />
      <ActiveElementsPanel />
      <ReservePanel />
      <ShopPanel />
      <AccusationPanel />
      <MobileNav />
    </AppShell>
  );
}
