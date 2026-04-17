"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApiResponse } from "@/types/api";
import type {
  Accusation,
  AdvantageInstanceWithTemplate,
  AdvantageTemplate,
  ElementInstance,
  Participant,
} from "@/types/domain";
import type { ClaimedResult } from "@/lib/game/enums";
import type { LiveRankingEntry } from "@/lib/game/services/live-ranking";
import {
  applyClaimRuntimeOptimisticUpdate,
  sanitizeRuntimeActiveElements,
} from "@/lib/game/services/player-runtime-client-state";

export type PlayerActiveElement = {
  instance: ElementInstance;
  template: {
    id: string;
    name: string;
    code: string;
    elementType: string;
    validationMode: string;
  } | null;
};

export type PlayerReserveTemplate = {
  reserveOfferId: string;
  templateId: string;
  name: string;
  code: string;
  elementType: string;
  difficulty: number;
  durationSeconds: number;
  validationMode: string;
};

export type PlayerShopItem = {
  template: AdvantageTemplate;
  canBuy: boolean;
  reasons: string[];
};

export type PlayerAccusationTarget = {
  id: string;
  displayName: string;
};

export type PlayerAccusableTemplate = {
  id: string;
  name: string;
  elementType: "mission" | "constraint";
};

export type PlayerAdvantageElementTarget = {
  id: string;
  participantId: string;
  participantDisplayName: string;
  elementType: "mission" | "constraint";
  state: "active" | "cooldown";
  endsAt: string | null;
  cooldownUntil: string | null;
  label: string;
};

export type PlayerRuntimeData = {
  participant: Participant;
  sessionStatus: "preparation" | "live" | "finished" | "archived";
  level: {
    id: string;
    levelNumber: number;
    label: string;
    shopTierMax: number;
  };
  reserveTemplates: PlayerReserveTemplate[];
  activeElements: PlayerActiveElement[];
  shop: PlayerShopItem[];
  inventory: AdvantageInstanceWithTemplate[];
  ranking: {
    self: LiveRankingEntry;
    above: LiveRankingEntry | null;
    below: LiveRankingEntry | null;
  };
  accusationTargets: PlayerAccusationTarget[];
  accusableTemplates: PlayerAccusableTemplate[];
  advantageElementTargets: PlayerAdvantageElementTarget[];
};

function parseActionError(message: string): string {
  if (message.includes("No free slot available") || message.includes("No active slot available")) {
    return "Aucun slot libre pour ce type d'élément. Libérez un slot puis réessayez.";
  }

  if (message.includes("insufficient_tokens")) {
    return "Jetons insuffisants pour cet achat.";
  }

  if (message.includes("insufficient_level")) {
    return "Niveau insuffisant pour cet avantage.";
  }

  if (message.includes("template_inactive")) {
    return "Ce template est inactif actuellement.";
  }

  if (message.includes("template_not_purchasable")) {
    return "Ce template n'est pas achetable à votre niveau/tier actuel.";
  }

  if (message.includes("missing_target_participant_id")) {
    return "Cible requise pour activer ce ticket GM.";
  }

  if (message.includes("target_participant_must_be_other")) {
    return "La cible doit être un autre participant.";
  }

  if (message.includes("Cannot consume advantage use: invalid_state")) {
    return "Impossible de consommer ce ticket dans son état actuel.";
  }

  if (message.includes("requires target_element_instance_id")) {
    return "Veuillez sélectionner une cible valide avant d'utiliser cet avantage.";
  }

  if (message.includes("Target element must be in state active")) {
    return "La cible doit être active.";
  }

  if (message.includes("Target element is not in cooldown") || message.includes("Target cooldown already ended")) {
    return "La cible doit être un slot en cooldown encore actif.";
  }

  if (message.includes("Target element participant mismatch")) {
    return "La cible ne correspond pas au participant sélectionné.";
  }

  if (message.includes("accuser_participant_id must be different")) {
    return "Vous ne pouvez pas vous auto-accuser.";
  }

  if (message.includes("must target an element_templates row")) {
    return "Le template choisi ne correspond pas au type d'accusation.";
  }

  if (message.includes("accused_participant_id must reference a player participant")) {
    return "La cible n'est pas accusable (participant GM).";
  }

  if (message.includes("justification")) {
    return "Justification invalide. Merci de saisir un texte clair avant envoi.";
  }

  if (message.includes("already terminally resolved")) {
    return "Cet élément est déjà résolu. Rafraîchissez la page pour synchroniser l'état.";
  }

  if (message.includes("already claimed and pending resolution")) {
    return "Ce claim a déjà été envoyé. En attente de résolution.";
  }

  return message;
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.ok) {
    throw new Error(parseActionError(payload.ok ? "Erreur inconnue" : payload.error));
  }

  return payload.data;
}

