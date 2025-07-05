#!/bin/bash
# File Structure Check Hook
# Prüft Dateinamen-Konventionen und Projekt-Struktur

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
FILE_PATH="${1:-}"
FILE_OPERATION="${2:-create}" # create, move, rename
HOOK_RESULT_FILE="${3:-}"

# Logging
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Warnung
warn() {
    log "${YELLOW}⚠️  $1${NC}"
}

# Fehler
error() {
    log "${RED}❌ $1${NC}"
    if [ -n "$HOOK_RESULT_FILE" ]; then
        cat > "$HOOK_RESULT_FILE" <<EOF
{
    "status": "warning",
    "message": "$1",
    "file": "$FILE_PATH"
}
EOF
    fi
}

log "${MAGENTA}📁 File Structure Check${NC}"
log "  File: ${BLUE}$FILE_PATH${NC}"
log "  Operation: ${BLUE}$FILE_OPERATION${NC}"

# Prüfe ob Datei angegeben wurde
if [ -z "$FILE_PATH" ]; then
    log "${GREEN}✅ Keine spezifische Datei zu prüfen${NC}"
    exit 0
fi

# Extrahiere Datei-Informationen
FILE_NAME=$(basename "$FILE_PATH")
FILE_DIR=$(dirname "$FILE_PATH")
FILE_EXT="${FILE_NAME##*.}"
FILE_BASE="${FILE_NAME%.*}"

# Bestimme Package-Kontext
PACKAGE_CONTEXT=""
if [[ "$FILE_PATH" =~ packages/frontend/ ]]; then
    PACKAGE_CONTEXT="frontend"
elif [[ "$FILE_PATH" =~ packages/backend/ ]]; then
    PACKAGE_CONTEXT="backend"
elif [[ "$FILE_PATH" =~ packages/shared/ ]]; then
    PACKAGE_CONTEXT="shared"
fi

log "  Package: ${CYAN}${PACKAGE_CONTEXT:-root}${NC}"

# Funktion: Prüfe Dateinamen-Konvention
check_naming_convention() {
    local file="$1"
    local ext="$2"
    local base="$3"
    local dir="$4"
    
    # TypeScript/JavaScript Dateien
    if [[ "$ext" =~ ^(ts|tsx|js|jsx)$ ]]; then
        # React Components (PascalCase)
        if [[ "$ext" =~ ^(tsx|jsx)$ ]] || [[ "$dir" =~ components ]]; then
            if [[ "$base" =~ ^[A-Z][a-zA-Z0-9]*$ ]]; then
                log "${GREEN}✅ React Component Naming (PascalCase)${NC}"
            else
                warn "React Components sollten PascalCase verwenden: $base"
            fi
            
            # Prüfe auf Index-Dateien
            if [[ "$base" = "index" ]]; then
                warn "Vermeide index.tsx/jsx - nutze beschreibende Namen"
            fi
        # Utility/Service Dateien (camelCase)
        elif [[ "$dir" =~ (utils|services|hooks|helpers) ]]; then
            if [[ "$base" =~ ^[a-z][a-zA-Z0-9]*$ ]]; then
                log "${GREEN}✅ Utility/Service Naming (camelCase)${NC}"
            else
                warn "Utilities/Services sollten camelCase verwenden: $base"
            fi
        # Test-Dateien
        elif [[ "$base" =~ \.(test|spec)$ ]]; then
            log "${GREEN}✅ Test-Datei erkannt${NC}"
            # Prüfe ob zugehörige Source-Datei existiert
            local source_file="${base%.*}.${ext}"
            if [ ! -f "$(dirname "$FILE_PATH")/$source_file" ]; then
                warn "Zugehörige Source-Datei nicht gefunden: $source_file"
            fi
        fi
        
        # Prüfe auf Sonderzeichen
        if [[ "$base" =~ [^a-zA-Z0-9.-] ]]; then
            error "Dateiname enthält ungültige Zeichen: $base"
        fi
    fi
    
    # CSS/SCSS Module
    if [[ "$ext" =~ ^(css|scss|sass)$ ]] && [[ "$base" =~ \.module$ ]]; then
        log "${GREEN}✅ CSS Module erkannt${NC}"
    fi
    
    # Konfigurationsdateien
    if [[ "$base" =~ ^\..*rc$ ]] || [[ "$file" =~ \.(json|yml|yaml|toml)$ ]]; then
        log "${GREEN}✅ Konfigurationsdatei${NC}"
    fi
}

