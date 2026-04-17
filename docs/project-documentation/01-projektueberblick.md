# 1 — Projektüberblick

> **Generiert:** 2026-04-17 · **Scan-Level:** Exhaustive · **Workflow:** v1.2.0 (Agent-basiert)

---

## 1.1 Fachlicher Kontext

**Bluelight Hub** ist eine Einsatzverwaltungs-Plattform für **Blaulicht-Organisationen** (Katastrophenschutz, DRK, Feuerwehr, Rettungsdienst, THW). Die Software begleitet einen Einsatz von der Alarmierung über die Führung bis zur rechtssicheren Archivierung.

### Kern-Fähigkeiten

| Bereich                  | Beschreibung                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **Einsatz**              | Lebenszyklus `ANGELEGT → IN_BEARBEITUNG → ABGESCHLOSSEN → ARCHIVIERT`. Append-Only (GoBD, 10-Jahre-Aufbewahrung).          |
| **Einsatztagebuch**      | Event-sourced Logbuch mit Snapshot-Optimierung. Discriminated-Union-Kontexte (Text, Funkspruch, Patient, …, ADR-005).     |
| **Lagekarte**            | Echtzeit-GIS (MapLibre GL + Mapbox Draw). 9 Custom Drawing-Modi. Taktische Zeichen, DWD-WMS, NINA-GeoJSON.                |
| **Kräfte**               | Fahrzeuge, Personen, Einheiten, Rollen, Qualifikationen. Dominante Domäne: 44 Commands / 30 Queries.                      |
| **Funkverkehr**          | Funkkanal als eigenes Aggregat (ADR-007), polymorphe Zuordnung via 3 nullable FKs (ADR-008), WebSocket-Sync (ADR-006).    |
| **Befehle**              | Erteilen, Zustellen, Quittieren, Kommentieren, Anonymisieren. Statustracking mit Audit-Trail.                             |
| **Alarmierung**          | Empfänger-Management, Nachalarmierungen, getrennte Commands für manuelle vs. FMS-Alarmzeiten (ADR-009).                   |
| **Gefahrenmatrix**       | Warnstufen-Matrix als Source-of-Truth, Live-Sync zur Karte (ADR-010).                                                     |
| **Erinnerungen**         | Multi-Eskalation, Snooze, Serien, Templates, Tauri-Audio-Alerts.                                                          |
| **Integrationen**        | HiOrg-Server (OAuth2, Personen- und Qualifikations-Import), Nominatim (Geocoding), HIBP (Password-Check).                 |
| **User-Management**      | RBAC mit `SUPER_ADMIN / ADMIN / USER`. Min-1-SUPER_ADMIN-Constraint. Operative Rollen (Führungskraft/Einsatzkraft/Externe). |

### Nutzungskontext

- **Plattform:** Primär Tauri-Desktop-Anwendung (macOS, Windows, Linux). Zusätzlich Web-App im Browser.
- **Mobil:** iOS/Android-Unterstützung über Tauri 2 (inkl. Barcode-Scanner-Plugin).
- **Betriebsmodus:** Self-Hosted. Self-Signed-HTTPS auch im Dev-Modus (mkcert).
- **Offline-Fähigkeit:** Ausgebaut im ETB-Feature (Offline-Persistence). Lokal-verschlüsselter Speicher via Tauri Store / Stronghold (ADR zu Platform Storage).

---

## 1.2 Repository-Struktur

**Typ:** Monorepo mit `pnpm@10.32.1` Workspaces (`pnpm-workspace.yaml` → `packages/*`).

```
bluelight-hub/
├── packages/
│   ├── backend/        # NestJS 11 API (Hexagonale Architektur + CQRS + DDD)
│   ├── frontend/       # React 19 + Vite 6 + Tauri 2 + TanStack-Ökosystem
│   └── shared/         # Generierter TypeScript-Fetch-Client + Zod-Schemas
├── docs/               # Projektdokumentation (ADRs, arc42-ähnlich, Deep Dives)
├── scripts/            # Worktree-Setup, Gitmoji-Sync, HTTPS-Cert-Gen, Hygiene-Checks
├── certs/              # mkcert-Zertifikate (lokal, git-ignoriert)
├── .github/workflows/  # CI/CD Pipelines
├── _bmad/, _bmad-output/ # BMAD-Methodik-Artefakte (Planning)
├── docker-compose.yml  # postgres:18, migrations, app (Profile: full-app)
├── Dockerfile          # Multi-Stage (base → builders → production / migrations)
├── mise.toml           # Node 24, Python 3
├── CLAUDE.md           # Agent-Instruktionen (Projekt-Regeln, Architektur)
├── AGENTS.md           # Zusätzliche Agent-Guides (Commit-Konventionen)
└── architecture.md     # Root-Architektur-Dokument (exhaustive Codebasis-Analyse)
```

