import type { GmRuntimeParticipant } from "@/lib/game/services/get-gm-runtime-view";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

type GmParticipantListProps = {
  participants: GmRuntimeParticipant[];
};

export function GmParticipantList({ participants }: GmParticipantListProps) {
  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">Participants</h3>
      {participants.length === 0 ? (
        <EmptyState message="Aucun participant trouvé pour la session." />
      ) : (
        <div className="space-y-2">
          {participants.map((participant) => (
            <div key={participant.id} className="rounded border border-slate-700 p-2 text-xs text-slate-300">
              <p className="text-sm font-medium text-slate-100">{participant.display_name}</p>
              <p>role: {participant.role} · status: {participant.current_status}</p>
              <p>score: {participant.current_score} · tokens: {participant.current_tokens}</p>
              <p>completed: {participant.completed_elements_count} · waiting: {participant.waiting_slot_count} · blocked: {participant.blocked_slot_count}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
