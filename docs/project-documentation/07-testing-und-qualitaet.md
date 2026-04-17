# 7 — Testing & Qualität

> Jest (Backend) + Vitest (Frontend) + Artillery (Performance) · OXC-Linting · Madge Circular-Deps · CodeQL

---

## 7.1 Test-Strategie im Überblick

| Ebene                  | Werkzeug                                             | Umfang                                              |
| ---------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| Backend Unit           | Jest 30 (Beta)                                       | Domain, Application, Infrastructure, Modules        |
| Backend Integration    | Jest + PostgreSQL                                    | Repository-Adapter, Event-Flows                     |
| Backend E2E            | Jest + Nest-Testing-Module + DB                      | HTTP-Flows (Controller → DB)                        |
| Backend Smoke          | Jest mit minimalem App-Bootstrap                     | Kritische Pfade für Deployments                     |
| Backend API-Contract   | Snapshot-basiert (OpenAPI)                           | Bricht bei Schema-Drift                             |
| Backend Performance    | Artillery                                            | NFR-4: `p95 < 200 ms`, Fehlerrate `< 5 %`           |
| Frontend Unit          | Vitest 4 + RTL + jsdom                               | Hooks, Utils, Stores, Komponenten                   |
| Frontend Integration   | Vitest + RTL                                         | Feature-Workflows (z. B. Lagekarte-Drawing)         |
| Frontend Performance   | Vitest Performance-Suites                            | Befehl, Einsatz, ETB Listen-Rendering               |

---

## 7.2 Backend-Tests (Jest)

### 7.2.1 Konfiguration (`packages/backend/jest.config.js`)

- **`maxWorkers: 1`** — DB-Connection-Pool nicht überlasten.
- **Coverage-Threshold:** 79 % (branches, functions, lines, statements) auf dem **Domain-Layer**.
- **Pattern:**
  - `**/*.spec.ts` — Unit
  - `**/*.integration.spec.ts` — Integration
  - `**/*.e2e.spec.ts` — End-to-End
  - `**/*.smoke.spec.ts` — Smoke
  - `*.example.ts` und `/node_modules/` werden ignoriert.
- **`--testPathPatterns`** ist aktuell der korrekte Flag (nicht `--testPathPattern`, Plural!).

### 7.2.2 Test-Scripts

| Script                    | Pattern                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `test`                    | alle Tests                                                                                  |
| `test:unit`               | ohne `.integration.spec`, `.e2e.spec`, `.smoke.spec` — mit Coverage                         |
| `test:db`                 | nur Integration + E2E + Smoke                                                               |
| `test:db:cov`             | wie `test:db` mit Coverage                                                                  |
| `test:domain`             | `--testPathPatterns=domain`                                                                 |
| `test:integration`        | `--testPathPatterns='\\.integration\\.spec\\.ts$'`                                          |
| `update-api-snapshot`     | OpenAPI-Contract-Snapshots aktualisieren                                                    |

### 7.2.3 Anzahl Tests

- Gesamt **521 Test-Dateien** im Backend (Unit + Integration + E2E + Smoke).
- **Test-Utils** unter `packages/backend/src/test-utils/` (Fixtures, Mocks, DB-Setup).
- **Compodoc** generiert Coverage-Reports für die Domain-Dokumentation (`pnpm docs:cov --coverageTest 85`).

### 7.2.4 Typische Test-Strategien

- **Domain:** reine Invariant- und State-Machine-Tests (AAA-Struktur, Given-When-Then-Kommentare). Keine I/O, keine Mocks.
- **Application:** Command-/Query-Handler mit `TransactionalCommandHandler`-Test-Doubles — prüft Events + Rollback-Semantik.
- **Infrastructure:** Prisma-Repositorys gegen echte PostgreSQL-Test-DB (siehe Memory-Notiz aus Epic-8-Retro: „Keine Mocks bei Repository-Tests — wir wurden durch Mock/Prod-Divergenz gebissen“).
- **Modules (Controller):** Nest-Testing-Module, AuthGuard gemockt, Swagger-Output gegen Snapshot.

---

## 7.3 Frontend-Tests (Vitest)

### 7.3.1 Konfiguration

- Konfiguration via `vite.config.ts` (+ `vitest.config.ts` bei Bedarf).
- **Umgebung:** jsdom.
- **Matchers:** `@testing-library/jest-dom`.
- **Coverage:** `@vitest/coverage-v8` → LCOV → **Codecov**-Upload in CI.
- **UI-Mode:** `pnpm --filter @bluelight-hub/frontend test:ui`.

