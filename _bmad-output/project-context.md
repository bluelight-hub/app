---
project_name: 'Bluelight Hub'
user_name: 'Rubeen'
date: '2026-04-21'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
optimized_for_llm: true
sources:
  - CLAUDE.md
  - AGENTS.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad/custom/project-conventions.md
  - docs/architecture-principles.md
  - packages/backend/package.json
  - packages/frontend/package.json
---

# Project Context für AI Agents — Bluelight Hub

_Diese Datei enthält kritische Regeln und Patterns, die AI-Agenten beim Implementieren von Code in diesem Projekt einhalten müssen. Fokus auf nicht-offensichtliche Details, die Agenten sonst übersehen._

---

## Technology Stack & Versionen

### Runtime & Package Manager

- **Node** ≥ 24 · **pnpm** 10.32.1 · **TypeScript** 6.0.3 (strict)
- Monorepo: `packages/{backend,frontend,shared}` + `shared/client` (generiert, nie manuell)

### Backend (`@bluelight-hub/backend`)

- **NestJS** 11.1.19 (`@nestjs/core`, `common`, `cqrs`, `swagger`, `throttler`, `event-emitter`, `websockets`, `platform-socket.io`, `serve-static`, `passport`, `jwt`)
- **Prisma** 7.7.0 + `@prisma/adapter-pg` 7.7.0 · **PostgreSQL** via `pg` 8.20
- **Zod** 4.3.6 (Schemas, oft geteilt mit FE) · **class-validator** 0.15 / **class-transformer** 0.5
- **socket.io** 4.8.3 · **helmet** 8.1 · **bcrypt** 6.0 · **web-push** 3.6 · **pdfkit** 0.18 · **@paralleldrive/cuid2** 3.3 · **mgrs** 2.1
- Observability: **prom-client** 15, `@willsoto/nestjs-prometheus` 6 · Tests: **Jest** 30 + **@swc/jest** · Perf: **Artillery** 2.0

### Frontend (`@bluelight-hub/frontend`)

- **React** 19.2.5 · **Vite** 8.0.9 · **Tauri** 2.10 (notification, deep-link, plugin-store, http, shell, barcode-scanner)
- Routing: **@tanstack/react-router** 1.168 (File-based, Route-Gen via `router-plugin`) · Server-State: **@tanstack/react-query** 5.99 · Client-State: **@tanstack/react-store** 0.11 · Forms: **@tanstack/react-form** 1.29 + `zod-form-adapter` + Zod 4.3
- Tables/Virtualisierung: `@tanstack/react-table` 8.21 + `@tanstack/react-virtual` 3.13 · DnD: `@dnd-kit/core` 6.3
- UI: **Tailwind CSS** 4.2 + `@tailwindcss/vite` · **Headless UI** 2.2 · `cmdk` · `sonner` · `next-themes` · `react-icons` · `class-variance-authority` + `clsx` + `tailwind-merge`
- Karte: **MapLibre-GL** 5.23 + **react-map-gl** 8.1 + `@mapbox/mapbox-gl-draw` 1.5 + `@turf/turf` 7.3 — **NICHT Leaflet**
- Sonstige: `taktische-zeichen-core` 0.10 (patched!) + `taktische-zeichen-react` 0.10 · `date-fns` 4.1 · `dompurify` · `react-hotkeys-hook` · `jsqr` · `modern-screenshot` · `recharts` · `zxcvbn`
- Tests: **Vitest** 4.1 + `@testing-library/react` 16.3 + `jsdom` 29

### Shared

- `packages/shared/client` — **generiert** via `pnpm run generate-api` (OpenAPI-Generator). Niemals manuell editieren.

### Tooling (Repo-Root)

- **OXC**: `oxlint` 1.60 + `oxfmt` 0.45 (ersetzt ESLint/Prettier/Biome)
- **husky** 9.1 + **lint-staged** 16.4 (pre-commit: oxlint+oxfmt, `check:di:imports`)
- **semantic-release-gitmoji** 1.6 — Commits müssen Gitmoji-konform sein (`scripts/sync-gitmojis.mjs --check`)
- **madge** 8 — Circular-Dependency-Check (`check:deps`, `check:arch`)

### Versionshinweise / Constraints

- `taktische-zeichen-core@0.10.0` ist **gepatcht** (`patches/`) — `pnpm` Override greift automatisch.
- `glob` ist per pnpm-override auf `>=11.1.0` gepinnt.
- `onlyBuiltDependencies` restriktiv gesetzt — neue Native-Deps müssen dort ergänzt werden.

