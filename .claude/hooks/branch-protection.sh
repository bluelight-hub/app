#!/bin/bash
# Branch Protection Hook
# Schützt kritische Branches vor direkten Änderungen

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Hook-Parameter
CURRENT_BRANCH="${1:-$(git branch --show-current)}"
TARGET_BRANCH="${2:-}"
OPERATION="${3:-edit}" # edit, commit, merge, etc.
HOOK_RESULT_FILE="${4:-}"

# Geschützte Branches
PROTECTED_BRANCHES=(
    "main"
    "master"
    "production"
    "prod"
    "release"
    "alpha"
    "beta"
    "stable"
)

# Logging
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Fehler-Handler
handle_error() {
    local error_msg="$1"
    local suggestion="$2"
    
    log "${RED}❌ $error_msg${NC}"
    if [ -n "$suggestion" ]; then
        log "${YELLOW}💡 $suggestion${NC}"
    fi
    
    if [ -n "$HOOK_RESULT_FILE" ]; then
        cat > "$HOOK_RESULT_FILE" <<EOF
{
    "status": "blocked",
    "message": "$error_msg",
    "suggestion": "$suggestion",
    "branch": "$CURRENT_BRANCH"
}
EOF
    fi
    exit 1
}

log "${MAGENTA}🛡️  Branch Protection Check${NC}"
log "  Current Branch: ${BLUE}$CURRENT_BRANCH${NC}"
log "  Operation: ${BLUE}$OPERATION${NC}"

# Prüfe ob aktueller Branch geschützt ist
IS_PROTECTED=false
for protected in "${PROTECTED_BRANCHES[@]}"; do
    if [ "$CURRENT_BRANCH" = "$protected" ]; then
        IS_PROTECTED=true
        break
    fi
done

