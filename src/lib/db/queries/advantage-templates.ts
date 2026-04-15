import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AdvantageTemplate } from "@/types/domain";

const ADVANTAGE_ORDER = [
  { column: "tier", ascending: true },
  { column: "cost_tokens", ascending: true },
  { column: "name", ascending: true },
] as const;

function applyAdvantageSort<T extends { order: (column: string, options: { ascending: boolean }) => T }>(query: T): T {
  let sortedQuery = query;

  for (const order of ADVANTAGE_ORDER) {
    sortedQuery = sortedQuery.order(order.column, { ascending: order.ascending });
  }

  return sortedQuery;
}

export async function getAllAdvantageTemplates(): Promise<AdvantageTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await applyAdvantageSort(supabase.from("advantage_templates").select("*"));

  if (error) {
    throw error;
  }

  return (data ?? []) as AdvantageTemplate[];
}

export async function getActiveAdvantageTemplates(): Promise<AdvantageTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await applyAdvantageSort(
    supabase.from("advantage_templates").select("*").eq("is_active", true),
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as AdvantageTemplate[];
}

export async function getAdvantageTemplateById(id: string): Promise<AdvantageTemplate | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("advantage_templates").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AdvantageTemplate | null) ?? null;
}

export async function getAdvantageTemplateByEffectCode(effectCode: string): Promise<AdvantageTemplate | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("advantage_templates")
    .select("*")
    .eq("effect_code", effectCode)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AdvantageTemplate | null) ?? null;
}

export async function getAdvantageTemplatesByTier(tier: number): Promise<AdvantageTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await applyAdvantageSort(
    supabase.from("advantage_templates").select("*").eq("tier", tier),
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as AdvantageTemplate[];
}

export async function getVisibleShopTemplatesForLevel(levelNumber: number): Promise<AdvantageTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await applyAdvantageSort(
    supabase
      .from("advantage_templates")
      .select("*")
      .eq("is_active", true)
      .or(`min_player_level.lte.${levelNumber},visible_if_locked.eq.true`),
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as AdvantageTemplate[];
}

export async function getPurchasableShopTemplatesForLevel(levelNumber: number): Promise<AdvantageTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await applyAdvantageSort(
    supabase
      .from("advantage_templates")
      .select("*")
      .eq("is_active", true)
      .lte("min_player_level", levelNumber),
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as AdvantageTemplate[];
}
