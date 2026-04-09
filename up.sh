#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

if [ ! -f demo/.env.ghttp ]; then
  cp demo/.env.ghttp.example demo/.env.ghttp
  echo "Seeded demo/.env.ghttp from demo/.env.ghttp.example"
fi

if [ ! -f demo/.env.tauth ]; then
  cp .env.tauth.example demo/.env.tauth
  echo "Seeded demo/.env.tauth from .env.tauth.example"
fi

ENTRY_URL="$(sed -n 's/^[[:space:]]*-[[:space:]]*"\(https:\/\/[^"]*\)".*/\1/p' demo/config-ui.yaml | head -n 1)"

echo ""
echo "Starting single demo stack"
if [ -n "$ENTRY_URL" ]; then
  echo "Entry URL: ${ENTRY_URL}/"
fi
echo ""

docker compose up --build --remove-orphans --force-recreate
