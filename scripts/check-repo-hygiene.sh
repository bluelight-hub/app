#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

artifact_candidates="$(git -c core.fsmonitor=false ls-files -co --exclude-standard -- '*.bak' '*.orig' '*.rej')"
artifact_files=""

while IFS= read -r file; do
  if [[ -n "$file" && -e "$file" ]]; then
    artifact_files+="${file}"$'\n'
  fi
done <<< "$artifact_candidates"

if [[ -n "$artifact_files" ]]; then
  echo "ERROR: Backup/artefakt-Dateien im Source-Tree gefunden:"
  printf '%s' "$artifact_files"
  echo
  echo "Bitte diese Dateien entfernen, bevor du commitest."
  exit 1
fi

echo "OK: Keine Backup/Artefakt-Dateien (*.bak/*.orig/*.rej) gefunden."
