import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { PlayerShopItem } from "@/hooks/use-player-runtime";

type ShopPanelProps = {
  items: PlayerShopItem[];
  pendingTemplateId: string | null;
  onBuy: (templateId: string) => Promise<void>;
};

function readableReasons(reasons: string[]) {
  if (reasons.includes("insufficient_tokens")) return "Jetons insuffisants";
  if (reasons.includes("insufficient_level")) return "Niveau insuffisant";
  if (reasons.includes("template_inactive")) return "Template inactif";
  if (reasons.includes("template_not_purchasable")) return "Non achetable";
  return reasons.join(", ");
}

export function ShopPanel({ items, pendingTemplateId, onBuy }: ShopPanelProps) {
  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">Boutique</h3>
      {items.length === 0 ? (
        <EmptyState message="Aucun avantage visible." />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.template.id} className="rounded border border-slate-700 p-2 text-xs text-slate-300">
              <p className="text-sm font-medium text-slate-100">{item.template.name}</p>
              <p>Coût: {item.template.cost_tokens} jetons · Tier {item.template.tier}</p>
              <p>Niveau min: {item.template.min_player_level}</p>
              <p className="text-slate-400">{item.template.description_player}</p>
              {!item.canBuy ? <p className="mt-1 text-amber-300">{readableReasons(item.reasons)}</p> : null}
              <Button
                className="mt-2 w-full"
                disabled={!item.canBuy || pendingTemplateId === item.template.id}
                onClick={() => void onBuy(item.template.id)}
              >
                {pendingTemplateId === item.template.id ? "Achat..." : "Acheter"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
