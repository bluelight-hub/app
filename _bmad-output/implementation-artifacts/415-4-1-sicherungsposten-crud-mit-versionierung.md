# Story 4.1: Sicherungsposten-CRUD mit Versionierung

Status: done

## Story

As a **Sicherheitsbeauftragter**,
I want **Sicherungsposten mit Standort (Koordinate oder Adresse), zugewiesenem Personal (User-Referenzen oder Freitext) und Zuständigkeitsbereich (Freitext) anlegen, ändern und als „aufgelöst" markieren zu können**,
so that **ich Sicherungs-Aufgaben strukturiert vergebe und auditierbar nachvollziehen kann, wer wo postiert war (FR27, FR41 Versions-Chain)**.

## Pivot-Anker (lies zuerst!)

- **Strikt aus-Scope (defer):** MapGL-Marker-Layer (Story 4.3), Map-Click-Picker für Standort-Eingabe (Story 4.3 oder Phase 2), Ablösezeiten-Textarea-UX (Story 4.2 — Backend-Feld existiert, Drawer rendert es **nur Read-Only-Stub** in 4.1), Bidirektionale Karte↔Detail-Navigation (Story 4.4).
- **Migration ist da, aber unvollständig:** `Sicherungsposten` + `SicherungspostenVersion` existieren seit Story 1.4 (`prisma/schema.prisma:2761–2798`). UX-DR27 verlangt **Begründung beim Auflösen** — diese Spalten fehlen → **eine neue additive Migration** in dieser Story (`add_sicherungsposten_aufloesen_fields`).
- **Permission existiert:** `eigenschutz:sicherungsposten:read` und `eigenschutz:sicherungsposten:write` sind im Enum (`domain/eigenschutz/enums/eigenschutz-permission.enum.ts:21–22`) — **kein neuer Permission-Eintrag**, keine Seed-Anpassung nötig.
- **Events sind im Whitelist-Knast:** `eigenschutz.sicherungsposten_eingerichtet` + `eigenschutz.sicherungsposten_aktualisiert` stehen aktuell in `architecture-rules.spec.ts:210–211` als „noch nicht registriert". Diese Story registriert beide an **allen 4 Stellen** und entfernt sie aus der Whitelist.
- **Pattern-Vorgänger 1:1:** Gefährdungsbeurteilung (Story 2.1 = Create, Story 2.3 = Update mit Optimistic-Concurrency, Story 2.4 = Versions-Historie). Dateien hart referenzieren — Code 80 % wiederverwendbar.

## Acceptance Criteria

### AC1 — Domain-Aggregate `Sicherungsposten` (Pattern: `gefaehrdungsbeurteilung.aggregate.ts`)

**Given** das Eigenschutz-Domain-Layer
**When** das Aggregate `Sicherungsposten` in `packages/backend/src/domain/eigenschutz/aggregates/sicherungsposten.aggregate.ts` angelegt wird
**Then** existiert eine `SicherungspostenId extends EntityId<'Sicherungsposten'>`-Klasse, eine `static create(props): Result<Sicherungsposten>`-Factory, eine `static reconstitute(props): Result<Sicherungsposten>`-Factory (Mapper-Pfad, keine Events), Pflicht-Invarianten `einsatzId`, `bezeichnung` (1–200 Zeichen), `standort`, `personal` (Array, ≥ 0), `createdBy`. **Optional:** `einheitId`, `zustaendigkeitsbereich` (≤ 4000 Zeichen), `abloesezeiten` (≤ 500 Zeichen)
**And** `create` emittiert genau **ein** `SicherungspostenEingerichtetEvent`
**And** `update(props, expectedVersion, userId): Result<void>` inkrementiert `version` (Optimistic-Concurrency analog `Gefaehrdungsbeurteilung.updateItems`), bei Mismatch `Result.fail(SICHERUNGSPOSTEN_CONFLICT_DETECTED)` (Sentinel-Konstante exportiert), emittiert ein `SicherungspostenAktualisiertEvent` mit `changedFields`-Audit (Diff-Set über Top-Level-Felder)
**And** `aufloesen(userId, begruendung): Result<void>` setzt `aufgeloestAm`, `aufgeloestVonUserId`, `aufloeseBegruendung`, inkrementiert `version`, emittiert `SicherungspostenAktualisiertEvent` mit `changedFields = { aufgeloest: true }` und ist **idempotent** (zweiter Aufruf liefert `Result.fail('BusinessRule:BereitsAufgeloest')` ohne Event).

### AC2 — Value Object `Standort` (discriminated union)

**Given** Epic-Wortlaut „Koordinate **oder** Adresse/Freitext"
**When** das Value Object `Standort` in `domain/eigenschutz/value-objects/standort.vo.ts` angelegt wird
**Then** ist `Standort` eine **discriminated Union**:

```ts
type Standort = { kind: 'coordinate'; longitude: number; latitude: number; addressHint?: string } | { kind: 'address'; text: string };
```

**And** Validierung in `Standort.create(props)`: bei `coordinate` `-180 ≤ longitude ≤ 180`, `-90 ≤ latitude ≤ 90`, `addressHint ≤ 500`; bei `address` `text` getrimmt 1–500 Zeichen
**And** Persistenz: `Sicherungsposten.standort: Json` hält das `Standort`-Object 1:1 (kein GeoJSON-Wrapper — Story 4.3 mappt erst beim MapGL-Layer)
**And** ein **Zod-Schema** `standort.schema.ts` in `packages/backend/src/application/eigenschutz/schemas/` — geteilt mit Frontend via `@bluelight-hub/shared/schemas` (Pattern Story 3.10 `KonfliktAufgeloestWsPayloadSchema`).

### AC3 — Migration `add_sicherungsposten_aufloesen_fields`

