# CLAUDE.md - AI Agent Instructions

## 🚫 BREAKING RULES (NIEMALS brechen!)

### API-Client Generation

**NIEMALS manuelle API-Helper erstellen!**

Nutze IMMER TanStack Query Hooks mit generiertem API-Client:

```typescript
// ✅ RICHTIG:
const useSecurityAlerts = () => {
  return useQuery({
    queryKey: QUERY_KEYS.security.alerts,
    queryFn: () => api.security().getSecurityAlerts(),
  });
};

// ❌ FALSCH:
const fetchAlerts = async () => {
  return await fetch('/api/security/alerts');
};
```

**Workflow:** Backend-Endpunkt → `pnpm run generate-api` → TanStack Query Hook → Komponente

### UI Framework

**NUR Tailwind CSS + Headless UI** - keine anderen Frameworks!

- NIEMALS andere CSS-Frameworks oder CSS-in-JS mischen
- Bei UI-Änderungen IMMER Tailwind-Klassen und Headless UI-Komponenten verwenden
- **Tailwind Plus (TailwindUI):** Premium-Komponenten
  - IMMER beim User anfragen!
  - Der User muss die Komponenten manuell von TailwindUI kopieren und bereitstellen
  - NIEMALS selbst TailwindUI-Komponenten erfinden oder raten

### Forms & State

- **Forms:** NUR @tanstack/react-form mit Zod-Schemas
- **State:** @tanstack/react-store für globalen State
- **Timing:** @tanstack/pacer für Debouncing/Throttling
- **NIEMALS:** HTML Forms, Redux, oder andere Libraries

### Commit Rules

- **NIEMALS** `--no-verify` verwenden
- **IMMER** nach jedem Subtask committen
- Format: `<emoji>(<context>): <title>`

## 🤖 MANDATORY WORKFLOWS

Verwende ultrathink, also denke nach bevor du handelst. Hier sind die wichtigsten Workflows.

| Trigger            | Agent                | Beschreibung                  |
| ------------------ | -------------------- | ----------------------------- |
| Nach Code-Änderung | `test-writer-fixer`  | Tests schreiben/anpassen      |
| Nach UI-Änderung   | `whimsy-injector`    | Delightful touches hinzufügen |
| Vor jedem Commit   | `commit-expert`      | Perfekte Commit-Message       |
| Bei Feature-Flags  | `experiment-tracker` | A/B-Test Tracking             |
| Bei Task-Planung   | `sprint-prioritizer` | Priorisierung                 |
| Bei Frontend-Work  | `frontend-developer` | UI/UX Implementation          |
| Bei Backend-Work   | `backend-architect`  | API-Design & DB-Architektur   |

## 📚 VERFÜGBARE DEVELOPMENT AGENTS

### 🔧 Engineering

| Agent                | Verwendung                    | Priorität    |
| -------------------- | ----------------------------- | ------------ |
| `rapid-prototyper`   | MVPs in 6 Tagen bauen         | **KRITISCH** |
| `backend-architect`  | APIs, Datenbanken, Server     | **KRITISCH** |
| `frontend-developer` | React, Vue, UI Implementation | **KRITISCH** |
| `test-writer-fixer`  | Tests schreiben & fixen       | **KRITISCH** |
| `devops-automator`   | CI/CD, Deployment, Docker     | HOCH         |
| `ai-engineer`        | LLM Integration, ML Features  | HOCH         |
| `mobile-app-builder` | iOS/Android Native Apps       | MITTEL       |

### 🧪 Testing & Quality

| Agent                     | Verwendung                  | Priorität    |
| ------------------------- | --------------------------- | ------------ |
| `api-tester`              | Load Testing, Performance   | **KRITISCH** |
| `performance-benchmarker` | Speed Optimization          | HOCH         |
| `test-results-analyzer`   | Test Patterns erkennen      | HOCH         |
| `tool-evaluator`          | Framework/Library Bewertung | MITTEL       |
| `workflow-optimizer`      | Dev-Workflow verbessern     | MITTEL       |

### 🎨 Design & UX (Technisch)

| Agent             | Verwendung                       | Priorität |
| ----------------- | -------------------------------- | --------- |
| `ui-designer`     | Component Design, Design Systems | HOCH      |
| `ux-researcher`   | User Feedback → Features         | HOCH      |
| `whimsy-injector` | Micro-Interactions, Delight      | MITTEL    |

