#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

require_private_environment() {
  local environment_path="$1"
  if [ ! -f "${environment_path}" ]; then
    echo "Missing private runtime environment: ${environment_path}" >&2
    echo "Create it explicitly with mode 0600; env example files are documentation only." >&2
    exit 1
  fi
  chmod 0600 "${environment_path}"
}

require_private_environment demo/.env.tauth
require_private_environment ../Pinguin/configs/.env.pinguin

for required_command in docker python3; do
  if ! command -v "${required_command}" >/dev/null 2>&1; then
    echo "Missing required command: ${required_command}" >&2
    exit 1
  fi
done

credential_material="$(python3 -c 'import base64, hashlib, os, uuid; secret = os.urandom(32); encoded = base64.urlsafe_b64encode(secret).rstrip(b"=").decode(); print(uuid.uuid4()); print(encoded); print(base64.urlsafe_b64encode(hashlib.sha256(secret).digest()).rstrip(b"=").decode())')"
PINGUIN_DEMO_CREDENTIAL_ID="$(printf '%s\n' "${credential_material}" | sed -n '1p')"
PINGUIN_DEMO_API_SECRET="$(printf '%s\n' "${credential_material}" | sed -n '2p')"
PINGUIN_DEMO_CREDENTIAL_DIGEST="$(printf '%s\n' "${credential_material}" | sed -n '3p')"
PINGUIN_DEMO_API_KEY="pgn_1_${PINGUIN_DEMO_CREDENTIAL_ID}_${PINGUIN_DEMO_API_SECRET}"
export PINGUIN_DEMO_CREDENTIAL_ID PINGUIN_DEMO_CREDENTIAL_DIGEST PINGUIN_DEMO_API_KEY
unset credential_material PINGUIN_DEMO_API_SECRET

ENTRY_URL="$(sed -n 's/^[[:space:]]*-[[:space:]]*"\(http:\/\/[^"]*\)".*/\1/p' demo/config-ui.yaml | head -n 1)"

echo ""
echo "Starting single demo stack"
if [ -n "$ENTRY_URL" ]; then
  echo "Entry URL: ${ENTRY_URL}/"
fi
echo ""

docker compose \
  --env-file demo/.env.tauth \
  --env-file ../Pinguin/configs/.env.pinguin \
  up --build --remove-orphans --force-recreate