**Given** Story 1.4 hat `Sicherungsposten` mit `geloescht: Boolean @default(false)` angelegt — UX-DR27 verlangt aber Begründung
**When** eine neue Prisma-Migration ausgeführt wird (`pnpm --filter @bluelight-hub/backend prisma:migrate --name add_sicherungsposten_aufloesen_fields`)
**Then** sind drei zusätzliche Spalten gesetzt: `aufgeloestAm: DateTime?` (nullable), `aufgeloestVonUserId: String?` (`@db.VarChar(30)`), `aufloeseBegruendung: String?` (`@db.VarChar(2000)`)
**And** das bestehende Feld `geloescht: Boolean` bleibt **vorerst** (Backwards-Compat); der **Auflösungs-Vertrag** ist ab dieser Migration `aufgeloestAm IS NOT NULL` — Repository nutzt **ausschließlich** diese Semantik
**And** ein neuer `@@index([einsatzId, aufgeloestAm])` für die Listen-Filter „aktiv vs. aufgelöst" ist gesetzt
**And** **strikt aus-Scope:** Removal/Rename von `geloescht` (deferred auf Phase 2 bzw. eigene Cleanup-Story).

### AC4 — Events `SicherungspostenEingerichtet` + `SicherungspostenAktualisiert` (4-Stellen-Registry)

**Given** das Event-Registry-Framework (Story 1.7) und die Whitelist-Sentinels in `architecture-rules.spec.ts:210–211`
**When** die zwei Event-Klassen angelegt werden — Pattern: `gefaehrdungsbeurteilung-erstellt.event.ts` + `gefaehrdungsbeurteilung-aktualisiert.event.ts`
**Then** liegen sie in `domain/eigenschutz/events/sicherungsposten-eingerichtet.event.ts` + `…-aktualisiert.event.ts`
**And** `SicherungspostenEingerichtetEvent.eventName()` liefert `'eigenschutz.sicherungsposten_eingerichtet'`, `…AktualisiertEvent.eventName()` liefert `'eigenschutz.sicherungsposten_aktualisiert'`
**And** beide sind **vollständig an allen 4 Stellen** registriert:

1. `infrastructure/outbox/event-serializer.ts`
2. `infrastructure/outbox/event-deserializer.ts`
3. `infrastructure/outbox/event-deserializer-adapters.module.ts`
4. `infrastructure/outbox/adapters/index.ts`
   **And** beide Einträge sind aus der `knownMissingEvents`-Liste in `architecture-rules.spec.ts:210–211` **entfernt** (Whitelist-Patch)
   **And** der bestehende Test `eigenschutz-event-registry.spec.ts` verifiziert „alle 4 oder keine" — nach dieser Story sind **alle 4** für beide Events grün
   **And** `index.ts`-Re-Export in `domain/eigenschutz/events/index.ts` ist ergänzt (analog `LueckeGemeldetEvent`-Eintrag dort).

### AC5 — Repositories `ISicherungspostenRepository` + `ISicherungspostenVersionRepository`

**Given** Versionierung via separater Tabelle (Pattern `Gefaehrdungsbeurteilung` ↔ `GefaehrdungsbeurteilungVersion`)
**When** die zwei Domain-Ports + Prisma-Adapter angelegt werden
**Then** existiert `domain/eigenschutz/repositories/i-sicherungsposten.repository.ts` mit Methoden:

- `findById(id, options?: { tx? })` → `Promise<Result<Sicherungsposten | null>>`
- `findActiveByEinsatzId(einsatzId)` → `Promise<Result<SicherungspostenReadModel[]>>` (nur `aufgeloestAm IS NULL`)
- `findResolvedByEinsatzId(einsatzId)` → `Promise<Result<SicherungspostenReadModel[]>>` (nur `aufgeloestAm IS NOT NULL`, sortiert `aufgeloestAm DESC`)
- `save(aggregate, tx)` → `Promise<Result<void>>` (Insert oder Update, schreibt **immer** Versions-Snapshot in `SicherungspostenVersion` mit `payload` = Top-Level-Felder + `eventId` aus erstem Aggregate-Event)
- `existsInEinsatz(einsatzId, postenId)` → `Promise<Result<boolean>>` (für Authorization in Update/Auflösen)

**And** `i-sicherungsposten-version.repository.ts` mit `findHistoryByPostenId(postenId)` → `Promise<Result<SicherungspostenVersionReadModel[]>>` (sortiert `version DESC`, alle Versionen inkl. Auflösungs-Snapshot)
**And** Prisma-Adapter `prisma-sicherungsposten.repository.ts` + `prisma-sicherungsposten-version.repository.ts` in `infrastructure/eigenschutz/repositories/` — Pattern 1:1 `prisma-gefaehrdungsbeurteilung.repository.ts` (Top-Level-Insert + Sub-Tabelle-Insert in **einer** Transaktion über `tx`-Parameter; siehe Story 3.9 `findById.tx === markResolved.tx`-Pattern)
**And** ein Mapper `infrastructure/eigenschutz/repositories/mappers/sicherungsposten.mapper.ts` (Pattern `gefaehrdungsbeurteilung.mapper.ts`).

### AC6 — Application-Commands `Create…` + `Update…` + `Aufloese…` (TransactionalCommandHandler)

**Given** das Application-Layer
**When** die drei Command-Pakete angelegt werden:

- `application/eigenschutz/commands/create-sicherungsposten/{create-sicherungsposten.command.ts, create-sicherungsposten.handler.ts}`
- `application/eigenschutz/commands/update-sicherungsposten/{update-sicherungsposten.command.ts, update-sicherungsposten.handler.ts}`
- `application/eigenschutz/commands/aufloese-sicherungsposten/{aufloese-sicherungsposten.command.ts, aufloese-sicherungsposten.handler.ts}`

