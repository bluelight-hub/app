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
|--------------------|----------------------|-------------------------------|
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
|----------------------|-------------------------------|--------------|
| `rapid-prototyper`   | MVPs in 6 Tagen bauen         | **KRITISCH** |
| `backend-architect`  | APIs, Datenbanken, Server     | **KRITISCH** |
| `frontend-developer` | React, Vue, UI Implementation | **KRITISCH** |
| `test-writer-fixer`  | Tests schreiben & fixen       | **KRITISCH** |
| `devops-automator`   | CI/CD, Deployment, Docker     | HOCH         |
| `ai-engineer`        | LLM Integration, ML Features  | HOCH         |
| `mobile-app-builder` | iOS/Android Native Apps       | MITTEL       |

### 🧪 Testing & Quality

| Agent                     | Verwendung                  | Priorität    |
|---------------------------|-----------------------------|--------------|
| `api-tester`              | Load Testing, Performance   | **KRITISCH** |
| `performance-benchmarker` | Speed Optimization          | HOCH         |
| `test-results-analyzer`   | Test Patterns erkennen      | HOCH         |
| `tool-evaluator`          | Framework/Library Bewertung | MITTEL       |
| `workflow-optimizer`      | Dev-Workflow verbessern     | MITTEL       |

### 🎨 Design & UX (Technisch)

| Agent             | Verwendung                       | Priorität |
|-------------------|----------------------------------|-----------|
| `ui-designer`     | Component Design, Design Systems | HOCH      |
| `ux-researcher`   | User Feedback → Features         | HOCH      |
| `whimsy-injector` | Micro-Interactions, Delight      | MITTEL    |

### 📦 Product & Planning

| Agent                  | Verwendung               | Priorität    |
|------------------------|--------------------------|--------------|
| `sprint-prioritizer`   | 6-Day Sprint Planning    | **KRITISCH** |
| `feedback-synthesizer` | Bug Reports analysieren  | HOCH         |
| `experiment-tracker`   | A/B Tests, Feature Flags | HOCH         |
| `trend-researcher`     | Tech Trends für Features | MITTEL       |

### 🚀 Deployment & Operations

| Agent                       | Verwendung                  | Priorität    |
|-----------------------------|-----------------------------|--------------|
| `infrastructure-maintainer` | Scaling, Performance        | **KRITISCH** |
| `project-shipper`           | Release Coordination        | HOCH         |
| `studio-producer`           | Team & Sprint Orchestration | HOCH         |
| `analytics-reporter`        | Performance Metriken        | MITTEL       |
| `legal-compliance-checker`  | GDPR, Security              | MITTEL       |

### 🎯 Special Agents

| Agent           | Verwendung               | Priorität |
|-----------------|--------------------------|-----------|
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
|-------|----------|---------|------------------|
| 💥    | Breaking | Major   | Breaking Changes |
| ✨     | Feature  | Minor   | Neue Features    |
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
|---------------------|----------|-----------------------------------|---------------------------|
| **Neues Projekt**   | -        | `pnpm create vite`                | `rapid-prototyper`        |
| **API erstellen**   | Backend  | NestJS + Swagger                  | `backend-architect`       |
| **API nutzen**      | Frontend | Generierter Client in `@/api`     | -                         |
| **UI Component**    | Frontend | Tailwind/Headless UI/TailwindUI\* | `frontend-developer`      |
| **Form erstellen**  | Frontend | TanStack Form + Zod               | `frontend-developer`      |
| **Tests schreiben** | Überall  | Jest/Vitest                       | `test-writer-fixer`       |
| **Performance**     | -        | Lighthouse, DevTools              | `performance-benchmarker` |
| **Deployment**      | -        | Docker, CI/CD                     | `devops-automator`        |
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

Mandatory: Spreche Deutsch mit mir, produziere Englischen Code, aber deutsche Dokumentation!

_Repository:_ github.com/rubenvitt/bluelight-hub
_Import zusätzliche Workflows:_ @./.taskmaster/CLAUDE.md
