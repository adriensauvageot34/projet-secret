"use client";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/utils/formatting";
import { toPlayerAdvantageStateLabel } from "@/lib/game/gm-ticket-advantages";
import type { GmRuntimeActiveTicket } from "@/lib/game/services/get-gm-runtime-view";

export function GmActiveTicketQueue({ tickets }: { tickets: GmRuntimeActiveTicket[] }) {
  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">Tickets GM actifs</h3>
      {tickets.length === 0 ? (
        <EmptyState message="Aucun ticket GM actif." />
      ) : (
        <div className="space-y-2 text-xs text-slate-300">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded border border-slate-700 p-2">
              <p className="text-sm font-medium text-slate-100">{ticket.template_name ?? ticket.effect_code}</p>
              <p>joueur: {ticket.participant_display_name ?? "inconnu"}</p>
              <p>cible: {ticket.target_participant_display_name ?? "—"}</p>
              <p>état: {toPlayerAdvantageStateLabel("active", true)}</p>
              <p>activé: {formatDate(ticket.activated_at)}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