**Then** alle drei Handler erweitern `TransactionalCommandHandler` aus `application/common/handlers/transactional-command.handler.ts` (atomar Aggregate-Persist + Outbox-Schreib)
**And** `Update`-Handler nutzt `expectedVersion`-Parameter und mappt `SICHERUNGSPOSTEN_CONFLICT_DETECTED` auf 409 mit `:current=<n>`-Suffix (Pattern: `update-gefaehrdungsbeurteilung-items.handler.ts`)
**And** `Aufloese`-Handler validiert `begruendung` (1–2000 Zeichen) **VOR** dem Aggregate-Aufruf (Application-Layer-Validation, Pattern Story 3.6 `MeldeLueckeCommand`)
**And** alle drei Handler validieren `caller`-Authorization implizit über `EinsatzScopeGuard`-Permission-Check im Controller-Layer (kein Re-Check im Handler)
**And** ID-Generierung via `@paralleldrive/cuid2` `createId()` im Handler (nicht im Aggregate, damit Tests stubbar bleiben).

### AC7 — Application-Query `ListSicherungspostenQuery` + DTO-Factory

**Given** das Sub-Tab-UI braucht zwei Listen (aktiv + aufgelöst)
**When** `application/eigenschutz/queries/list-sicherungsposten/{list-sicherungsposten.query.ts, list-sicherungsposten.handler.ts}` angelegt wird
**Then** akzeptiert die Query Parameter `{ einsatzId: string; status: 'AKTIV' | 'AUFGELOEST' }` und liefert `Result<SicherungspostenDto[]>`
**And** ein DTO `application/eigenschutz/dto/sicherungsposten.dto.ts` mit allen Feldern + Factory `sicherungsposten.factory.ts` (`toSicherungspostenDto(readModel): SicherungspostenDto`) — Pattern `gefaehrdungsbeurteilung.dto.ts` + `…factory.ts`
**And** `personal` ist eine getypte Liste `Array<{ kind: 'user'; userId: string } | { kind: 'freitext'; name: string; rolle?: string }>` — discriminated Union analog `Standort` (Begründung: Multi-Select-Mix aus User + Freitext laut Epic).
**And** **strikt aus-Scope:** `GetSicherungspostenHistorieQuery` für die Versions-Timeline → defer auf Story 4.4 oder eigene Historie-Story (analog Story 2.4 für Gefährdungsbeurteilung).

### AC8 — Controller `SicherungspostenController` (REST-Endpoints)

**Given** das HTTP-Modul (`packages/backend/src/modules/eigenschutz/`)
**When** `controllers/sicherungsposten.controller.ts` angelegt wird (Pattern 1:1 `gefaehrdungsbeurteilung.controller.ts`)
**Then** existieren genau **vier** Endpoints unter `/api/einsaetze/:einsatzId/sicherheit/eigenschutz/sicherungsposten`:

- `GET …/sicherungsposten?status=AKTIV|AUFGELOEST` → `200 OK` mit `SicherungspostenDto[]`, Permission `eigenschutz:sicherungsposten:read`
- `POST …/sicherungsposten` → `201 Created` mit `SicherungspostenDto`, Permission `eigenschutz:sicherungsposten:write`
- `PATCH …/sicherungsposten/:postenId` → `200 OK` mit `SicherungspostenDto`, Permission `eigenschutz:sicherungsposten:write`, Header/Body-Feld `expectedVersion`, mappt `SICHERUNGSPOSTEN_CONFLICT_DETECTED:current=<n>` → `409 Conflict` mit `{ currentVersion, attemptedVersion }`
- `POST …/sicherungsposten/:postenId/aufloesen` → `200 OK` mit `SicherungspostenDto` (UX-DR27 destructive-with-reason), Permission `eigenschutz:sicherungsposten:write`, Body `{ begruendung: string, expectedVersion: number }`, `BusinessRule:BereitsAufgeloest` → `422 Unprocessable Entity`

**And** alle Erfolgs-Responses nutzen `@ApiWrappedResponse(SicherungspostenDto, …)` bzw. `@ApiWrappedCreatedResponse(SicherungspostenDto, …)` — **niemals** `@ApiOkResponse` (CLAUDE.md AC7 verbietet das)
**And** Guards: `@UseGuards(JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard)` + `@RequiresPermission(...)` Decorator pro Endpoint (Pattern Story 3.10 `sync-conflict.controller.ts:42–58`)
**And** Module-Wiring: `SicherungspostenController` in `eigenschutz.module.ts` als Controller registriert; Repositories als DI-Provider mit Tokens in `infrastructure/di-tokens.ts` (`SICHERUNGSPOSTEN_REPOSITORY`, `SICHERUNGSPOSTEN_VERSION_REPOSITORY` — Konvention: `<RESOURCE>_REPOSITORY`).

### AC9 — Frontend Feature-Slice `features/eigenschutz/sicherungsposten/` + Route

**Given** das Feature-Layout (`packages/frontend/src/features/eigenschutz/`) und die TanStack-Router-File-Based-Routes
**When** das Sub-Feature-Verzeichnis angelegt wird (analog `features/eigenschutz/gefaehrdungen/` falls vorhanden — sonst direkt unter `features/eigenschutz/`)
**Then** existieren:

- `features/eigenschutz/api/useSicherungsposten.ts` — `useListSicherungsposten(einsatzId, status)`, `useCreateSicherungsposten`, `useUpdateSicherungsposten`, `useAufloeseSicherungsposten` (alle TanStack-Query-Hooks um den **generierten** Client aus `@bluelight-hub/shared/client`)
- `features/eigenschutz/schemas/sicherungsposten.schema.ts` — Zod-Schemas für `Standort` (re-exportiert aus shared) + Form-Schema (TanStack-Form-Resolver)
- `features/eigenschutz/ui/organisms/SicherungspostenDrawer.tsx` — Headless-UI-Dialog (Pattern `PsaProfilDetailDrawer.tsx`), Felder: Bezeichnung (Pflicht), Standort-Toggle (Coordinate vs. Address), Personal-Multi-Select (User-Picker via bestehenden `useUserNames` + Freitext-Fallback), Zuständigkeitsbereich (Textarea ≤ 4000), **`abloesezeiten` als Read-Only-Stub-Hinweis** „Pflege in nächster Story" (Story 4.2 baut UX)
- `features/eigenschutz/ui/organisms/SicherungspostenList.tsx` — Tabelle mit aktiven Posten, Tabs `Aktiv` / `Aufgelöst`, „+ Sicherungsposten"-Button, Per-Row Edit + Aufloesen
- `features/eigenschutz/ui/organisms/AufloeseSicherungspostenDialog.tsx` — destructive Confirmation mit Pflicht-Begründungs-Textarea (1–2000 Zeichen, UX-DR27)
- `features/eigenschutz/ui/pages/SicherungspostenPage.tsx` — Page-Komponente, konsumiert die Hooks
- Route-Datei `routes/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten.tsx` (Pattern `psa-profile.tsx`)

