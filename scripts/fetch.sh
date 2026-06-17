#!/usr/bin/env bash
# Fetch the Standoff 365 cyberbattle business-risk list for a given battle.
# Auth comes from the session that lives in GitHub Secrets — never hardcode it here.
#
# Required env:
#   STANDOFF_ACCESS_TOKEN   the `accessToken` cookie value (a session token — expires!)
#   STANDOFF_DEVICE_UUID    the `deviceuuid` value
# Optional env:
#   BATTLE_ID               battle id to fetch (default 55)
#   STANDOFF_COOKIE         full raw Cookie header — overrides the two values above
#   OUT                     output file (default battle.json)
set -euo pipefail

BATTLE_ID="${BATTLE_ID:-55}"
OUT="${OUT:-battle.json}"
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'

if [[ -n "${STANDOFF_COOKIE:-}" ]]; then
  COOKIE="$STANDOFF_COOKIE"
else
  : "${STANDOFF_ACCESS_TOKEN:?STANDOFF_ACCESS_TOKEN is required}"
  : "${STANDOFF_DEVICE_UUID:?STANDOFF_DEVICE_UUID is required}"
  COOKIE="accessToken=${STANDOFF_ACCESS_TOKEN}; deviceuuid=${STANDOFF_DEVICE_UUID}; mindboxDeviceUUID=${STANDOFF_DEVICE_UUID}"
fi

echo "› Fetching battle ${BATTLE_ID} …"
http_code=$(curl -sS -w '%{http_code}' -o "$OUT" \
  "https://api.standoff365.com/api/game-portal/ui/risks/battle/${BATTLE_ID}" \
  -H 'accept: application/json' \
  -H 'accept-language: en-US,en;q=0.9' \
  -H "deviceuuid: ${STANDOFF_DEVICE_UUID:-}" \
  -H 'language_code: en' \
  -H 'origin: https://cyberbattle.standoff365.com' \
  -H 'referer: https://cyberbattle.standoff365.com/' \
  -H "user-agent: ${UA}" \
  -b "$COOKIE")

if [[ "$http_code" != "200" ]]; then
  echo "✗ HTTP $http_code from API. Body:" >&2
  head -c 600 "$OUT" >&2 || true
  echo >&2
  echo "  (A 401/403 usually means the session token expired — refresh the STANDOFF_ACCESS_TOKEN secret.)" >&2
  exit 1
fi

# Validate it is the expected JSON array before we let it touch the gist.
if ! jq -e 'type == "array"' "$OUT" >/dev/null 2>&1; then
  echo "✗ Response is not a JSON array — aborting so we don't overwrite good data." >&2
  head -c 600 "$OUT" >&2 || true
  exit 1
fi

echo "✓ Got $(jq 'length' "$OUT") risks → $OUT"
