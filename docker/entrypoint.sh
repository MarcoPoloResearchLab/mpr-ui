#!/bin/sh
set -eu

TEMPLATE_DIR=/templates
OUTPUT_DIR=/output

: "${DEMO_AUTH_BASE_URL:=http://backend:8080}"
: "${DEMO_GOOGLE_CLIENT_ID:=${APP_GOOGLE_WEB_CLIENT_ID:-}}"

if [ -z "$DEMO_GOOGLE_CLIENT_ID" ]; then
  echo "error: DEMO_GOOGLE_CLIENT_ID or APP_GOOGLE_WEB_CLIENT_ID must be set" >&2
  exit 1
fi

export DEMO_AUTH_BASE_URL
export DEMO_GOOGLE_CLIENT_ID

mkdir -p "$OUTPUT_DIR"

envsubst '${DEMO_AUTH_BASE_URL} ${DEMO_GOOGLE_CLIENT_ID}' \
  < "$TEMPLATE_DIR/index.html.template" \
  > "$OUTPUT_DIR/index.html"

envsubst '${DEMO_AUTH_BASE_URL} ${DEMO_GOOGLE_CLIENT_ID}' \
  < "$TEMPLATE_DIR/auth-demo.js.template" \
  > "$OUTPUT_DIR/auth-demo.js"

echo "Assets rendered to $OUTPUT_DIR"