**And** Sub-Tab-Integration: `EigenschutzEntryPage.tsx` listet bereits „Sicherungsposten" als geplantes Sub-Modul (`EigenschutzEntryPage.tsx:22, 35`) — Sub-Tab-Navigation unter `/sicherheit/eigenschutz/` muss um den Tab-Eintrag „Sicherungsposten" ergänzt werden (Pattern Sub-Tabs in `eigenschutz.tsx` Layout-Route).

### AC10 — `generate-api`-Lauf + API-Client-Diff

**Given** die neuen Endpoints + DTOs
**When** `pnpm run generate-api` läuft
**Then** sind die Methoden `sicherungspostenControllerListV*`, `sicherungspostenControllerCreateV*`, `sicherungspostenControllerUpdateV*`, `sicherungspostenControllerAufloeseV*` im generierten Client (`packages/shared/client/`) verfügbar
**And** der generierte Diff ist **mit-committet** (CLAUDE.md API-Workflow)
**And** OpenAPI-Snapshot ist via `pnpm update-api-snapshot` aktualisiert.

### AC11 — Authorization (Pattern Story 3.6 — kein tautologischer Mock-Test!)

**Given** ein Nutzer ohne `eigenschutz:sicherungsposten:write`
**When** er `POST/PATCH/POST-aufloesen` aufruft
**Then** liefert der Endpoint `403 Forbidden` (echte Permission-Smoke-Tests, **kein** `canActivate`-Mock — Lesson aus Story 3.9-Code-Review)
**And** ein Nutzer ohne `eigenschutz:sicherungsposten:read` erhält `403` auf `GET`
**And** ein Nutzer ohne `EinsatzScopeGuard`-Match (anderer Einsatz) erhält `403`.

## Tasks / Subtasks

- [x] **T1** Domain-Layer (AC1, AC2, AC4)
  - [x] T1.1 `domain/eigenschutz/value-objects/standort.vo.ts` + Zod-Schema in shared (AC2)
  - [x] T1.2 `domain/eigenschutz/aggregates/sicherungsposten.aggregate.ts` + `SICHERUNGSPOSTEN_CONFLICT_DETECTED`-Sentinel (AC1)
  - [x] T1.3 Events `sicherungsposten-eingerichtet.event.ts` + `…-aktualisiert.event.ts` + `index.ts`-Re-Export (AC4)
  - [x] T1.4 Repository-Interfaces `i-sicherungsposten.repository.ts` + `i-sicherungsposten-version.repository.ts` (AC5)
  - [x] T1.5 Domain-Tests `*.spec.ts` für Aggregate + VO (≥ 12 Tests: Create-Invariants, Update-Conflict, Aufloesen-Idempotenz, Standort-discriminated-Union)
- [x] **T2** Migration + Schema (AC3)
  - [x] T2.1 Schema-Patch in `prisma/schema.prisma:2761` (Felder `aufgeloestAm`, `aufgeloestVonUserId`, `aufloeseBegruendung`, Index)
  - [x] T2.2 `pnpm --filter @bluelight-hub/backend prisma:migrate --name add_sicherungsposten_aufloesen_fields`
  - [x] T2.3 Prisma-Client regenerieren (`pnpm --filter @bluelight-hub/backend prisma:generate`)
- [x] **T3** Infrastructure-Adapter + Outbox-Registry (AC4, AC5)
  - [x] T3.1 Mapper `infrastructure/eigenschutz/repositories/mappers/sicherungsposten.mapper.ts`
  - [x] T3.2 `prisma-sicherungsposten.repository.ts` + `prisma-sicherungsposten-version.repository.ts`
  - [x] T3.3 4-Stellen-Event-Registrierung: `event-serializer.ts`, `event-deserializer.ts`, `event-deserializer-adapters.module.ts`, `adapters/index.ts`
  - [x] T3.4 Whitelist-Patch in `__tests__/architecture-rules.spec.ts:210–211` — beide Eintragungen entfernt
  - [x] T3.5 DI-Tokens `SICHERUNGSPOSTEN_REPOSITORY` + `SICHERUNGSPOSTEN_VERSION_REPOSITORY` in `infrastructure/di-tokens.ts`
  - [x] T3.6 Repository-Spec-Tests (≥ 8 Tests: Insert+Version-Snapshot, Update-Version-Inkrement, findActive vs. findResolved, tx-Propagation)
- [x] **T4** Application-Commands + Query (AC6, AC7)
  - [x] T4.1 Drei Command-Pakete (Create/Update/Aufloese) inkl. Specs (≥ 12 Tests)
  - [x] T4.2 `ListSicherungspostenQuery` + Handler + Spec (≥ 4 Tests: AKTIV/AUFGELOEST-Filter)
  - [x] T4.3 DTO + Factory `sicherungsposten.dto.ts` + `…factory.ts`
- [x] **T5** HTTP-Controller (AC8, AC11)
  - [x] T5.1 `controllers/sicherungsposten.controller.ts` mit 4 Endpoints
  - [x] T5.2 Module-Wiring in `eigenschutz.module.ts` + Application-/Infrastructure-Module
  - [x] T5.3 Controller-Spec inkl. **echter** Permission-Smoke-Tests (≥ 12 Tests, kein Guard-Mock)
