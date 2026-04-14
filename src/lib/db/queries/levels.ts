import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Level } from "@/types/domain";

export async function getLevelByNumber(levelNumber: number): Promise<Level | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("levels")
    .select("*")
    .eq("level_number", levelNumber)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Level | null) ?? null;
}

export async function getAllLevels(): Promise<Level[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("levels")
    .select("*")
    .order("level_number", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Level[];
}
