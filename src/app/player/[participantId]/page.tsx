import { AppShell } from "@/components/layout/app-shell";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PlayerHud } from "@/components/player/player-hud";
import { PlayerRankStrip } from "@/components/player/player-rank-strip";
import { ActiveElementsPanel } from "@/components/player/active-elements-panel";
import { ReservePanel } from "@/components/player/reserve-panel";
import { ShopPanel } from "@/components/player/shop-panel";
import { AccusationPanel } from "@/components/player/accusation-panel";

export default function PlayerPage({ params }: { params: { participantId: string } }) {
  return (
    <AppShell>
      <Header title={`Joueur ${params.participantId}`} subtitle="Vue runtime participant" />
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
