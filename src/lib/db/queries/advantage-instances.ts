import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdvantageUsable } from "@/lib/game/rules/advantage-instances";
import type { AdvantageInstance, AdvantageInstanceWithTemplate, AdvantageTemplate } from "@/types/domain";

const TEMPLATE_SELECT = `
  name,
  effect_code,
  effect_family,
  target_type,
  duration_seconds,
  max_uses,
  cost_tokens,
  description_player
`;

type RawAdvantageWithTemplate = AdvantageInstance & {
  advantage_templates: Pick<
    AdvantageTemplate,
    | "name"
    | "effect_code"
    | "effect_family"
    | "target_type"
    | "duration_seconds"
    | "max_uses"
    | "cost_tokens"
    | "description_player"
  > | null;
};

function mapWithTemplate(row: RawAdvantageWithTemplate): AdvantageInstanceWithTemplate {
  if (!row.advantage_templates) {
    throw new Error(`Advantage template not found for instance ${row.id}`);
  }

  return {
    ...row,
    template: row.advantage_templates,
  };
}

export async function getAdvantageInstanceById(id: string): Promise<AdvantageInstance | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("advantage_instances").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(`Failed to load advantage instance: ${error.message}`);
  }

  return (data as AdvantageInstance | null) ?? null;
}

export async function getAdvantageInstanceWithTemplateById(id: string): Promise<AdvantageInstanceWithTemplate | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("advantage_instances")
    .select(`*, advantage_templates!inner(${TEMPLATE_SELECT})`)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load advantage instance with template: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapWithTemplate(data as RawAdvantageWithTemplate);
}

export async function getParticipantAdvantageInventory(participantId: string): Promise<AdvantageInstanceWithTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("advantage_instances")
    .select(`*, advantage_templates!inner(${TEMPLATE_SELECT})`)
    .eq("participant_id", participantId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list participant inventory: ${error.message}`);
  }

  const rows = (data ?? []) as RawAdvantageWithTemplate[];

  const stateWeight: Record<AdvantageInstance["state"], number> = {
    owned: 0,
    active: 1,
    consumed: 2,
    expired: 3,
    cancelled: 4,
  };

  return rows
    .map(mapWithTemplate)
    .sort((a, b) => stateWeight[a.state] - stateWeight[b.state] || b.created_at.localeCompare(a.created_at));
}

export async function getParticipantOwnedAdvantages(participantId: string): Promise<AdvantageInstanceWithTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("advantage_instances")
    .select(`*, advantage_templates!inner(${TEMPLATE_SELECT})`)
    .eq("participant_id", participantId)
    .eq("state", "owned")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list owned advantages: ${error.message}`);
  }

  return ((data ?? []) as RawAdvantageWithTemplate[]).map(mapWithTemplate);
}

export async function getParticipantActiveAdvantages(participantId: string): Promise<AdvantageInstanceWithTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("advantage_instances")
    .select(`*, advantage_templates!inner(${TEMPLATE_SELECT})`)
    .eq("participant_id", participantId)
    .eq("state", "active")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list active advantages: ${error.message}`);
  }

  return ((data ?? []) as RawAdvantageWithTemplate[]).map(mapWithTemplate);
}

export async function getParticipantUsableAdvantages(participantId: string): Promise<AdvantageInstanceWithTemplate[]> {
  const inventory = await getParticipantAdvantageInventory(participantId);
  return inventory.filter((item) => isAdvantageUsable(item, { ...item.template, is_active: true }));
}

export async function getSessionAdvantageInstances(sessionId: string): Promise<AdvantageInstanceWithTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("advantage_instances")
    .select(`*, advantage_templates!inner(${TEMPLATE_SELECT})`)
    .eq("session_id", sessionId)
    .order("state", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list session advantage instances: ${error.message}`);
  }

  return ((data ?? []) as RawAdvantageWithTemplate[]).map(mapWithTemplate);
}

export async function getActiveTimedAdvantagesExpiringBefore(date: Date): Promise<AdvantageInstanceWithTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("advantage_instances")
    .select(`*, advantage_templates!inner(${TEMPLATE_SELECT})`)
    .eq("state", "active")
    .not("expires_at", "is", null)
    .lte("expires_at", date.toISOString())
    .order("expires_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list expiring advantages: ${error.message}`);
  }

  return ((data ?? []) as RawAdvantageWithTemplate[]).map(mapWithTemplate);
}

export async function getAdvantagesTargetingParticipant(
  participantId: string,
): Promise<AdvantageInstanceWithTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("advantage_instances")
    .select(`*, advantage_templates!inner(${TEMPLATE_SELECT})`)
    .eq("target_participant_id", participantId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list participant-targeting advantages: ${error.message}`);
  }

  return ((data ?? []) as RawAdvantageWithTemplate[]).map(mapWithTemplate);
}

export async function getAdvantagesTargetingElementInstance(
  elementInstanceId: string,
): Promise<AdvantageInstanceWithTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("advantage_instances")
    .select(`*, advantage_templates!inner(${TEMPLATE_SELECT})`)
    .eq("target_element_instance_id", elementInstanceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list element-targeting advantages: ${error.message}`);
  }

  return ((data ?? []) as RawAdvantageWithTemplate[]).map(mapWithTemplate);
}
