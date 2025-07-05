# Claude Code Hooks für Bluelight Hub

Diese Hooks sind speziell auf das Bluelight Hub Projekt zugeschnitten und nutzen die vorhandene Infrastruktur (pnpm, TypeScript, ESLint, Jest/Vitest).

## 🚀 Aktivierung

1. Hooks ausführbar machen:
```bash
chmod +x .claude/hooks/*.sh
```

2. Claude Code neustarten oder Hooks manuell laden

## 📋 Verfügbare Hooks

### Pre-Edit Hook (`pre-edit-typescript.sh`)
- **Zweck**: Validiert TypeScript-Code vor Bearbeitung
- **Features**:
  - TypeScript Compiler Check
  - Package-spezifische Validierung
  - Warnung bei console.log und TODOs
  - Automatische pnpm install wenn nötig

### Post-Edit Hook (`post-edit-lint.sh`)
- **Zweck**: Führt ESLint aus und behebt Probleme automatisch
- **Features**:
  - ESLint mit --fix Option
  - Package-spezifische Konfiguration
  - Import-Reihenfolge Prüfung
  - Datei-Größen Warnung

### Pre-Commit Hook (`pre-commit-checks.sh`)
- **Zweck**: Umfassende Qualitätsprüfung vor Commits
- **Features**:
  - Commit-Message Format Validierung
  - TypeScript Type-Check für alle Packages
  - ESLint auf geänderten Dateien
  - Tests nur für betroffene Packages
  - Coverage-Prüfung (80% Threshold)
  - Sicherheitsprüfungen
  - Build-Validierung

### Post-Commit Hook (`post-commit-notify.sh`)
- **Zweck**: Zeigt Commit-Zusammenfassung und gibt Hinweise
- **Features**:
  - Detaillierte Commit-Informationen
  - Package-spezifische Hinweise
  - Nächste Schritte Vorschläge
  - Prisma Migration Erinnerungen
  - Motivational Quotes

### Test Coverage Hook (`test-coverage-check.sh`)
- **Zweck**: Detaillierte Test-Coverage Analyse
- **Features**:
  - Coverage-Report für alle Metriken
  - Ungetestete Dateien finden
  - Package-spezifische Analyse
  - Performance-Tipps

### Dependency Security Hook (`dependency-security-check.sh`)
- **Zweck**: Prüft Dependencies auf Sicherheitslücken
- **Features**:
  - pnpm audit Integration
  - Prüfung auf veraltete Packages
  - Unsichere URL-Patterns
  - Bekannte unsichere Packages
  - Crypto-Mining Detection

### Branch Protection Hook (`branch-protection.sh`)
- **Zweck**: Schützt kritische Branches
- **Features**:
  - Verhindert direkte Commits auf main/alpha
  - Branch-Naming Konventionen
  - Merge-Flow Validierung
  - Git-Flow Empfehlungen

### File Structure Hook (`file-structure-check.sh`)
- **Zweck**: Prüft Dateinamen und Projekt-Struktur
- **Features**:
  - PascalCase für React Components
  - camelCase für Services/Utils
  - Atomic Design Validierung (Frontend)
  - NestJS Module Struktur (Backend)
  - Package-spezifische Regeln

## 🔧 Konfiguration

Die Hooks nutzen die zentrale Konfiguration in `.claude/hooks.json`. Einzelne Hooks können dort aktiviert/deaktiviert werden:

```json
{
  "hooks": {
    "hook_name": {
      "enabled": false  // Hook deaktivieren
    }
  }
}
```

## 📝 Hook-Entwicklung

### Neue Hooks hinzufügen:
1. Script in `.claude/hooks/` erstellen
2. Ausführbar machen: `chmod +x hook-name.sh`
3. In `hooks.json` registrieren
4. Testen mit verschiedenen Szenarien

### Hook-Konventionen:
- Nutze Farben für bessere Lesbarkeit
- Gib hilfreiche Fehlermeldungen
- Biete Lösungsvorschläge an
- Respektiere Timeouts
- Schreibe Ergebnisse in HOOK_RESULT_FILE

## 🐛 Debugging

Hooks loggen nach stderr. Bei Problemen:
1. Prüfe Hook-Logs in Claude Code Output
2. Führe Hook manuell aus: `.claude/hooks/hook-name.sh <parameter>`
3. Aktiviere Debug-Logging in hooks.json

## 🔒 Sicherheit

- Hooks laufen mit den Berechtigungen von Claude Code
- Keine sensitiven Daten in Hook-Scripts
- Validiere alle Eingaben
- Nutze `set -e` für Fehlerbehandlung