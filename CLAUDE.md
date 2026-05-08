# CLAUDE.md - Bluelight Hub

**Sprache:** Deutsch mit mir, englischer Code, deutsche JSDoc/Kommentare

> **Umlaute:** In Kommentaren, JSDoc, Testbeschreibungen und User-facing Strings IMMER korrekte Umlaute (ä, ö, ü, ß) verwenden — NIEMALS Digraphen (ae, oe, ue, ss). Code-Identifier (Variablen, Klassen, Funktionen) bleiben ASCII.

## Projekt-Überblick

Bluelight Hub ist eine **Web + Tauri Desktop App** für **weiße Hilfsorganisationen** im Sanitätsdienst und Katastrophenschutz (DRK, JUH, MHD, ASB, DLRG). **Explizit nicht für Feuerwehr** — fachliche Annahmen, Terminologie, Rollen- und Zeichen-Modelle orientieren sich am Sanitäts-/KatS-Kontext der weißen HiOrgs. (FW-/THW-Zeichen werden im Taktische-Zeichen-Katalog aus Interop-Gründen unterstützt, bestimmen aber nicht die Zielgruppe.)

| Package          | Stack                        | Beschreibung                                                             |
| ---------------- | ---------------------------- | ------------------------------------------------------------------------ |
| `frontend/`      | React 19 + Vite + Tauri      | Desktop App mit Feature-based Architektur                                |
| `backend/`       | NestJS + Prisma + PostgreSQL | Hexagonale Architektur (Domain → Application → Infrastructure → Modules) |
| `shared/client/` | Generiert                    | API Client - **NIEMALS manuell ändern!**                                 |

## MCP Server (NUTZE SIE!)

- **Context7** - Aktuelle Library-Dokumentation abrufen
- **Claude-in-Chrome** - Frontend testen (Login: rubeen / MyPass123\*)

## Kritische Regeln

### Boyscout Rule

- Hier gilt die Boyscout Rule: Wenn du im Zuge einer Aufgabe klar abgegrenzten, naheliegenden Müll findest, räume ihn mit
  auf, auch wenn du ihn nicht verursacht hast.
- Das Aufräumen bleibt scoped: keine großen Nebenrefactorings, keine unrequested Architektur-Umbauten und keine Änderungen
  an generierten Dateien außerhalb des vorgesehenen Generierungs-Workflows.
- Wenn das Aufräumen riskant, umfangreich oder fachlich mehrdeutig ist, dokumentiere es als Follow-up statt es heimlich
  mitzuziehen.

### API Workflow (IMMER so!)

```
Backend-Endpoint → pnpm run generate-api → TanStack Query Hook → Komponente
```

**NIEMALS** manuelle `fetch()` Calls oder API-Helper!

### Tech Stack (NUR diese!)

| Bereich | Erlaubt                                                        | Verboten                     |
| ------- | -------------------------------------------------------------- | ---------------------------- |
| UI      | Tailwind CSS + Headless UI                                     | CSS-in-JS, andere Frameworks |
| Forms   | @tanstack/react-form + Zod                                     | HTML Forms, Formik           |
| State   | @tanstack/react-query (Server), @tanstack/react-store (Client) | Redux                        |
| Linting | OXC (oxlint + oxfmt)                                           | Biome, ESLint, Prettier      |

### Backend DI Import (AC1)

```typescript
// ✅ Injectable Classes mit "import"
import { MyService } from './my.service';

// ❌ NIEMALS "import type" für Injectable Classes (bricht NestJS DI!)
import type { MyService } from './my.service';
```

Pre-commit Hook prüft automatisch. Check: `pnpm --filter @bluelight-hub/backend check:di:imports`

### Controller Response Decorators (AC7)

```typescript
// ✅ IMMER Custom Decorators für korrekte OpenAPI-Generierung
@ApiWrappedResponse(EinsatzDto, { description: '...' })
@ApiWrappedCreatedResponse(EinsatzDto, { description: '...' })

// ❌ NIEMALS Standard Swagger Decorators
@ApiOkResponse({ type: EinsatzDto })  // Bricht API-Client Generation!
```