# Branch-spezifische Regeln
check_branch_rules() {
    local branch="$1"
    local operation="$2"
    
    case "$branch" in
        main|master|production|prod)
            # Keine direkten Commits erlaubt
            if [ "$operation" = "commit" ] || [ "$operation" = "edit" ]; then
                handle_error \
                    "Direkte Änderungen an $branch sind nicht erlaubt!" \
                    "Erstelle einen Feature-Branch: git checkout -b feature/your-feature"
            fi
            ;;
            
        alpha|beta|release)
            # Nur bestimmte Commit-Types erlaubt
            if [ "$operation" = "commit" ]; then
                log "${YELLOW}⚠️  Eingeschränkter Branch: $branch${NC}"
                log "  Erlaubt sind nur: Hotfixes, Release-Vorbereitung"
            fi
            ;;
            
        release/*)
            # Release-Branches haben spezielle Regeln
            if [ "$operation" = "edit" ]; then
                log "${YELLOW}⚠️  Release-Branch erkannt${NC}"
                log "  Nur Version-Bumps und Changelog-Updates erlaubt"
            fi
            ;;
    esac
}

# Prüfe Branch-Namenskonventionen
check_branch_naming() {
    local branch="$1"
    
    # Erlaubte Präfixe
    local valid_prefixes=(
        "feature/"
        "fix/"
        "hotfix/"
        "release/"
        "docs/"
        "test/"
        "chore/"
        "refactor/"
        "style/"
        "perf/"
        "ci/"
        "build/"
        "revert/"
        "claude/"
    )
    
    # Prüfe ob Branch einem Pattern folgt
    local valid_pattern=false
    for prefix in "${valid_prefixes[@]}"; do
        if [[ "$branch" =~ ^$prefix ]]; then
            valid_pattern=true
            break
        fi
    done
    
    # Spezielle Branches sind auch erlaubt
    if [[ "$branch" =~ ^(main|master|develop|alpha|beta|production|staging)$ ]]; then
        valid_pattern=true
    fi
    
    if [ "$valid_pattern" = false ]; then
        log "${YELLOW}⚠️  Branch-Name folgt keiner Konvention: $branch${NC}"
        log "  Empfohlene Präfixe: ${valid_prefixes[*]}"
        log "  Beispiel: feature/add-user-authentication"
    else
        log "${GREEN}✅ Branch-Namenskonvention eingehalten${NC}"
    fi
}

# Prüfe Merge-Richtung
check_merge_direction() {
    local source="$1"
    local target="$2"
    
    # Definiere erlaubte Merge-Flows
    case "$target" in
        main|master|production)
            # Nur von release/* oder hotfix/* nach production
            if [[ ! "$source" =~ ^(release/|hotfix/|alpha|beta) ]]; then
                handle_error \
                    "Merge von $source nach $target nicht erlaubt!" \
                    "Nutze den PR-Workflow über alpha/beta Branches"
            fi
            ;;
            
        alpha)
            # Feature-Branches können nach alpha
            if [[ ! "$source" =~ ^(feature/|fix/|docs/|test/|chore/) ]]; then
                log "${YELLOW}⚠️  Ungewöhnlicher Merge von $source nach $target${NC}"
            fi
            ;;
    esac
}

# Führe Checks aus
if [ "$IS_PROTECTED" = true ]; then
    log "${RED}🔒 Geschützter Branch erkannt: $CURRENT_BRANCH${NC}"
    check_branch_rules "$CURRENT_BRANCH" "$OPERATION"
fi

# Prüfe Branch-Naming bei neuen Branches
if [ "$OPERATION" = "create" ] || [ -z "$(git rev-parse --verify HEAD 2>/dev/null)" ]; then
    check_branch_naming "$CURRENT_BRANCH"
fi

# Prüfe Merge-Operation
if [ "$OPERATION" = "merge" ] && [ -n "$TARGET_BRANCH" ]; then
    check_merge_direction "$CURRENT_BRANCH" "$TARGET_BRANCH"
fi

# Zusätzliche Checks basierend auf Branch-Type
log ""
log "${BLUE}📋 Branch-spezifische Hinweise:${NC}"

case "$CURRENT_BRANCH" in
    feature/*)
        log "  ${GREEN}✓${NC} Feature-Branch"
        log "  • Erstelle PR nach alpha wenn fertig"
        log "  • Halte Branch aktuell mit: ${BLUE}git rebase alpha${NC}"
        log "  • Squash Commits vor dem Merge"
        ;;
        
    fix/*|hotfix/*)
        log "  ${YELLOW}🔧${NC} Fix/Hotfix-Branch"
        log "  • Minimale Änderungen durchführen"
        log "  • Tests für den Fix schreiben"
        log "  • Cherry-pick in Release-Branches wenn nötig"
        ;;
        
    release/*)
        log "  ${MAGENTA}📦${NC} Release-Branch"
        log "  • Nur Version-Bumps und Fixes"
        log "  • Changelog aktualisieren"
        log "  • Tag nach Merge zu main/master"
        ;;
        
    claude/*)
        log "  ${BLUE}🤖${NC} Claude-generierter Branch"
        log "  • Automatisch von Claude Code erstellt"
        log "  • Review vor Merge erforderlich"
        ;;
esac

# Git-Flow Empfehlungen
log ""
log "${MAGENTA}🌊 Git-Flow Empfehlungen:${NC}"
log "  1. ${BLUE}feature/*${NC} → ${GREEN}alpha${NC} → ${YELLOW}beta${NC} → ${RED}main${NC}"
log "  2. ${RED}hotfix/*${NC} → ${RED}main${NC} + ${GREEN}alpha${NC}"
log "  3. ${MAGENTA}release/*${NC} → ${RED}main${NC} + ${GREEN}alpha${NC}"

# Workflow-Status
log ""
if [ "$IS_PROTECTED" = false ] || [ "$OPERATION" = "read" ]; then
    log "${GREEN}✅ Branch-Operation erlaubt${NC}"
    
    if [ -n "$HOOK_RESULT_FILE" ]; then
        cat > "$HOOK_RESULT_FILE" <<EOF
{
    "status": "allowed",
    "message": "Branch-Operation erlaubt",
    "branch": "$CURRENT_BRANCH",
    "is_protected": $IS_PROTECTED,
    "operation": "$OPERATION"
}
EOF
    fi
else
    log "${YELLOW}⚠️  Prüfe Branch-Schutzregeln beachten${NC}"
fi

exit 0