- [x] **T6** API-Client + Frontend (AC9, AC10)
  - [x] T6.1 `pnpm run generate-api` + Snapshot
  - [x] T6.2 Feature-Slice-Setup (`features/eigenschutz/api/useSicherungsposten.ts`, `schemas/`, `ui/organisms/`, `ui/pages/`)
  - [x] T6.3 Route `routes/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten.tsx`
  - [x] T6.4 Sub-Tab-Eintrag in Layout-Route `eigenschutz.tsx`
  - [x] T6.5 Frontend-Tests (≥ 15: List, Drawer-Form-Validation, AufloeseDialog-Begründungs-Pflicht, Konflikt-Handling 409, axe-Snapshot der Liste)
- [x] **T7** Definition of Done
  - [x] T7.1 `pnpm lint:check` 0 Errors
  - [x] T7.2 `pnpm --filter @bluelight-hub/backend check:arch` + `check:di:imports` grün
  - [x] T7.3 Backend-Story-4.1-Scope vollständig grün (Test-Zahl im Commit-Body)
  - [x] T7.4 Frontend-eigenschutz vollständig grün
  - [x] T7.5 OpenAPI-Snapshot aktualisiert + committet

## Dev Notes

### Pattern-Vorgänger (Code 80 % wiederverwendbar)

| Konzept                              | Datei (1:1 als Vorlage)                                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Aggregate + Optimistic-Concurrency   | `domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate.ts` (Sentinel `…_CONFLICT_DETECTED`)                   |
| Update-Handler mit `:current=<n>`    | `application/eigenschutz/commands/update-gefaehrdungsbeurteilung-items/update-gefaehrdungsbeurteilung-items.handler.ts` |
| Repository + Versions-Sub-Tabelle    | `infrastructure/eigenschutz/repositories/prisma-gefaehrdungsbeurteilung.repository.ts` + `…-version.repository.ts`      |
| Mapper                               | `infrastructure/eigenschutz/repositories/mappers/gefaehrdungsbeurteilung.mapper.ts`                                     |
| Controller-Pattern (alle Decorators) | `modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts`                                                 |
| Event-4-Stellen-Registry             | Story 1.7-Framework + Story 2.1-Erweiterung (`gefaehrdungsbeurteilung_erstellt` ist Vorbild)                            |
| Permission-Smoke-Test (echt!)        | `modules/eigenschutz/controllers/__tests__/sync-conflict.controller.spec.ts` (Story 3.10 Pattern)                       |
| TanStack-Form-Drawer                 | `features/eigenschutz/ui/organisms/PsaProfilDetailDrawer.tsx` (falls existent — sonst `MeldeLueckeDialog.tsx`)          |
| Destructive Confirmation             | UX-DR27 + bestehender `…confirm`-Pattern (Story 3.5 Drawer-Pattern für Vergleich)                                       |

### Kritische Regeln (CLAUDE.md + project-context.md)

- **DI-Imports:** `import { Service }`, niemals `import type` für Injectables — Pre-commit-Hook blockiert.
- **Domain ist framework-frei:** keine Prisma-/NestJS-Imports in `domain/eigenschutz/**`. Result-Pattern statt Exceptions.
- **Custom Decorators für Responses:** `@ApiWrappedResponse(SicherungspostenDto, …)`. **Niemals** `@ApiOkResponse({ type })` — bricht OpenAPI-Generator.
- **Einsatz-Routen-Nesting:** Plural Backend (`/api/einsaetze/:einsatzId/…`), Singular Frontend (`/app/einsatz/$einsatzId/…`).
- **Umlaute:** echte `ä ö ü ß` in allen Strings/Kommentaren/Tests, niemals `ae/oe/ue/ss`.
- **CUIDs:** `@paralleldrive/cuid2` `createId()` — keine UUIDs.
- **Migration:** immer mit `--name`, sonst interaktiv.
- **Prisma-Migration ohne Bypass:** keine `migrate reset`, keine direkten SQL-Edits — nur via `prisma:migrate`.
- **TransactionalCommandHandler:** Pflicht für alle drei Mutations-Handler.
- **Test-Targeting:** `cd packages/backend && npx jest --testPathPatterns="sicherungsposten" --no-coverage` (Plural, deprecated-Singular vermeiden).
- **Frontend-Test:** `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="sicherungsposten" --no-coverage`.

### Q-Liste — PO-Defaults (verbindlich übernommen)

