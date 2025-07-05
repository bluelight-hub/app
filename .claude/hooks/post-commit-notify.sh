#!/bin/bash
# Post-Commit Hook: Benachrichtigung und Zusammenfassung
# Zeigt eine Zusammenfassung des Commits und gibt Hinweise

set -e

# Farben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Hook-Parameter
COMMIT_HASH="${1:-}"
COMMIT_MESSAGE="${2:-}"
HOOK_RESULT_FILE="${3:-}"

# Logging
log() {
    echo -e "$1"
}

# Git-Informationen sammeln
if [ -z "$COMMIT_HASH" ]; then
    COMMIT_HASH=$(git rev-parse HEAD)
fi

if [ -z "$COMMIT_MESSAGE" ]; then
    COMMIT_MESSAGE=$(git log -1 --pretty=%B)
fi

# Commit-Details
AUTHOR=$(git log -1 --pretty=%an)
AUTHOR_EMAIL=$(git log -1 --pretty=%ae)
COMMIT_DATE=$(git log -1 --pretty=%ad --date=relative)
FILES_CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD | wc -l)
STATS=$(git diff-tree --no-commit-id --shortstat -r HEAD)

# Banner
log ""
log "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
log "${GREEN}║                    🎉 Commit Erfolgreich! 🎉                   ║${NC}"
log "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
log ""

# Commit-Info
log "${CYAN}📋 Commit Details:${NC}"
log "  ${BLUE}Hash:${NC}     ${COMMIT_HASH:0:8}"
log "  ${BLUE}Autor:${NC}    $AUTHOR <$AUTHOR_EMAIL>"
log "  ${BLUE}Zeit:${NC}     $COMMIT_DATE"
log "  ${BLUE}Message:${NC}  $COMMIT_MESSAGE"
log ""

# Statistiken
log "${CYAN}📊 Änderungen:${NC}"
log "  $FILES_CHANGED Dateien geändert"
log "  $STATS"
log ""

# Geänderte Packages identifizieren
FRONTEND_CHANGED=false
BACKEND_CHANGED=false
SHARED_CHANGED=false

CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)
if echo "$CHANGED_FILES" | grep -q "packages/frontend/"; then
    FRONTEND_CHANGED=true
fi
if echo "$CHANGED_FILES" | grep -q "packages/backend/"; then
    BACKEND_CHANGED=true
fi
if echo "$CHANGED_FILES" | grep -q "packages/shared/"; then
    SHARED_CHANGED=true
fi

# Package-spezifische Hinweise
if [ "$FRONTEND_CHANGED" = true ] || [ "$BACKEND_CHANGED" = true ] || [ "$SHARED_CHANGED" = true ]; then
    log "${CYAN}📦 Betroffene Packages:${NC}"
    [ "$FRONTEND_CHANGED" = true ] && log "  ${MAGENTA}•${NC} Frontend"
    [ "$BACKEND_CHANGED" = true ] && log "  ${MAGENTA}•${NC} Backend"
    [ "$SHARED_CHANGED" = true ] && log "  ${MAGENTA}•${NC} Shared"
    log ""
fi

# Nächste Schritte vorschlagen
log "${CYAN}💡 Nächste Schritte:${NC}"

# Prüfe Branch-Name für Context
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" =~ ^feature/ ]]; then
    log "  ${YELLOW}→${NC} Pull Request erstellen wenn Feature fertig ist"
    log "  ${YELLOW}→${NC} Tests lokal ausführen: ${BLUE}pnpm -r test${NC}"
elif [[ "$CURRENT_BRANCH" =~ ^fix/ ]] || [[ "$CURRENT_BRANCH" =~ ^hotfix/ ]]; then
    log "  ${YELLOW}→${NC} Sicherstellen dass der Bug behoben ist"
    log "  ${YELLOW}→${NC} Regression-Tests durchführen"
elif [[ "$CURRENT_BRANCH" =~ ^release/ ]]; then
    log "  ${YELLOW}→${NC} Changelog aktualisieren"
    log "  ${YELLOW}→${NC} Version Bump durchführen"
fi

# Allgemeine Empfehlungen basierend auf Änderungen
if [ "$FRONTEND_CHANGED" = true ]; then
    log "  ${YELLOW}→${NC} Frontend dev server: ${BLUE}pnpm --filter @bluelight-hub/frontend dev${NC}"
    log "  ${YELLOW}→${NC} Frontend tests: ${BLUE}pnpm --filter @bluelight-hub/frontend test${NC}"
