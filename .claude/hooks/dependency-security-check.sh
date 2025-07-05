#!/bin/bash
# Dependency Security Check Hook
# Prüft Dependencies auf bekannte Sicherheitslücken

set -e

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Hook-Parameter
PACKAGE_FILE="${1:-package.json}"
HOOK_RESULT_FILE="${2:-}"

# Logging
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Warnung-Handler
handle_warning() {
    local warning_msg="$1"
    log "${YELLOW}⚠️  $warning_msg${NC}"
}

log "${MAGENTA}🔒 Starte Sicherheitsprüfung der Dependencies...${NC}"

# Prüfe ob pnpm verfügbar ist
if ! command -v pnpm &> /dev/null; then
    log "${RED}❌ pnpm nicht gefunden${NC}"
    exit 1
fi

# Sammle Sicherheitsergebnisse
TOTAL_VULNERABILITIES=0
CRITICAL_COUNT=0
HIGH_COUNT=0
MODERATE_COUNT=0
LOW_COUNT=0
PACKAGES_CHECKED=0

# Funktion zum Prüfen eines Packages
check_package_security() {
    local package_dir="$1"
    local package_name="$2"
    
    if [ ! -d "$package_dir" ]; then
        return 0
    fi
    
    log "${BLUE}📦 Prüfe $package_name...${NC}"
    
    cd "$package_dir"
    
    # pnpm audit für Sicherheitsprüfung
    AUDIT_OUTPUT=$(pnpm audit --json 2>/dev/null || true)
    
    if [ -n "$AUDIT_OUTPUT" ]; then
        # Parse JSON output wenn jq verfügbar ist
        if command -v jq &> /dev/null; then
            local vulnerabilities=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities // {}' 2>/dev/null || echo "{}")
            
            local critical=$(echo "$vulnerabilities" | jq -r '.critical // 0' 2>/dev/null || echo "0")
            local high=$(echo "$vulnerabilities" | jq -r '.high // 0' 2>/dev/null || echo "0")
            local moderate=$(echo "$vulnerabilities" | jq -r '.moderate // 0' 2>/dev/null || echo "0")
            local low=$(echo "$vulnerabilities" | jq -r '.low // 0' 2>/dev/null || echo "0")
            
            CRITICAL_COUNT=$((CRITICAL_COUNT + critical))
            HIGH_COUNT=$((HIGH_COUNT + high))
            MODERATE_COUNT=$((MODERATE_COUNT + moderate))
            LOW_COUNT=$((LOW_COUNT + low))
            
            local package_total=$((critical + high + moderate + low))
            
            if [ $package_total -gt 0 ]; then
                log "  ${RED}⚠️  Gefundene Sicherheitslücken:${NC}"
                [ $critical -gt 0 ] && log "     ${RED}● Kritisch: $critical${NC}"
                [ $high -gt 0 ] && log "     ${RED}● Hoch: $high${NC}"
                [ $moderate -gt 0 ] && log "     ${YELLOW}● Mittel: $moderate${NC}"
                [ $low -gt 0 ] && log "     ${BLUE}● Niedrig: $low${NC}"
            else
                log "  ${GREEN}✅ Keine Sicherheitslücken gefunden${NC}"
            fi
        else
            # Fallback ohne jq
            if echo "$AUDIT_OUTPUT" | grep -q "found 0 vulnerabilities"; then
                log "  ${GREEN}✅ Keine Sicherheitslücken gefunden${NC}"
            else
                log "  ${YELLOW}⚠️  Audit abgeschlossen (Details mit 'pnpm audit')${NC}"
            fi
        fi
    fi
    
    # Zusätzliche Prüfungen
    log "  🔍 Weitere Sicherheitsprüfungen..."
    
    # Prüfe auf veraltete Dependencies
    OUTDATED_OUTPUT=$(pnpm outdated --json 2>/dev/null || true)
    if [ -n "$OUTDATED_OUTPUT" ] && command -v jq &> /dev/null; then
        local outdated_count=$(echo "$OUTDATED_OUTPUT" | jq '. | length' 2>/dev/null || echo "0")
        if [ "$outdated_count" -gt 10 ]; then
            log "  ${YELLOW}⚠️  $outdated_count veraltete Dependencies${NC}"
        fi
    fi
    
    # Prüfe auf unsichere Patterns in package.json
    if [ -f "package.json" ]; then
        # Prüfe auf Git-Dependencies (potentiell unsicher)
        if grep -q '"git://' package.json || grep -q '"git+http://' package.json; then
            handle_warning "Unsichere Git-URLs in package.json gefunden (verwende https://)"
        fi
        
        # Prüfe auf lokale file: Dependencies in Production
        if grep -q '"file:' package.json && [ "$package_name" != "shared" ]; then
            handle_warning "Lokale file: Dependencies gefunden"
        fi
        
        # Prüfe auf * Versionen
        if grep -q '"\*"' package.json; then
            handle_warning "Wildcard (*) Versionen gefunden - spezifische Versionen empfohlen"
        fi
    fi
    
    cd - > /dev/null
    PACKAGES_CHECKED=$((PACKAGES_CHECKED + 1))
}

# Prüfe Root-Package
log "${CYAN}🔍 Prüfe Root-Dependencies...${NC}"
check_package_security "." "root"

# Prüfe alle Workspace-Packages
log ""
log "${CYAN}🔍 Prüfe Workspace-Packages...${NC}"
check_package_security "packages/frontend" "frontend"
check_package_security "packages/backend" "backend"
check_package_security "packages/shared" "shared"

# Berechne Gesamt-Vulnerabilities
TOTAL_VULNERABILITIES=$((CRITICAL_COUNT + HIGH_COUNT + MODERATE_COUNT + LOW_COUNT))

