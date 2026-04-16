import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/utils/formatting";
import type { AdvantageInstanceWithTemplate } from "@/types/domain";

export function InventoryPanel({ inventory }: { inventory: AdvantageInstanceWithTemplate[] }) {
  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">Inventaire</h3>
      {inventory.length === 0 ? (
        <EmptyState message="Aucun avantage en inventaire." />
      ) : (
        <div className="space-y-2 text-xs text-slate-300">
          {inventory.map((item) => (
            <div key={item.id} className="rounded border border-slate-700 p-2">
              <p className="text-sm font-medium text-slate-100">{item.template.name}</p>
              <p>state: {item.state} · uses: {item.remaining_uses}</p>
              <p>source: {item.source} · coût payé: {item.cost_paid}</p>
              <p>createdAt: {formatDate(item.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