### 📦 Product & Planning

| Agent                  | Verwendung               | Priorität    |
| ---------------------- | ------------------------ | ------------ |
| `sprint-prioritizer`   | 6-Day Sprint Planning    | **KRITISCH** |
| `feedback-synthesizer` | Bug Reports analysieren  | HOCH         |
| `experiment-tracker`   | A/B Tests, Feature Flags | HOCH         |
| `trend-researcher`     | Tech Trends für Features | MITTEL       |

### 🚀 Deployment & Operations

| Agent                       | Verwendung                  | Priorität    |
| --------------------------- | --------------------------- | ------------ |
| `infrastructure-maintainer` | Scaling, Performance        | **KRITISCH** |
| `project-shipper`           | Release Coordination        | HOCH         |
| `studio-producer`           | Team & Sprint Orchestration | HOCH         |
| `analytics-reporter`        | Performance Metriken        | MITTEL       |
| `legal-compliance-checker`  | GDPR, Security              | MITTEL       |

### 🎯 Special Agents

| Agent           | Verwendung               | Priorität |
| --------------- | ------------------------ | --------- |
| `studio-coach`  | Multi-Agent Koordination | HOCH      |
| `commit-expert` | Git Commit Messages      | HOCH      |

## 📁 PROJECT STRUCTURE

```text
app/
├── packages/
│   ├── frontend/          # React + Vite + Atomic Design
│   ├── backend/           # NestJS + Prisma + PostgreSQL
│   └── shared/
│       └── client/apis/   # Generierte API-Clients (nicht manuell ändern!)
├── docs/
│   └── architecture/      # arc42 Dokumentation (PFLICHT für Architektur)
├── ai-docs/              # AI-spezifische Dokumentation
└── .taskmaster/          # Task-Management & Workflows
```

## 🛠️ ESSENTIAL COMMANDS

### Development

```bash
# Projekt-weit
pnpm -r dev                                    # Alle Services starten
pnpm -r build                                  # Alles bauen
pnpm run generate-api                          # API-Client generieren (WICHTIG!)

# Package-spezifisch
pnpm --filter @bluelight-hub/backend dev      # Nur Backend
pnpm --filter @bluelight-hub/frontend dev     # Nur Frontend

# E2E Tests (separates Jest-Config!)
cd packages/backend && pnpm run test:e2e       # NICHT "test" verwenden!
```

## 🔧 MCP SERVER INTEGRATION

### 🌟 Serena - Code Intelligence (PRIORITÄT #1 für Code-Navigation!)

**WICHTIG: Serena MUSS als primäres Tool für Code-Navigation und -Manipulation verwendet werden!**

Serena bietet über 30 spezialisierte Tools für effiziente Code-Arbeit. Die Verwendung von Serena ist PFLICHT, außer es gibt einen triftigen Grund dagegen.

#### Warum Serena verwenden?

- **Token-Effizienz:** Liest nur relevante Code-Teile statt ganzer Dateien
- **Präzision:** Arbeitet auf Symbol-Ebene (Klassen, Methoden, Funktionen)
- **Sicherheit:** Findet automatisch alle Referenzen vor Refactoring
- **Performance:** Schnellere Navigation durch semantische Suche

#### Serena Core Tools (IMMER verwenden!)

```text
# PFLICHT-Workflow für Code-Exploration:
1. get_symbols_overview      # IMMER zuerst! Überblick über Datei-Struktur
2. find_symbol               # Gezielt Symbole finden (Klassen, Methoden, etc.)
3. find_referencing_symbols  # VOR jeder Änderung: Wer nutzt dieses Symbol?
4. replace_symbol_body       # Präzise Symbol-Änderungen
5. search_for_pattern        # Flexibles Pattern-Matching wenn Symbol unbekannt
```

#### Vollständige Serena Tool-Liste

**Datei-Operationen:**

- `list_dir` - Verzeichnisse auflisten (gitignore-aware)
- `find_file` - Dateien nach Maske suchen
- `create_text_file` - Neue Dateien erstellen
- `read_file` - NUR wenn Symbol-Tools nicht ausreichen!

**Symbol-Navigation (PRIORITÄT!):**

- `get_symbols_overview` - Top-Level Symbole einer Datei
- `find_symbol` - Symbol nach Name/Pfad finden
- `find_referencing_symbols` - Alle Referenzen finden
- `jet_brains_find_symbol` - JetBrains IDE Integration
- `jet_brains_get_symbols_overview` - IDE Symbol-Überblick

