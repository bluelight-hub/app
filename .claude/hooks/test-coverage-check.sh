#!/bin/bash
# Test Coverage Check Hook
# Überprüft Test-Coverage und gibt detaillierte Berichte

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Hook-Parameter
TEST_COMMAND="${1:-}"
PACKAGE="${2:-}"
HOOK_RESULT_FILE="${3:-}"

# Coverage-Schwellenwerte (aus package.json)
COVERAGE_THRESHOLD=80

# Logging
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Funktion zum Escapen von JSON-Strings
escape_json_string() {
    local input="$1"
    printf '%s' "$input" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\n/\\n/g'
}

# Fehler-Handler
handle_error() {
    local error_msg="$1"
    log "${RED}❌ $error_msg${NC}"
    
    if [ -n "$HOOK_RESULT_FILE" ]; then
        local escaped_error_msg
        escaped_error_msg=$(escape_json_string "$error_msg")
        cat > "$HOOK_RESULT_FILE" <<EOF
{
    "status": "failed",
    "message": "$escaped_error_msg"
}
EOF
    fi
    exit 1
}

log "${MAGENTA}🧪 Starte Test-Coverage Analyse...${NC}"

# Bestimme welches Package getestet werden soll
if [ -z "$PACKAGE" ]; then
    # Versuche Package aus dem aktuellen Verzeichnis zu ermitteln
    if pwd | grep -q "packages/frontend"; then
        PACKAGE="frontend"
    elif pwd | grep -q "packages/backend"; then
        PACKAGE="backend"
    elif pwd | grep -q "packages/shared"; then
        PACKAGE="shared"
    else
        # Führe Tests für alle Packages aus
        PACKAGE="all"
    fi
fi

log "${BLUE}📦 Package: $PACKAGE${NC}"

# Funktion zum Parsen der Coverage-Ergebnisse
parse_coverage() {
    local coverage_file="$1"
    local package_name="$2"
    
    if [ -f "$coverage_file" ]; then
        # Versuche Coverage-Summary zu lesen
        if [ -f "coverage/coverage-summary.json" ]; then
            # Parse JSON für Coverage-Werte
            if command -v jq &> /dev/null; then
                STATEMENTS=$(jq -r '.total.statements.pct' coverage/coverage-summary.json 2>/dev/null || echo "0")
                BRANCHES=$(jq -r '.total.branches.pct' coverage/coverage-summary.json 2>/dev/null || echo "0")
                FUNCTIONS=$(jq -r '.total.functions.pct' coverage/coverage-summary.json 2>/dev/null || echo "0")
                LINES=$(jq -r '.total.lines.pct' coverage/coverage-summary.json 2>/dev/null || echo "0")
                
                log ""
                log "${CYAN}📊 Coverage Report - $package_name:${NC}"
                log "  ${BLUE}Statements:${NC} $(printf "%6.2f%%" $STATEMENTS) $([ $(echo "$STATEMENTS >= $COVERAGE_THRESHOLD" | bc -l) -eq 1 ] && echo "${GREEN}✓${NC}" || echo "${RED}✗${NC}")"
                log "  ${BLUE}Branches:${NC}   $(printf "%6.2f%%" $BRANCHES) $([ $(echo "$BRANCHES >= $COVERAGE_THRESHOLD" | bc -l) -eq 1 ] && echo "${GREEN}✓${NC}" || echo "${RED}✗${NC}")"
                log "  ${BLUE}Functions:${NC}  $(printf "%6.2f%%" $FUNCTIONS) $([ $(echo "$FUNCTIONS >= $COVERAGE_THRESHOLD" | bc -l) -eq 1 ] && echo "${GREEN}✓${NC}" || echo "${RED}✗${NC}")"
                log "  ${BLUE}Lines:${NC}      $(printf "%6.2f%%" $LINES) $([ $(echo "$LINES >= $COVERAGE_THRESHOLD" | bc -l) -eq 1 ] && echo "${GREEN}✓${NC}" || echo "${RED}✗${NC}")"
                log ""
                
                # Prüfe ob Schwellenwert erreicht wurde
                if [ $(echo "$LINES < $COVERAGE_THRESHOLD" | bc -l) -eq 1 ]; then
                    return 1
                fi
            fi
        fi
    fi
    return 0
}

# Führe Tests mit Coverage aus
run_tests_with_coverage() {
    local package_name="$1"
    local test_cmd="$2"
    
    log "${BLUE}🔍 Führe Tests für $package_name aus...${NC}"
    
    # Wechsle ins Package-Verzeichnis
    cd "packages/$package_name" 2>/dev/null || {
        log "${YELLOW}⚠️  Package $package_name nicht gefunden${NC}"
        return 1
    }
    
    # Führe Tests aus
    if eval "$test_cmd"; then
        log "${GREEN}✅ Tests erfolgreich${NC}"
        
        # Parse Coverage
        if ! parse_coverage "coverage/coverage-summary.json" "$package_name"; then
            log "${RED}❌ Coverage unter Schwellenwert ($COVERAGE_THRESHOLD%)${NC}"
            cd - > /dev/null
            return 1
        fi
    else
        log "${RED}❌ Tests fehlgeschlagen${NC}"
        cd - > /dev/null
        return 1
    fi
    
    cd - > /dev/null
    return 0
}

