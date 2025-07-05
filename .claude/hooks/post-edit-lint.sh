#!/bin/bash
# Post-Edit Hook: ESLint Ausführung
# Führt ESLint auf bearbeiteten Dateien aus

set -e

# Farben für Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Hook-Parameter
FILE_PATH="${1:-}"
HOOK_RESULT_FILE="${2:-}"

# Logging
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Erfolgs-Handler
handle_success() {
    local message="$1"
    log "${GREEN}✅ $message${NC}"
    
    if [ -n "$HOOK_RESULT_FILE" ]; then
        cat > "$HOOK_RESULT_FILE" <<EOF
{
    "status": "success",
    "message": "$message"
}
EOF
    fi
}

# Prüfe ob Datei angegeben wurde
if [ -z "$FILE_PATH" ]; then
    log "${YELLOW}⚠️  Keine Datei angegeben, überspringe Linting${NC}"
    exit 0
fi

# Prüfe ob es eine relevante Datei ist
if [[ ! "$FILE_PATH" =~ \.(js|jsx|ts|tsx)$ ]]; then
    log "ℹ️  Keine JavaScript/TypeScript-Datei, überspringe Linting"
    exit 0
fi

log "${BLUE}🔍 Führe ESLint aus für: $FILE_PATH${NC}"

# Bestimme das Package
PACKAGE=""
ESLINT_CONFIG=""
if [[ "$FILE_PATH" =~ packages/frontend/ ]]; then
    PACKAGE="frontend"
    ESLINT_CONFIG="packages/frontend/.eslintrc.json"
    WORKING_DIR="packages/frontend"
elif [[ "$FILE_PATH" =~ packages/backend/ ]]; then
    PACKAGE="backend"
    ESLINT_CONFIG="packages/backend/.eslintrc.js"
    WORKING_DIR="packages/backend"
elif [[ "$FILE_PATH" =~ packages/shared/ ]]; then
    PACKAGE="shared"
    # Shared nutzt die Root-Config
    ESLINT_CONFIG=".eslintrc.json"
    WORKING_DIR="packages/shared"
else
    log "${YELLOW}⚠️  Datei außerhalb der Package-Struktur${NC}"
    exit 0
fi

log "📦 Package: $PACKAGE"

# Prüfe ob ESLint verfügbar ist
ESLINT="node_modules/.bin/eslint"
if [ ! -f "$ESLINT" ]; then
    log "${YELLOW}⚠️  ESLint nicht gefunden, überspringe Linting${NC}"
    exit 0
fi

# Führe ESLint aus und versuche automatisch zu fixen
log "🔧 Versuche automatische Fehlerbehebung..."

# Relative Pfad vom Working Directory
REL_PATH=$(realpath --relative-to="$WORKING_DIR" "$FILE_PATH")

# ESLint mit Fix-Option
cd "$WORKING_DIR"
if $ESLINT "$REL_PATH" --fix 2>&1; then
    log "${GREEN}✅ ESLint erfolgreich, alle Regeln eingehalten${NC}"
    LINT_STATUS="passed"
    FIXED_ISSUES="false"
else
    # Prüfe ob nach dem Fix noch Fehler vorhanden sind
    if $ESLINT "$REL_PATH" 2>&1; then
        log "${GREEN}✅ ESLint Fehler wurden automatisch behoben${NC}"
        LINT_STATUS="passed"
        FIXED_ISSUES="true"
    else
        # Es gibt noch Fehler die nicht automatisch behoben werden können
        LINT_OUTPUT=$($ESLINT "$REL_PATH" --format json || true)
        log "${YELLOW}⚠️  ESLint Warnungen/Fehler die manuell behoben werden müssen${NC}"
        
        # Parse JSON output für bessere Darstellung
        if command -v jq &> /dev/null && [ -n "$LINT_OUTPUT" ]; then
            WARNINGS=$(echo "$LINT_OUTPUT" | jq -r '.[0].warningCount // 0')
            ERRORS=$(echo "$LINT_OUTPUT" | jq -r '.[0].errorCount // 0')
            
            log "${YELLOW}⚠️  Gefunden: $ERRORS Fehler, $WARNINGS Warnungen${NC}"
            
            # Zeige erste 5 Probleme
            echo "$LINT_OUTPUT" | jq -r '
                .[0].messages[0:5][] | 
                "  - Zeile \(.line): \(.message) (\(.ruleId))"
            ' 2>/dev/null || true
        fi
        
        LINT_STATUS="warnings"
        FIXED_ISSUES="partial"
    fi
fi
cd - > /dev/null

# Zusätzliche Code-Qualitätsprüfungen
log "🔍 Führe zusätzliche Code-Qualitätsprüfungen durch..."

# Prüfe Datei-Größe (warnen bei > 300 Zeilen)
if [ -f "$FILE_PATH" ]; then
    LINE_COUNT=$(wc -l < "$FILE_PATH")
    if [ "$LINE_COUNT" -gt 300 ]; then
        log "${YELLOW}⚠️  Datei hat $LINE_COUNT Zeilen. Erwäge Aufteilung für bessere Wartbarkeit${NC}"
    fi
fi

# Prüfe auf Import-Ordnung (für TypeScript/JavaScript)
if [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
    # Prüfe ob Imports gruppiert sind
    if grep -q "^import" "$FILE_PATH"; then
        # Einfache Prüfung: Sind React imports vor lokalen imports?
        FIRST_REACT_IMPORT=$(grep -n "^import.*from ['\"]react" "$FILE_PATH" | head -1 | cut -d: -f1 || echo "999999")
        FIRST_LOCAL_IMPORT=$(grep -n "^import.*from ['\"]\./" "$FILE_PATH" | head -1 | cut -d: -f1 || echo "999999")
        
        if [ "$FIRST_LOCAL_IMPORT" != "999999" ] && [ "$FIRST_REACT_IMPORT" != "999999" ] && [ "$FIRST_LOCAL_IMPORT" -lt "$FIRST_REACT_IMPORT" ]; then
            log "${YELLOW}⚠️  Import-Reihenfolge: Externe Imports sollten vor lokalen Imports stehen${NC}"
        fi
    fi
fi

# Abschlussmeldung
if [ "$LINT_STATUS" = "passed" ]; then
    handle_success "Code-Qualität geprüft und optimiert"
else
    log "${YELLOW}⚠️  Code-Qualität geprüft, manuelle Überprüfung empfohlen${NC}"
fi

# Schreibe Ergebnis
if [ -n "$HOOK_RESULT_FILE" ]; then
    cat > "$HOOK_RESULT_FILE" <<EOF
{
    "status": "success",
    "message": "ESLint ausgeführt",
    "package": "$PACKAGE",
    "checks": {
        "eslint": "$LINT_STATUS",
        "auto_fixed": "$FIXED_ISSUES",
        "file_size": "$LINE_COUNT lines"
    }
}
EOF
fi

exit 0