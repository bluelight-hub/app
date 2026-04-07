#!/usr/bin/env bash
# Port-Hashing Library für Worktree-Isolation
# Jeder Git-Worktree bekommt deterministische, eindeutige Ports.
#
# Usage: source scripts/worktree-ports.sh

# Erkennt ob wir in einem Worktree sind und gibt den absoluten Pfad zurück.
# Hauptrepo → leerer String (= Default-Ports)
get_worktree_id() {
  # In einem Git-Worktree ist .git eine Datei, kein Verzeichnis
  if [ -f "$(git rev-parse --show-toplevel 2>/dev/null)/.git" ]; then
    git rev-parse --show-toplevel
  else
    echo ""
  fi
}

# Berechnet deterministischen Port-Offset (1-99) aus einem Pfad.
# Hauptrepo (leerer String) → Offset 0 (= Default-Ports).
calculate_port_offset() {
  local worktree_id="$1"
  if [ -z "$worktree_id" ]; then
    echo "0"
    return
  fi

  local hash
  hash=$(printf '%s' "$worktree_id" | cksum | awk '{print $1}')
  local offset=$(( (hash % 99) + 1 ))
  echo "$offset"
}

# Berechnet die drei Ports für einen gegebenen Offset und gibt sie als
# KEY=VALUE Zeilen aus (eval-bar).
get_ports() {
  local offset="$1"
  local base_frontend=3090
  local base_backend=3091
  local base_db=3092

  echo "VITE_PORT=$((base_frontend + offset * 10))"
  echo "BACKEND_PORT=$((base_backend + offset * 10))"
  echo "DATABASE_PORT=$((base_db + offset * 10))"
}

# Gibt einen sanitierten Docker Compose Project-Namen zurück.
# Hauptrepo → "bluelight-hub", Worktree → "bluelight-hub-<branch>".
get_compose_project_name() {
  local worktree_id="$1"
  if [ -z "$worktree_id" ]; then
    echo "bluelight-hub"
    return
  fi

  local branch
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-' | tr '[:upper:]' '[:lower:]')"
  # Nur alphanumerisch und Bindestrich, max 40 Zeichen
  branch="$(echo "$branch" | sed 's/[^a-z0-9-]/-/g' | head -c 40)"
  echo "bluelight-hub-${branch}"
}