export function usePlayerRuntime(participantId: string) {
  const [runtime, setRuntime] = useState<PlayerRuntimeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [pendingInstanceId, setPendingInstanceId] = useState<string | null>(null);
  const [pendingShopTemplateId, setPendingShopTemplateId] = useState<string | null>(null);
  const [pendingAdvantageActionId, setPendingAdvantageActionId] = useState<string | null>(null);
  const [isCreatingAccusation, setIsCreatingAccusation] = useState(false);
  const [lastClaimFlowByInstanceId, setLastClaimFlowByInstanceId] = useState<Record<string, string>>({});
  const loadRuntimeSequenceRef = useRef(0);
  const latestAppliedSequenceRef = useRef(0);

  useEffect(() => {
    loadRuntimeSequenceRef.current = 0;
    latestAppliedSequenceRef.current = 0;
    setRuntime(null);
    setError(null);
    setActionError(null);
    setSuccessMessage(null);
    setPendingTemplateId(null);
    setPendingInstanceId(null);
    setPendingShopTemplateId(null);
    setPendingAdvantageActionId(null);
    setLastClaimFlowByInstanceId({});
  }, [participantId]);

  const loadRuntime = useCallback(async (initial = false) => {
    const sequence = ++loadRuntimeSequenceRef.current;

    try {
      if (initial) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const response = await fetch(`/api/player-runtime/${participantId}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResponse<PlayerRuntimeData>;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Impossible de charger le runtime joueur" : payload.error);
      }

      if (sequence < latestAppliedSequenceRef.current) {
        return;
      }

      latestAppliedSequenceRef.current = sequence;
      const sanitized = sanitizeRuntimeActiveElements(payload.data);
      console.info("[player-runtime] reserve offers loaded", {
        participantId,
        reserveOfferIds: sanitized.reserveTemplates.map((template) => template.reserveOfferId),
      });
      setRuntime(sanitized);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur inconnue de chargement runtime joueur");
    } finally {
      if (sequence === loadRuntimeSequenceRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [participantId]);

  useEffect(() => {
    void loadRuntime(true);

    const timer = setInterval(() => {
      void loadRuntime(false);
    }, 8_000);

    return () => clearInterval(timer);
  }, [loadRuntime]);

  const isSessionFinished = runtime?.sessionStatus === "finished";

  const activateElement = useCallback(async (reserveOfferId: string) => {
    if (isSessionFinished) {
      setActionError("Session terminée : actions gameplay verrouillées.");
      return;
    }
    try {
      setPendingTemplateId(reserveOfferId);
      setActionError(null);
      setSuccessMessage(null);

      console.info("[player-runtime] activate reserve offer", {
        participantId,
        reserveOfferId,
        visibleReserveOfferIds: runtime?.reserveTemplates.map((template) => template.reserveOfferId) ?? [],
      });

      await postJson("/api/elements/activate", {
        participantId,
        reserveOfferId,
      });

      setSuccessMessage("Élément activé.");
      await loadRuntime(false);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Activation impossible");
    } finally {
      setPendingTemplateId(null);
    }
  }, [isSessionFinished, loadRuntime, participantId, runtime]);

  const claimResult = useCallback(async (instanceId: string, claimedResult: ClaimedResult) => {
    if (isSessionFinished) {
      setActionError("Session terminée : actions gameplay verrouillées.");
      return;
    }
    try {
      setPendingInstanceId(instanceId);
      setActionError(null);
      setSuccessMessage(null);

      const result = await postJson<{ flow: string; finalResolved: boolean }>("/api/elements/claim-result", {
        instanceId,
        claimedResult,
      });

      setRuntime((current) => applyClaimRuntimeOptimisticUpdate(current, {
        instanceId,
        claimedResult,
        finalResolved: result.finalResolved,
      }));
      setLastClaimFlowByInstanceId((current) => ({ ...current, [instanceId]: result.flow }));

      if (result.finalResolved) {
        setSuccessMessage(`Claim envoyé (${result.flow}). Score/timers mis à jour.`);
      } else {
        setSuccessMessage(`Claim enregistré (${result.flow}). Résolution en attente.`);
      }

      await loadRuntime(false);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Claim impossible");
    } finally {
      setPendingInstanceId(null);
    }
  }, [isSessionFinished, loadRuntime]);

  const buyAdvantage = useCallback(async (templateId: string) => {
    if (isSessionFinished) {
      setActionError("Session terminée : actions gameplay verrouillées.");
      return;
    }
    try {
      setPendingShopTemplateId(templateId);
      setActionError(null);
      setSuccessMessage(null);

      await postJson("/api/advantages/buy", {
        participantId,
        templateId,
      });

      setSuccessMessage("Achat validé, inventaire mis à jour.");
      await loadRuntime(false);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Achat impossible");
    } finally {
      setPendingShopTemplateId(null);
    }
  }, [isSessionFinished, loadRuntime, participantId]);

  const createAccusation = useCallback(async (params: {
    accusedParticipantId: string;
    suspectedType: "mission" | "constraint";
    suspectedTemplateId: string;
    justification: string;
  }): Promise<Accusation> => {
    if (isSessionFinished) {
      const message = "Session terminée : actions gameplay verrouillées.";
      setActionError(message);
      throw new Error(message);
    }
    try {
      setIsCreatingAccusation(true);
      setActionError(null);
      setSuccessMessage(null);

      const accusation = await postJson<Accusation>("/api/accusations/create", {
        sessionId: runtime?.participant.session_id ?? "",
        accuserParticipantId: participantId,
        accusedParticipantId: params.accusedParticipantId,
        suspectedType: params.suspectedType,
        suspectedTemplateId: params.suspectedTemplateId,
        justification: params.justification,
      });

      setSuccessMessage("Accusation envoyée au GM.");
      await loadRuntime(false);

      return accusation;
    } catch (cause) {
      const readableError = cause instanceof Error ? cause.message : "Accusation impossible";
      setActionError(readableError);
      throw new Error(readableError);
    } finally {
      setIsCreatingAccusation(false);
    }
  }, [isSessionFinished, loadRuntime, participantId, runtime?.participant.session_id]);

  const activateAdvantage = useCallback(async (params: {
    advantageInstanceId: string;
    targetParticipantId?: string | null;
    targetElementInstanceId?: string | null;
  }) => {
    if (isSessionFinished) {
      setActionError("Session terminée : actions gameplay verrouillées.");
      return;
    }
    try {
      setPendingAdvantageActionId(params.advantageInstanceId);
      setActionError(null);
      setSuccessMessage(null);

      await postJson("/api/advantages/activate", {
        advantageInstanceId: params.advantageInstanceId,
        targetParticipantId: params.targetParticipantId ?? null,
        targetElementInstanceId: params.targetElementInstanceId ?? null,
      });

      setSuccessMessage("Ticket GM activé.");
      await loadRuntime(false);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Activation du ticket impossible");
    } finally {
      setPendingAdvantageActionId(null);
    }
  }, [isSessionFinished, loadRuntime]);

  const useAdvantage = useCallback(async (params: {
    advantageInstanceId: string;
    targetElementInstanceId?: string | null;
    targetParticipantId?: string | null;
  }) => {
    if (isSessionFinished) {
      setActionError("Session terminée : actions gameplay verrouillées.");
      return;
    }
    try {
      setPendingAdvantageActionId(params.advantageInstanceId);
      setActionError(null);
      setSuccessMessage(null);

      await postJson("/api/advantages/use", {
        advantageInstanceId: params.advantageInstanceId,
        context: {
          targetElementInstanceId: params.targetElementInstanceId ?? null,
          targetParticipantId: params.targetParticipantId ?? null,
        },
        gmNotes: "Ticket GM consommé depuis interface joueur",
      });

      setSuccessMessage("Ticket GM consommé.");
      await loadRuntime(false);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Consommation du ticket impossible");
    } finally {
      setPendingAdvantageActionId(null);
    }
  }, [isSessionFinished, loadRuntime]);

  return useMemo(() => ({
    runtime,
    isLoading,
    isRefreshing,
    error,
    actionError,
    successMessage,
    pendingTemplateId,
    pendingInstanceId,
    pendingShopTemplateId,
    pendingAdvantageActionId,
    isCreatingAccusation,
    lastClaimFlowByInstanceId,
    refresh: () => loadRuntime(false),
    activateElement,
    claimResult,
    buyAdvantage,
    createAccusation,
    activateAdvantage,
    useAdvantage,
  }), [
    activateElement,
    activateAdvantage,
    actionError,
    buyAdvantage,
    claimResult,
    createAccusation,
    error,
    isCreatingAccusation,
    isLoading,
    isRefreshing,
    lastClaimFlowByInstanceId,
    loadRuntime,
    pendingAdvantageActionId,
    pendingInstanceId,
    pendingShopTemplateId,
    pendingTemplateId,
    runtime,
    successMessage,
    useAdvantage,
  ]);
}
