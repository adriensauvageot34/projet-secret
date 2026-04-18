"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiResponse } from "@/types/api";
import type { AccusationDecision, GmDecisionType } from "@/lib/game/enums";
import type { GmRuntimeData } from "@/lib/game/services/get-gm-runtime-view";

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.ok ? "Erreur inconnue" : payload.error);
  }

  return payload.data;
}

function toUiError(rawMessage: string): string {
  if (rawMessage.includes("already adjudicated with another decision")) {
    return "Accusation déjà arbitrée avec une autre décision (double adjudication incohérente).";
  }

  if (rawMessage.includes("target_participant_id is required")) {
    return "Participant cible requis si impact score/token non nul.";
  }

  if (rawMessage.includes("Decision already applied")) {
    return "Décision déjà appliquée, impossible de la réappliquer.";
  }

  if (rawMessage.includes("cannot be cancelled")) {
    return "Décision déjà appliquée: annulation impossible.";
  }

  if (rawMessage.includes("gameplay is locked")) {
    return "Session terminée : les actions gameplay sont verrouillées.";
  }

  return rawMessage;
}

export function useGmRuntime() {
  const [runtime, setRuntime] = useState<GmRuntimeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);

  const loadRuntime = useCallback(async (initial = false) => {
    try {
      if (initial) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const response = await fetch("/api/gm-runtime", { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<GmRuntimeData>;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Impossible de charger le runtime GM" : payload.error);
      }

      setRuntime(payload.data);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur inconnue de chargement runtime GM");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRuntime(true);

    const timer = setInterval(() => {
      void loadRuntime(false);
    }, 8_000);

    return () => clearInterval(timer);
  }, [loadRuntime]);

  const runAction = useCallback(async (key: string, action: () => Promise<void>, success: string) => {
    try {
      setPendingActionKey(key);
      setActionError(null);
      setSuccessMessage(null);
      await action();
      setSuccessMessage(success);
      await loadRuntime(false);
    } catch (cause) {
      setActionError(toUiError(cause instanceof Error ? cause.message : "Erreur action GM"));
    } finally {
      setPendingActionKey(null);
    }
  }, [loadRuntime]);

  const adjudicateAccusation = useCallback(async (params: {
    accusationId: string;
    decision: AccusationDecision;
    notesAdmin?: string;
    rewardTokens?: number;
  }) => {
    if (!runtime?.session.session_gm_participant_id) {
      setActionError("Aucun participant GM configuré dans la session courante.");
      return;
    }

    await runAction(
      `adjudicate-${params.accusationId}`,
      async () => {
        await postJson("/api/accusations/adjudicate", {
          accusationId: params.accusationId,
          sessionId: runtime.session.id,
          adjudicatedByParticipantId: runtime.session.session_gm_participant_id,
          decision: params.decision,
          notesAdmin: params.notesAdmin ?? null,
          rewardTokens: params.rewardTokens,
        });
      },
      "Accusation arbitrée.",
    );
  }, [runAction, runtime]);

  const createAccusation = useCallback(async (params: {
    accuserParticipantId: string;
    accusedParticipantId: string;
    suspectedType: "mission" | "constraint";
    suspectedTemplateId: string;
    justification: string;
    relatedElementInstanceId?: string;
  }) => {
    if (!runtime) {
      return;
    }

    await runAction(
      "create-accusation",
      async () => {
        await postJson("/api/accusations/create", {
          sessionId: runtime.session.id,
          ...params,
          relatedElementInstanceId: params.relatedElementInstanceId ?? null,
        });
      },
      "Accusation créée.",
    );
  }, [runAction, runtime]);



  const markElementCaught = useCallback(async (params: {
    element: GmRuntimeData["liveElements"][number];
    accuserParticipantId: string;
  }) => {
    if (!runtime?.session.session_gm_participant_id) {
      setActionError("Aucun participant GM configuré dans la session courante.");
      return;
    }

    await runAction(
      `caught-${params.element.id}`,
      async () => {
        if (params.element.element_type !== "mission" && params.element.element_type !== "constraint") {
          throw new Error("Type d'élément actif invalide pour une action grillé.");
        }

        const accusation = await postJson<{ id: string }>("/api/accusations/create", {
          sessionId: runtime.session.id,
          accuserParticipantId: params.accuserParticipantId,
          accusedParticipantId: params.element.participant_id,
          suspectedType: params.element.element_type,
          suspectedTemplateId: params.element.element_template_id,
          relatedElementInstanceId: params.element.id,
          justification: "Signalement GM: joueur grillé en situation réelle",
        });

        await postJson("/api/accusations/adjudicate", {
          accusationId: accusation.id,
          sessionId: runtime.session.id,
          adjudicatedByParticipantId: runtime.session.session_gm_participant_id,
          decision: "correct",
          rewardTokens: 1,
          notesAdmin: "Action rapide GM: grillé",
        });
      },
      "Joueur marqué comme grillé.",
    );
  }, [runAction, runtime]);

  const createDecision = useCallback(async (params: {
    decisionType: GmDecisionType;
    decisionLabel: string;
    reason: string;
    notes?: string;
    scoreImpact?: number;
    tokenImpact?: number;
    targetParticipantId?: string;
    targetAccusationId?: string;
  }) => {
    if (!runtime?.session.session_gm_participant_id) {
      setActionError("Aucun participant GM configuré dans la session courante.");
      return;
    }

    await runAction(
      "create-decision",
      async () => {
        await postJson("/api/gm-decisions/create", {
          sessionId: runtime.session.id,
          madeByParticipantId: runtime.session.session_gm_participant_id,
          decisionType: params.decisionType,
          decisionLabel: params.decisionLabel,
          reason: params.reason,
          notes: params.notes ?? null,
          scoreImpact: params.scoreImpact ?? 0,
          tokenImpact: params.tokenImpact ?? 0,
          targetParticipantId: params.targetParticipantId ?? null,
          targetAccusationId: params.targetAccusationId ?? null,
        });
      },
      "Décision GM créée.",
    );
  }, [runAction, runtime]);

  const applyDecision = useCallback(async (decisionId: string) => {
    await runAction(
      `apply-${decisionId}`,
      async () => {
        await postJson("/api/gm-decisions/apply", { decisionId, produceLedgerEvents: true });
      },
      "Décision appliquée.",
    );
  }, [runAction]);

  const cancelDecision = useCallback(async (decisionId: string) => {
    await runAction(
      `cancel-${decisionId}`,
      async () => {
        await postJson("/api/gm-decisions/cancel", { decisionId, notes: "Annulé depuis UI GM MVP" });
      },
      "Décision annulée.",
    );
  }, [runAction]);

  const finishSession = useCallback(async () => {
    if (!runtime) {
      return;
    }

    await runAction(
      "finish-session",
      async () => {
        await postJson("/api/sessions/finish", { sessionId: runtime.session.id });
      },
      "Session terminée. Jeu figé, classement final disponible.",
    );
  }, [runAction, runtime]);

  return useMemo(() => ({
    runtime,
    isLoading,
    isRefreshing,
    error,
    actionError,
    successMessage,
    pendingActionKey,
    refresh: () => loadRuntime(false),
    createAccusation,
    adjudicateAccusation,
    markElementCaught,
    createDecision,
    applyDecision,
    cancelDecision,
    finishSession,
  }), [
    runtime,
    isLoading,
    isRefreshing,
    error,
    actionError,
    successMessage,
    pendingActionKey,
    loadRuntime,
    createAccusation,
    adjudicateAccusation,
    markElementCaught,
    createDecision,
    applyDecision,
    cancelDecision,
    finishSession,
  ]);
}
