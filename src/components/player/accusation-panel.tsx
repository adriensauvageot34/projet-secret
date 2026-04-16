import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PlayerAccusableTemplate, PlayerAccusationTarget } from "@/hooks/use-player-runtime";

type AccusationPanelProps = {
  accusationTargets: PlayerAccusationTarget[];
  accusableTemplates: PlayerAccusableTemplate[];
  isPending: boolean;
  actionError: string | null;
  successMessage: string | null;
  onCreateAccusation: (params: {
    accusedParticipantId: string;
    suspectedType: "mission" | "constraint";
    suspectedTemplateId: string;
    justification: string;
  }) => Promise<unknown>;
};

export function AccusationPanel({
  accusationTargets,
  accusableTemplates,
  isPending,
  actionError,
  successMessage,
  onCreateAccusation,
}: AccusationPanelProps) {
  const [accusedParticipantId, setAccusedParticipantId] = useState(accusationTargets[0]?.id ?? "");
  const [suspectedType, setSuspectedType] = useState<"mission" | "constraint">("mission");
  const [suspectedTemplateId, setSuspectedTemplateId] = useState("");
  const [justification, setJustification] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const templatesForType = useMemo(
    () => accusableTemplates.filter((template) => template.elementType === suspectedType),
    [accusableTemplates, suspectedType],
  );

  const canSubmit = Boolean(accusedParticipantId && suspectedTemplateId && justification.trim());

  async function submitAccusation() {
    if (!canSubmit) {
      setLocalError("Complétez cible, type, template et justification.");
      return;
    }

    try {
      setLocalError(null);
      await onCreateAccusation({
        accusedParticipantId,
        suspectedType,
        suspectedTemplateId,
        justification: justification.trim(),
      });
      setJustification("");
      setSuspectedTemplateId("");
    } catch {
      // Erreur déjà exposée via le hook.
    }
  }

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold">Accusation</h3>
      {accusationTargets.length === 0 ? (
        <p className="text-xs text-slate-400">Aucune cible accusable dans cette session.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 text-xs text-slate-200">
            <select
              value={accusedParticipantId}
              onChange={(event) => setAccusedParticipantId(event.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-2"
            >
              <option value="">Choisir une cible</option>
              {accusationTargets.map((target) => (
                <option key={target.id} value={target.id}>{target.displayName}</option>
              ))}
            </select>

            <select
              value={suspectedType}
              onChange={(event) => {
                setSuspectedType(event.target.value as "mission" | "constraint");
                setSuspectedTemplateId("");
              }}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-2"
            >
              <option value="mission">mission</option>
              <option value="constraint">constraint</option>
            </select>

            <select
              value={suspectedTemplateId}
              onChange={(event) => setSuspectedTemplateId(event.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-2"
            >
              <option value="">Choisir un template</option>
              {templatesForType.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>

            <textarea
              rows={3}
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              placeholder="Pourquoi cette accusation ?"
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-2"
            />
          </div>

          <Button className="w-full" disabled={!canSubmit || isPending} onClick={() => void submitAccusation()}>
            {isPending ? "Envoi..." : "Envoyer accusation"}
          </Button>
        </>
      )}

      {localError ? <p className="text-xs text-amber-300">{localError}</p> : null}
      {actionError ? <p className="text-xs text-red-300">{actionError}</p> : null}
      {successMessage ? <p className="text-xs text-emerald-300">{successMessage}</p> : null}
    </Card>
  );
}