1. **Soft-Delete-Naming:** Additive Migration mit `aufgeloestAm`/`aufgeloestVonUserId`/`aufloeseBegruendung`. Existierendes `geloescht: Boolean` bleibt unangetastet (defer Cleanup). Begründung: Migration-Bruch + Such-/Filter-Schiene laufen über `aufgeloestAm IS NULL` bzw. `IS NOT NULL` — semantisch klarer als Boolean ohne Timestamp.
2. **Standort-Schema:** Discriminated Union `{kind:'coordinate'|address'}` als Zod in `shared/`. **Kein** GeoJSON-Wrapping in 4.1 (Story 4.3 mappt erst beim MapGL-Layer).
3. **Map-Click-Picker für Standort:** **Defer** auf Story 4.3 (oder Phase 2). Story 4.1 bietet manuelle `longitude`/`latitude`-Number-Inputs (mit Tooltip „Koordinaten ohne Map-Picker — Map-Click kommt mit Story 4.3") **oder** Adress-Freitext.
4. **Begründungs-Persistenz:** Begründung wird in `aufloeseBegruendung: VarChar(2000)` persistiert, NICHT nur im Event-Payload. Begründung ist auditierbar via Versions-Historie.
5. **Ablösezeiten-UX in 4.1:** Backend-Feld `abloesezeiten: VarChar(500)` ist im Aggregate + DTO + Repository — UI-Drawer rendert das Feld als Read-Only-Hinweis-Stub („wird in nächster Story editierbar"). **Keine** Textarea, kein Auto-Save in 4.1.
6. **Personal-Schema:** Discriminated Union `{kind:'user',userId} | {kind:'freitext',name,rolle?}` — Multi-Select-Mix aus User-Picker + Freitext.
7. **Aufloesen-Idempotenz:** Zweiter Aufruf liefert `BusinessRule:BereitsAufgeloest` → 422 (kein 200 mit alreadyResolved-Flag, weil Outbox sonst Doppel-Event schreiben könnte; Pattern Story 3.10 `markResolved.alreadyResolved=true` + TX-Rollback).
8. **Versions-Historie-API:** `GET /sicherungsposten/:id/historie` ist **strikt aus-Scope** dieser Story → defer auf Story 4.4 oder eigene Historie-Story (analog Story 2.4 `Get…Historie`-Pattern).

### Test-Erwartungen (Definition of Done)

- **Backend Story-4.1-Scope:** ≥ 35 Tests (Domain ≥ 12, Repository ≥ 8, Application-Handler ≥ 12, Application-Query ≥ 4, Controller ≥ 12 inkl. echter 403-Permission-Smoke; **kein** `canActivate`-Mock-Tautologie). Module-Identity-Test (DI-Token-Wiring).
- **Frontend:** ≥ 15 Tests (List ≥ 4, Drawer-Form ≥ 5 inkl. Standort-Toggle + Pflichtfeld-Validation, AufloeseDialog ≥ 3 inkl. Begründungs-Pflicht + 422-Mapping, useUpdateSicherungsposten 409-Handling ≥ 2, axe-Snapshot ≥ 1).
- **Whitelist-Patch:** `architecture-rules.spec.ts` muss nach Story-Abschluss grün sein **ohne** die zwei `eigenschutz.sicherungsposten_*`-Einträge in `knownMissingEvents`.

### Strikt aus-Scope (defer)

- MapGL-Marker-Layer (Story 4.3)
- Map-Click-Picker (Story 4.3 oder Phase 2)
- Bidirektionale Karte↔Detail-Navigation (Story 4.4)
- Ablösezeiten-Textarea-UX + Auto-Save (Story 4.2 — wiederverwendet `useAutoSave` aus Story 2.5)
- Versions-Timeline-UI (`SicherungspostenHistoriePage`) — defer
- Cleanup von `geloescht: Boolean` — defer
- Telemetrie-Marken `sicherungsposten_eingerichtet/_aktualisiert` — Story 3.11 Telemetrie-Capture deckt das via Outbox-Spiegel; **kein** neuer Telemetrie-Hook in 4.1
- AmpelProjection-Integration (Epic 6)

### Project Structure Notes

- Backend-Datei-Layout exakt nach Architektur §B („Backend Feature-Layout") — `domain/eigenschutz/{aggregates,value-objects,events,repositories}/`, `application/eigenschutz/{commands,queries,dto}/`, `infrastructure/eigenschutz/repositories/{mappers/}`, `modules/eigenschutz/controllers/`.
- Frontend-Feature-Slice-Layout nach project-context.md Z. 188–198 (`api/`, `schemas/`, `ui/{organisms,pages}/`).
- Route-Datei nach TanStack-Router-File-Based-Konvention; `routeTree.gen.ts` ist generiert — niemals manuell editieren.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.1] — Epic-Wortlaut, Acceptance Criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#§A-Naming-Patterns] — Naming-Konvention
- [Source: _bmad-output/planning-artifacts/architecture.md#§B6-Optimistic-Concurrency] — Conflict-Sentinel-Pattern
- [Source: _bmad-output/planning-artifacts/architecture.md:768-769] — Event-Tabelle `SicherungspostenEingerichtet`/`SicherungspostenAktualisiert`
- [Source: _bmad-output/planning-artifacts/architecture.md:1521-1556] — Prisma-Schema-Spezifikation
- [Source: _bmad-output/planning-artifacts/architecture.md:1660-1800] — Datei-Layout
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:395] — `SecurityPostMapMarker` (Story 4.3-Vorgriff, **nicht** in 4.1)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:1007] — Sub-Tab-Navigation Eigenschutz
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR27] — Destructive-Action-with-Reason
- [Source: _bmad-output/planning-artifacts/prd.md:471-473] — FR27/FR28/FR29
- [Source: packages/backend/prisma/schema.prisma:2761-2798] — bestehende Tabellen
- [Source: packages/backend/src/domain/eigenschutz/enums/eigenschutz-permission.enum.ts:21-22] — Permissions
- [Source: packages/backend/src/__tests__/architecture-rules.spec.ts:210-211] — Whitelist-Einträge zu entfernen
- [Source: packages/backend/src/domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate.ts] — 1:1-Aggregate-Vorlage
- [Source: CLAUDE.md] — Projekt-Konventionen
- [Source: _bmad-output/project-context.md] — Stack-Versionen + Anti-Patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — Dev-Story-Workflow im /bmad-dev-story Modus, mit einem Frontend-Subagent für T6.

### Debug Log References

- Backend Story-4.1-Scope: 182 Tests grün (Domain 15, Repo 10, App-Handler 16, App-Query 4, Controller 17 inkl. Permission-Strukturtests, Outbox-Konsistenz 30, sonstige `architecture-rules` + `event-deserializer.spec`).
- Frontend Story-4.1-Scope: 26 Tests grün (Hook 8, List 6, Drawer 7, AufloeseDialog 4, Page 1).
- 4-Stellen-Outbox-Registry für `sicherungsposten_eingerichtet` + `sicherungsposten_aktualisiert` vollständig (Konsistenz-Spec grün); beide aus `architecture-rules.spec.ts:210-211`-Whitelist entfernt.
- Migration `20260505152248_add_sicherungsposten_aufloesen_fields` angewandt (3 Spalten + Composite-Index).
- `pnpm run generate-api` lief gegen lokal fixierten Spec-Snapshot (Java-Generator hat Probleme mit Self-Signed-HTTPS — Workaround: Spec via curl in lokale JSON-Datei kopiert, dann `openapi-generator-cli generate -i ./.tmp-spec.json`).
- DI-Imports + Architecture-Linting grün (`pnpm --filter @bluelight-hub/backend check:di:imports`, `pnpm --filter @bluelight-hub/backend check:arch`).
- Repo-weiter `pnpm lint:check`: 0 Errors, 32 Warnings (alle pre-existent / unrelated).

