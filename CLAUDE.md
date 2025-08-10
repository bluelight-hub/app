# CLAUDE.md - AI Agent Instructions

## 🚫 BREAKING RULES (NIEMALS brechen!)

### API-Client Generation

**NIEMALS manuelle API-Helper erstellen!**

```typescript
// ✅ RICHTIG:
import { api } from '@/api';

const alerts = await api.security.getSecurityAlerts();

// ❌ FALSCH:
import { fetchWithAuth } from '@/utils/authInterceptor';

const response = await fetchWithAuth('/api/security/alerts');
```

**Workflow:** Backend-Endpunkt → `pnpm run generate-api` → Nutze generierten Client

### UI Framework

**NUR Chakra UI v3** - keine anderen Frameworks!

- IMMER MCP Server nutzen: `mcp__chakra-ui__get_component_props`
- NIEMALS Tailwind oder natives CSS mischen
- Bei UI-Änderungen IMMER Theme checken

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

### Serena - Code Intelligence (IMMER nutzen für Code-Navigation!)

```text
# Workflow für effiziente Code-Exploration:
1. get_symbols_overview      # Statt ganze Files lesen
2. find_symbol               # Gezielt Symbole finden
3. find_referencing_symbols  # VOR Refactoring prüfen!
4. replace_symbol_body       # Präzise Änderungen
```

### Context7 - Library Docs (VOR Library-Nutzung!)

```text
# Beispiel:
resolve-library-id("prisma") → "/prisma/prisma"
get-library-docs("/prisma/prisma", topic="schema")
```

### Chakra UI - Component System

- `get_theme` - Theme-Definitionen abrufen
- `get_component_props` - Props für Komponente
- `get_component_example` - Code-Beispiele
- `v2_to_v3_code_review` - Migration Check

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
atoms/      # Basis-Komponenten
molecules/  # Kombinierte Komponenten
organisms/  # Komplexe Module
templates/  # Seiten-Layouts
pages/      # Route-Komponenten

// IMMER Chakra UI v3 Komponenten verwenden!
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
4. Bei fehlenden APIs: TODO-Kommentar + temporär fetchWithAuth

## 🔍 QUICK REFERENCE

| Was                 | Wo       | Tool/Command                  | Agent                     |
| ------------------- | -------- | ----------------------------- | ------------------------- |
| **Neues Projekt**   | -        | `pnpm create vite`            | `rapid-prototyper`        |
| **API erstellen**   | Backend  | NestJS + Swagger              | `backend-architect`       |
| **API nutzen**      | Frontend | Generierter Client in `@/api` | -                         |
| **UI Component**    | Frontend | Chakra UI v3 via MCP          | `frontend-developer`      |
| **Form erstellen**  | Frontend | TanStack Form + Zod           | `frontend-developer`      |
| **Tests schreiben** | Überall  | Jest/Vitest                   | `test-writer-fixer`       |
| **Performance**     | -        | Lighthouse, DevTools          | `performance-benchmarker` |
| **Deployment**      | -        | Docker, CI/CD                 | `devops-automator`        |
| **Code finden**     | Überall  | Serena MCP `find_symbol`      | -                         |
| **Library Docs**    | -        | Context7 MCP                  | -                         |
| **Architektur**     | docs/    | arc42 Template                | `backend-architect`       |
| **Sprint Planning** | -        | RICE/Value Matrix             | `sprint-prioritizer`      |
| **Commit**          | -        | Semantic Emojis               | `commit-expert`           |

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
