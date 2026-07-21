#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/deploy-jsdelivr.sh [options]

Activates an already-published mpr-ui tag by purging and verifying the jsDelivr
latest and SemVer-major aliases. It never creates or pushes a release.

Options:
  --version <tag>  Published v* tag. Default: exact v* tag at HEAD
  --skip-verify    Purge aliases without comparing them to the exact tag
  --help           Show this help text
USAGE
}

version=""
verify="true"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      [[ $# -ge 2 ]] || { echo "error: --version requires a value" >&2; exit 1; }
      version="$2"
      shift 2
      ;;
    --skip-verify)
      verify="false"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

for command_name in curl git shasum; do
  command -v "${command_name}" >/dev/null 2>&1 || { echo "error: ${command_name} is required" >&2; exit 1; }
done

repo_root="$(git rev-parse --show-toplevel)"
cd "${repo_root}"
if [[ -z "${version}" ]]; then
  version="$(git tag --points-at HEAD --list 'v*' --sort=-version:refname | head -n 1)"
fi
[[ "${version}" =~ ^v([0-9]+)\.[0-9]+\.[0-9]+$ ]] || {
  echo "error: deploy requires a stable SemVer v* tag at HEAD" >&2
  exit 1
}
major_version="${BASH_REMATCH[1]}"
local_commit="$(git rev-list -n 1 "${version}")"
head_commit="$(git rev-parse HEAD)"
[[ "${local_commit}" == "${head_commit}" ]] || { echo "error: ${version} does not point at HEAD" >&2; exit 1; }
remote_commit="$(git ls-remote origin "refs/tags/${version}^{}" | awk 'NR == 1 {print $1}')"
if [[ -z "${remote_commit}" ]]; then
  remote_commit="$(git ls-remote origin "refs/tags/${version}" | awk 'NR == 1 {print $1}')"
fi
[[ "${remote_commit}" == "${local_commit}" ]] || { echo "error: ${version} is not published at the prepared commit; run make publish" >&2; exit 1; }

repository_path="MarcoPoloResearchLab/mpr-ui"
assets=(mpr-ui.js mpr-ui.css mpr-ui-config.js)
aliases=(latest "${major_version}")
for alias in "${aliases[@]}"; do
  for asset in "${assets[@]}"; do
    echo "==> [deploy] Purging jsDelivr ${alias}/${asset}"
    curl --fail --silent --show-error "https://purge.jsdelivr.net/gh/${repository_path}@${alias}/${asset}" >/dev/null
  done
done

if [[ "${verify}" == "true" ]]; then
  attempts=12
  delay_seconds=5
  temporary_directory="$(mktemp -d)"
  trap 'rm -rf "${temporary_directory}"' EXIT
  for asset in "${assets[@]}"; do
    exact_path="${temporary_directory}/exact-${asset}"
    curl --fail --silent --show-error "https://cdn.jsdelivr.net/gh/${repository_path}@${version}/${asset}" --output "${exact_path}"
    expected_sha256="$(shasum -a 256 "${exact_path}" | awk '{print $1}')"
    for alias in "${aliases[@]}"; do
      alias_path="${temporary_directory}/${alias}-${asset}"
      matched="false"
      for ((attempt = 1; attempt <= attempts; attempt += 1)); do
        if curl --fail --silent --show-error "https://cdn.jsdelivr.net/gh/${repository_path}@${alias}/${asset}" --output "${alias_path}"; then
          actual_sha256="$(shasum -a 256 "${alias_path}" | awk '{print $1}')"
          if [[ "${actual_sha256}" == "${expected_sha256}" ]]; then
            matched="true"
            break
          fi
        fi
        sleep "${delay_seconds}"
      done
      [[ "${matched}" == "true" ]] || { echo "error: jsDelivr ${alias}/${asset} did not activate ${version}" >&2; exit 1; }
    done
  done
fi

echo "Activated mpr-ui ${version} on jsDelivr aliases latest and ${major_version}."