---

## Kritische Implementation Rules

### Language-Specific Rules (TypeScript)

#### Backend DI-Imports (AC1 — Pre-commit Hook blockiert Verstöße)

- `@Injectable()` Classes **immer** mit Value-Import:
  ```ts
  import { MyService } from './my.service'; // ✅
  import type { MyService } from './my.service'; // ❌ bricht NestJS DI
  ```
- Check lokal: `pnpm --filter @bluelight-hub/backend check:di:imports`
- Gilt analog für Prisma-Services, Repositories, Adapters, CommandHandlers, QueryHandlers, EventHandlers.

#### Domain-Layer: Framework-agnostisch + `Result<T>`-Pattern

- Domain (`packages/backend/src/domain/`) kennt **kein** NestJS, **keine** Prisma, **kein** HTTP.
- Fehlerbehandlung via `Result<T>` aus `domain/common/result.ts` — **keine** Exceptions aus Domain-Methoden.
- Aggregate Roots: `AggregateRoot<TId>`, `private constructor`, statische Factory Method (`static create()`).
- Value Objects: `ValueObject<TProps>`, immutabel, Validierung in Factory.
- Domain Events: Past Tense (`EinsatzErstellt`, nicht `CreateEinsatz`), via `addDomainEvent()` in Aggregate gesammelt.

#### Import-Reihenfolge & Module

- **ESM only** (Frontend `"type": "module"`; Backend via SWC/TS-ESM).
- Cross-Layer-Imports: `modules → infrastructure → application → domain` — niemals umgekehrt. `madge --circular` schlägt Alarm (`check:arch`).
- Innerhalb Domain: keine Imports aus `application/`, `infrastructure/`, `modules/`, `generated/`.

#### Async/Error-Handling

- `async/await` statt Promise-Ketten.
- In Controllern: Domain-Failures (`Result.fail`) in HTTP-Fehler mappen, **nicht** nach oben werfen.
- `throw` nur an System-Grenzen (HTTP-Guards, Middleware) — Business-Logik nutzt `Result`.

#### TypeScript Strict & Typ-Disziplin

- `strict: true` — keine `any` ohne explizite Begründung (Kommentar + `// oxlint-disable-next-line` wenn nötig).
- `Optional<T>` / `Nullable<T>` explizit; `undefined` für „nicht gesetzt", `null` nur wo Prisma/DTO es zwingt.
- Keine Type-Assertions (`as`) zur Umgehung von Typfehlern — Root-Cause fixen.

#### Umlaut-Disziplin (repo-weit)

- In Kommentaren, JSDoc, Testbeschreibungen, User-facing Strings: **echte Umlaute** (`ä`, `ö`, `ü`, `ß`).
- **Niemals** Digraphen (`ae`/`oe`/`ue`/`ss`) als Ersatz.
- Code-Identifier (Variablen, Klassen, Funktionen) bleiben ASCII.

#### CUIDs statt UUIDs

- ID-Generierung via `@paralleldrive/cuid2` (`createId()`) — konsistent mit bestehenden Entities.
- Validierung via Custom Decorator `@IsCuid()` aus `modules/common/decorators/`.

### Framework-Specific Rules

#### API-Workflow (ZWINGEND — keine Ausnahmen)

```
Backend Endpoint → pnpm run generate-api → TanStack Query Hook → Komponente
```

- **Niemals** manueller `fetch()` / `axios`-Call im Frontend für API-Integration.
- **Keine** parallelen API-Helper, die den generierten Client umgehen.
- `packages/shared/client/**` ist generiert → bei API-Änderung **immer** `pnpm run generate-api` laufen lassen, generierte Diffs mitcommitten.

#### NestJS Controller — Response-Decorators (AC7)

- Für Erfolgs-Responses **ausschließlich** Custom Decorators nutzen:
  ```ts
  @ApiWrappedResponse(EinsatzDto, { description: '...' })       // 200
  @ApiWrappedCreatedResponse(EinsatzDto, { description: '...' }) // 201
  ```
- **Verboten**: `@ApiOkResponse({ type: ... })`, `@ApiCreatedResponse({ type: ... })` — bricht OpenAPI-Generator.
- Pfad: `packages/backend/src/modules/common/decorators/api-wrapped-response.decorator.ts`.

