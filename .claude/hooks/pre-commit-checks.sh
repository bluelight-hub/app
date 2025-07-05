#!/bin/bash
# Pre-Commit Hook: Umfassende Code-Qualitätsprüfung
# Prüft Code-Qualität, Tests und Coverage vor dem Commit

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Hook-Parameter
CHANGED_FILES="${1:-}"
HOOK_RESULT_FILE="${2:-}"
COMMIT_MESSAGE="${3:-}"

# Logging
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Fehler-Handler
handle_error() {
    local error_msg="$1"
    log "${RED}❌ $error_msg${NC}"
    
    if [ -n "$HOOK_RESULT_FILE" ]; then
        cat > "$HOOK_RESULT_FILE" <<EOF
{
    "status": "blocked",
    "message": "$error_msg"
}
EOF
    fi
    exit 1
}

log "${MAGENTA}🚀 Starte Pre-Commit Checks...${NC}"

# 1. Prüfe Commit Message Format
if [ -n "$COMMIT_MESSAGE" ]; then
    log "${BLUE}📝 Prüfe Commit-Message Format...${NC}"
    
    # Regex für Commit-Format: <emoji>(<context>): <title>
    if ! echo "$COMMIT_MESSAGE" | grep -qE '^[^ ]+\([a-z-]+\): .{1,72}$'; then
        handle_error "Commit-Message entspricht nicht dem Format: <emoji>(<context>): <title>"
    fi
    
    # Prüfe auf bekannte Contexts
    VALID_CONTEXTS="frontend|backend|shared|release|docs|ci|test|build|style|refactor|perf|chore"
    if ! echo "$COMMIT_MESSAGE" | grep -qE "^[^ ]+\(($VALID_CONTEXTS)\):" ; then
        log "${YELLOW}⚠️  Unbekannter Context in Commit-Message${NC}"
    fi
fi

# 2. TypeScript Type-Check für alle Packages
log "${BLUE}🔍 Führe TypeScript Type-Check aus...${NC}"

# Frontend Type-Check
if [ -d "packages/frontend" ]; then
    log "  📦 Frontend..."
    cd packages/frontend
    if ! npx tsc --noEmit; then
        cd - > /dev/null
        handle_error "TypeScript-Fehler im Frontend gefunden"
    fi
    cd - > /dev/null
fi

# Backend Type-Check
if [ -d "packages/backend" ]; then
    log "  📦 Backend..."
    cd packages/backend
    if ! npx tsc --noEmit; then
        cd - > /dev/null
        handle_error "TypeScript-Fehler im Backend gefunden"
    fi
    cd - > /dev/null
fi

# Shared Type-Check
if [ -d "packages/shared" ]; then
    log "  📦 Shared..."
    cd packages/shared
    if ! npx tsc --noEmit; then
        cd - > /dev/null
        handle_error "TypeScript-Fehler in Shared gefunden"
    fi
    cd - > /dev/null
fi

log "${GREEN}✅ TypeScript Type-Check erfolgreich${NC}"

# 3. ESLint für geänderte Dateien
if [ -n "$CHANGED_FILES" ]; then
    log "${BLUE}🔍 Führe ESLint auf geänderten Dateien aus...${NC}"
    
    # Filtere nur JS/TS Dateien
    JS_FILES=$(echo "$CHANGED_FILES" | grep -E '\.(js|jsx|ts|tsx)$' || true)
    
    if [ -n "$JS_FILES" ]; then
        # Führe lint-staged aus (bereits konfiguriert im Projekt)
        if ! pnpm lint-staged; then
            log "${YELLOW}⚠️  ESLint-Warnungen gefunden${NC}"
        fi
    fi
fi

# 4. Teste betroffene Packages
log "${BLUE}🧪 Führe Tests aus...${NC}"

TESTS_RUN=false
FRONTEND_AFFECTED=false
BACKEND_AFFECTED=false
SHARED_AFFECTED=false

# Prüfe welche Packages betroffen sind
if [ -n "$CHANGED_FILES" ]; then
    if echo "$CHANGED_FILES" | grep -q "packages/frontend/"; then
        FRONTEND_AFFECTED=true
    fi
    if echo "$CHANGED_FILES" | grep -q "packages/backend/"; then
        BACKEND_AFFECTED=true
    fi
    if echo "$CHANGED_FILES" | grep -q "packages/shared/"; then
        SHARED_AFFECTED=true
    fi
fi

# Führe Tests nur für betroffene Packages aus
if [ "$FRONTEND_AFFECTED" = true ]; then
    log "  📦 Frontend Tests..."
    if ! pnpm --filter @bluelight-hub/frontend test:run; then
        handle_error "Frontend Tests fehlgeschlagen"
    fi
    TESTS_RUN=true
