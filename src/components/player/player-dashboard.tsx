"use client";

import { PlayerHud } from "@/components/player/player-hud";
import { PlayerRankStrip } from "@/components/player/player-rank-strip";
import { ActiveElementsPanel } from "@/components/player/active-elements-panel";
import { ReservePanel } from "@/components/player/reserve-panel";
import { ShopPanel } from "@/components/player/shop-panel";
import { InventoryPanel } from "@/components/player/inventory-panel";
import { AccusationPanel } from "@/components/player/accusation-panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePlayerRuntime } from "@/hooks/use-player-runtime";

export function PlayerDashboard({ participantId }: { participantId: string }) {
  const runtime = usePlayerRuntime(participantId);

  if (runtime.isLoading && !runtime.runtime) {
    return <Card className="text-sm text-slate-300">Chargement du runtime joueur…</Card>;
  }

  if (runtime.error && !runtime.runtime) {
    return (
      <Card className="space-y-3">
        <p className="text-sm text-red-300">{runtime.error}</p>
        <Button onClick={() => void runtime.refresh()}>Réessayer</Button>
      </Card>
    );
  }

  if (!runtime.runtime) {
    return <Card className="text-sm text-red-300">Aucune donnée runtime disponible.</Card>;
  }

  return (
    <>
      <PlayerHud
        participant={runtime.runtime.participant}
        level={runtime.runtime.level}
        isRefreshing={runtime.isRefreshing}
        successMessage={runtime.successMessage}
        actionError={runtime.actionError}
      />
      <PlayerRankStrip level={runtime.runtime.level} ranking={runtime.runtime.ranking} />
      <ActiveElementsPanel
        activeElements={runtime.runtime.activeElements}
        pendingInstanceId={runtime.pendingInstanceId}
        lastClaimFlowByInstanceId={runtime.lastClaimFlowByInstanceId}
        onClaim={runtime.claimResult}
      />
      <ReservePanel
        templates={runtime.runtime.reserveTemplates}
        pendingTemplateId={runtime.pendingTemplateId}
        onActivate={runtime.activateElement}
      />
      <ShopPanel
        items={runtime.runtime.shop}
        pendingTemplateId={runtime.pendingShopTemplateId}
        onBuy={runtime.buyAdvantage}
      />
      <InventoryPanel
        inventory={runtime.runtime.inventory}
        targets={runtime.runtime.accusationTargets}
        pendingAdvantageActionId={runtime.pendingAdvantageActionId}
        onActivateAdvantage={runtime.activateAdvantage}
        onUseAdvantage={runtime.useAdvantage}
      />
      <AccusationPanel
        accusationTargets={runtime.runtime.accusationTargets}
        accusableTemplates={runtime.runtime.accusableTemplates}
        isPending={runtime.isCreatingAccusation}
        actionError={runtime.actionError}
        successMessage={runtime.successMessage}
        onCreateAccusation={runtime.createAccusation}
      />
    </>
  );
}
