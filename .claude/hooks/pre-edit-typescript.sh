#!/bin/bash
# Pre-Edit Hook: TypeScript-Validierung
# Prüft TypeScript-Dateien auf Fehler vor der Bearbeitung

set -e

# Farben für Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Hook-Konfiguration
FILE_PATH="${1:-}"
HOOK_RESULT_FILE="${2:-}"

# Logging-Funktion
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Fehler-Handler
handle_error() {
    local error_msg="$1"
    log "${RED}❌ Fehler: $error_msg${NC}"
    
    if [ -n "$HOOK_RESULT_FILE" ]; then
        cat > "$HOOK_RESULT_FILE" <<EOF
{
    "status": "blocked",
    "message": "$error_msg",
    "suggestions": [
        "TypeScript-Fehler beheben",
        "tsconfig.json überprüfen",
        "Dependencies installieren (pnpm install)"
    ]
}
EOF
    fi
    exit 1
}

# Prüfe ob Datei angegeben wurde
if [ -z "$FILE_PATH" ]; then
    handle_error "Keine Datei angegeben"
fi

# Prüfe ob Datei existiert
if [ ! -f "$FILE_PATH" ]; then
    log "${YELLOW}⚠️  Datei existiert noch nicht: $FILE_PATH${NC}"
    exit 0
fi

# Prüfe ob es eine TypeScript-Datei ist
if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
    log "ℹ️  Keine TypeScript-Datei, überspringe Validierung"
    exit 0
fi

log "🔍 Validiere TypeScript-Datei: $FILE_PATH"

# Bestimme das Package (frontend, backend oder shared)
PACKAGE=""
if [[ "$FILE_PATH" =~ packages/frontend/ ]]; then
    PACKAGE="frontend"
    TSC_CONFIG="packages/frontend/tsconfig.json"
elif [[ "$FILE_PATH" =~ packages/backend/ ]]; then
    PACKAGE="backend"
    TSC_CONFIG="packages/backend/tsconfig.json"
elif [[ "$FILE_PATH" =~ packages/shared/ ]]; then
    PACKAGE="shared"
    TSC_CONFIG="packages/shared/tsconfig.json"
else
    log "${YELLOW}⚠️  Datei außerhalb der Package-Struktur${NC}"
    exit 0
fi

log "📦 Package erkannt: $PACKAGE"

# Prüfe ob pnpm verfügbar ist
if ! command -v pnpm &> /dev/null; then
    handle_error "pnpm nicht gefunden. Bitte installieren: npm install -g pnpm"
fi

# Prüfe ob node_modules existiert
if [ ! -d "node_modules" ]; then
    log "${YELLOW}⚠️  node_modules nicht gefunden. Führe pnpm install aus...${NC}"
    pnpm install --frozen-lockfile || handle_error "pnpm install fehlgeschlagen"
fi

# TypeScript-Validierung
log "🔧 Führe TypeScript-Prüfung aus..."

# Verwende lokales TypeScript aus node_modules
TSC="node_modules/.bin/tsc"

if [ ! -f "$TSC" ]; then
    handle_error "TypeScript nicht installiert"
fi

# Führe TypeScript-Prüfung aus
ERROR_OUTPUT=$($TSC --noEmit --project "$TSC_CONFIG" 2>&1) || {
    # Filtere nur Fehler für die betroffene Datei
    FILE_ERRORS=$(echo "$ERROR_OUTPUT" | grep -E "^$FILE_PATH" || true)
    
    if [ -n "$FILE_ERRORS" ]; then
        handle_error "TypeScript-Fehler gefunden:\n$FILE_ERRORS"
    else
        log "${YELLOW}⚠️  TypeScript-Fehler in anderen Dateien gefunden${NC}"
    fi
}

# Zusätzliche Prüfungen für spezielle Patterns
log "🔍 Prüfe Code-Patterns..."

# Prüfe auf console.log in Production-Code
if [[ ! "$FILE_PATH" =~ \.(test|spec)\.(ts|tsx)$ ]]; then
    if grep -q "console\." "$FILE_PATH"; then
        log "${YELLOW}⚠️  Warnung: console.* Aufrufe gefunden${NC}"
    fi
fi

# Prüfe auf TODO/FIXME Kommentare
if grep -qE "(TODO|FIXME|XXX)" "$FILE_PATH"; then
    log "${YELLOW}⚠️  Warnung: TODO/FIXME Kommentare gefunden${NC}"
fi

# Erfolg
log "${GREEN}✅ TypeScript-Validierung erfolgreich${NC}"

if [ -n "$HOOK_RESULT_FILE" ]; then
    cat > "$HOOK_RESULT_FILE" <<EOF
{
    "status": "success",
    "message": "TypeScript-Validierung erfolgreich",
    "package": "$PACKAGE",
    "checks": {
        "typescript": "passed",
        "patterns": "passed"
    }
}
EOF
fi

exit 0