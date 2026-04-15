import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  computeAdvantageTheoreticalExpiresAt,
  getAdvantageEffectiveRemainingUses,
} from "@/lib/game/rules/advantage-instances";
import { getAdvantageTemplateById } from "@/lib/db/queries/advantage-templates";
import type { AdvantageInstance, AdvantageTemplate } from "@/types/domain";
import type {
  AdvantageGrantInsert,
  AdvantageInstanceInsert,
  AdvantageInstanceUpdate,
  AdvantagePurchaseInsert,
} from "@/types/database";

export async function createAdvantageInstance(input: AdvantageInstanceInsert): Promise<AdvantageInstance> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("advantage_instances").insert(input).select("*").single();

  if (error) {
    throw new Error(`Failed to create advantage instance: ${error.message}`);
  }

  return data as AdvantageInstance;
}

export async function updateAdvantageInstance(id: string, patch: AdvantageInstanceUpdate): Promise<AdvantageInstance> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("advantage_instances").update(patch).eq("id", id).select("*").single();

  if (error) {
    throw new Error(`Failed to update advantage instance: ${error.message}`);
  }

  return data as AdvantageInstance;
}

export async function grantAdvantageInstance(input: AdvantageGrantInsert): Promise<AdvantageInstance> {
  return createAdvantageInstance({
    ...input,
    source: input.source,
    cost_paid: input.cost_paid ?? 0,
    state: input.state ?? "owned",
    remaining_uses: input.remaining_uses ?? 1,
    activated_at: input.activated_at ?? null,
    expires_at: input.expires_at ?? null,
  });
}

export async function purchaseAdvantageInstance(input: AdvantagePurchaseInsert): Promise<AdvantageInstance> {
  return createAdvantageInstance({
    ...input,
    source: "shop",
    state: input.state ?? "owned",
  });
}

export async function activateAdvantageInstance(
  id: string,
  patch: Pick<AdvantageInstanceUpdate, "activated_at" | "expires_at" | "target_participant_id" | "target_element_instance_id">,
): Promise<AdvantageInstance> {
  const activatedAt = patch.activated_at ?? new Date().toISOString();

  return updateAdvantageInstance(id, {
    ...patch,
    state: "active",
    activated_at: activatedAt,
  });
}

export async function consumeAdvantageInstanceUse(
  id: string,
  patch?: Pick<AdvantageInstanceUpdate, "gm_notes">,
): Promise<AdvantageInstance> {
  const supabase = createServerSupabaseClient();
  const { data: existing, error: loadError } = await supabase
    .from("advantage_instances")
    .select("*")
    .eq("id", id)
    .single();

  if (loadError || !existing) {
    throw new Error(`Failed to load advantage instance before consumption: ${loadError?.message ?? "not found"}`);
  }

  const remainingUses = Math.max(0, (existing.remaining_uses as number) - 1);

  return updateAdvantageInstance(id, {
    remaining_uses: remainingUses,
    state: remainingUses === 0 ? "consumed" : existing.state,
    ...(patch ?? {}),
  });
}

export async function markAdvantageInstanceExpired(id: string): Promise<AdvantageInstance> {
  return updateAdvantageInstance(id, {
    state: "expired",
    expires_at: new Date().toISOString(),
  });
}

export async function cancelAdvantageInstance(id: string, notes?: string): Promise<AdvantageInstance> {
  const patch: AdvantageInstanceUpdate = { state: "cancelled" };

  if (notes !== undefined) {
    patch.gm_notes = notes;
  }

  return updateAdvantageInstance(id, patch);
}

export function buildOwnedAdvantagePayload(params: {
  template: Pick<AdvantageTemplate, "id" | "max_uses" | "cost_tokens">;
  session_id: string;
  participant_id: string;
  assigned_player_id: string;
  source: "shop" | "bonus" | "fake_bait" | "manual";
  cost_paid?: number;
  state?: "owned" | "active";
  activated_at?: string | null;
  expires_at?: string | null;
  target_participant_id?: string | null;
  target_element_instance_id?: string | null;
  gm_notes?: string;
}): AdvantageInstanceInsert {
  const expiresAt =
    params.expires_at ??
    computeAdvantageTheoreticalExpiresAt(params.activated_at ?? null, 0)?.toISOString() ??
    null;

  return {
    source: params.source,
    cost_paid: params.cost_paid ?? params.template.cost_tokens,
    state: params.state ?? "owned",
    activated_at: params.activated_at ?? null,
    expires_at: expiresAt,
    remaining_uses: getAdvantageEffectiveRemainingUses({ remaining_uses: params.template.max_uses }, params.template),
    gm_notes: params.gm_notes ?? "",
    advantage_template_id: params.template.id,
    session_id: params.session_id,
    assigned_player_id: params.assigned_player_id,
    participant_id: params.participant_id,
    target_participant_id: params.target_participant_id ?? null,
    target_element_instance_id: params.target_element_instance_id ?? null,
  };
}

export async function createOwnedAdvantageInstance(input: {
  templateId: string;
  session_id: string;
  participant_id: string;
  assigned_player_id: string;
  source: "shop" | "bonus" | "fake_bait" | "manual";
  cost_paid?: number;
  remaining_uses?: number;
  gm_notes?: string;
}): Promise<AdvantageInstance> {
  const template = await getAdvantageTemplateById(input.templateId);

  if (!template) {
    throw new Error("Advantage template not found");
  }

  return createAdvantageInstance({
    source: input.source,
    cost_paid: input.cost_paid ?? template.cost_tokens,
    state: "owned",
    activated_at: null,
    expires_at: null,
    remaining_uses: input.remaining_uses ?? template.max_uses,
    gm_notes: input.gm_notes ?? "",
    advantage_template_id: template.id,
    session_id: input.session_id,
    assigned_player_id: input.assigned_player_id,
    participant_id: input.participant_id,
    target_participant_id: null,
    target_element_instance_id: null,
  });
}
