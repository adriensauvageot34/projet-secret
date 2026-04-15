#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v supabase >/dev/null 2>&1; then
  echo "[error] Supabase CLI introuvable."
  echo "Installe-le puis relance ce script."
  exit 1
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "[error] SUPABASE_PROJECT_REF manquant (ex: abcdefghijklmnop)."
  exit 1
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "[error] SUPABASE_ACCESS_TOKEN manquant."
  echo "Fais 'supabase login' (interactif) ou exporte SUPABASE_ACCESS_TOKEN."
  exit 1
fi

if [[ ! -f "supabase/config.toml" ]]; then
  echo "[info] Initialisation de supabase/config.toml"
  supabase init
fi

LINK_CMD=(supabase link --project-ref "$SUPABASE_PROJECT_REF")
if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  LINK_CMD+=(--password "$SUPABASE_DB_PASSWORD")
fi

"${LINK_CMD[@]}"

if [[ ! -f "supabase/config.toml" ]]; then
  echo "[error] supabase/config.toml introuvable après link."
  exit 1
fi

if ! rg -n "^project_id\s*=\s*\"$SUPABASE_PROJECT_REF\"" supabase/config.toml >/dev/null; then
  echo "[error] Link non confirmé: project_id différent de SUPABASE_PROJECT_REF."
  echo "Vérifie supabase/config.toml."
  exit 1
fi

echo "[ok] Repo lié au projet Supabase '$SUPABASE_PROJECT_REF'."
echo "Aucune migration n'a été poussée."
