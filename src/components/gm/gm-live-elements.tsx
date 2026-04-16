import type { GmRuntimeElement } from "@/lib/game/services/get-gm-runtime-view";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/utils/formatting";

type GmLiveElementsProps = {
  liveElements: GmRuntimeElement[];
};

export function GmLiveElements({ liveElements }: GmLiveElementsProps) {
  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">Éléments live</h3>
      {liveElements.length === 0 ? (
        <EmptyState message="Aucun élément en runtime." />
      ) : (
        <div className="space-y-2">
          {liveElements.map((element) => (
            <div key={element.id} className="rounded border border-slate-700 p-2 text-xs text-slate-300">
              <p className="text-sm font-medium text-slate-100">{element.template_name ?? element.element_template_id}</p>
              <p>{element.participant_display_name ?? element.participant_id} · type={element.element_type ?? "-"} · state={element.state}</p>
              <p>validation={element.validation_mode ?? "-"} · proof_status={element.proof_status} · is_fake={String(element.is_fake)}</p>
              <p>proof_pending={String(element.is_proof_pending)} · gm_pending={String(element.is_gm_pending)}</p>
              <p>claimed={element.claimed_result ?? "-"} · final={element.final_result ?? "-"}</p>
              <p>activated={formatDate(element.activated_at)} · ends={formatDate(element.ends_at)}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
