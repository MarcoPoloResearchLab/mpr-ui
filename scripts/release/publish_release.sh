#!/usr/bin/env bash
set -euo pipefail

helper="${RELEASE_HELPER:-}"
if [[ -z "${helper}" ]]; then
  helper="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/release_helper.py"
fi
[[ -x "${helper}" ]] || { echo "error: release helper is not executable: ${helper}" >&2; exit 1; }

exec "${helper}" publish-prepared-release "$@"