**Symbol-Manipulation:**

- `replace_symbol_body` - Ganzes Symbol ersetzen
- `insert_after_symbol` - Nach Symbol einfügen
- `insert_before_symbol` - Vor Symbol einfügen (z.B. Imports)

**Pattern-basierte Suche:**

- `search_for_pattern` - Regex-Suche in Codebase
- `replace_regex` - Regex-basiertes Ersetzen
- `replace_lines` - Zeilen ersetzen
- `insert_at_line` - An Zeile einfügen
- `delete_lines` - Zeilen löschen

**Memory-System:**

- `write_memory` - Projekt-Kontext speichern
- `read_memory` - Gespeicherten Kontext abrufen
- `list_memories` - Verfügbare Memories anzeigen
- `delete_memory` - Memory löschen

**Projekt-Management:**

- `activate_project` - Projekt aktivieren
- `check_onboarding_performed` - Onboarding-Status prüfen
- `onboarding` - Projekt-Onboarding durchführen

**Thinking Tools (für komplexe Aufgaben):**

- `think_about_collected_information` - Nach Recherche reflektieren
- `think_about_task_adherence` - Vor Code-Änderungen prüfen
- `think_about_whether_you_are_done` - Aufgaben-Vollständigkeit prüfen

#### Serena Best Practices

**DO's:**

- ✅ IMMER `get_symbols_overview` vor dem Lesen ganzer Files
- ✅ IMMER `find_referencing_symbols` vor Refactoring
- ✅ Symbol-Tools für Navigation verwenden
- ✅ `search_for_pattern` wenn Symbol-Name unbekannt
- ✅ Memory-System für Projekt-Kontext nutzen

**DON'Ts:**

- ❌ NIEMALS ganze Files lesen wenn Symbol-Tools reichen
- ❌ NIEMALS Refactoring ohne Referenz-Check
- ❌ NIEMALS manuelle Suche statt Serena-Tools
- ❌ NIEMALS Symbol-Tools nach `read_file` auf gleicher Datei

#### Typische Serena Workflows

**Code verstehen:**

```text
1. list_dir                    # Projekt-Struktur verstehen
2. get_symbols_overview        # Datei-Struktur analysieren
3. find_symbol mit depth=1     # Methoden einer Klasse finden
4. find_symbol mit include_body=true  # Spezifische Implementation lesen
```

**Refactoring:**

```text
1. find_symbol                 # Symbol lokalisieren
2. find_referencing_symbols    # Alle Verwendungen finden
3. replace_symbol_body         # Symbol ändern
4. replace_regex               # Referenzen anpassen
```

**Neue Features:**

```text
1. get_symbols_overview        # Struktur verstehen
2. insert_before_symbol        # Imports hinzufügen
3. insert_after_symbol         # Neue Methode/Klasse einfügen
4. write_memory                # Kontext für später speichern
```

### Context7 - Library Docs (VOR Library-Nutzung!)

```text
# Beispiel:
resolve-library-id("prisma") → "/prisma/prisma"
get-library-docs("/prisma/prisma", topic="schema")
```

### Tailwind CSS + Headless UI - Component System

- **Tailwind CSS:** Utility-first CSS Framework für Styling
- **Headless UI:** Unstyled, accessible Komponenten (Dialogs, Dropdowns, etc.)
- **Tailwind Plus/TailwindUI:** Premium-Komponenten
  - WICHTIG: Komponenten müssen vom User bereitgestellt werden
  - Workflow: Frage User nach benötigter Komponente → User kopiert von TailwindUI → Integration
- **Tailwind Config:** Zentrale Theme-Konfiguration in `tailwind.config.js`

## 📚 ARCHITECTURE & DOCUMENTATION

### arc42 (PFLICHT für Architektur!)

Architekturdokumentation MUSS in `docs/architecture/` gepflegt werden:

- Neue Konzepte → `08-concepts.adoc`
- Architekturentscheidungen → `adr/XXX-entscheidungsname.adoc`
- Systemgrenzen → `03-context.adoc`
- **NIEMALS** separate Architektur-Markdown außerhalb arc42!

### JSDoc Requirements

- **Sprache:** Deutsch (für technische Dokumentation)
- **Coverage Check:** `pnpm --filter @bluelight-hub/backend check:jsdoc:public`
- Erkläre "warum", nicht "was"