### Packages im Detail

| Package                    | Pfad                | Technologie-Stichworte                                          |
| -------------------------- | ------------------- | --------------------------------------------------------------- |
| `@bluelight-hub/backend`   | `packages/backend`  | NestJS 11.1, TypeScript 5.8, Prisma 6.8, PostgreSQL 18, Jest    |
| `@bluelight-hub/frontend`  | `packages/frontend` | React 19.1, Vite 6, Tauri 2.10, TanStack, Tailwind 4, Vitest    |
| `@bluelight-hub/shared`    | `packages/shared`   | OpenAPI Generator 7.10, Zod 4, Axios / Fetch                    |

---

## 1.3 Technologie-Stack

### 1.3.1 Backend (`packages/backend`)

| Kategorie      | Technologie                             | Zweck                                                      |
| -------------- | --------------------------------------- | ---------------------------------------------------------- |
| Framework      | NestJS `^11.1.18`                       | Modulares IoC/DI-Framework                                 |
| Language       | TypeScript `5.8`                        | Strikt typisiert                                           |
| CQRS           | `@nestjs/cqrs` `^11.0.3`                | Command- und Query-Handler                                 |
| ORM            | Prisma `6.8`                            | PostgreSQL-Schema und Migrationen                          |
| Datenbank      | PostgreSQL `18`                         | Haupt-Datastore (Docker: Port 3092)                        |
| Auth           | `passport-jwt` + Eigene Strategien      | Access-/Refresh-Token mit HTTP-only Cookies, Admin-Strategie |
| HTTP-Client    | `@nestjs/axios` `^4.0.1`                | Externe Integrationen (HiOrg, Nominatim)                   |
| Caching        | `@nestjs/cache-manager` `^3.1`          | Query-Caching                                              |
| Events         | `@nestjs/event-emitter` `^3.0.1`        | In-Proc Event-Bus                                          |
| WebSocket      | `socket.io` `^5.x`                      | Einsatz-scoped Live-Updates (`/ws/einsatz-events`, ADR-006) |
| API-Docs       | `@nestjs/swagger` `^11.1.4`             | OpenAPI 3 (Alpha + V1)                                     |
| ENV            | `@dotenvx/dotenvx` `^1.59`              | Signierte .env-Dateien                                     |
| Testing        | Jest `30.0.0-beta.3`                    | Unit, Integration, E2E, Smoke                              |
| Performance    | Artillery                               | NFR-4: p95 < 200 ms                                        |
| CLI            | Zwei CLIs (`main-cli`, `archive`, `invite-once`) | Admin-Operationen                                   |

### 1.3.2 Frontend (`packages/frontend`)

| Kategorie    | Technologie                                 | Zweck                                                  |
| ------------ | ------------------------------------------- | ------------------------------------------------------ |
| UI-Library   | React `19.1`                                | SPA                                                    |
| Build-Tool   | Vite `^6.3`                                 | HMR, Self-Signed HTTPS                                 |
| Desktop      | Tauri `^2.10`                               | Rust-basiertes Desktop-Shell (macOS/Linux/Windows/mobile) |
| Routing      | `@tanstack/react-router` `^1.168`           | File-based, 72 Route-Dateien                           |
| Server-State | `@tanstack/react-query` `^5.99`             | 543+ Query/Mutation-Hooks                              |
| Client-State | `@tanstack/react-store` `^0.10`             | 57 Stores                                              |
| Forms        | `@tanstack/react-form` `^1.29` + Zod `^4.3` | Validation via `zod-form-adapter`                      |
| Tables       | `@tanstack/react-table` `^8.21`             | Datentabellen                                          |
| Virtual      | `@tanstack/react-virtual` `^3.13`           | Große Listen (Befehl, ETB)                             |
| Styling      | Tailwind CSS `4.2` + Headless UI `^2.2`     | Utility-first                                          |
| CVA          | `class-variance-authority`                  | Komponenten-Varianten                                  |
| Map          | MapLibre GL `^5.22` + React Map GL `^8.1`   | OSM-basiert (nicht Mapbox), siehe Memory-Notiz         |
| Draw         | `@mapbox/mapbox-gl-draw` `^1.5`             | 9 Custom Modi                                          |
| GIS          | Turf.js `^7.3`, MGRS `^2.1`                 | Polygon-Ops, Military Grid                             |
| Socket       | `socket.io-client` `^4.8`                   | Einsatz-Live-Sync                                      |
| Notifications | `sonner` `^2.0`                            | Toasts                                                 |
| Charts       | `recharts` `^3.8`                           | Statistiken                                            |
| DnD          | `@dnd-kit/*`                                | Drag-and-Drop (Sortierung, Karten-Elemente)            |
| Testing      | Vitest `^4.1` + RTL `^16.3` + jsdom         | Unit + Integration + Performance                       |