fi

if [ "$BACKEND_CHANGED" = true ]; then
    log "  ${YELLOW}→${NC} Backend dev server: ${BLUE}pnpm --filter @bluelight-hub/backend dev${NC}"
    log "  ${YELLOW}→${NC} Backend tests: ${BLUE}pnpm --filter @bluelight-hub/backend test${NC}"
    
    # Prüfe ob Prisma-Schema geändert wurde
    if echo "$CHANGED_FILES" | grep -q "schema.prisma"; then
        log "  ${YELLOW}→${NC} ${RED}Wichtig:${NC} Prisma-Schema geändert! Führe aus:"
        log "     ${BLUE}pnpm --filter @bluelight-hub/backend prisma generate${NC}"
        log "     ${BLUE}pnpm --filter @bluelight-hub/backend prisma migrate dev${NC}"
    fi
fi

# CI/CD Hinweise
if [[ "$CURRENT_BRANCH" != "main" ]] && [[ "$CURRENT_BRANCH" != "master" ]] && [[ "$CURRENT_BRANCH" != "alpha" ]]; then
    log ""
    log "${CYAN}🔄 Synchronisation:${NC}"
    log "  ${YELLOW}→${NC} Push zu Remote: ${BLUE}git push origin $CURRENT_BRANCH${NC}"
    log "  ${YELLOW}→${NC} Pull Request URL wird nach Push angezeigt"
fi

# Commit-Message Analyse für spezielle Aktionen
if [[ "$COMMIT_MESSAGE" =~ ^💥 ]]; then
    log ""
    log "${RED}⚠️  BREAKING CHANGE detektiert!${NC}"
    log "  Stelle sicher dass:"
    log "  • Alle abhängigen Komponenten aktualisiert sind"
    log "  • Migration-Guide dokumentiert ist"
    log "  • Major Version Bump vorbereitet ist"
elif [[ "$COMMIT_MESSAGE" =~ ^✨ ]]; then
    log ""
    log "${GREEN}✨ Neues Feature hinzugefügt!${NC}"
    log "  Vergiss nicht:"
    log "  • Dokumentation zu aktualisieren"
    log "  • Feature-Tests zu schreiben"
    log "  • README.md zu erweitern (falls nötig)"
elif [[ "$COMMIT_MESSAGE" =~ ^🐛 ]]; then
    log ""
    log "${GREEN}🐛 Bug-Fix committed!${NC}"
    log "  Empfohlen:"
    log "  • Regression-Test hinzufügen"
    log "  • Verwandte Issues schließen"
fi

# Quality Reminders
log ""
log "${CYAN}📝 Qualitäts-Checkliste:${NC}"
log "  ${BLUE}□${NC} Code-Review anfordern"
log "  ${BLUE}□${NC} Tests sind grün"
log "  ${BLUE}□${NC} Dokumentation aktualisiert"
log "  ${BLUE}□${NC} Keine TODO-Kommentare vergessen"

# Motivational Quote
QUOTES=(
    "Code is like humor. When you have to explain it, it's bad. - Cory House"
    "First, solve the problem. Then, write the code. - John Johnson"
    "Experience is the name everyone gives to their mistakes. - Oscar Wilde"
    "The best way to predict the future is to implement it. - David Heinemeier Hansson"
    "Simplicity is the soul of efficiency. - Austin Freeman"
)
RANDOM_QUOTE=${QUOTES[$RANDOM % ${#QUOTES[@]}]}

log ""
log "${MAGENTA}💭 \"$RANDOM_QUOTE\"${NC}"
log ""

# Footer
log "${GREEN}════════════════════════════════════════════════════════════════${NC}"

# Schreibe Ergebnis für Hook-System
if [ -n "$HOOK_RESULT_FILE" ]; then
    cat > "$HOOK_RESULT_FILE" <<EOF
{
    "status": "success",
    "message": "Commit erfolgreich verarbeitet",
    "commit": {
        "hash": "$COMMIT_HASH",
        "message": "$COMMIT_MESSAGE",
        "author": "$AUTHOR",
        "files_changed": $FILES_CHANGED
    },
    "packages_affected": {
        "frontend": $FRONTEND_CHANGED,
        "backend": $BACKEND_CHANGED,
        "shared": $SHARED_CHANGED
    }
}
EOF
fi

exit 0