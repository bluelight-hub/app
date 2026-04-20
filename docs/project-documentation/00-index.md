# Bluelight Hub — Dokumentationsindex

> **Projekt:** Bluelight Hub — Einsatzverwaltung für **weiße Hilfsorganisationen** (DRK, JUH, MHD, ASB, DLRG) im Sanitätsdienst und Katastrophenschutz. **Explizit nicht für Feuerwehr.**
> **Version:** siehe `CHANGELOG.md` (aktuell: `1.0.0-alpha.102`)
> **Generiert:** 2026-04-17
> **Quelle:** Projekt-Scan v1.2.0 (Exhaustive, Agent-basiert)
> **Sprache:** Deutsch

---

## Schnellstart

```bash
# Einrichtung
pnpm install
pnpm gen:certs                                         # mkcert HTTPS-Zertifikate
docker compose up -d postgres
pnpm --filter @bluelight-hub/backend prisma:migrate --name init

# Entwicklung
pnpm -r dev                                            # Alles starten (Backend + Frontend + Tauri)
pnpm --filter @bluelight-hub/frontend dev:vite         # Nur Web-Frontend (ohne Tauri)
pnpm run generate-api                                  # OpenAPI-Client regenerieren

# Standard-Ports (Hauptrepo)
# Frontend: https://localhost:3090  |  Backend: https://127.0.0.1:3091/api  |  PostgreSQL: 3092
```

---

## Dokumentations-Übersicht

| #   | Dokument                                                           | Beschreibung                                                                          |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 1   | [Projektüberblick](./01-projektueberblick.md)                      | Repository-Struktur, Tech-Stack, Architektur-Patterns, Fachlicher Kontext             |
| 2   | [Backend-Architektur](./02-backend-architektur.md)                 | Hexagonale Architektur, CQRS, DDD, Domain-Aggregate, Outbox-Pattern                   |
| 3   | [Frontend-Architektur](./03-frontend-architektur.md)               | React 19 + Tauri 2, TanStack-Ökosystem, Feature-Struktur, MapGL-Lagekarte             |
| 4   | [API-Referenz](./04-api-referenz.md)                               | 272 REST-Endpoints, Auth-Guards, WebSocket-Gateway, API-Versionierung                 |
| 5   | [Entwicklungshandbuch](./05-entwicklungshandbuch.md)               | Setup, Commands, Konventionen, Worktrees, HTTPS im Dev-Modus                          |
| 6   | [Datenmodell](./06-datenmodell.md)                                 | 58 Prisma-Modelle, 7 Domain-Aggregates, 74 Value Objects, 73 Domain Events            |
| 7   | [Testing & Qualität](./07-testing-und-qualitaet.md)                | Jest + Vitest, Artillery-Performance, Coverage-Targets, OXC-Linting, Madge            |
| 8   | [DevOps & Deployment](./08-devops-und-deployment.md)               | CI/CD (GitHub Actions), semantic-release + Gitmoji, Docker, Tauri-Cross-Build         |
| 9   | [Integrationen & externe Systeme](./09-integrationen-und-extern.md) | HiOrg-Server (OAuth2), Nominatim, HIBP, WebSocket-Events, Shared API-Client           |
| ADR | [Architecture Decision Records](../adr/)                           | 10 ADRs (API-Versionierung, Funkkanal-Aggregat, Gefahrenzone-Matrix, u. a.)           |

---

## Projekt-Klassifikation

| Eigenschaft                   | Wert                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------- |
| **Repository-Typ**            | Monorepo (pnpm Workspaces `@10.32.1`)                                             |
| **Packages**                  | `@bluelight-hub/backend`, `@bluelight-hub/frontend`, `@bluelight-hub/shared`      |
| **Backend**                   | NestJS 11 + Prisma 6 + PostgreSQL 18 + Socket.io + JWT                            |
| **Frontend**                  | React 19 + Vite 6 + Tauri 2 + TanStack Router/Query/Store/Form/Table/Virtual      |
| **Shared**                    | Generierter TypeScript-Fetch-Client (OpenAPI Generator v7.10) + Zod-Schemas       |
| **Architektur (Backend)**     | Hexagonal (Ports & Adapters) + CQRS + DDD + Result Pattern + Transactional Outbox |
| **Architektur (Frontend)**    | Feature-based + Atomic Design (Shared UI) + File-based Routing                    |
| **Backend-Module**            | 26 (admin, alarmierung, aufbewahrung, auth, befehl, einsatz, etb, funkkanal, …)   |
| **Frontend-Features**         | 22 (alarmierung, befehl, einsatz, etb, funkverkehr, lagekarte, reminders, …)      |
| **REST-Endpoints**            | ~272 über 58 Controller                                                           |
| **Prisma-Modelle**            | 58 (98 Migrationen)                                                               |
| **Domain-Aggregate-Roots**    | 7 (Einsatz, Befehl, EtbEintrag, User, Lagekarte, InviteCode, ServerAccessToken)   |
| **CQRS-Command-Handler**      | ~178                                                                              |
| **CQRS-Query-Handler**        | ~105                                                                              |
| **Domain-Events**             | 73                                                                                |
| **Generierte API-Klassen**    | 52 (aus 2 API-Versionen: `v-alpha` instabil, `v-1` stabil)                        |
| **Generierte Modelle**        | 475                                                                               |
| **Test-Dateien (Backend)**    | 521 (Unit / Integration / E2E / Smoke)                                            |
| **Test-Dateien (Frontend)**   | ~354 (~1474 Test-Cases)                                                           |