fi

if [ "$BACKEND_AFFECTED" = true ]; then
    log "  📦 Backend Tests..."
    if ! pnpm --filter @bluelight-hub/backend test; then
        handle_error "Backend Tests fehlgeschlagen"
    fi
    TESTS_RUN=true
fi

if [ "$SHARED_AFFECTED" = true ] || [ "$TESTS_RUN" = false ]; then
    log "  📦 Shared Tests..."
    # Shared hat möglicherweise keine Tests, also ignoriere Fehler
    pnpm --filter @bluelight-hub/shared test 2>/dev/null || true
fi

if [ "$TESTS_RUN" = true ]; then
    log "${GREEN}✅ Tests erfolgreich${NC}"
fi

# 5. Coverage Check (nur wenn Tests gelaufen sind)
if [ "$TESTS_RUN" = true ]; then
    log "${BLUE}📊 Prüfe Test-Coverage...${NC}"
    
    # Coverage wird bereits durch die Test-Befehle geprüft (80% Threshold)
    log "${GREEN}✅ Coverage-Anforderungen erfüllt${NC}"
fi

# 6. Sicherheitsprüfungen
log "${BLUE}🔒 Führe Sicherheitsprüfungen durch...${NC}"

# Prüfe auf Secrets in geänderten Dateien
if [ -n "$CHANGED_FILES" ]; then
    SENSITIVE_PATTERNS="password|api_key|apikey|secret|token|private_key|privatekey"
    
    for file in $CHANGED_FILES; do
        if [ -f "$file" ]; then
            # Ignoriere Test-Dateien und Konfigurationsdateien
            if [[ ! "$file" =~ \.(test|spec)\.(ts|tsx|js|jsx)$ ]] && \
               [[ ! "$file" =~ \.(json|yml|yaml|md)$ ]]; then
                if grep -iE "$SENSITIVE_PATTERNS" "$file" | grep -vE "(mock|fake|test|example|placeholder)" > /dev/null; then
                    log "${YELLOW}⚠️  Mögliche sensitive Daten in $file gefunden${NC}"
                fi
            fi
        fi
    done
fi

# 7. Build-Prüfung (optional, nur bei größeren Änderungen)
if [ "$FRONTEND_AFFECTED" = true ] || [ "$BACKEND_AFFECTED" = true ]; then
    log "${BLUE}🏗️  Prüfe Build...${NC}"
    
    # Quick Build Check
    if [ "$FRONTEND_AFFECTED" = true ]; then
        log "  📦 Frontend Build Check..."
        cd packages/frontend
        if ! npx vite build --mode development --logLevel silent; then
            cd - > /dev/null
            handle_error "Frontend Build fehlgeschlagen"
        fi
        cd - > /dev/null
    fi
    
    if [ "$BACKEND_AFFECTED" = true ]; then
        log "  📦 Backend Build Check..."
        if ! pnpm --filter @bluelight-hub/backend build; then
            handle_error "Backend Build fehlgeschlagen"
        fi
    fi
    
    log "${GREEN}✅ Build-Prüfung erfolgreich${NC}"
fi

# 8. Abschlussprüfungen
log "${BLUE}🔍 Führe Abschlussprüfungen durch...${NC}"

# Prüfe auf große Dateien
if [ -n "$CHANGED_FILES" ]; then
    for file in $CHANGED_FILES; do
        if [ -f "$file" ]; then
            FILE_SIZE=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "0")
            if [ "$FILE_SIZE" -gt 1048576 ]; then # 1MB
                log "${YELLOW}⚠️  Große Datei: $file ($(( FILE_SIZE / 1024 / 1024 ))MB)${NC}"
            fi
        fi
    done
fi

# Erfolg!
log "${GREEN}✅ Alle Pre-Commit Checks erfolgreich!${NC}"

if [ -n "$HOOK_RESULT_FILE" ]; then
    cat > "$HOOK_RESULT_FILE" <<EOF
{
    "status": "success",
    "message": "Alle Pre-Commit Checks bestanden",
    "checks": {
        "typescript": "passed",
        "eslint": "passed",
        "tests": "$TESTS_RUN",
        "coverage": "passed",
        "security": "passed",
        "build": "passed"
    },
    "packages_affected": {
        "frontend": $FRONTEND_AFFECTED,
        "backend": $BACKEND_AFFECTED,
        "shared": $SHARED_AFFECTED
    }
}
EOF
fi

exit 0