#### Einsatz-Route-Nesting

- **Backend-Routen** (Plural): `/api/einsaetze/:einsatzId/<domain>/<resource>`
  - Beispiel: `/api/einsaetze/:einsatzId/sicherheit/eigenschutz/gefaehrdungsbeurteilungen`
- **Frontend-Routen** (Singular, bestehend): `/app/einsatz/$einsatzId/<domain>/<resource>`
- **Verboten**: Einsatz-bezogene Endpoints als Top-Level (`/api/gefaehrdungen`).
- TanStack Router: File-based unter `src/routes/app/einsatz/...`; `routeTree.gen.ts` ist **generiert** — nicht manuell editieren.

#### NestJS Module-Organisation & DI-Tokens

- Application-Layer: **nur** `@Injectable()` (keine Controller, keine Prisma-Imports).
- DI-Tokens zentral in `packages/backend/src/infrastructure/di-tokens.ts` — keine Magic-Strings in `@Inject()`.
- Ports (`domain/ports/`) sind Interfaces; Adapter (`infrastructure/**/adapters/`) implementieren sie.

#### CQRS — Commands, Queries, Events

- Commands mutieren State, Queries lesen, Events propagieren Änderungen.
- TransactionalCommandHandler erweitern (siehe `application/common/handlers/transactional-command.handler.ts`) — garantiert Prisma-Tx + Outbox-Schreib-Konsistenz.

#### Event-Registry (4-Punkt-Registrierung!)

Jedes neue Domain Event muss registriert werden in:

1. **Serializer** — `infrastructure/outbox/event-serializer.ts`
2. **Deserializer** — `infrastructure/outbox/event-deserializer.ts`
3. **Adapters-Modul** (Event-Handler-Registrierung)
4. **Adapters-Index** (Export)

Fehlt ein Punkt → Event wird stumm geschluckt, keine Laufzeit-Fehlermeldung. Immer alle 4 ergänzen.

#### Transport — WebSocket (ADR-006)

- Echtzeit-Push läuft über **einsatz-scoped WebSocket-Gateway** (`@nestjs/websockets` + `socket.io`).
- Keine neuen Transport-Kanäle (SSE, Polling) für Einsatz-Events.

#### React 19 + TanStack

- **Komponenten**: Function Components + Hooks; keine Class Components.
- **Server-State**: `useQuery` / `useMutation` aus `@tanstack/react-query` — QueryKeys zentral in `src/queryKeys.ts`.
- **Client-State**: `@tanstack/react-store` (kein Redux, kein Zustand).
- **Forms**: `@tanstack/react-form` + Zod-Resolver. Neuer Code: TanStack-Form (`react-hook-form` nur für bestehenden Legacy-Code).
- **Hotkeys**: `react-hotkeys-hook` für Keyboard-Shortcuts (MVP-First-Class).

#### Feature-Struktur (Frontend)

Jedes Feature unter `src/features/<domain>/` folgt:

```
api/         ← TanStack-Query-Hooks um generierte Client-Calls
constants/
contexts/
hooks/
schemas/     ← Zod-Schemas (oft geteilt mit Backend-DTOs)
stores/      ← TanStack-Store Slices
ui/          ← atoms / molecules / organisms / pages / layouts (Atomic Design)
utils/
index.ts
```

- `ui/pages/` + `ui/organisms/` konsumieren Hooks aus `api/`; Routes unter `src/routes/**` sind dünn und rendern Pages.

#### Karte (MapGL-Migration)

- **MapLibre-GL + react-map-gl + Mapbox-GL-Draw** für Lagekarte.
- **Leaflet / Leaflet.PM** sind **abgelöst** — nicht reintroduzieren.

#### Tauri + Platform Storage (ADR-010)

- Offline-Storage ausschließlich via `@tauri-apps/plugin-store` bzw. bestehenden Platform-Storage-Adapter.
- Kein modul-eigenes Sync, kein direktes `localStorage` für Einsatz-Domain-Daten.
- Push-Notifications via `@tauri-apps/plugin-notification` (Desktop) + `web-push` (Web) — einheitliche Abstraktion im Platform-Notification-Kanal.

#### Auth — globale UserRole + JWT

- `JwtAuthGuard` + `@UseGuards(...)` bleibt Standard-Guard für Endpoints.
- Globale Rollen: `SUPER_ADMIN` / `ADMIN` / `USER`.
- Einsatz-kontextuelle Rollen via `EinsatzRollenbesetzung` + Feature-spezifische Enums (z. B. `EigenschutzRolle`); feingranulare Permissions-Array-Pattern (`<domain>:<action>`) statt Hard-Coded Checks.

