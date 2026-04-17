import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getElementInstanceById } from "@/lib/db/queries/element-instances";
import { resolveElementClaim, type ResolveElementClaimOutput } from "@/lib/game/services/resolve-element-claim";
import type { ClaimedResult } from "@/lib/game/enums";
import type { ElementInstance } from "@/types/domain";

function isExpired(instance: Pick<ElementInstance, "ends_at">, now: Date): boolean {
  if (!instance.ends_at) {
    return false;
  }

  return new Date(instance.ends_at).getTime() <= now.getTime();
}

function getExpirationClaim(elementType: "mission" | "constraint"): ClaimedResult {
  return elementType === "mission" ? "fail" : "success";
}

type ResolveExpiredElementsDependencies = {
  getElementInstanceById: typeof getElementInstanceById;
  getElementTypeByTemplateId: (templateId: string) => Promise<"mission" | "constraint" | null>;
  resolveElementClaim: typeof resolveElementClaim;
};

const defaultDependencies: ResolveExpiredElementsDependencies = {
  getElementInstanceById,
  getElementTypeByTemplateId: async (templateId) => {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("element_templates")
      .select("element_type")
      .eq("id", templateId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load template for expiration resolution: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return data.element_type as "mission" | "constraint";
  },
  resolveElementClaim,
};

export async function resolveExpiredElementInstance(
  instanceId: string,
  now: Date = new Date(),
  dependencies: ResolveExpiredElementsDependencies = defaultDependencies,
): Promise<ResolveElementClaimOutput | null> {
  const instance = await dependencies.getElementInstanceById(instanceId);

  if (!instance) {
    return null;
  }

  if (
    instance.state !== "active"
    || instance.final_result !== null
    || instance.claimed_result !== null
    || !isExpired(instance, now)
  ) {
    return null;
  }

  const elementType = await dependencies.getElementTypeByTemplateId(instance.element_template_id);
  if (!elementType) {
    throw new Error(`Template not found for expiration resolution: ${instance.element_template_id}`);
  }

  const claimedResult = getExpirationClaim(elementType);
  return dependencies.resolveElementClaim(instance.id, claimedResult, undefined, { forceAutoResolve: true });
}

export async function resolveExpiredElementsForParticipant(
  participantId: string,
  sessionId: string,
  now: Date = new Date(),
  dependencies: ResolveExpiredElementsDependencies = defaultDependencies,
): Promise<ResolveElementClaimOutput[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("element_instances")
    .select("id")
    .eq("participant_id", participantId)
    .eq("session_id", sessionId)
    .eq("state", "active")
    .is("final_result", null)
    .is("claimed_result", null)
    .lte("ends_at", now.toISOString());

  if (error) {
    throw new Error(`Failed to list expired active element instances: ${error.message}`);
  }

  const outputs: ResolveElementClaimOutput[] = [];

  for (const row of data ?? []) {
    const result = await resolveExpiredElementInstance(row.id as string, now, dependencies);
    if (result) {
      outputs.push(result);
    }
  }

  return outputs;
}