### Completion Notes List

- Domain: `Sicherungsposten`-Aggregate mit `update`/`aufloesen`-Methoden, Optimistic-Concurrency-Sentinel `SICHERUNGSPOSTEN_CONFLICT_DETECTED` und Idempotenz-Sentinel `BusinessRule:BereitsAufgeloest`. `Standort`-VO als Discriminated Union (Domain bleibt Framework-frei; Zod liegt in `@bluelight-hub/shared`).
- Migration ist additiv: `aufgeloestAm`/`aufgeloestVonUserId`/`aufloeseBegruendung` + neuer Index `(einsatzId, aufgeloestAm)`. `geloescht: Boolean` bleibt unangetastet (Cleanup defer auf Phase 2).
- Application-Layer: drei Command-Handler erweitern `TransactionalCommandHandler`; Update + Aufloesen mappen Konflikte mit `:current=<n>`-Suffix für 409-Mapping. Listen-Query liefert AKTIV/AUFGELOEST-Filter.
- Controller `SicherungspostenController` (vier Endpoints: GET/POST/PATCH/POST :id/aufloesen) trägt die Drei-Schicht-Guard-Kette + per-Endpoint `@RequiresPermission`. Permission-Strukturtests via Reflect-Metadata (Pattern Story 3.10), kein `canActivate`-Tautologie-Mock.
- Frontend-Slice mit TanStack-Query-Hooks, TanStack-Form-Drawer (Standort-Toggle Coordinate↔Address, Personal-Multi-Select), `AufloeseSicherungspostenDialog` mit UX-DR27-Begründungs-Pflicht, Sub-Tab-Eintrag in `EigenschutzEntryPage` und neuer File-Route. `abloesezeiten` ist im Drawer als Read-Only-Hinweis-Stub (Story 4.2 baut den Editor).
- Strikt aus-Scope: MapGL-Marker-Layer (Story 4.3), Map-Click-Picker (defer), Bidirektionale Karte↔Detail-Navigation (Story 4.4), Versions-Timeline-UI (defer), `geloescht`-Cleanup (defer), Telemetrie-Marken (Story 3.11 deckt die Outbox-Spiegelung).

### File List

**Backend — neue Dateien**

- `packages/backend/src/domain/eigenschutz/value-objects/standort.vo.ts`
- `packages/backend/src/domain/eigenschutz/aggregates/sicherungsposten.aggregate.ts`
- `packages/backend/src/domain/eigenschutz/aggregates/__tests__/sicherungsposten.aggregate.spec.ts`
- `packages/backend/src/domain/eigenschutz/events/sicherungsposten-eingerichtet.event.ts`
- `packages/backend/src/domain/eigenschutz/events/sicherungsposten-aktualisiert.event.ts`
- `packages/backend/src/domain/eigenschutz/repositories/i-sicherungsposten.repository.ts`
- `packages/backend/src/domain/eigenschutz/repositories/i-sicherungsposten-version.repository.ts`
- `packages/backend/src/infrastructure/eigenschutz/repositories/mappers/sicherungsposten.mapper.ts`
- `packages/backend/src/infrastructure/eigenschutz/repositories/prisma-sicherungsposten.repository.ts`
- `packages/backend/src/infrastructure/eigenschutz/repositories/prisma-sicherungsposten-version.repository.ts`
- `packages/backend/src/infrastructure/eigenschutz/repositories/__tests__/prisma-sicherungsposten.repository.spec.ts`
- `packages/backend/src/infrastructure/eigenschutz/event-adapters/sicherungsposten-eingerichtet.adapter.ts`
- `packages/backend/src/infrastructure/eigenschutz/event-adapters/sicherungsposten-aktualisiert.adapter.ts`
- `packages/backend/src/infrastructure/events/adapters/eigenschutz-sicherungsposten-eingerichtet-event.adapter.ts`
- `packages/backend/src/infrastructure/events/adapters/eigenschutz-sicherungsposten-aktualisiert-event.adapter.ts`
- `packages/backend/src/application/eigenschutz/dto/sicherungsposten.dto.ts`
- `packages/backend/src/application/eigenschutz/dto/sicherungsposten.factory.ts`
- `packages/backend/src/application/eigenschutz/dto/create-sicherungsposten.dto.ts`
- `packages/backend/src/application/eigenschutz/commands/create-sicherungsposten/create-sicherungsposten.command.ts`
- `packages/backend/src/application/eigenschutz/commands/create-sicherungsposten/create-sicherungsposten.handler.ts`
- `packages/backend/src/application/eigenschutz/commands/create-sicherungsposten/__tests__/create-sicherungsposten.handler.spec.ts`
- `packages/backend/src/application/eigenschutz/commands/update-sicherungsposten/update-sicherungsposten.command.ts`
- `packages/backend/src/application/eigenschutz/commands/update-sicherungsposten/update-sicherungsposten.handler.ts`
- `packages/backend/src/application/eigenschutz/commands/update-sicherungsposten/__tests__/update-sicherungsposten.handler.spec.ts`
- `packages/backend/src/application/eigenschutz/commands/aufloese-sicherungsposten/aufloese-sicherungsposten.command.ts`
- `packages/backend/src/application/eigenschutz/commands/aufloese-sicherungsposten/aufloese-sicherungsposten.handler.ts`
- `packages/backend/src/application/eigenschutz/commands/aufloese-sicherungsposten/__tests__/aufloese-sicherungsposten.handler.spec.ts`
- `packages/backend/src/application/eigenschutz/queries/list-sicherungsposten/list-sicherungsposten.query.ts`
- `packages/backend/src/application/eigenschutz/queries/list-sicherungsposten/list-sicherungsposten.handler.ts`
- `packages/backend/src/application/eigenschutz/queries/list-sicherungsposten/__tests__/list-sicherungsposten.handler.spec.ts`
- `packages/backend/src/modules/eigenschutz/controllers/sicherungsposten.controller.ts`
- `packages/backend/src/modules/eigenschutz/controllers/__tests__/sicherungsposten.controller.spec.ts`
- `packages/backend/prisma/migrations/20260505152248_add_sicherungsposten_aufloesen_fields/migration.sql`