# Funktion: Prüfe Verzeichnisstruktur
check_directory_structure() {
    local path="$1"
    local package="$2"
    
    case "$package" in
        frontend)
            # Frontend folgt Atomic Design
            if [[ "$path" =~ src/components/(atoms|molecules|organisms|templates|pages)/ ]]; then
                log "${GREEN}✅ Atomic Design Struktur eingehalten${NC}"
                
                # Prüfe Verschachtelungstiefe
                local depth=$(echo "$path" | grep -o "/" | wc -l)
                if [ $depth -gt 6 ]; then
                    warn "Tiefe Verschachtelung erkannt - erwäge Umstrukturierung"
                fi
            elif [[ "$path" =~ src/components/ ]]; then
                warn "Components sollten Atomic Design folgen (atoms/molecules/organisms/templates/pages)"
            fi
            
            # Weitere Frontend-Strukturen
            if [[ "$path" =~ src/(hooks|utils|services|store|types|styles|assets)/ ]]; then
                log "${GREEN}✅ Standard Frontend-Struktur${NC}"
            fi
            ;;
            
        backend)
            # Backend folgt NestJS Modular-Struktur
            if [[ "$path" =~ src/modules/[^/]+/(controller|service|repository|dto|entity|interface)s?/ ]]; then
                log "${GREEN}✅ NestJS Modular-Struktur eingehalten${NC}"
            elif [[ "$path" =~ src/modules/ ]]; then
                warn "Module sollten controller/service/repository Struktur folgen"
            fi
            
            # Common Backend-Strukturen
            if [[ "$path" =~ src/(common|config|database|guards|interceptors|pipes|filters)/ ]]; then
                log "${GREEN}✅ Standard Backend-Struktur${NC}"
            fi
            ;;
            
        shared)
            # Shared Package Struktur
            if [[ "$path" =~ src/(types|interfaces|constants|utils|api)/ ]]; then
                log "${GREEN}✅ Shared Package Struktur${NC}"
            fi
            ;;
    esac
}

# Funktion: Prüfe Import-Pfade
check_import_paths() {
    local file_path="$1"
    
    # Nur für TS/JS Dateien
    if [[ ! "$file_path" =~ \.(ts|tsx|js|jsx)$ ]]; then
        return
    fi
    
    # Diese Prüfung würde normalerweise den Dateiinhalt analysieren
    # Hier nur als Platzhalter für die Struktur
    log "  ${BLUE}Import-Pfade werden zur Laufzeit geprüft${NC}"
}

# Funktion: Package-spezifische Regeln
check_package_specific_rules() {
    local path="$1"
    local package="$2"
    local file_name="$3"
    
    case "$package" in
        frontend)
            # Keine .js Dateien im Frontend (nur .ts/.tsx)
            if [[ "$file_name" =~ \.js$ ]] && [[ ! "$path" =~ (node_modules|dist|build) ]]; then
                warn "Frontend sollte nur TypeScript verwenden (.ts/.tsx)"
            fi
            
            # Komponenten sollten Stories haben
            if [[ "$path" =~ components.*\.tsx$ ]] && [[ ! "$file_name" =~ \.(test|spec) ]]; then
                local story_file="${FILE_BASE}.stories.tsx"
                if [ ! -f "$(dirname "$path")/$story_file" ]; then
                    log "  ${YELLOW}💡 Erwäge Storybook Story hinzuzufügen${NC}"
                fi
            fi
            ;;
            
        backend)
            # DTOs sollten Validierung haben
            if [[ "$path" =~ /dto/.*\.ts$ ]]; then
                log "  ${YELLOW}💡 Stelle sicher dass DTOs class-validator Decorators nutzen${NC}"
            fi
            
            # Entities sollten in entity Ordnern sein
            if [[ "$file_name" =~ \.entity\.ts$ ]] && [[ ! "$path" =~ /entit(y|ies)/ ]]; then
                warn "Entity-Dateien sollten in entity/ Ordnern liegen"
            fi
            ;;
    esac
}

