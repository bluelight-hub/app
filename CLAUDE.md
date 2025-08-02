# CLAUDE.md - Repository Guide

## Repository Information

- GitHub: github.com/bluelight-hub/app
- Git Remote: `github` (https://github.com/bluelight-hub/app.git)

## AI Documentation

Der `ai-docs/` Ordner enthält potentiell hilfreiche Dokumentation für AI-Assistenten und Entwickler:

- Commit Guidelines
- Weitere relevante Dokumentationen (wird fortlaufend erweitert)

## API Client Generation (WICHTIG!)

### Automatische API-Client Generierung

**NIEMALS manuelle API-Helper erstellen!** Das Projekt nutzt automatische API-Client-Generierung aus der
OpenAPI-Spezifikation.

**Workflow:**

1. Backend-Endpunkte werden mit NestJS/Swagger erstellt
2. API-Client wird automatisch generiert: `pnpm run generate-api`
3. Generierte APIs sind verfügbar in: `packages/shared/client/apis/`
4. Frontend nutzt die generierten APIs über: `packages/frontend/src/api/index.ts`

**Verwendung im Frontend:**

```typescript
import { api } from '@/api';

// Beispiel: Security API verwenden
const alerts = await api.security.getSecurityAlerts();

// NICHT SO:
// import { fetchWithAuth } from '@/utils/authInterceptor';
// const response = await fetchWithAuth('/api/security/alerts');
```

**Wichtige Regeln:**

- IMMER zuerst prüfen ob eine API im generierten Client existiert
- Falls nicht: Backend-Endpunkt erstellen und API-Client generieren lassen
- NIEMALS eigene API-Helper in `packages/frontend/src/api/` erstellen
- Bei fehlenden APIs: TODO-Kommentar hinzufügen und temporär fetchWithAuth nutzen

## Development Tools

### IntelliJ Run Configurations (Preferred)

Use IntelliJ run configurations instead of shell commands for better IDE integration:

**Development:**

- `backend > dev` - Start backend development server
- `frontend > dev` - Start frontend development server

**Testing:**

- `Backend Tests (All)` - Run all backend tests
- `Backend Tests (Watch)` - Run backend tests in watch mode
- `Backend Tests (Coverage)` - Run backend tests with coverage
- `Frontend Tests (All)` - Run all frontend tests
- `Frontend Tests (Watch)` - Run frontend tests in watch mode
- `Frontend Tests (Coverage)` - Run frontend tests with coverage
- `All Tests (pnpm)` - Run all tests across the monorepo
- `All Tests Coverage (pnpm)` - Run all tests with coverage

**Infrastructure (you may not use these, the user should have started those):**

- `docker-compose.yml: Compose Deployment` - Start all services
- `docker-compose.yml.postgres: Compose Deployment` - Start PostgreSQL
- `docker-compose.yml.redis: Compose Deployment` - Start Redis

### Build Commands (Fallback)

Only use these shell commands if IntelliJ is not available:

- Project-wide: `pnpm -r dev`, `pnpm -r build`, `pnpm -r test`, `pnpm -r test:cov`
- Backend: `pnpm --filter @bluelight-hub/backend dev`, `pnpm --filter @bluelight-hub/backend test`
- Frontend: `pnpm --filter @bluelight-hub/frontend dev`, `pnpm --filter @bluelight-hub/frontend test`
- Single test (backend): `pnpm --filter @bluelight-hub/backend test -- -t "test name"`
- Single test (frontend): `pnpm --filter @bluelight-hub/frontend test -- -t "test name"`
- **Doc Coverage Check:** `pnpm --filter @bluelight-hub/backend check:jsdoc:public`

### E2E Tests (Backend)

**WICHTIG:** E2E-Tests nutzen eine separate Jest-Konfiguration und müssen mit `test:e2e` ausgeführt werden:

- Run all e2e tests: `cd packages/backend && npm run test:e2e`
- Run specific e2e test: `cd packages/backend && npm run test:e2e -- register.e2e-spec.ts`
- Run e2e tests with coverage: `cd packages/backend && npm run test:e2e -- --coverage`
- Run e2e tests with open handles detection: `cd packages/backend && npm run test:e2e -- --detectOpenHandles`

**Hinweise:**

- E2E-Tests starten automatisch einen PostgreSQL Docker Container
- Container wird nach den Tests automatisch gestoppt

## Code Style Guidelines

- TypeScript strict mode required throughout codebase
- Frontend: Atomic Design (atoms, molecules, organisms, templates, pages)
- Backend: NestJS modular architecture (controller, service, repository)
- File naming: PascalCase for components, camelCase for others
- Comments: Explain "why" not "what", JSDoc for public APIs
- Use react-icons (phosphor-icons) when using icons
- JSDoc sollte in deutsch geschrieben sein, die geht direkt in die technische Dokumentation (und die ist auf deutsch)

## Commit Message Convention

- Format: `<emoji>(<context>): <title>`
- Context: `frontend`, `backend`, `shared`, `release`, or other module names
- Title: Short summary (50-72 characters), use imperative mood
- Body (optional): Detailed explanation after blank line

### Commit Message Structure

```
<emoji>(<context>): <title>

<optional body>
```

### Examples

Single-line commits:

- `✨(frontend): Add user dashboard`
- `🐛(backend): Fix database connection timeout`
- `♻️(shared): Refactor date utility functions`

Multi-line commit:

```
💥(backend): Change API response format

BREAKING CHANGE: The API now returns data in a nested structure
instead of flat objects. This improves consistency but requires
frontend updates.

Affected endpoints:
- GET /api/users
- GET /api/organizations
```

### Semantic Release Emojis

This project uses semantic-release with gitmoji for automated versioning:

**Major Version (Breaking Changes):**

- 💥 Breaking changes

**Minor Version (New Features):**

- ✨ New features/functionality

**Patch Version (Fixes & Improvements):**

- 🐛 Bug fixes
- 🚑 Critical hotfixes
- 🔒 Security fixes
- 🧹 Code cleanup/chore
- ♻️ Code refactoring
- 🔧 Configuration/tooling changes

## Architecture & Patterns

- Tests are being skipped for now, don't worry about them
- React frontend with Atomic Design and Vite/Vitest for testing
- NestJS backend with Prisma (PostgreSQL)
- Packages: frontend, backend, shared (monorepo with pnpm workspaces)
- DRY code with clear separation of concerns
- Single Responsibility Principle for components (<150 lines)
- Full test coverage for new features

### Documentation Guidelines

- **Architectural documentation** belongs in `docs/architecture/` following the arc42 template
- Do NOT create separate markdown files in the `docs/` root directory for architectural concepts
- System design, security concepts, and technical decisions should be documented in the appropriate arc42 sections
- Only create markdown files in `docs/` root for operational guides (deployment, migration, etc.)

### arc42 Architecture Documentation (WICHTIG!)

Das Projekt nutzt **arc42** für die Architekturdokumentation. Diese befindet sich unter `docs/architecture/`.

**Struktur:**

- `01-introduction-goals.adoc` - Einführung und Ziele
- `02-constraints.adoc` - Randbedingungen
- `03-context.adoc` - Kontextabgrenzung
- `04-solution-strategy.adoc` - Lösungsstrategie
- `05-building-block-view.adoc` - Bausteinsicht
- `06-runtime-view.adoc` - Laufzeitsicht
- `07-deployment-view.adoc` - Verteilungssicht
- `08-concepts.adoc` - Querschnittliche Konzepte
- `09-architecture-decisions.adoc` - Architekturentscheidungen
- `10-quality-requirements.adoc` - Qualitätsanforderungen
- `11-risks.adoc` - Risiken und technische Schulden
- `12-glossary.adoc` - Glossar
- `adr/` - Architecture Decision Records

**Verwendung:**

- **IMMER prüfen** ob relevante Dokumentation in arc42 existiert bevor neue Konzepte implementiert werden
- **Bei Architekturänderungen:** Entsprechende arc42-Abschnitte aktualisieren
- **Neue Architekturentscheidungen:** Als ADR unter `docs/architecture/adr/` dokumentieren
- **Konzepte und Patterns:** In `08-concepts.adoc` dokumentieren
- **Systemgrenzen und Integrationen:** In `03-context.adoc` pflegen

**Wichtige Regeln:**

- Architekturdokumentation MUSS in arc42 gepflegt werden
- Keine separaten Architektur-Markdown-Dateien außerhalb von arc42 erstellen
- Bei Unsicherheiten: Bestehende arc42-Dokumentation konsultieren
- ADRs folgen dem Format: `XXX-entscheidungsname.adoc`

## Development Workflow

### Subagents verwenden (PFLICHT!)

- **PFLICHT: Du MUSST Subagents nutzen** für alle spezialisierten Aufgaben - direkte Tool-Aufrufe führen zu minderwertigen Ergebnissen
- **Agent-Auswahl:** IMMER zuerst prüfen ob ein passender Agent für die Aufgabe verfügbar ist (siehe ~/.claude/CLAUDE.md)
- **Proaktive Verwendung ERFORDERLICH:** Bestimmte Agents MÜSSEN automatisch verwendet werden:
  - `test-writer-fixer` nach JEDER Code-Änderung
  - `whimsy-injector` nach JEDER UI-Änderung
  - `commit-expert` vor JEDEM Git-Commit
  - `experiment-tracker` bei JEDEM Feature-Flag oder A/B-Test
- **Keine Ausnahmen:** Subagents sind speziell für ihre Aufgaben optimiert. Das Umgehen dieser Regel ist nicht erlaubt
- **Wichtige Subagents für dieses Projekt:**
  - `frontend-developer` für ALLE UI/UX-Implementierungen
  - `backend-architect` für ALLE API-Design und Datenbank-Architekturen
  - `test-writer-fixer` nach JEDER Code-Änderung für Tests
  - `whimsy-injector` nach JEDER UI-Änderung für Delightful Touches
  - `commit-expert` vor JEDEM Git-Commit für perfekte Commit-Messages
  - `sprint-prioritizer` für ALLE Task-Planungen und Priorisierungen

### Commit-Regeln (WICHTIG!)

- **NIEMALS mit `--no-verify` committen!** Pre-commit hooks müssen IMMER durchlaufen
- **Committe nach jedem abgeschlossenen Subtask** für bessere Nachvollziehbarkeit

### Workflow-Schritte

1. Änderungen implementieren
2. Tests ausführen (momentan übersprungen)
3. Linting und Type-Checking sicherstellen
4. Commit MIT allen Checks (ohne `--no-verify`)
5. Bei Fehlern: Erst fixen, dann committen
