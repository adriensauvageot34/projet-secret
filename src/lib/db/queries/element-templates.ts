import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ElementTemplate, Participant } from "@/types/domain";
import type { ElementType } from "@/lib/game/enums";

export async function getAllTemplates(): Promise<ElementTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("element_templates")
    .select("*")
    .order("difficulty", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ElementTemplate[];
}

export async function getActiveTemplates(): Promise<ElementTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("element_templates")
    .select("*")
    .eq("is_active", true)
    .order("difficulty", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ElementTemplate[];
}

export async function getTemplatesByType(type: ElementType): Promise<ElementTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("element_templates")
    .select("*")
    .eq("element_type", type)
    .eq("is_active", true)
    .order("difficulty", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ElementTemplate[];
}

export async function getTemplatesByDifficulty(maxDifficulty: number): Promise<ElementTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("element_templates")
    .select("*")
    .eq("is_active", true)
    .lte("difficulty", maxDifficulty)
    .order("difficulty", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ElementTemplate[];
}

export async function getTemplatesForParticipant(level: number): Promise<ElementTemplate[]> {
  const supabase = createServerSupabaseClient();

  const { data: levelData, error: levelError } = await supabase
    .from("levels")
    .select("mission_difficulty_max,constraint_difficulty_max")
    .eq("level_number", level)
    .single();

  if (levelError) {
    throw levelError;
  }

  const { data, error } = await supabase
    .from("element_templates")
    .select("*")
    .eq("is_active", true)
    .or(
      `and(element_type.eq.mission,difficulty.lte.${levelData.mission_difficulty_max}),and(element_type.eq.constraint,difficulty.lte.${levelData.constraint_difficulty_max})`,
    )
    .order("difficulty", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ElementTemplate[];
}

export async function getTemplatesForParticipantRow(participant: { current_level: number }): Promise<ElementTemplate[]> {
  return getTemplatesForParticipant(participant.current_level);
}