### Testing Rules

#### Backend (Jest 30)

- Aufruf **direkt** mit `npx jest` aus `packages/backend/` — `pnpm --filter ... test -- --...` hängt Argumente falsch zusammen (Pipe-separated).
  ```bash
  cd packages/backend && npx jest --testPathPatterns="gefaehrdungsbeurteilung" --no-coverage
  ```
- `--testPathPattern` (Singular) ist **deprecated** → `--testPathPatterns` (Plural) verwenden.
- Test-Arten:
  - `*.spec.ts` — Unit-Tests (`pnpm test:unit`)
  - `*.integration.spec.ts` / `*.e2e.spec.ts` / `*.smoke.spec.ts` — DB-Tests (`pnpm test:db`, laufen `--runInBand`)
  - `*.domain.spec.ts` — reine Domain-Tests (`pnpm test:domain`, ≥ 80 % Coverage Pflicht)
- API-Contract-Snapshots: `pnpm update-api-snapshot` nach Endpoint-Änderung.

#### Frontend (Vitest 4)

```bash
pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="pattern" --no-coverage
```

- Test-Umgebung: `jsdom` 29 + `@testing-library/react` 16 + `user-event` 14.
- Performance-Suite separat: `pnpm test:performance` (nur explizit benannte Specs).

#### Targeting

