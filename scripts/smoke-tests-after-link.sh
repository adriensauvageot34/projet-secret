#!/usr/bin/env bash
set -euo pipefail

# Smoke tests to run once Supabase link and env are ready.
# Required env vars:
#   APP_URL (default: http://localhost:3000)
#   SESSION_ID
#   PARTICIPANT_ID
#   ACCUSER_PARTICIPANT_ID
#   ACCUSED_PARTICIPANT_ID
#   GM_PARTICIPANT_ID
#   ELEMENT_TEMPLATE_ID
#   ADVANTAGE_TEMPLATE_ID
#   SUSPECTED_TEMPLATE_ID
#
# Optional:
#   SLOT_INDEX (default: 0)

APP_URL="${APP_URL:-http://localhost:3000}"
SLOT_INDEX="${SLOT_INDEX:-0}"

require_env() {
  local key="$1"
  if [[ -z "${!key:-}" ]]; then
    echo "Missing env var: ${key}" >&2
    exit 1
  fi
}

for key in \
  SESSION_ID \
  PARTICIPANT_ID \
  ACCUSER_PARTICIPANT_ID \
  ACCUSED_PARTICIPANT_ID \
  GM_PARTICIPANT_ID \
  ELEMENT_TEMPLATE_ID \
  ADVANTAGE_TEMPLATE_ID \
  SUSPECTED_TEMPLATE_ID; do
  require_env "$key"
done

echo "1) Read current session"
curl -fsS "$APP_URL/api/sessions/current" | jq .

echo "2) Read participant"
curl -fsS "$APP_URL/api/participants/$PARTICIPANT_ID" | jq .

echo "3) Activate element"
ACTIVATE_RESPONSE="$({
  curl -fsS -X POST "$APP_URL/api/elements/activate" \
    -H 'content-type: application/json' \
    -d "{\"participantId\":\"$PARTICIPANT_ID\",\"templateId\":\"$ELEMENT_TEMPLATE_ID\",\"slotIndex\":$SLOT_INDEX}"
})"
echo "$ACTIVATE_RESPONSE" | jq .
ELEMENT_INSTANCE_ID="$(echo "$ACTIVATE_RESPONSE" | jq -r '.data.instance.id')"

if [[ -z "$ELEMENT_INSTANCE_ID" || "$ELEMENT_INSTANCE_ID" == "null" ]]; then
  echo "Failed to extract element instance id" >&2
  exit 1
fi

echo "4) Claim element result"
curl -fsS -X POST "$APP_URL/api/elements/claim-result" \
  -H 'content-type: application/json' \
  -d "{\"instanceId\":\"$ELEMENT_INSTANCE_ID\",\"finalResult\":\"success\"}" | jq .

echo "5) Create score event"
curl -fsS -X POST "$APP_URL/api/score-events" \
  -H 'content-type: application/json' \
  -d "{\"participantId\":\"$PARTICIPANT_ID\",\"sessionId\":\"$SESSION_ID\",\"eventType\":\"mission_success\",\"deltaPoints\":1,\"relatedElementInstanceId\":\"$ELEMENT_INSTANCE_ID\"}" | jq .

echo "6) Create accusation + adjudicate correct"
ACCUSATION_RESPONSE="$({
  curl -fsS -X POST "$APP_URL/api/accusations/create" \
    -H 'content-type: application/json' \
    -d "{\"sessionId\":\"$SESSION_ID\",\"accuserParticipantId\":\"$ACCUSER_PARTICIPANT_ID\",\"accusedParticipantId\":\"$ACCUSED_PARTICIPANT_ID\",\"suspectedType\":\"mission\",\"suspectedTemplateId\":\"$SUSPECTED_TEMPLATE_ID\",\"relatedElementInstanceId\":\"$ELEMENT_INSTANCE_ID\",\"justification\":\"Smoke test accusation\"}"
})"
echo "$ACCUSATION_RESPONSE" | jq .
ACCUSATION_ID="$(echo "$ACCUSATION_RESPONSE" | jq -r '.data.id')"

if [[ -z "$ACCUSATION_ID" || "$ACCUSATION_ID" == "null" ]]; then
  echo "Failed to extract accusation id" >&2
  exit 1
fi

curl -fsS -X POST "$APP_URL/api/accusations/adjudicate" \
  -H 'content-type: application/json' \
  -d "{\"accusationId\":\"$ACCUSATION_ID\",\"sessionId\":\"$SESSION_ID\",\"adjudicatedByParticipantId\":\"$GM_PARTICIPANT_ID\",\"decision\":\"correct\",\"rewardTokens\":1,\"notesAdmin\":\"Smoke test\"}" | jq .

echo "7) Create token event"
curl -fsS -X POST "$APP_URL/api/token-events" \
  -H 'content-type: application/json' \
  -d "{\"participantId\":\"$PARTICIPANT_ID\",\"sessionId\":\"$SESSION_ID\",\"eventType\":\"manual_adjustment\",\"deltaTokens\":1,\"notes\":\"Smoke test token increment\"}" | jq .

echo "8) Buy advantage"
curl -fsS -X POST "$APP_URL/api/advantages/buy" \
  -H 'content-type: application/json' \
  -d "{\"templateId\":\"$ADVANTAGE_TEMPLATE_ID\",\"participantId\":\"$PARTICIPANT_ID\",\"gmNotes\":\"Smoke test purchase\"}" | jq .

echo "Smoke tests completed."
