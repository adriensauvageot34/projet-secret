"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiResponse } from "@/types/api";
import type {
  AdvantageInstanceWithTemplate,
  AdvantageTemplate,
  ElementInstance,
  Participant,
} from "@/types/domain";
import type { ClaimedResult } from "@/lib/game/enums";

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
  id: string;
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

export type PlayerRuntimeData = {
  participant: Participant;
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
  const [lastClaimFlowByInstanceId, setLastClaimFlowByInstanceId] = useState<Record<string, string>>({});

  const loadRuntime = useCallback(async (initial = false) => {
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

      setRuntime(payload.data);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur inconnue de chargement runtime joueur");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [participantId]);

  useEffect(() => {
    void loadRuntime(true);

    const timer = setInterval(() => {
      void loadRuntime(false);
    }, 8_000);

    return () => clearInterval(timer);
  }, [loadRuntime]);

  const activateElement = useCallback(async (templateId: string) => {
    try {
      setPendingTemplateId(templateId);
      setActionError(null);
      setSuccessMessage(null);

      await postJson("/api/elements/activate", {
        participantId,
        templateId,
      });

      setSuccessMessage("Élément activé.");
      await loadRuntime(false);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Activation impossible");
    } finally {
      setPendingTemplateId(null);
    }
  }, [loadRuntime, participantId]);

  const claimResult = useCallback(async (instanceId: string, claimedResult: ClaimedResult) => {
    try {
      setPendingInstanceId(instanceId);
      setActionError(null);
      setSuccessMessage(null);

      const result = await postJson<{ flow: string; finalResolved: boolean }>("/api/elements/claim-result", {
        instanceId,
        claimedResult,
      });

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
  }, [loadRuntime]);

  const buyAdvantage = useCallback(async (templateId: string) => {
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
  }, [loadRuntime, participantId]);

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
    lastClaimFlowByInstanceId,
    refresh: () => loadRuntime(false),
    activateElement,
    claimResult,
    buyAdvantage,
  }), [
    activateElement,
    actionError,
    buyAdvantage,
    claimResult,
    error,
    isLoading,
    isRefreshing,
    lastClaimFlowByInstanceId,
    loadRuntime,
    pendingInstanceId,
    pendingShopTemplateId,
    pendingTemplateId,
    runtime,
    successMessage,
  ]);
}
