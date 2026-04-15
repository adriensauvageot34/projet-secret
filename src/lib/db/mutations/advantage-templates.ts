import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AdvantageTemplate, AdvantageTemplateInsert, AdvantageTemplateUpdate } from "@/types/domain";

export async function createAdvantageTemplate(input: AdvantageTemplateInsert): Promise<AdvantageTemplate> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("advantage_templates").insert(input).select("*").single();

  if (error) {
    throw error;
  }

  return data as AdvantageTemplate;
}

export async function updateAdvantageTemplate(id: string, patch: AdvantageTemplateUpdate): Promise<AdvantageTemplate> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("advantage_templates").update(patch).eq("id", id).select("*").single();

  if (error) {
    throw error;
  }

  return data as AdvantageTemplate;
}

export async function setAdvantageTemplateActive(id: string, isActive: boolean): Promise<AdvantageTemplate> {
  return updateAdvantageTemplate(id, { is_active: isActive });
}

export async function upsertAdvantageTemplateByEffectCode(input: AdvantageTemplateInsert): Promise<AdvantageTemplate> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("advantage_templates")
    .upsert(input, { onConflict: "effect_code" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as AdvantageTemplate;
}