- Während Development: **präzise** `--testPathPatterns` / `--testPathPattern` auf betroffene Datei(en) — breite Patterns laufen unnötig.
- Vor Fertigmeldung (Definition of Done): volle relevante Suite laufen lassen + exakte Test-Zahl berichten (z. B. „114/114 bestehen").

#### Test-Struktur

- AAA-Pattern (Arrange / Act / Assert), deutsche `describe`/`it`-Texte erlaubt und konsistent mit bestehenden Tests.
- **Keine** Datenbank-Mocks in Integration-Tests — echte Prisma-Instanz via Testcontainer/Test-DB.
- Domain-Tests: **keine** Prisma- / NestJS-Imports — Domain bleibt framework-agnostisch.

#### Mocks & Fixtures

- NestJS-Unit-Tests nutzen `@nestjs/testing` (`Test.createTestingModule`).
- Repository-Ports in Application-Tests via In-Memory-Implementierung mocken — nicht Prisma direkt.
- Zeit/IDs in Tests deterministisch: `createId`-Wrapper stubbar halten, `date-fns` statt `new Date()` direkt.

#### Coverage-Erwartungen

- Domain ≥ 80 % (Lines/Branches, enforced via `jest --coverage`).
- Keine Fertigmeldung mit rot/instabilen Tests. Flaky-Tests dokumentieren (Issue), nicht stumm wieder-laufen lassen.

#### Tauri / Native

- Tauri-spezifischer Code wird via Platform-Adapter-Pattern testbar gemacht (Adapter mockbar im Renderer-Test).
- E2E gegen die Tauri-Shell nicht standardmäßig automatisiert — manuelle Smoke-Tests mit `pnpm --filter @bluelight-hub/frontend dev` (Tauri) vor Release.

### Code Quality & Style Rules

#### Linting/Formatting — OXC statt ESLint/Prettier

- **oxlint** + **oxfmt** sind die einzigen zulässigen Tools. ESLint, Prettier, Biome sind **verboten** (keine Configs einführen).
- Repo-Root: `pnpm lint` (fix) / `pnpm lint:check` (read-only).
- Pre-commit via `lint-staged`: automatisch `oxlint --fix` + `oxfmt --write` auf geänderte Dateien.
- Domain-Layer separat gelintet: `pnpm --filter @bluelight-hub/backend lint:domain`.

#### Architektur-Checks

- `pnpm --filter @bluelight-hub/backend check:arch` — Circular-Dep-Check + Layer-Linting.
- `pnpm --filter @bluelight-hub/backend check:deps` — reine Domain-Zyklen.
- `pnpm --filter @bluelight-hub/backend check:di:imports` — blockiert `import type` bei Injectables.
- Diese Checks laufen im Pre-commit/CI; lokal vor PR-Push laufen lassen.

#### Naming & File-Struktur

- **Code-Identifier**: ASCII, camelCase (Funktionen/Variablen), PascalCase (Klassen/Types/Components), SCREAMING_SNAKE_CASE (Konstanten).
- **Dateinamen**:
  - Backend: `kebab-case` mit Feature-Suffix (`einsatz.service.ts`, `einsatz.controller.ts`, `einsatz.entity.ts`, `einsatz-erstellt.event.ts`).
  - Frontend: `kebab-case` für Utils/Hooks (`use-einsatz.ts`), `PascalCase.tsx` für Komponenten.
- **Tests**: `<name>.spec.ts` (Unit), `<name>.integration.spec.ts`, `<name>.e2e.spec.ts`.
- **Routen (FE)**: File-based, Einsatz-Route-Nesting unter `src/routes/app/einsatz/`.

#### Kommentare & Dokumentation

- **Default: keine Kommentare.** Nur wenn das _Warum_ nicht-offensichtlich ist (versteckte Constraint, Workaround, subtile Invariante).
- Kein „Was"-Kommentar — Code + sprechende Identifier erklären das.
- Keine Bezüge auf Tickets/Autoren/Flow im Code (`// für Story 415`, `// von X für Y`) — gehört ins PR-/Commit-Log.
- **JSDoc** erlaubt auf Deutsch; Public-API Backend-Pflicht (`check:jsdoc:public` als Audit).
- **UI-Texte** nie Implementierungsdetails/Architektur erklären — sowas gehört in `docs/`, nicht ins Produkt.

#### Strings & Umlaute

- Repo-weit echte Umlaute (`ä ö ü ß`), **nicht** `ae oe ue ss`.
- User-facing Strings auf Deutsch; Log-Messages können Englisch bleiben (Konsistenz mit bestehendem Code).

#### Prisma-Migrations

- Immer mit `--name <snake_case_name>`:
  ```bash
  pnpm --filter @bluelight-hub/backend prisma:migrate --name add_eigenschutz_tables
  ```
- Ohne `--name` wird der CLI-Modus interaktiv und blockiert CI/Agent-Sessions.
- Migration-Dateien werden versioniert (kein `migrate reset` auf feature-Branches ohne Absprache).

#### DTOs & Validation

- Request-DTOs: `class-validator`-Decorators + `@ApiProperty` für Swagger.
- Response-DTOs: separat, nicht Domain-Entities durchreichen (Hexagonal-Boundary).
- Zod-Schemas (geteilt FE/BE) als Single Source of Truth für komplexe Felder; DTOs mappen auf Zod-Typen.

#### Performance & Bundle

- Frontend-Bundle-Budget: ≤ 150 kB gzip (NFR). Neue Dependencies gegen bundle-size prüfen.
- Virtualisierung für Listen ≥ 50 Items: `@tanstack/react-virtual`.
- Debounce/Throttle via `use-debounce` + `@tanstack/pacer` — kein eigenes `setTimeout`-Gefrickel.

#### Keine Over-Engineering

- Erst reale Anforderung, dann Abstraktion. Keine Fallbacks/Validierung für unmögliche Fälle.
- Fehlerhandling/Validation nur an System-Grenzen (HTTP, externe APIs). Internes Code vertraut Typsystem.
- Feature-Flags/BC-Shims vermeiden, wenn einfacher Rewrite geht.

### Development Workflow Rules

#### Branch & GitHub-Issue-Konvention

- Feature-Branches: `<gh-issue-nr>-<kebab-beschreibung>` (z. B. `415-eigenschutz-einsatzkraefte-sicherheit-psa`).
- Hauptbranches: `alpha` (Default-Main), `main`, `develop` — **keine Stories direkt** darauf erstellen.
- Detached HEAD oder Branches ohne Issue-Präfix → BMad-Story-Erstellung blockiert.

#### Story-Key-Konvention (BMad)

Verbindlich gemäß `_bmad/custom/project-conventions.md`:

- **Format**: `{gh-issue-nr}-{epic}-{story}-{kebab-title}` (z. B. `415-1-2-plattform-push-clients-service-worker-tauri-bridge`).
- Präfix = führende Zahl aus Branch-Name (Regex `^(\d+)-`).
- **Epic-Keys bleiben ohne Präfix**: `epic-1`, `epic-2`, …, `epic-1-retrospective`.
- Begründung: globale Eindeutigkeit, da PRDs pro Branch in `_bmad-output/planning-artifacts/` leben.
- Fehler-Fall (kein Issue-Präfix / Hauptbranch / Detached HEAD) → **HALT** mit Meldung an User.

#### Commit-Format (Gitmoji + Kontext)

```
<emoji>(<context>): <title>
```

- Emoji-Set: ✨ Feature · 🐛 Fix · ♻️ Refactor · 📝 Docs · 🧪 Test · 💥 Breaking · 🙈 gitignore · 🎨 Style · ⚡ Performance · 🔧 Config · 🚀 Deploy/Release · 🧹 Chore
- Check automatisiert: `scripts/sync-gitmojis.mjs --check` + `scripts/check-commit-range.mjs`.
- **Niemals** `--no-verify`. Bei Hook-Fehlschlag: Root-Cause fixen und **neuen** Commit erzeugen (kein `--amend` auf fehlgeschlagene Hooks).
- Co-Authored-By-Trailer bei Agent-Commits nach bestehendem Muster.

#### PR-/Commit-Hygiene

- Nur relevante Dateien committen (kein `git add -A`). Generierte Artefakte nicht manuell editieren.
- PR-Titel < 70 Zeichen; Details im Body (Summary + Test plan Checklist).
- Keine generierten BMad-Artefakte (`_bmad-output/`) committen — nur ADRs (`docs/adr/`) und Konventions-Dokumente (`_bmad/custom/`).
- Push-Policy (GitButler): Feature-Branch als Target, nicht `gitbutler/workspace`.

#### Package-Management

- **pnpm** (10.32.1) statt npm/yarn. `pnpx` statt `npx` wo möglich (Workspace-Resolution).
- Workspace-Dependencies via `workspace:*` (z. B. `@bluelight-hub/shared`).
- Neue Native-Dependencies müssen in `pnpm.onlyBuiltDependencies` im Root-`package.json` ergänzt werden.

#### Lokale Ports (Default, Hauptrepo)

- Frontend (HTTPS only): `https://localhost:3090` (`VITE_PORT`)
- Backend + Swagger (HTTPS only): `https://127.0.0.1:3091/api` (`BACKEND_PORT` / `PORT`)
- PostgreSQL: `3092` (`DATABASE_PORT`)
- Prisma Studio: `3093`
- Worktrees bekommen automatisch freie Ports via `scripts/worktree-setup.sh`.
- Kein lokales `psql` — DB-Zugriff via `docker compose exec postgres psql -U bluelight -d bluelight-hub -c "..."`.

#### Definition of Done

1. Implementierung komplett (keine TODOs, keine halben Pfade).
2. `pnpm lint:check` grün.
3. Backend: `pnpm --filter @bluelight-hub/backend check:arch` + `check:di:imports` grün.
4. Relevante Test-Suite vollständig grün; Test-Zahl im PR/Commit berichtet (z. B. „114/114").
5. Bei Architektur-/API-Änderung: `docs/architecture/` (arc42) oder neue ADR in `docs/adr/` aktualisiert.
6. Bei API-Änderung: `pnpm run generate-api` gelaufen, generierte Dateien mitcommittet.

### Critical Don't-Miss Rules

#### Zielgruppen-Scope

- **Weiße Hilfsorganisationen**: DRK, JUH, MHD, ASB, DLRG (RD/SEG/KatS-Kontext).
- **Nicht** für Feuerwehr/THW — fachliche Annahmen (Rollen, Zeichen-Modell, ETB-Terminologie, Kräfte-Modell) orientieren sich am Sanitäts-/KatS-Kontext.
- FW-/THW-Taktische-Zeichen werden aus Interop-Gründen im Katalog unterstützt, prägen aber **nicht** UX/Rollen-Defaults.
- Feature-Wording/Defaults/Beispiele vor Merge gegen diese Zielgruppe prüfen.

#### Audit & Versionierung by design

- Sicherheitsrelevante Entitäten sind **append-only** (Versionen statt Überschreiben).
- Events via **Transactional Outbox** — at-least-once + Dedup via Event-ID.
- Zeitpunktgenauer Kontext-Snapshot bei kritischen Ereignissen (z. B. Vorfall): unveränderlicher Stand zum Ereigniszeitpunkt, nicht live-Join.

#### Offline-First

- Alle Lese-/Schreib-Operationen offline-fähig via Platform Storage Adapter (ADR-010).
- Konflikt-Auflösung explizit (ConflictResolutionList UX) — keine stummen Last-Write-Wins.
- Kein modul-eigener Sync-Layer — immer die bestehende Plattform-Abstraktion.

#### Security

- Server-seitige Role-/Permission-Checks **pro Endpoint** (nie nur Frontend).
- Append-only Audit-Trail; Exporte folgen Leserechten.
- Helm et / Cookie-Parser / Throttler bleiben aktiviert — keine Middleware-Removals ohne ADR.
- Secrets niemals in Code/Tests/Commits; `.env.example` zeigt die Namen, `.env` ist gitignored.

#### Accessibility (WCAG 2.1 AA + BITV 2.0)

- Icon + Text immer kombiniert (kein Icon-only für kritische Aktionen).
- ARIA-Live-Budget: max 3 `assertive` Banner gleichzeitig; Rest `polite`.
- Touch-Targets: ≥ 48 px (Primary) / ≥ 44 px (Secondary).
- Dark-Mode-Nachteinsatz-tauglich — Kontraste AA in beiden Modi.

#### API-Versionierung & OpenAPI

- Kein manueller Edit in `packages/shared/client/` — jedes Diff dort stammt aus `pnpm run generate-api`.
- Response-Wrapper-Shape ist einheitlich (siehe `@ApiWrappedResponse`) — neue Endpoints dürfen das nicht umgehen.

#### BMad-Artefakte & ADRs

- `_bmad-output/` ist **gitignored** (Scratchpad für PRD, Architecture, Epics, UX).
- **Nur ADRs** unter `docs/adr/` werden versioniert (+ BMad-Overrides unter `_bmad/custom/`).
- Bei Architektur-/Verhaltensänderung: neue ADR **pflichtig**.

#### MapGL-Migration

- Alte Leaflet/Leaflet.PM-Aufrufe nicht wiederbeleben. Wenn altes Code-Gerüst auftaucht: auf MapGL migrieren, nicht ergänzen.

#### Anti-Patterns (nie tun)

- ❌ `import type { MyService }` bei `@Injectable()`-Klassen
- ❌ `@ApiOkResponse({ type })` in Controllern
- ❌ Manueller `fetch()` im Frontend für API-Calls
- ❌ Leaflet/Leaflet.PM reaktivieren
- ❌ `--no-verify` beim Commit
- ❌ `ae/oe/ue/ss` statt Umlaute in Texten
- ❌ Prisma Migrations ohne `--name`
- ❌ `any` ohne Begründung
- ❌ Domain-Layer importiert NestJS/Prisma
- ❌ Event-Registry nur teilweise aktualisiert (alle 4 Stellen nötig!)
- ❌ Einsatz-Endpoints als Top-Level-Route
- ❌ Feuerwehr-Wording in UI/Defaults
- ❌ BMad-Planning-Artefakte committen (außer ADRs + `_bmad/custom/`)

---

## Usage Guidelines

### Für AI-Agenten

- Diese Datei **vor** jeder Implementierung lesen.
- Alle Regeln exakt befolgen — im Zweifel die restriktivere Variante.
- Bei neuen wiederkehrenden Mustern: diese Datei via `/bmad-generate-project-context` aktualisieren.
- Bei Konflikt zwischen dieser Datei und `CLAUDE.md`/`AGENTS.md`: die direkteste Quelle gewinnt (meist `CLAUDE.md` für tägliche Arbeit); kritische Stack-/Architektur-Regeln hier sind verbindlich.

### Für Menschen

- Datei schlank und agent-fokussiert halten — offensichtliche Regeln entfernen.
- Bei Stack-/Pattern-Änderungen aktualisieren (neue Events, neue ADRs, neue Feature-Struktur).
- Quartalsweise Review auf Veraltetes.
- Versionskontrolle: Diese Datei lebt in `_bmad-output/` (gitignored per Konvention) — bei Bedarf manuell in Agent-Setup kopieren oder via Workflow-Hook laden.

### Pflege-Checkliste

- [ ] Neue Package-Versionen in Stack-Sektion aktualisiert
- [ ] Neue Domain Events → 4-Punkt-Registrierung dokumentiert (bleibt stabil)
- [ ] Neue Routen-Konvention → FE/BE-Abschnitt geprüft
- [ ] Neue ADR → relevante Regel ergänzt
- [ ] Veraltete Verbote entfernt (z. B. wenn alte Migration final abgeschlossen)

---

**Letzte Aktualisierung:** 2026-04-21 · **Status:** complete · **Optimiert für LLM-Konsum:** ja