---

## Fachlicher Kontext

### Zielgruppe

Bluelight Hub richtet sich **explizit an weiße Hilfsorganisationen** (DRK, JUH, MHD, ASB, DLRG) im Sanitätsdienst und Katastrophenschutz. Die Fachdomäne — Rollen, Einheitenstruktur, Führungsrhythmus, ETB-Kontexte, Kräfte-Modell und Default-Taktische-Zeichen — ist auf diesen Einsatzbereich zugeschnitten (Sanitätsdienst, Betreuungsdienst, SEG, KatS-Zug, Führungsgruppen).

**Nicht die Zielgruppe:** Feuerwehr (kein Brandschutz-/Technische-Hilfeleistung-Fokus, keine FwDV-konforme Einsatzabwicklung), Polizei, Bundeswehr. FW-/THW-Zeichen im Taktische-Zeichen-Katalog existieren ausschließlich für Interoperabilität auf der Lagekarte (überörtliche Einsätze mit gemischten Kräften) und prägen weder Rollen-Modell noch Workflows.

### Fachliche Fähigkeiten

Bluelight Hub unterstützt die strukturierte Dokumentation und Koordination von Einsätzen:

- **Einsatz-Management** — Erstellen, Aktualisieren, Archivieren (inkl. 10-Jahre-Aufbewahrung, GoBD-konform)
- **Einsatztagebuch (ETB)** — Event-sourced Logbuch mit Snapshot-Optimierung, Discriminated-Union-Kontexte (ADR-005)
- **Lagekarte** — Echtzeit-GIS (MapLibre GL) mit Drawing-Engine, Taktischen Zeichen, Gefahrenzonen
- **Kräfte-Management** — Fahrzeuge, Personen, Einheiten, Rollen, Qualifikationen (größte Domäne: 44 Commands / 30 Queries)
- **Funkverkehr** — Funkkanal-Aggregat (ADR-007), polymorphe Zuordnung Fahrzeug/Person/Einheit (ADR-008), WebSocket-Live-Sync (ADR-006)
- **Befehle** — Erteilen, Zustellung, Quittierung, Kommentare, Anonymisierung
- **Alarmierung** — Empfänger-Management, Nachalarmierung, getrennte Commands manuell/FMS (ADR-009)
- **Gefahrenmatrix** — Warnstufe-Source-of-Truth mit Live-Sync zur Karte (ADR-010)
- **Erinnerungen** — Multi-Eskalation, Snooze, Serien-Wiederholungen, Templates, Tauri-Audio-Alerts
- **Integration HiOrg-Server** — OAuth2-Flow, Personen- und Qualifikations-Import

---

## Wichtige Architektur-Entscheidungen (ADRs)

| #       | Titel                                                      | Status / Datum        |
| ------- | ---------------------------------------------------------- | --------------------- |
| ADR-001 | API-Versionierungsstrategie (URI-basiert: v-alpha / v-1)   | Akzeptiert 2026-02-24 |
| ADR-002 | Runtime-Konfigurationsmodell & Secret-Management           | Akzeptiert, Phase 1   |
| ADR-003 | Gitmoji Source of Truth für Commit-Validierung             | Akzeptiert            |
| ADR-004 | Frontend-Workspace-Orchestrierung (Feature-Tree-Layout)    | Akzeptiert            |
| ADR-005 | ETB-Eintrag-Kontext als Discriminated Union                | Akzeptiert            |
| ADR-006 | WebSocket-Event-Bus einsatz-scoped                         | Akzeptiert            |
| ADR-007 | Funkkanal als eigenes Aggregat                             | Akzeptiert            |
| ADR-008 | Polymorphe Funkkanal-Zuordnung (3 nullable FKs)            | Akzeptiert            |
| ADR-009 | Getrennte Commands manuell vs. FMS-Auto                    | Akzeptiert            |
| ADR-010 | Gefahrenzone → Matrixzelle (Warnstufe Source-of-Truth)     | Akzeptiert 2026-04-17 |

Volltexte: [`docs/adr/`](../adr/)

---

## Kritische Projekt-Regeln

> **Enforcement:** Pre-Commit-Hooks + CI-Checks. Verstöße blockieren Merge.