# Zusätzliche Sicherheitsprüfungen
log ""
log "${CYAN}🔍 Zusätzliche Sicherheitsprüfungen...${NC}"

# Prüfe auf bekannte unsichere Packages
UNSAFE_PACKAGES=(
    "event-stream"
    "flatmap-stream"
    "ws@<7.4.6"
    "node-fetch@<2.6.7"
    "axios@<0.21.2"
    "moment@<2.29.4"
)

log "  Prüfe auf bekannte unsichere Packages..."
FOUND_UNSAFE=false
for unsafe_pkg in "${UNSAFE_PACKAGES[@]}"; do
    if grep -r "\"${unsafe_pkg%@*}\"" packages/*/package.json 2>/dev/null | grep -v node_modules > /dev/null; then
        handle_warning "Potentiell unsicheres Package gefunden: $unsafe_pkg"
        FOUND_UNSAFE=true
    fi
done

if [ "$FOUND_UNSAFE" = false ]; then
    log "  ${GREEN}✅ Keine bekannten unsicheren Packages gefunden${NC}"
fi

# Prüfe auf Crypto-Mining Scripts
log "  Prüfe auf verdächtige Scripts..."
if find packages -name "*.js" -o -name "*.ts" | xargs grep -l "crypto-js\|cryptonight\|coinhive" 2>/dev/null | grep -v node_modules > /dev/null; then
    handle_warning "Verdächtige Crypto-Referenzen gefunden"
else
    log "  ${GREEN}✅ Keine verdächtigen Scripts gefunden${NC}"
fi

# Zusammenfassung
log ""
log "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
log "${MAGENTA}📊 Sicherheitsbericht Zusammenfassung${NC}"
log "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
log ""
log "  Packages geprüft: $PACKAGES_CHECKED"
log "  Gefundene Sicherheitslücken: $TOTAL_VULNERABILITIES"
log ""

if [ $TOTAL_VULNERABILITIES -gt 0 ]; then
    log "  ${RED}Kritisch:${NC} $CRITICAL_COUNT"
    log "  ${RED}Hoch:${NC} $HIGH_COUNT"
    log "  ${YELLOW}Mittel:${NC} $MODERATE_COUNT"
    log "  ${BLUE}Niedrig:${NC} $LOW_COUNT"
    log ""
fi

# Empfehlungen
log "${CYAN}💡 Empfehlungen:${NC}"

if [ $CRITICAL_COUNT -gt 0 ] || [ $HIGH_COUNT -gt 0 ]; then
    log "  ${RED}⚠️  DRINGEND: Kritische/Hohe Sicherheitslücken beheben!${NC}"
    log "  ${YELLOW}→${NC} Führe aus: ${BLUE}pnpm audit fix${NC}"
    log "  ${YELLOW}→${NC} Oder manuell: ${BLUE}pnpm update <package-name>${NC}"
elif [ $TOTAL_VULNERABILITIES -gt 0 ]; then
    log "  ${YELLOW}→${NC} Sicherheitslücken mit ${BLUE}pnpm audit fix${NC} beheben"
    log "  ${YELLOW}→${NC} Details anzeigen: ${BLUE}pnpm audit${NC}"
else
    log "  ${GREEN}✅ Keine Sicherheitslücken - sehr gut!${NC}"
fi

log "  ${YELLOW}→${NC} Regelmäßig Dependencies aktualisieren"
log "  ${YELLOW}→${NC} Lock-Files committen (pnpm-lock.yaml)"
log "  ${YELLOW}→${NC} Automatische Sicherheitsprüfung in CI/CD einrichten"

# Best Practices
log ""
log "${CYAN}🛡️  Security Best Practices:${NC}"
log "  • Nutze exakte Versionen oder Ranges (^1.2.3)"
log "  • Prüfe neue Dependencies vor Installation"
log "  • Aktiviere GitHub Dependabot Alerts"
log "  • Führe regelmäßig ${BLUE}pnpm audit${NC} aus"
log "  • Nutze ${BLUE}pnpm outdated${NC} für Update-Übersicht"

# Status bestimmen
STATUS="success"
MESSAGE="Sicherheitsprüfung abgeschlossen"

if [ $CRITICAL_COUNT -gt 0 ]; then
    STATUS="critical"
    MESSAGE="Kritische Sicherheitslücken gefunden!"
elif [ $HIGH_COUNT -gt 0 ]; then
    STATUS="high"
    MESSAGE="Hohe Sicherheitslücken gefunden!"
elif [ $MODERATE_COUNT -gt 0 ]; then
    STATUS="warning"
    MESSAGE="Mittlere Sicherheitslücken gefunden"
fi

# Ergebnis
if [ "$STATUS" = "success" ] || [ "$STATUS" = "warning" ]; then
    log ""
    log "${GREEN}✅ Sicherheitsprüfung abgeschlossen${NC}"
else
    log ""
    log "${RED}❌ Sicherheitsprobleme gefunden - bitte beheben!${NC}"
fi

# Schreibe Ergebnis
if [ -n "$HOOK_RESULT_FILE" ]; then
    cat > "$HOOK_RESULT_FILE" <<EOF
{
    "status": "$STATUS",
    "message": "$MESSAGE",
    "vulnerabilities": {
        "total": $TOTAL_VULNERABILITIES,
        "critical": $CRITICAL_COUNT,
        "high": $HIGH_COUNT,
        "moderate": $MODERATE_COUNT,
        "low": $LOW_COUNT
    },
    "packages_checked": $PACKAGES_CHECKED
}
EOF
fi

# Exit-Code basierend auf kritischen Findings
if [ $CRITICAL_COUNT -gt 0 ] || [ $HIGH_COUNT -gt 0 ]; then
    exit 1
fi

exit 0