## 🏗️ CODE PATTERNS

### Frontend (Atomic Design)

```text
// Component-Struktur
atoms/      # Basis-Komponenten (Tailwind Utilities)
molecules/  # Kombinierte Komponenten (Headless UI + Tailwind)
organisms/  # Komplexe Module (TailwindUI Komponenten vom User)
templates/  # Seiten-Layouts
pages/      # Route-Komponenten

// IMMER Tailwind CSS Classes + Headless UI verwenden!
// TailwindUI-Komponenten: User nach Code fragen, NICHT selbst erstellen!
```

### Backend (NestJS Modular)

```text
// Module-Struktur
controller/ # REST Endpoints
service/    # Business Logic
repository/ # Data Access
dto/       # Data Transfer Objects

// IMMER OpenAPI decorators für API-Generation!
```

## 🎯 COMMIT EMOJIS

### Semantic Release Triggers

| Emoji | Typ      | Version | Verwendung       |
| ----- | -------- | ------- | ---------------- |
| 💥    | Breaking | Major   | Breaking Changes |
| ✨    | Feature  | Minor   | Neue Features    |
| 🐛    | Fix      | Patch   | Bug Fixes        |
| 🚑    | Hotfix   | Patch   | Kritische Fixes  |
| 🔒    | Security | Patch   | Security Fixes   |
| ♻️    | Refactor | Patch   | Code Refactoring |

## ⚠️ KLARSTELLUNGEN

### Tests

- Tests werden AKTUELL übersprungen (temporär)
- Trotzdem: `test-writer-fixer` Agent nutzen für zukünftige Tests
- E2E-Tests nutzen separates Config: `test:e2e` nicht `test`

### Subagents

- **Location:** Definiert in `.taskmaster/` Verzeichnis
- **Verwendung:** PFLICHT für spezialisierte Aufgaben
- **Keine Ausnahmen:** Direkte Tool-Aufrufe vermeiden

### API Development

1. Backend-Endpoint mit NestJS/Swagger erstellen
2. API-Client generieren lassen
3. Frontend nutzt generierten Client
4. Bei fehlenden APIs: Backend-Endpoint erstellen → `pnpm run generate-api` → generierten Client nutzen

## 🔍 QUICK REFERENCE

| Was                 | Wo       | Tool/Command                      | Agent                     |
| ------------------- | -------- | --------------------------------- | ------------------------- |
| **Neues Projekt**   | -        | `pnpm create vite`                | `rapid-prototyper`        |
| **API erstellen**   | Backend  | NestJS + Swagger                  | `backend-architect`       |
| **API nutzen**      | Frontend | Generierter Client in `@/api`     | -                         |
| **UI Component**    | Frontend | Tailwind/Headless UI/TailwindUI\* | `frontend-developer`      |
| **Form erstellen**  | Frontend | TanStack Form + Zod               | `frontend-developer`      |
| **Tests schreiben** | Überall  | Jest/Vitest                       | `test-writer-fixer`       |
| **Performance**     | -        | Lighthouse, DevTools              | `performance-benchmarker` |
| **Deployment**      | -        | Docker, CI/CD                     | `devops-automator`        |
| **Code finden**     | Überall  | Serena MCP `find_symbol`          | -                         |
| **Library Docs**    | -        | Context7 MCP                      | -                         |
| **Architektur**     | docs/    | arc42 Template                    | `backend-architect`       |
| **Sprint Planning** | -        | RICE/Value Matrix                 | `sprint-prioritizer`      |
| **Commit**          | -        | Semantic Emojis                   | `commit-expert`           |

## 🚀 DEVELOPMENT WORKFLOW CHECKLIST

- [ ] **Start**: `rapid-prototyper` für MVP Setup
- [ ] **Backend**: `backend-architect` für API Design
- [ ] **Frontend**: `frontend-developer` für UI
- [ ] **Testing**: `test-writer-fixer` nach jeder Änderung
- [ ] **Performance**: `performance-benchmarker` vor Release
- [ ] **Deploy**: `devops-automator` für CI/CD
- [ ] **Monitor**: `infrastructure-maintainer` für Scaling
- [ ] **Commit**: `commit-expert` für Git Messages

---

_Repository:_ github.com/bluelight-hub/app
_Import zusätzliche Workflows:_ @./.taskmaster/CLAUDE.md