## Wichtige Commands

```bash
# Development
pnpm -r dev                          # Alles starten
pnpm --filter @bluelight-hub/frontend dev:vite  # Nur Web (ohne Tauri)
pnpm run generate-api                # API Client generieren

# Database (IMMER mit Name, sonst interaktiv!)
pnpm --filter @bluelight-hub/backend prisma:migrate --name add_feature_xyz

# Tests
pnpm --filter @bluelight-hub/backend test

# Code Quality
pnpm lint                            # oxlint + oxfmt
pnpm --filter @bluelight-hub/backend check:arch  # Circular Dependencies
```

## Ports

Default-Ports (Hauptrepo, ohne Worktree):

- Frontend: `https://localhost:3090` (Self-Signed, **HTTPS only** — `http://` liefert `ERR_EMPTY_RESPONSE`, konfigurierbar via `VITE_PORT`)
- Backend API + Swagger UI: `https://127.0.0.1:3091/api` (Self-Signed, HTTPS only, konfigurierbar via `BACKEND_PORT` / `PORT`)
- PostgreSQL: Port `3092` (konfigurierbar via `DATABASE_PORT`)
- Kein `psql` lokal installiert — DB-Zugriff via `docker compose exec postgres psql -U bluelight -d bluelight-hub -c "..."`

In Worktrees werden Ports automatisch via `scripts/worktree-setup.sh` zugewiesen. Setup: `bash scripts/worktree-setup.sh`

## Commit Format

```
<emoji>(<context>): <title>

✨ Feature | 🐛 Fix | ♻️ Refactor | 📝 Docs | 🧪 Test | 💥 Breaking
```

**NIEMALS** `--no-verify`!

## Architektur-Layers (Backend)

```
modules/        → HTTP Controller (NestJS-spezifisch)
    ↓
infrastructure/ → DB, Events, Adapters
    ↓
application/    → Use Cases, Commands, Queries (nur @Injectable erlaubt)
    ↓
domain/         → Business Rules (Framework-agnostic, Result Pattern)
```

Abhängigkeiten fließen **IMMER nach innen**.

## Pattern-Referenz

Diese Patterns im Code nachschauen (nicht auswendig lernen):

- **Feature-Struktur:** `frontend/src/features/einsatz/`
- **TransactionalCommandHandler:** `backend/src/application/common/handlers/`
- **Result Pattern:** `backend/src/domain/common/result.ts`
- **API Wrapper Decorator:** `backend/src/modules/common/decorators/api-wrapped-response.decorator.ts`
- **DI Tokens:** `backend/src/infrastructure/di-tokens.ts`
- **Event Registry:** `backend/src/infrastructure/outbox/event-deserializer.ts` - Neue Events MÜSSEN hier registriert
  werden!

## Implementation Rules

When implementing features, always work directly in the real application codebase. Never create standalone HTML prototypes or mockups unless explicitly requested.

## Agent Team / Task Orchestration

When using parallel sub-agents (Task tool), ensure all agents use consistent API contracts: matching endpoint URLs, response field names, and TypeScript types. Before spawning agents, define a shared interface contract in the task instructions.

## General Behavior

Before adding workarounds, dependency shims, or custom implementations, first question whether they are truly necessary. Present the analysis and ask for confirmation before implementing.

## Testing

When running tests, use precise testPathPattern targeting only the specific test files for the feature being worked on. Avoid broad patterns that match unrelated test files.

## Definition of Done

After completing implementation tasks, always run the full relevant test suite and fix any failures before marking a story/task as complete. Report the exact test count (e.g., '114/114 tests passing').

## Dokumentation

Bei Architektur-Änderungen: `/docs/architecture/` (arc42) und `/docs/adr/` aktualisieren!
