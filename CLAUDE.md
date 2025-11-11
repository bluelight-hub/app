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

## 🤖 BUILT-IN AGENTS (Claude Code)

**WICHTIG:** Nutze IMMER die Built-in Agents via Task-Tool, wenn verfügbar. Bei komplexen Multi-Agent-Workflows arbeite
im **Orchestrator-Mode** (parallele Agent-Launches).

### Verfügbare Built-in Agents

| Agent            | subagent_type        | Verwendung                                                  | Tools verfügbar               |
|------------------|----------------------|-------------------------------------------------------------|-------------------------------|
| **General**      | `general-purpose`    | Komplexe Recherchen, Code-Suche, Multi-Step-Tasks           | Alle Tools                    |
| **Explorer**     | `Explore`            | Schnelle Codebase-Exploration, Pattern-Suche, Keyword-Suche | Glob, Grep, Read, Bash        |
| **Planner**      | `Plan`               | Task-Planung, Codebase-Analyse für Implementierung          | Glob, Grep, Read, Bash        |

### Wann welchen Agent nutzen?

| Szenario                        | Agent             | Thoroughness Level            |
|---------------------------------|-------------------|-------------------------------|
| Codebase verstehen              | `Explore`         | `medium` oder `very thorough` |
| Spezifische Datei/Klasse finden | Direkte Tools     | -                             |
| Komplexe Implementierung planen | `Plan`            | `medium`                      |
| Multi-Step Refactoring          | `general-purpose` | -                             |
| Fehlersuche über mehrere Files  | `Explore`         | `very thorough`               |
| Task-Breakdown & Strategie      | `Plan`            | `medium`                      |

### Orchestrator-Mode (Parallele Agents)

Für komplexe Workflows mit mehreren unabhängigen Aufgaben:

```typescript
// Beispiel: Parallele Agent-Launches in EINER Message
Task({subagent_type: "Explore", prompt: "Find all authentication handlers"})
Task({subagent_type: "Explore", prompt: "Find all API error handling patterns"})
Task({subagent_type: "Plan", prompt: "Plan migration strategy for auth system"})
```

**Vorteile:**

- Maximale Performance durch Parallelität
- Mehrere Perspektiven gleichzeitig
- Effiziente Codebase-Analyse

### Task-Tool Usage Pattern

```typescript
// ✅ RICHTIG: Agent für Codebase-Exploration
Task({
    subagent_type: "Explore",
    description: "Find error handlers",
    prompt: "Locate all error handling patterns in the backend, thorough search",
})

// ❌ FALSCH: Direkte Tool-Aufrufe für offene Suchen
Glob({pattern: "**/*error*"})
Grep({pattern: "catch"})
// ... mehrere Runden manueller Suche
```

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
└── ai-docs/              # AI-spezifische Dokumentation
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

# E2E Tests wurden entfernt
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
- E2E-Tests wurden entfernt

### Built-in Agents

- **Verfügbare Agents:** Siehe Sektion "🤖 BUILT-IN AGENTS"
- **Verwendung:** PFLICHT für Codebase-Exploration und komplexe Multi-Step-Tasks
- **Task-Tool:** Nutze das Task-Tool mit entsprechendem `subagent_type`
- **Orchestrator-Mode:** Bei unabhängigen Tasks parallele Agent-Launches in EINER Message
- **Keine direkten Tool-Aufrufe** für offene Codebase-Suchen - immer `Explore`-Agent nutzen

### API Development

1. Backend-Endpoint mit NestJS/Swagger erstellen
2. API-Client generieren lassen
3. Frontend nutzt generierten Client
4. Bei fehlenden APIs: Backend-Endpoint erstellen → `pnpm run generate-api` → generierten Client nutzen

## 🔍 QUICK REFERENCE

| Was                        | Wo       | Tool/Command                      | Built-in Agent / Orchestrator                         |
|----------------------------|----------|-----------------------------------|-------------------------------------------------------|
| **Codebase verstehen**     | -        | Task-Tool                         | `Explore` (medium/very thorough)                      |
| **Implementierung planen** | -        | Task-Tool                         | `Plan` (medium) oder Orchestrator-Mode                |
| **API erstellen**          | Backend  | NestJS + Swagger                  | `general-purpose` für komplexe API-Designs            |
| **API nutzen**             | Frontend | Generierter Client in `@/api`     | -                                                     |
| **UI Component**           | Frontend | Tailwind/Headless UI/TailwindUI\* | `Explore` für Beispiele, dann direkte Implementierung |
| **Form erstellen**         | Frontend | TanStack Form + Zod               | `Explore` für Pattern-Suche                           |
| **Refactoring**            | -        | Multi-Step                        | `general-purpose` oder Orchestrator-Mode              |
| **Architektur**            | docs/    | arc42 Template                    | `Explore` für Bestandsanalyse                         |
| **Bug-Analyse**            | -        | Code-Suche                        | `Explore` (very thorough)                             |

## 🚀 DEVELOPMENT WORKFLOW CHECKLIST

- [ ] **Codebase verstehen**: `Explore`-Agent mit `medium` thoroughness
- [ ] **Planung**: `Plan`-Agent für Task-Breakdown und Implementierungsstrategie
- [ ] **Komplexe Tasks**: `general-purpose`-Agent für Multi-Step-Workflows
- [ ] **Parallele Recherche**: Orchestrator-Mode mit mehreren `Explore`-Agents
- [ ] **Implementierung**: Direkte Tools nach Agent-basierter Planung
- [ ] **Commit**: Semantic Emojis nach jedem Subtask

---

Mandatory: Spreche Deutsch mit mir, produziere Englischen Code, aber deutsche Dokumentation!

_Repository:_ github.com/rubenvitt/bluelight-hub

---

- Verwende die Chrome-Dev Tools um die Anwendung auszuprobieren - die läuft wahrscheinlich auf :3001