### 7.3.2 Test-Umfang

- **≈ 354 Test-Dateien** (`*.spec.ts(x)`, `*.test.ts(x)`).
- **≈ 1.474 Test-Cases** (`describe`, `test`, `it`).
- Zahlreiche **Lagekarte-Drawing-Modi-Tests** (11+ Specs für Custom Modes).
- **ETB Offline-Persistence** stark getestet.
- **Performance-Tests** in `test:performance`:
  - `BefehlsListeMitEingabe.performance.spec.tsx`
  - `SingleEinsatzDashboard.performance.spec.tsx`
  - `EtbEntryList.performance.spec.tsx`

### 7.3.3 Empfehlung beim Ausführen einzelner Tests

Aus Memory (`memory/MEMORY.md`):

```bash
# Frontend: Pattern via Doppel-Dash
pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="einsatz" --no-coverage

# Backend: direkt über npx aus dem Package (vermeidet --- Pipe-Problem)
cd packages/backend
npx jest --testPathPatterns="einsatz.*spec" --no-coverage
```

---

## 7.4 Performance-Tests (Artillery)

Lokation: `packages/backend/artillery/`

| Datei                            | Inhalt                                        |
| -------------------------------- | --------------------------------------------- |
| `artillery-performance.yml`      | Haupt-Szenario (Warmup 60s @ 5 RPS, Sustained 120s @ 20 RPS) |
| `artillery-quick.yml`            | Schnell-Check                                 |
| `seed-performance-data.ts`       | Testdaten-Seed                                |
| `helpers/*`                      | Payload-Generator, Auth-Header, dynamische ID-Erfassung |

### 7.4.1 Gewichtete Szenarien

| Gewicht | Szenario                         |
| ------: | -------------------------------- |
|    20 % | Create Einsatz                   |
|    30 % | Get All Einsätze (häufigste Op)  |
|    20 % | Dashboard Query                  |
|    15 % | Get Einsatz Details              |
|    10 % | Add ETB-Eintrag                  |
|     5 % | Complete Einsatz                 |

### 7.4.2 NFR-4 Schwellen

- **p95 Latency:** `< 200 ms`
- **Max-Fehlerrate:** `5 %`

### 7.4.3 Commands

```bash
pnpm --filter @bluelight-hub/backend test:perf:quick         # kurzer Smoke-Load
pnpm --filter @bluelight-hub/backend test:perf               # voll (lokal)
pnpm --filter @bluelight-hub/backend test:perf:ci            # CI-Mode (quiet)
pnpm --filter @bluelight-hub/backend seed:perf               # Seed für Tests
pnpm --filter @bluelight-hub/backend perf:report             # HTML-Report
```

Ergebnisse landen in `artillery/results/` und werden optional als Artefakt hochgeladen.

---

## 7.5 Linting & Formatierung (OXC)

| Tool       | Zweck                                           | Commands                                      |
| ---------- | ----------------------------------------------- | --------------------------------------------- |
| `oxlint`   | Schneller ESLint-Ersatz (Rust)                  | `pnpm lint` / `pnpm lint:check`               |
| `oxfmt`    | Formatter (Prettier-Ersatz)                     | im Lint-Prozess integriert                    |
| `madge`    | Circular-Dependency-Checker                      | `pnpm check:deps`, `lint:deps`, `lint:deps:core` |
| `tsc`      | TypeScript-Check (`--noEmit` im Pre-Commit)     | `packages/*/tsconfig.json`                    |
| CodeQL     | Security-Analyse                                 | Weekly + PR-Trigger (GitHub)                  |
| Codecov    | Coverage-Upload (LCOV) für Backend + Frontend   | CI-Workflow `ci.yml`                          |

**Architektur-Check (Backend):**

```bash
pnpm --filter @bluelight-hub/backend check:arch
# entspricht:  lint:deps:core (madge domain+application)  &&  lint:arch (oxlint + oxfmt check)
```

**DI-Import-Regel (AC1):**

```bash
pnpm --filter @bluelight-hub/backend check:di:imports
# Skript: packages/backend/scripts/check-di-imports-zero-deps.ts
```

Verstöße (z. B. `import type { MyService }`) brechen den Pre-Commit-Hook.

**JSDoc-Check (Backend):**

```bash
pnpm --filter @bluelight-hub/backend check:jsdoc          # fehlende JSDoc listen
pnpm --filter @bluelight-hub/backend check:jsdoc:public   # nur public
pnpm --filter @bluelight-hub/backend check:jsdoc:json     # JSON-Report
```

