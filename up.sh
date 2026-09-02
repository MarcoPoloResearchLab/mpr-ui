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

ENTRY_URL="$(sed -n 's/^[[:space:]]*-[[:space:]]*"\(http:\/\/[^"]*\)".*/\1/p' demo/config-ui.yaml | head -n 1)"

echo ""
echo "Starting single demo stack"
if [ -n "$ENTRY_URL" ]; then
  echo "Entry URL: ${ENTRY_URL}/"
fi
echo ""

docker compose up --build --remove-orphans --force-recreate
