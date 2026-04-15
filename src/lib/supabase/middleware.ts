import { createClient } from "@supabase/supabase-js";

export function supabaseMiddleware() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase middleware env vars");
  }

  return createClient(url, key);
}