- **DI-Import (AC1):** Injectable Classes IMMER mit `import MyService` — NIEMALS `import type` (bricht NestJS-DI). Prüfung: `pnpm --filter @bluelight-hub/backend check:di:imports`.
- **API-Workflow:** Backend-Endpoint → `pnpm run generate-api` → TanStack-Query-Hook → Komponente. NIEMALS manuelle `fetch()`-Calls.
- **Response-Decorators (AC7):** IMMER `@ApiWrappedResponse` / `@ApiWrappedCreatedResponse` — NIEMALS `@ApiOkResponse` (bricht API-Client-Generierung).
- **Tech-Stack:** UI nur Tailwind + Headless UI, Forms nur TanStack Form + Zod, State nur TanStack Query + Store, Linting nur OXC. Redux, Biome, ESLint, Prettier, CSS-in-JS, Formik sind untersagt.
- **Umlaute:** In Kommentaren, JSDoc, Testbeschreibungen und UI-Strings immer `ä ö ü ß` — NIEMALS Digraphen (`ae oe ue ss`). Code-Identifier bleiben ASCII.
- **Einsatz-Routen-Nesting:** Einsatz-bezogene HTTP-Endpunkte immer unter `/einsatz/:einsatzId/…`, nie Top-Level.
- **Commit-Format:** `<emoji>(<context>): <title>` gegen wöchentlich synchronisierten Gitmoji-Snapshot. `--no-verify` ist untersagt.

---

## Wichtige Commands

```bash
# Entwicklung
pnpm -r dev                                              # Alle Packages parallel
pnpm run generate-api                                    # OpenAPI-Client (Alpha + V1) neu bauen

# Datenbank
pnpm --filter @bluelight-hub/backend prisma:migrate --name <feature>   # Migration + DB aktualisieren
pnpm --filter @bluelight-hub/backend prisma:studio                      # Port 3093

# Tests
pnpm --filter @bluelight-hub/backend test                # Alle Backend-Tests (Jest)
pnpm --filter @bluelight-hub/backend test:unit           # Ohne DB
pnpm --filter @bluelight-hub/backend test:db             # Integration + E2E + Smoke
pnpm --filter @bluelight-hub/frontend test               # Frontend (Vitest)
pnpm --filter @bluelight-hub/backend test:perf           # Artillery-Load-Tests

# Qualität
pnpm lint                                                # oxlint --fix + oxfmt --write
pnpm --filter @bluelight-hub/backend check:arch          # Madge Circular-Deps + Layer-Lint
pnpm --filter @bluelight-hub/backend check:di:imports    # DI-Import-Hygiene
```

---

## Dokumentation weiterführend

| Bereich                            | Pfad                                                                 |
| ---------------------------------- | -------------------------------------------------------------------- |
| Root-Architektur                   | `architecture.md`, `docs/architecture-principles.md`                  |
| Deep Dives (2026-01)               | `docs/deep-dive-backend.md`, `docs/deep-dive-frontend.md`             |
| Externe System-Schnittstellen      | `docs/deep-dive-externe-system-schnittstellen.md`                     |
| Frontend-Backend-Integration       | `docs/deep-dive-frontend-backend-integration.md`                      |
| Backend-Patterns                   | `docs/backend/patterns/` (einsatz-mutation-auth, event-adapters, repo-abstraction) |
| Design-System-Übersicht            | [`docs/frontend/00-design-system-overview.md`](../frontend/00-design-system-overview.md) (Ring-Modell, Stack, Guardrails) |
| Ring 1 — Design-Tokens             | [`docs/frontend/ring-1-design-tokens.md`](../frontend/ring-1-design-tokens.md) |
| Ring 2 — Workspace & Gates         | [`workspace-fundament-ring-2.md`](../frontend/workspace-fundament-ring-2.md), [`ring-2-review-gates.md`](../frontend/ring-2-review-gates.md), [`ring-2-performance-gates.md`](../frontend/ring-2-performance-gates.md), [`session-api-contract-ring-2.md`](../frontend/session-api-contract-ring-2.md) |
| Ring 3 — Komponenten-Vertrag       | [`docs/frontend/ring-3-component-contract.md`](../frontend/ring-3-component-contract.md) (Atoms/Molecules/Organisms/Templates) |
| UI/UX — Aktueller Umsetzungsstand  | [`docs/frontend/ui-ux-state-current.md`](../frontend/ui-ux-state-current.md) (lebendes Status-Dokument) |
| Development Guide                  | `docs/development-guide/` (code-conventions, tauri-plugins)           |
| Superpowers Plans & Specs          | `docs/superpowers/` (aktive Epic-Planung)                             |
| API-Versionierung                  | `docs/api-versioning.md`                                              |
| Tauri-Store-Setup                  | `docs/frontend-tauri-plugin-store-setup.md`                           |
| Epic-8 Retro (Reminders/Templates) | `docs/epic-8-retro-2026-02-06.md`                                     |

---

*Dokumentation generiert am 2026-04-17 via Multi-Agent-Recherche (6 parallele Explore-Agents). State-Datei: `docs/project-scan-report.json`.*