# Coverage-Berichte sammeln
OVERALL_SUCCESS=true
COVERAGE_RESULTS=""

case "$PACKAGE" in
    "frontend")
        if ! run_tests_with_coverage "frontend" "pnpm test:cov"; then
            OVERALL_SUCCESS=false
        fi
        ;;
    "backend")
        if ! run_tests_with_coverage "backend" "pnpm test:cov"; then
            OVERALL_SUCCESS=false
        fi
        ;;
    "shared")
        # Shared hat möglicherweise keine Tests
        if [ -d "packages/shared" ] && [ -f "packages/shared/package.json" ]; then
            if grep -q '"test"' "packages/shared/package.json"; then
                if ! run_tests_with_coverage "shared" "pnpm test"; then
                    log "${YELLOW}⚠️  Shared Tests fehlgeschlagen (nicht kritisch)${NC}"
                fi
            fi
        fi
        ;;
    "all")
        # Führe Tests für alle Packages aus
        for pkg in frontend backend; do
            if ! run_tests_with_coverage "$pkg" "pnpm test:cov"; then
                OVERALL_SUCCESS=false
            fi
        done
        ;;
esac

# Zusätzliche Analyse
log "${BLUE}📈 Zusätzliche Test-Analyse...${NC}"

# Suche nach untested files
find_untested_files() {
    local package_dir="$1"
    local coverage_dir="$package_dir/coverage"
    
    if [ -d "$coverage_dir" ] && [ -f "$coverage_dir/lcov.info" ]; then
        # Finde alle source files
        local source_files=$(find "$package_dir/src" -name "*.ts" -o -name "*.tsx" | grep -v ".test." | grep -v ".spec." || true)
        local untested_count=0
        
        log "${YELLOW}📁 Nicht getestete Dateien in $package_dir:${NC}"
        
        for file in $source_files; do
            local rel_file=$(realpath --relative-to="$package_dir" "$file")
            if ! grep -q "$rel_file" "$coverage_dir/lcov.info" 2>/dev/null; then
                log "  ${RED}•${NC} $rel_file"
                ((untested_count++))
            fi
        done
        
        if [ $untested_count -eq 0 ]; then
            log "  ${GREEN}Alle Dateien haben Tests!${NC}"
        else
            log "  ${YELLOW}⚠️  $untested_count Dateien ohne Tests${NC}"
        fi
    fi
}

# Analysiere untested files für jedes Package
if [ "$PACKAGE" = "all" ] || [ "$PACKAGE" = "frontend" ]; then
    find_untested_files "packages/frontend"
fi

if [ "$PACKAGE" = "all" ] || [ "$PACKAGE" = "backend" ]; then
    find_untested_files "packages/backend"
fi

# Best Practices Empfehlungen
log ""
log "${MAGENTA}💡 Test-Empfehlungen:${NC}"

if [ "$OVERALL_SUCCESS" = false ]; then
    log "  ${YELLOW}→${NC} Coverage erhöhen durch:"
    log "     • Unit Tests für kritische Business-Logik"
    log "     • Integration Tests für API Endpoints"
    log "     • Component Tests für UI-Komponenten"
    log "  ${YELLOW}→${NC} Fokus auf ungetestete Dateien legen"
    log "  ${YELLOW}→${NC} Edge Cases und Error Handling testen"
else
    log "  ${GREEN}✅ Exzellente Test-Coverage!${NC}"
    log "  ${YELLOW}→${NC} Coverage beibehalten bei neuen Features"
    log "  ${YELLOW}→${NC} Mutation Testing für noch bessere Qualität erwägen"
fi

# Test-Performance Tipps
log ""
log "${CYAN}⚡ Performance-Tipps:${NC}"
log "  • Nutze ${BLUE}pnpm test -- --watch${NC} während der Entwicklung"
log "  • Führe nur relevante Tests aus: ${BLUE}pnpm test -- -t 'test name'${NC}"
log "  • Parallelisiere Tests wo möglich"

# Ergebnis
if [ "$OVERALL_SUCCESS" = true ]; then
    log ""
    log "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    log "${GREEN}✅ Test-Coverage Check erfolgreich abgeschlossen!${NC}"
    log "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    
    if [ -n "$HOOK_RESULT_FILE" ]; then
        cat > "$HOOK_RESULT_FILE" <<EOF
{
    "status": "success",
    "message": "Test-Coverage erfüllt alle Anforderungen",
    "coverage_threshold": $COVERAGE_THRESHOLD,
    "package": "$PACKAGE"
}
EOF
    fi
else
    handle_error "Test-Coverage unter dem erforderlichen Schwellenwert"
fi

exit 0