import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { PlayerReserveTemplate } from "@/hooks/use-player-runtime";

type ReservePanelProps = {
  templates: PlayerReserveTemplate[];
  pendingTemplateId: string | null;
  onActivate: (templateId: string) => Promise<void>;
};

export function ReservePanel({ templates, pendingTemplateId, onActivate }: ReservePanelProps) {
  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">Réserve visible</h3>
      {templates.length === 0 ? (
        <EmptyState message="Aucun élément disponible dans la réserve." />
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div key={template.id} className="rounded border border-slate-700 p-2">
              <p className="text-sm font-medium">{template.name}</p>
              <p className="text-xs text-slate-400">{template.code} · {template.elementType} · diff {template.difficulty}</p>
              <p className="text-xs text-slate-400">Durée {template.durationSeconds}s · validation {template.validationMode}</p>
              <Button
                className="mt-2 w-full"
                disabled={pendingTemplateId === template.id}
                onClick={() => void onActivate(template.id)}
              >
                {pendingTemplateId === template.id ? "Activation..." : "Activer"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