**Tauri-Plugins:** `http`, `store`, `stronghold`, `deep-link`, `notification`, `single-instance`, `shell`, `barcode-scanner` (nur Mobile), `log`. Custom Rust-Commands: `play_sound` (Rodio), `update_tray_badge` / `clear_tray_badge`.

### 1.3.3 Shared (`packages/shared`)

| Kategorie         | Technologie                                                     |
| ----------------- | --------------------------------------------------------------- |
| API-Generierung   | `@openapitools/openapi-generator-cli` `v2.31.1` (Spec: v7.10.0) |
| Generator         | `typescript-fetch` (Alpha + V1)                                 |
| Validierung       | Zod `^4.3` + Plain-JS-Validatoren                               |
| Config            | `openapitools.json` (Root: `https://localhost:3091` überschreibbar) |

### 1.3.4 Tooling & DevOps

| Kategorie        | Technologie                                                 |
| ---------------- | ----------------------------------------------------------- |
| Paketmanager     | pnpm `10.32.1` (Workspaces)                                 |
| Node             | `>= 24` (mise.toml `node = "24"`)                           |
| Linting          | **OXC**: `oxlint` `^1.60` + `oxfmt` `^0.45` (ersetzt Biome!) |
| Circular Deps    | `madge` (Domain + Application Layer)                        |
| Git Hooks        | `husky` `^9.1`, `lint-staged` `^16.4`                       |
| Commits          | Gitmoji mit wöchentlich synchronisiertem Snapshot (ADR-003) |
| Release          | `semantic-release` `^25` + `semantic-release-gitmoji` + `semantic-release-claude-changelog` |
| Container        | Docker (Multi-Stage) + docker-compose                       |
| CI/CD            | GitHub Actions (ci.yml, release.yml, gitmoji-sync, codeql)  |
| Code-Metrics     | CodeQL (weekly), Codecov (LCOV Upload)                      |
| HTTPS im Dev     | `mkcert` via `scripts/generate-certs.sh`                    |
| Worktree-Support | `scripts/worktree-setup.sh` (dynamische Ports je Worktree)  |

> **Wechsel zu OXC:** Die alte Dokumentation nannte Biome. Seitdem wurde auf die OXC-Toolchain umgestellt (`oxlint` + `oxfmt`). `biome` ist nicht mehr im Repository.

---

## 1.4 Architektur-Pattern (Überblick)

### Backend: Hexagonal + CQRS + DDD

```
┌─────────────────────────────────────────────────────────────────────┐
│                          modules/  (HTTP-Layer)                     │
│  Controller · Guards · Decorators · DTOs · WebSocket-Gateway        │
├─────────────────────────────────────────────────────────────────────┤
│                    application/  (Use-Cases, CQRS)                  │
│  Command-Handler (≈178) · Query-Handler (≈105) · Mapper · DTOs      │
│  TransactionalCommandHandler (Prisma-Tx + Outbox)                   │
├─────────────────────────────────────────────────────────────────────┤
│                       domain/  (Business-Core)                      │
│  7 Aggregate-Roots · 14 Entities · 74 Value Objects · 73 Events     │
│  28 Repository-Ports · Result<T> · Framework-agnostisch             │
├─────────────────────────────────────────────────────────────────────┤
│                  infrastructure/  (Adapter/Driven)                  │
│  Prisma-Repos · Outbox · Socket.io-Gateway · HiOrg · Geocoding      │
│  Guards-Impl · JWT-Strategies · Exporter (PDF/CSV/JSON) · Scheduler │
└─────────────────────────────────────────────────────────────────────┘
```

