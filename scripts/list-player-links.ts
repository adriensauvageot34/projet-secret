import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const sessionName = process.argv[2];

if (!url || !serviceRoleKey) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  let query = supabase
    .from("participants")
    .select("id, display_name, public_slug, session:sessions(name)")
    .order("display_name", { ascending: true });

  if (sessionName) {
    query = query.eq("sessions.name", sessionName);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    console.log("No participants found.");
    return;
  }

  for (const participant of data) {
    const session = Array.isArray(participant.session) ? participant.session[0] : participant.session;
    const sessionLabel = session?.name ?? "Session inconnue";
    console.log(`${participant.display_name} (${sessionLabel}) => ${appUrl}/player/${participant.public_slug}`);
  }
}

main().catch((error) => {
  console.error("Failed to list player links:", error.message ?? error);
  process.exit(1);
});