---

## 7.6 Pre-Commit Hooks (`.husky/pre-commit`)

1. TypeScript-Typ-Check (`tsconfig.build.json`, `--noEmit`, Tests ausgenommen).
2. DI-Import-Prüfung (`check:di:imports`).
3. Circular-Deps (`lint:deps:core`, nur Domain + Application).
4. `lint-staged`: `oxlint --fix` + `oxfmt --write` für gematchte Dateien (TS / JSON / YAML / MD).

**`commit-msg`-Hook:** Gitmoji-Validator (ADR-003) gegen `scripts/gitmojis.snapshot.json`.

**`--no-verify` ist untersagt** (explizit in `CLAUDE.md`).

---

## 7.7 Code-Quality-Gates im CI (`ci.yml`)

| Job                    | Inhalt                                                                   |
| ---------------------- | ------------------------------------------------------------------------ |
| `repo-hygiene`         | `check:repo-hygiene` (`.bak`, `.orig`, `.rej` suchen)                    |
| `commit-message-validation` | Gitmoji-Validator für PR-Commits                                    |
| `linux-quality`        | Build (`pnpm build`) + Lint-Check (`pnpm lint:check`)                    |
| `linux-backend-unit`   | Unit-Tests ohne DB (`test:unit`) + Coverage-Upload                        |
| `linux-backend-db`     | 3 Shards parallel (Integration + E2E + Smoke)                            |
| `linux-frontend`       | Vitest + Performance-Gates                                               |
| `docker-build`         | Multi-Stage-Dockerfile-Smoketest                                          |
| `Summary`              | Meta-Job als Branch-Protection-Gate                                      |

**Code-Metriken-Workflows:**

- `codeql.yml` — Security-Analyse (weekly + push/PR auf main/alpha/beta/develop)
- `gitmoji-sync.yml` — Snapshot-Aktualisierung (wöchentlich)

---

## 7.8 Review-Gates (Frontend Ring-2)

Aus `docs/frontend/ring-2-review-gates.md`:

- **Unit Tests** für Logik-schwere Hooks und Stores.
- **A11y:** Lighthouse-Rechecks, Semantische Strukturen (ARIA-Rollen), Focus-Management.
- **TypeScript-Strictness:** keine `any`, keine unsicheren Casts ohne ADR.
- **Design-Tokens:** Tailwind-Farben/Spacing nur über `ring-1-design-tokens.md`-Kontrakt.
- **Performance-Gates** (Ring-2-Gates): Bundle-Size, LCP, INP, CLS.

---

## 7.9 Testing-Prinzipien

- **AAA (Arrange-Act-Assert)** oder Given-When-Then — dokumentiert in Test-Namen.
- **Isolation:** Domain-Tests ohne I/O; Infrastructure-Tests gegen echte DB (keine Mocks bei Repositorys, Memory-Lesson aus Epic-8).
- **Testpyramide:** Viele Unit-, wenige E2E-Tests.
- **Präzise Test-Patterns statt breite Matcher** (Memory-Notiz, CLAUDE.md Testing-Regel).
- **Definition of Done:** Kompletten relevanten Test-Suite vor Story-Completion ausführen und Erfolg als Zahl reporten (z. B. „114/114 tests passing“).

---

## 7.10 Dokumentations-Lücken (laut Recherche)

- **Systematische Error-Handling-Patterns** für Frontend-Features.
- **Event-Serialisierung**: Epic-8-Retro nennt 4 Bugs rund um 4 Registrierungsstellen — systematische Fix-Strategie (z. B. Event-Registry) wäre dokumentationswürdig.
- **WebSocket-Event-Katalog** (aktuell nur im Serializer dokumentiert).
- **Monitoring-/Alerting-Setup** für Production (Metrics-Exporter existiert, aber Dashboards/Runbooks nicht dokumentiert).

---

## 7.11 Referenzen

- **Jest-Config:** `packages/backend/jest.config.js`
- **Vitest-Config:** `packages/frontend/vite.config.ts`
- **Artillery:** `packages/backend/artillery/`
- **Test-Utils Backend:** `packages/backend/src/test-utils/`
- **OXC:** [oxc-project.github.io](https://oxc-project.github.io) (Memory-Override: nicht manuell verlinken — Kontext-Referenz)
- **Ring-2-Gates Frontend:** `docs/frontend/ring-2-performance-gates.md`, `ring-2-review-gates.md`
- **Epic-8 Retro:** `docs/epic-8-retro-2026-02-06.md`