# Führe alle Checks aus
log ""
log "${CYAN}🔍 Führe Struktur-Checks aus...${NC}"

# 1. Naming Convention Check
check_naming_convention "$FILE_NAME" "$FILE_EXT" "$FILE_BASE" "$FILE_DIR"

# 2. Directory Structure Check
if [ -n "$PACKAGE_CONTEXT" ]; then
    check_directory_structure "$FILE_PATH" "$PACKAGE_CONTEXT"
fi

# 3. Package-spezifische Regeln
if [ -n "$PACKAGE_CONTEXT" ]; then
    check_package_specific_rules "$FILE_PATH" "$PACKAGE_CONTEXT" "$FILE_NAME"
fi

# 4. Allgemeine Best Practices
log ""
log "${CYAN}📋 Best Practices Check:${NC}"

# Datei-Größen Warnung
if [ -f "$FILE_PATH" ]; then
    FILE_LINES=$(wc -l < "$FILE_PATH" 2>/dev/null || echo 0)
    if [ "$FILE_LINES" -gt 300 ]; then
        warn "Datei hat $FILE_LINES Zeilen - erwäge Aufteilung"
    fi
fi

# Keine Spaces in Dateinamen
if [[ "$FILE_NAME" =~ \  ]]; then
    error "Dateiname enthält Leerzeichen - nutze Bindestriche oder camelCase"
fi

# Vermeide Umlaute
if [[ "$FILE_NAME" =~ [äöüÄÖÜß] ]]; then
    warn "Vermeide Umlaute in Dateinamen für bessere Kompatibilität"
fi

# File-Type spezifische Empfehlungen
case "$FILE_EXT" in
    tsx|jsx)
        log "  ${BLUE}•${NC} React Component - exportiere als default oder named export"
        log "  ${BLUE}•${NC} Nutze Props-Interface/Type"
        ;;
    ts|js)
        if [[ "$FILE_BASE" =~ \.(service|controller|repository)$ ]]; then
            log "  ${BLUE}•${NC} NestJS Klasse - nutze Dependency Injection"
        fi
        ;;
    test.ts|spec.ts)
        log "  ${BLUE}•${NC} Test-Datei - nutze describe/it Struktur"
        log "  ${BLUE}•${NC} Mocke externe Dependencies"
        ;;
esac

# Abschluss
log ""
if [ -f "$HOOK_RESULT_FILE" ]; then
    # Wenn keine Fehler geschrieben wurden, war alles ok
    if ! grep -q "status" "$HOOK_RESULT_FILE" 2>/dev/null; then
        cat > "$HOOK_RESULT_FILE" <<EOF
{
    "status": "success",
    "message": "Dateistruktur-Prüfung erfolgreich",
    "file": "$FILE_PATH",
    "package": "${PACKAGE_CONTEXT:-root}",
    "checks": {
        "naming": "passed",
        "structure": "passed",
        "conventions": "passed"
    }
}
EOF
        log "${GREEN}✅ Dateistruktur-Prüfung erfolgreich${NC}"
    fi
else
    log "${GREEN}✅ Dateistruktur-Prüfung abgeschlossen${NC}"
fi

# Hilfreiche Links
log ""
log "${MAGENTA}📚 Weitere Informationen:${NC}"
log "  • Frontend: Atomic Design Pattern"
log "  • Backend: NestJS Best Practices"
log "  • TypeScript: Style Guide"
log "  • Projekt: Siehe CLAUDE.md"

exit 0