**Abhängigkeitsrichtung:** `modules` → `application` → `domain` ← `infrastructure`. Domain hängt von nichts ab, Infrastructure implementiert Domain-Ports.

**Patterns:** CQRS (NestJS `@CommandHandler`/`@QueryHandler`), Result Pattern (`domain/common/result.ts`, 38 LOC), **Transactional Outbox** (107 Event-Cases im Serializer, 1.691 Zeilen), DDD-Aggregates, Repository Pattern mit Symbol-DI-Tokens (`infrastructure/di-tokens.ts`).

### Frontend: Feature-based + Atomic-Design-Shared-UI

```
packages/frontend/src/
├── features/          # 22 Features (alarmierung, befehl, einsatz, etb, …)
│   └── <feature>/
│       ├── api/         # TanStack Query Hooks + queryKeys.ts
│       ├── ui/          # Atoms · Molecules · Organisms · Templates
│       ├── hooks/       # Feature-spezifische Hooks
│       ├── stores/      # TanStack Store (Client-State)
│       ├── schemas/     # Zod-Schemas (Form-Validation)
│       └── utils/       # Helper, Mapper
├── shared/
│   ├── ui/              # 46 Atoms + 30 Molecules + 22 Organisms + Templates
│   ├── api/             # fetchWithRefresh, serverStore, Configuration
│   └── lib/             # Utilities (cn, date-fns, MGRS)
├── routes/              # 72 File-based Routes → routeTree.gen.ts
├── provider/            # Query-Client, Theme, Router-Provider
└── main.tsx / index.tailwind.css
```

**Patterns:** File-based Routing mit Nested Layout (`/app/einsatz/$einsatzId/…`), Query-Key-Factories pro Feature (`FEATURE_QUERY_KEYS.list(filters)`), Custom Fetch-Wrapper mit Token-Refresh-Queue, Persistent Stores für Offline-State (ETB, Workspace-Registry).

---

## 1.5 Projekt-Metriken (Stand: 2026-04-17)

| Metrik                           | Wert                               |
| -------------------------------- | ---------------------------------- |
| Backend-Module (`modules/`)      | 26                                 |
| Frontend-Features (`features/`)  | 22                                 |
| REST-Endpoints                   | ~272 (vorher: 24)                  |
| Controller-Dateien               | 58                                 |
| Prisma-Modelle                   | 58 (vorher: 10)                    |
| Migrationen                      | 98                                 |
| Domain-Aggregate-Roots           | 7                                  |
| Domain-Value-Objects             | 74                                 |
| Domain-Events                    | 73                                 |
| Repository-Ports                 | 28                                 |
| Command-Handler                  | ≈178                               |
| Query-Handler                    | ≈105                               |
| Generierte API-Klassen           | 52                                 |
| Generierte Modelle               | 475                                |
| Test-Dateien Backend             | 521 (Jest)                         |
| Test-Dateien Frontend            | ≈354 (≈1.474 Test-Cases)           |
| ADRs                             | 10                                 |
| Markdown-Dokumente (`docs/`)     | 62 (inkl. project-documentation/)  |

---

## 1.6 Weiterführende Dokumentation

- **Backend-Architektur:** [02-backend-architektur.md](./02-backend-architektur.md)
- **Frontend-Architektur:** [03-frontend-architektur.md](./03-frontend-architektur.md)
- **API-Referenz:** [04-api-referenz.md](./04-api-referenz.md)
- **Entwicklungshandbuch:** [05-entwicklungshandbuch.md](./05-entwicklungshandbuch.md)
- **Datenmodell:** [06-datenmodell.md](./06-datenmodell.md)
- **Testing & Qualität:** [07-testing-und-qualitaet.md](./07-testing-und-qualitaet.md)
- **DevOps & Deployment:** [08-devops-und-deployment.md](./08-devops-und-deployment.md)
- **Integrationen & externe Systeme:** [09-integrationen-und-extern.md](./09-integrationen-und-extern.md)
- **ADRs:** [`docs/adr/`](../adr/)
- **Deep Dives (2026-01):** `docs/deep-dive-backend.md`, `docs/deep-dive-frontend.md`
