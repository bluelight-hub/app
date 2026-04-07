#!/usr/bin/env bash
# Worktree-Teardown: Räumt die isolierte Entwicklungsumgebung auf.
# Stoppt Docker-Container und entfernt optional die Volumes.
#
# Usage:
#   bash scripts/worktree-teardown.sh             # Container stoppen
#   bash scripts/worktree-teardown.sh --volumes    # + Volumes löschen
#   bash scripts/worktree-teardown.sh -v           # Kurzform
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel)"

# shellcheck source=worktree-ports.sh
source "$SCRIPT_DIR/worktree-ports.sh"

WORKTREE_ID="$(get_worktree_id)"
PROJECT_NAME="$(get_compose_project_name "$WORKTREE_ID")"

echo "=== Bluelight Hub Worktree Teardown ==="
echo "Project: $PROJECT_NAME"

if [ "${1:-}" = "--volumes" ] || [ "${1:-}" = "-v" ]; then
  echo "Container stoppen + Volumes entfernen..."
  COMPOSE_PROJECT_NAME="$PROJECT_NAME" \
    docker compose -f "$REPO_ROOT/docker-compose.yml" down -v
else
  echo "Container stoppen..."
  COMPOSE_PROJECT_NAME="$PROJECT_NAME" \
    docker compose -f "$REPO_ROOT/docker-compose.yml" down
fi

echo "=== Teardown abgeschlossen ==="