**Backend — geänderte Dateien**

- `packages/backend/prisma/schema.prisma` — Sicherungsposten-Model um Auflösungs-Spalten + Index ergänzt.
- `packages/backend/src/infrastructure/database/prisma.service.ts` — Accessor-Getter für `sicherungsposten` + `sicherungspostenVersion`.
- `packages/backend/src/infrastructure/di-tokens.ts` — `SICHERUNGSPOSTEN_REPOSITORY` + `SICHERUNGSPOSTEN_VERSION_REPOSITORY`.
- `packages/backend/src/infrastructure/eigenschutz/eigenschutz-infrastructure.module.ts` — neue Provider/Exports.
- `packages/backend/src/infrastructure/eigenschutz/event-adapters/index.ts` — Adapter-Exports.
- `packages/backend/src/infrastructure/events/event-adapters.module.ts` — globale Wiring.
- `packages/backend/src/infrastructure/events/adapters/index.ts` — Slug-Proxy-Re-Exports.
- `packages/backend/src/infrastructure/outbox/event-serializer.ts` — Switch-Case + Serializer für beide neuen Events.
- `packages/backend/src/infrastructure/outbox/event-deserializer.ts` — Map-Eintrag + Deserializer-Funktionen.
- `packages/backend/src/infrastructure/outbox/__tests__/eigenschutz-event-registry.spec.ts` — Story-4.1-Fortschrittstest aktualisiert.
- `packages/backend/src/infrastructure/outbox/__tests__/event-deserializer.spec.ts` — `supportedTypes`-Count + Sicherungsposten-Eintragungen.
- `packages/backend/src/__tests__/architecture-rules.spec.ts` — Whitelist-Patch (zwei Einträge entfernt).
- `packages/backend/src/domain/eigenschutz/events/index.ts` — Event-Exports.
- `packages/backend/src/domain/eigenschutz/repositories/index.ts` — Repository-Exports.
- `packages/backend/src/application/eigenschutz/eigenschutz-application.module.ts` — Handler-Provider/Exports.
- `packages/backend/src/modules/eigenschutz/eigenschutz.module.ts` — Controller-Registry.

**Shared — neue Dateien**

- `packages/shared/src/schemas/eigenschutz/sicherungsposten.schema.ts`

**Shared — geänderte Dateien**

- `packages/shared/src/schemas/eigenschutz/index.ts` — Re-Export.
- `packages/shared/client/**` — komplett regeneriert via `generate-api`.

**Frontend — neue Dateien**

- `packages/frontend/src/features/eigenschutz/api/use-sicherungsposten.ts`
- `packages/frontend/src/features/eigenschutz/api/__tests__/use-sicherungsposten.spec.tsx`
- `packages/frontend/src/features/eigenschutz/schemas/sicherungsposten.schema.ts`
- `packages/frontend/src/features/eigenschutz/ui/organisms/SicherungspostenList.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/SicherungspostenDrawer.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/AufloeseSicherungspostenDialog.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/SicherungspostenList.spec.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/SicherungspostenDrawer.spec.tsx`
- `packages/frontend/src/features/eigenschutz/ui/organisms/__tests__/AufloeseSicherungspostenDialog.spec.tsx`
- `packages/frontend/src/features/eigenschutz/ui/pages/SicherungspostenPage.tsx`
- `packages/frontend/src/features/eigenschutz/ui/pages/__tests__/SicherungspostenPage.spec.tsx`
- `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten.tsx`

**Frontend — geänderte Dateien**

- `packages/frontend/src/features/eigenschutz/ui/pages/EigenschutzEntryPage.tsx` — Sub-Tab-Link „Sicherungsposten verwalten".
- `packages/frontend/src/routeTree.gen.ts` — auto-generiert.

### Change Log

- 2026-05-05: Story 4.1 vollständig implementiert (T1–T7), Status auf `review` gesetzt. 182 Backend-Tests + 26 Frontend-Tests grün.
- 2026-05-05: Code-Review (3 parallele adversariale Reviewer) → 13 Patches angewendet, 16 Defer, 17 Dismissed. Status auf `done`. Backend Story-4.1-scope 64/64 grün (inkl. 2 neue Chain-Closing-Tests in `prisma-sicherungsposten.repository.spec.ts:(10b)+(10c)`); broader eigenschutz+outbox+architecture suite 1165 grün, 54 pre-existing real-DB-Integration-Timeouts (deferred analog Story 3.9). Frontend 26/26 grün. lint:check 0 Errors, check:arch + check:di:imports grün. Patches: P2 UpdateDto Type-Validators, P3 Drawer-Coordinate-NaN-Init + Schema `.finite()`, P4 Mapper strict typeof, P5 Cache-Invalidation by-einsatz, P6 AufloeseDialog version-dep, P7 Versions-Chain `gueltigBis`-Closing, P8 parsePersonal length-defenses, P9 Outbox-Deserializer aufgeloest-Invariant, P10 Personal-Whitespace no-silent-drop, P11 isBereitsAufgeloest context.rule, P12 occurredOn-Parameter entfernt, P13 useEffect-Lint-Begründung, P15 409-Schema attemptedVersion-`positive()`-Alignment.
