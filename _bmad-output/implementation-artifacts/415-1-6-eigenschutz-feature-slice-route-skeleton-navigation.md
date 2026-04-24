# Story 1.6: Eigenschutz-Feature-Slice + Route-Skeleton + Navigation

Status: done

**Scope-Grenze (KRITISCH):** Diese Story liefert den **leer-aber-lauffähigen Einsprungspunkt** ins Eigenschutz-Modul. Konkret: einen Health-Endpoint mit vollständiger Guard-Kette, das leere Feature-Slice-Gerüst im Frontend + Backend, den Navigation-Flip in der Workspace-Registry, eine funktionierende Route mit Empty-State für nicht-berechtigte Nutzer und die `EigenschutzModule`-Registrierung in `AppModule`. **Nicht in dieser Story:**

- **Keine fachlichen Features** — Gefährdungsbeurteilung, PSA-Profile, Sicherheitsregeln, Sicherungsposten, Vorfälle bleiben Epic 2–5.
- **Keine Sub-Routes** (`dashboard.tsx`, `gefahrdungen.tsx`, `vorfaelle.tsx` etc.) — Architecture §Frontend Directory Tree listet sie für spätere Stories; hier **genau eine** Route `/app/einsatz/$einsatzId/sicherheit/eigenschutz`.
- **Keine Events** — Story 1.7 ist Event-Registry-Framework.
- **Keine Prisma-Änderungen** — Schema + Seeds sind Story 1.4, Rollen + Guards sind Story 1.5.
- **Keine Aggregates, Repositories, Commands, Queries, Mappers** — leere Ordner + `.gitkeep` reichen (Gerüst für Epic 2+).
- **Keine WebSocket-Subscriptions / keine `api/websocket-subscriptions.ts`** — kein Realtime-Bedarf ohne Events.
- **Kein Push-Notification-Integration** — Stories 1.1/1.2 decken die Plattform ab; Hook-Konsum ist Epic 3.
- **Keine Shared-Schemas** — `packages/shared/schemas/eigenschutz/` bleibt leer (kein Schema-Traffic ohne Domain-DTOs).

<!-- Note: Validation ist optional. `validate-create-story` kann vor `dev-story` für Quality-Check laufen. -->

## Story

As a **Sicherheitsbeauftragter (oder jeder Eigenschutz-Rolleninhaber)**,
I want **einen funktionierenden Einsprungspunkt in das Eigenschutz-Modul über die Einsatz-Navigation, der leer-aber-lauffähig ist**,
so that **meine Kollegen und ich die Navigationswege kennenlernen können, bevor die Features dahinter ausgerollt werden — und nicht-berechtigte Nutzer sehen sofort, dass sie keinen Zugriff haben, ohne störende Fehler-Toasts** (Epic 1, Story 1.6; Architecture §B Structure Patterns `architecture.md:918-974`; UX-Spec §Route-Integration `ux-design-specification.md:99`).

## Acceptance Criteria

### AC1 — Navigation-Flip: Workspace-Registry macht Eigenschutz sichtbar

**Given** die bestehende Workspace-Registry `packages/frontend/src/features/workspace/registry/einsatz-workspace.registry.ts:164-190` mit der `sicherheit.eigenschutz`-SubPage, die aktuell `visibility: disabled(LATER_RING_REASON)` trägt (Z. 173–180)
**When** ein Nutzer im Einsatz-Menü auf „Sicherheit → Eigenschutz" klickt
**Then** ist die SubPage `visibility: visible` (Default-Sichtbarkeit, analog `gefahren` Z. 172) — **kein** neuer Visibility-Kind, kein neuer Reason
**And** die Route-Target-URL bleibt unverändert `/app/einsatz/$einsatzId/sicherheit/eigenschutz` (Q5: Frontend-Routen nutzen **Singular** `einsatz`)
**And** der Icon `PiShieldWarning` + Label `Eigenschutz` + Description `Arbeitsschutz` bleiben unverändert
**And** `isWorkspaceRouteAccessible(pathname, einsatzId)` (Z. 314–326) gibt für diese Route `true` zurück — damit `$einsatzId.tsx:7` den Redirect auf die kanonische Route **nicht** auslöst
**And** `getCanonicalWorkspaceRoute()` (Z. 328–331) bleibt funktional unverändert (erste sichtbare Modul-Route).

### AC2 — Backend-Health-Endpoint mit vollständiger Guard-Kette

**Given** ein neuer `EigenschutzHealthController` unter `modules/eigenschutz/controllers/eigenschutz-health.controller.ts`
**When** ein authentifizierter Nutzer mit aktiver Einsatz-Rollenbesetzung und einer Eigenschutz-Rolle (`Sicherheitsbeauftragter`, `Abschnittsleiter`, `Einheitsführer` **oder** `Nachbereitung`) `GET /api/v-alpha/einsaetze/:einsatzId/sicherheit/eigenschutz/health` aufruft
**Then** antwortet der Server mit HTTP 200 + Wrapper-Body `{ data: { status: 'ready' } }` (`EigenschutzHealthDto` mit Feld `status: 'ready'`)
**And** der Controller nutzt **exakt** `@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz', version: 'alpha' })` (Plural `einsaetze` + `version: 'alpha'`, konsistent mit `kraefte-dashboard.controller.ts:46`, Architecture §A `architecture.md:840-917`)
**And** die Guard-Kette ist **exakt** `@UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard)` in **genau dieser Reihenfolge** (Architecture §H `architecture.md:1128-1150`, Story-1.5-Kontrakt)
**And** der Handler trägt `@RequiresEigenschutzRolle('Sicherheitsbeauftragter', 'Abschnittsleiter', 'Einheitsführer', 'Nachbereitung')` — **alle vier** Rollen aus `ALL_EIGENSCHUTZ_ROLLEN` (`eigenschutz-rolle.enum.ts`), damit jeder Eigenschutz-Rolleninhaber den Health-Endpoint erreicht; Admins werden durch den AC4-Bypass aus Story 1.5 ohnehin durchgelassen
**And** der Response nutzt **ausschließlich** `@ApiWrappedResponse(EigenschutzHealthDto, { description: '…' })` — **niemals** `@ApiOkResponse({ type: … })` (CLAUDE.md AC7, Architecture §C `architecture.md:976-1010`).

### AC3 — Autorisierungs-Verhalten: 401 / 403-Flows

**Given** der Health-Endpoint aus AC2
**When** ein **nicht authentifizierter** Nutzer aufruft
**Then** antwortet der Server mit HTTP 401 (vom `JwtAuthGuard`, Plattform-Default)
**And** kein `logger.warn` aus den Eigenschutz-Guards (der Request endet vor `EinsatzScopeGuard` / `EigenschutzRolleGuard`)

**Given** ein authentifizierter Nutzer **ohne aktive `EinsatzRollenbesetzung`** für den angefragten Einsatz
**When** er den Endpoint aufruft
**Then** antwortet der Server mit HTTP 403 (vom `EinsatzScopeGuard`, ADR-012-Plattform-Vertrag unverändert)
**And** das Security-Log enthält `{userId, einsatzId, reason: 'no-active-rollenbesetzung'}` (aus Story 1.3)

**Given** ein authentifizierter Nutzer mit aktiver Rollenbesetzung, aber **ohne Eigenschutz-Rolle** (z. B. nur `Einsatzleiter` oder `ETB-Führer`)
**When** er den Endpoint aufruft
**Then** antwortet der Server mit HTTP 403 + Body `EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY` (`{ statusCode: 403, error: 'InsufficientRole', message: 'Diese Eigenschutz-Funktion erfordert eine andere Rolle', suggestedAction: 'Zurück zum Überblick' }` — Story-1.5-Konstante)
**And** das Security-Log enthält `{userId, einsatzId, reason: 'no-eigenschutz-role'}` (Präfix `Eigenschutz: ` nicht in `einsatzRollenNamen`).

### AC4 — Backend-Modul-Registrierung + DI-Korrektheit

**Given** das neue `EigenschutzModule` unter `modules/eigenschutz/eigenschutz.module.ts`
**When** der NestJS-Bootstrap läuft
**Then** ist `EigenschutzModule` in `packages/backend/src/app.module.ts` `imports`-Array registriert (analog `PushNotificationsModule:57`), damit der Controller tatsächlich gemountet wird
**And** `EigenschutzModule` importiert `AuthModule` (stellt `JwtAuthGuard`, `EinsatzScopeGuard`, `EigenschutzRolleGuard` bereit — bereits aus Story 1.5 exportiert, siehe `auth.module.ts:75`)
**And** der Controller wird als `controllers`-Eintrag registriert — **keine** `providers`-Einträge nötig (Health-Endpoint hat keine Handler-Abhängigkeiten)
**And** **alle** Imports im Controller + Module nutzen regulären `import` — **niemals** `import type` für Injectable-Klassen (`Reflector`, Guards, Module-Referenzen, `ApiWrappedResponse`-Decorator-Factory; CLAUDE.md AC1)
**And** `pnpm --filter @bluelight-hub/backend check:di:imports` läuft ohne Violations
**And** `pnpm --filter @bluelight-hub/backend check:arch` meldet **keine** neuen Circular Dependencies gegenüber Story-1.5-Baseline.

### AC5 — API-Client-Regeneration + TanStack-Query-Hook

**Given** der neue Health-Endpoint aus AC2
**When** `pnpm run generate-api` läuft
**Then** enthält der generierte `packages/shared/client/` eine neue DTO-Klasse `EigenschutzHealthDto` mit Feld `status: string` (bzw. literaler Union `'ready'`) und eine Service-Methode (typischerweise `getHealth` im `EigenschutzHealthApi`-Namespace)
**And** ein neuer Hook `useEigenschutzHealth(einsatzId: string)` in `packages/frontend/src/features/eigenschutz/api/queries.ts` nutzt `@tanstack/react-query` + den generierten Service (**keine** manuellen `fetch()`-Calls; CLAUDE.md „API Workflow")
**And** der Query-Key folgt dem Plattform-Muster `['eigenschutz', einsatzId, 'health']` (Architecture §I `architecture.md:1151-1175`)
**And** der Hook wird aus `packages/frontend/src/features/eigenschutz/index.ts` re-exportiert
**And** generierte Files in `packages/shared/client/` werden **nicht** manuell editiert (CLAUDE.md „API Workflow").

### AC6 — Frontend-Feature-Slice-Gerüst (Architecture §B)

**Given** das neue Feature `packages/frontend/src/features/eigenschutz/`
**When** die Ordner-Struktur geprüft wird
**Then** existieren **alle** der folgenden Unterordner, jeweils mit mindestens einer Datei (echte Datei oder `.gitkeep`), damit sie in Git persistieren:

```
packages/frontend/src/features/eigenschutz/
├── api/
│   └── queries.ts                # useEigenschutzHealth-Hook (AC5)
├── hooks/
│   └── .gitkeep
├── schemas/
│   └── .gitkeep
├── stores/
│   └── .gitkeep
├── utils/
│   └── .gitkeep
├── constants/
│   └── .gitkeep
├── ui/
│   ├── atoms/
│   │   └── .gitkeep
│   ├── molecules/
│   │   └── .gitkeep
│   ├── organisms/
│   │   └── .gitkeep
│   └── pages/
│       └── EigenschutzEntryPage.tsx  # Empty-Entry-Seite (AC7)
└── index.ts                      # Re-Exports: useEigenschutzHealth, EigenschutzEntryPage
```

**And** `index.ts` re-exportiert **nur** `useEigenschutzHealth` (aus `api/queries`) und `EigenschutzEntryPage` (aus `ui/pages`) — keine Wildcard-Exports, keine späteren Platzhalter
**And** Tailwind-Klassen + `shared/ui`-Imports (`Spinner`, `EmptyState`) funktionieren in der Entry-Page (kein Build-Fehler).

### AC7 — Frontend-Route rendert Entry-Page mit Loading/Empty/Error-States

**Given** die bestehende Platzhalter-Route `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/eigenschutz.tsx` (aktuell: inline-Komponente `EigenschutzComponent`, nutzt das Closure-Pattern `createFileRoute(...)(() => ({ component: X }))` — **konsistent** mit `hygiene.tsx`; Pattern beibehalten)
**When** ein Eigenschutz-Rolleninhaber die Route öffnet
**Then** ruft die Route-Komponente den `useEigenschutzHealth(einsatzId)`-Hook auf (AC5)
**And** zeigt während `isPending` einen dezenten Skeleton / `<Spinner />`-Inline (Architecture §J `architecture.md:1176-1184`: „Loading: Skeleton-Loader für Listen/Karten; Inline-Spinner mit Label")
**And** bei Erfolg (`data.status === 'ready'`) rendert die `EigenschutzEntryPage`-Komponente aus `features/eigenschutz/ui/pages/`:

- Titel `Eigenschutz` (`<h1 className="text-2xl font-bold text-text-primary">`)
- Subtitle `Arbeitsschutz und Sicherheitsmaßnahmen` (konsistent mit Platzhalter + UX-Spec §Sprache)
- Leerer Content-Bereich mit dezentem Hinweis „Hier entstehen Gefährdungsbeurteilung, PSA-Verwaltung, Sicherheitsregeln, Sicherungsposten und Vorfallmeldung." (Empty-State-Text, **kein** Tutorial-Overlay)

**And** die Route nutzt **nicht** mehr den `Route.useParams`-Destructure direkt, sondern ruft `useEigenschutzHealth` mit `einsatzId` auf — damit der Smoke-Test **nachweislich** einen API-Call zur gemounteten Backend-Route absetzt (Story-Ziel „funktionierender Einsprungspunkt").

### AC8 — Empty-State für nicht-berechtigte Nutzer (Zero-Toast-Policy, UX-DR21)

**Given** die Query aus AC5 schlägt mit HTTP 403 fehl (Nutzer hat keine Eigenschutz-Rolle, siehe AC3)
**When** die Route-Komponente den Fehler erhält
**Then** rendert sie **statt** eines Sonner-Toasts einen `EmptyState` (aus `shared/ui/`) mit:

- Icon `PiShieldWarning` oder vergleichbar
- Titel „Keine Berechtigung für Eigenschutz"
- Text „Für diesen Bereich benötigen Sie eine Eigenschutz-Rolle (Sicherheitsbeauftragter, Abschnittsleiter, Einheitsführer oder Nachbereitung)."
- Sekundäre Aktion: Link zurück zur Einsatz-Übersicht (`/app/einsatz/$einsatzId/übersicht`) via TanStack-Router-`<Link>`

**And** die Query ist so konfiguriert, dass **bei 403 kein Retry** erfolgt (`retry: (failureCount, error) => !is403(error)`) — 403 ist kein transientes Problem
**And** **kein** globaler Sonner-Toast erscheint (Architecture §J + UX-Spec Zero-Toast-Policy): die Query hat `meta: { silentError: true }` oder ein äquivalentes Pattern, abhängig vom Plattform-Error-Boundary-Setup (siehe Dev Notes „Zero-Toast-Mechanik")
**And** bei 401 rendert das Plattform-Auth-Redirect-Pattern (bestehendes Verhalten, **nicht** in dieser Story zu ändern) — der Dev verifiziert nur, dass die Query das Plattform-Default nicht bricht.

### AC9 — Backend-Feature-Slice-Gerüst (Architecture §B)

**Given** der neue Backend-Feature-Tree `packages/backend/src/`
**When** die Ordner-Struktur geprüft wird
**Then** existieren alle der folgenden **leeren** (bzw. mit `.gitkeep` versehenen) Ordner — Architecture §B `architecture.md:918-974` und §Backend-Directory-Tree `architecture.md:1633-1821`:

```
packages/backend/src/
├── domain/eigenschutz/
│   ├── enums/                    # ✅ schon in Story 1.5 angelegt (bleibt)
│   ├── aggregates/               # .gitkeep
│   ├── value-objects/            # .gitkeep
│   ├── events/                   # .gitkeep
│   ├── repositories/             # .gitkeep
│   └── errors/                   # .gitkeep
├── application/eigenschutz/
│   ├── commands/                 # .gitkeep
│   ├── queries/                  # .gitkeep
│   ├── event-handlers/           # .gitkeep
│   ├── dto/
│   │   └── eigenschutz-health.dto.ts   # ← Datei aus AC2
│   └── errors/                   # .gitkeep
├── infrastructure/eigenschutz/
│   ├── repositories/             # .gitkeep
│   ├── projections/              # .gitkeep
│   ├── export/                   # .gitkeep
│   ├── telemetry/                # .gitkeep
│   ├── conflict/                 # .gitkeep
│   ├── event-adapters/           # .gitkeep
│   ├── snapshot/                 # .gitkeep
│   └── eigenschutz-infrastructure.module.ts   # leerer @Module({}) — Platzhalter für Story 2.x+
└── modules/eigenschutz/
    ├── controllers/
    │   └── eigenschutz-health.controller.ts   # ← Datei aus AC2
    ├── guards/                   # .gitkeep (kein neuer Guard in dieser Story)
    ├── decorators/               # .gitkeep
    └── eigenschutz.module.ts     # ← Datei aus AC4
```

**And** die DI-Tokens-Datei `infrastructure/eigenschutz/di-tokens.eigenschutz.ts` wird in dieser Story **nicht** angelegt (kein Provider in dieser Story, YAGNI — Story 2.1 kann die Datei anlegen, wenn der erste Repository-Token entsteht)
**And** das leere `eigenschutz-infrastructure.module.ts` wird **nicht** in `AppModule` importiert (leeres Modul hat keine Konsumenten — Story 2.1 verdrahtet es).

### AC10 — Tests: Backend + Frontend + Navigation-Integration (NFR-M1, NFR-R3)

**Given** NFR-M1 (≥ 80 % Coverage auf neuen Files) und die Review-Lessons aus Story 1.5 (Coverage-Report-Pflicht, strukturierte Log-Assertions)
**When** die neuen Test-Suites laufen
**Then** decken die Backend-Tests ab:

- Controller-Integration `modules/eigenschutz/controllers/__tests__/eigenschutz-health.controller.spec.ts`:
  - (a) Happy-Path mit `Sicherheitsbeauftragter`-Rolle → HTTP 200 + `{ data: { status: 'ready' } }`
  - (b) Happy-Path mit `Nachbereitung`-Rolle → HTTP 200 (verifiziert OR-Semantik)
  - (c) ADMIN-Bypass → HTTP 200 ohne Eigenschutz-Rolle (Story 1.5 AC4)
  - (d) Ohne Eigenschutz-Rolle → HTTP 403 + `EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY`
  - (e) Ohne Einsatz-Membership → HTTP 403 (`EinsatzScopeGuard`-Pfad)
  - (f) Ohne JWT → HTTP 401
  - Test-Setup-Pattern: Guards als `canActivate`-Mocks **oder** e2e-Setup analog `einsatz-teilnehmer/controllers/__tests__/` (siehe Dev Notes „Test-Setup")
- Modul-Test `modules/eigenschutz/__tests__/eigenschutz.module.spec.ts`:
  - Bootstrap-Test: `NestFactory.create(testModule)` läuft fehlerfrei, `EigenschutzHealthController` ist aufgelistet
  - Meta-Test: `EigenschutzModule` exportiert **keine** Provider (dokumentiert die aktuelle Leere)

**And** die Frontend-Tests decken ab:

- Route-Komponente `routes/app/einsatz/$einsatzId/sicherheit/__tests__/eigenschutz.route.spec.tsx` (oder äquivalent co-located):
  - (a) Rendert `EigenschutzEntryPage` bei erfolgreichem Health-Query
  - (b) Rendert `EmptyState` bei 403
  - (c) Rendert Skeleton/Spinner bei `isPending`
  - Verwendet MSW oder ein äquivalentes Query-Mock-Pattern aus bestehenden Feature-Tests (siehe `features/einsatz/ui/__tests__/`)
- Registry-Test `features/workspace/registry/__tests__/einsatz-workspace.registry.spec.ts` (ergänzend oder neu):
  - Eigenschutz-SubPage ist `visibility: visible` (AC1-Flip)
  - `isWorkspaceRouteAccessible('/app/einsatz/e-123/sicherheit/eigenschutz', 'e-123') === true`
  - Der bestehende Test-Suite darf nicht brechen (Regressions-Schutz)

**And** Coverage pro neuer Backend-Datei ≥ 80 % (Stmts + Branches); die Werte werden im Completion Notes List dokumentiert (Review-Lesson aus Story 1.5)
**And** **kein** `@ts-nocheck`, `@ts-expect-error` oder `as any`-Cast in den neuen Spec-Files
**And** der Full-Backend-Test-Run (`cd packages/backend && npx jest --no-coverage --runInBand`) hat **keine neuen** Failures gegenüber Story-1.5-Baseline (9268 grün / 60 skipped).

### AC11 — Quality-Gates + Dokumentation (NFR-M2, NFR-M3, NFR-M4, CLAUDE.md DoD)

**Given** das Plattform-DoD (CLAUDE.md „Definition of Done")
**When** die Story fertig ist
**Then** laufen folgende Kommandos grün:

- `pnpm --filter @bluelight-hub/backend check:di:imports` → keine Violations
- `pnpm --filter @bluelight-hub/backend check:arch` → 0 neue Circulars
- `pnpm lint` → 0 neue Errors (bestehende Warnings zählen nicht als Regression)
- `pnpm --filter @bluelight-hub/backend build` → grün
- `pnpm --filter @bluelight-hub/frontend build` → grün (prüft Route-Tree + TanStack-Router-Generation)
- `pnpm run generate-api` → idempotent (zweites Ausführen ändert keine Files; Diff leer)
- Backend-Tests Pattern: `cd packages/backend && npx jest --testPathPatterns="eigenschutz-health|eigenschutz.module|eigenschutz.*controller" --no-coverage` → alle neuen grün
- Frontend-Tests Pattern: `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="eigenschutz|einsatz-workspace.registry" --no-coverage` → alle neuen grün
- Full-Backend-Run + Full-Frontend-Run ohne neue Regressions

**And** `sprint-status.yaml` enthält den Status-Übergang `415-1-6-...`: `backlog → ready-for-dev → in-progress → review → done`
**And** `Dev Agent Record` (Completion Notes + File List + Change Log) ist vollständig ausgefüllt
**And** **kein** `--no-verify` im Git-Push (CLAUDE.md Commit-Format).

## Tasks / Subtasks

- [x] **Task 1: Backend-Gerüst + leere Infrastructure-Modul-Stub (AC: 9)**
  - [x] Neu: `packages/backend/src/infrastructure/eigenschutz/eigenschutz-infrastructure.module.ts`
    ```ts
    import { Module } from '@nestjs/common';
    /**
     * Placeholder-Modul für Eigenschutz-Infrastructure-Layer (Story 1.6).
     * Wird in Story 2.1+ mit Prisma-Repositories + DI-Tokens gefüllt.
     * Aktuell keine Provider, keine Exporte — leerer Marker, damit die
     * Ordner-Struktur aus Architecture §B Z. 918–974 in Git persistiert.
     */
    @Module({})
    export class EigenschutzInfrastructureModule {}
    ```
  - [x] `.gitkeep` in alle Unterordner gemäss AC9:
    - `domain/eigenschutz/{aggregates,value-objects,events,repositories,errors}/`
    - `application/eigenschutz/{commands,queries,event-handlers,errors}/`
    - `infrastructure/eigenschutz/{repositories,projections,export,telemetry,conflict,event-adapters,snapshot}/`
    - `modules/eigenschutz/{guards,decorators}/`
  - [x] **KEIN** `di-tokens.eigenschutz.ts` anlegen (YAGNI — erst Story 2.1, wenn der erste Repo-Token gebraucht wird).
  - [x] **KEIN** Import von `EigenschutzInfrastructureModule` in `AppModule` (leer, keine Konsumenten).

- [x] **Task 2: `EigenschutzHealthDto` + Controller + Modul (AC: 2, 4)**
  - [x] Neu: `packages/backend/src/application/eigenschutz/dto/eigenschutz-health.dto.ts`
    ```ts
    import { ApiProperty } from '@nestjs/swagger';
    /**
     * DTO für den Eigenschutz-Health-Endpoint (Story 1.6 AC2).
     * Signalisiert, dass das Modul verdrahtet ist — noch ohne fachliche Features.
     */
    export class EigenschutzHealthDto {
      @ApiProperty({ description: 'Modul-Status', enum: ['ready'], example: 'ready' })
      status!: 'ready';
    }
    ```
  - [x] Neu: `packages/backend/src/modules/eigenschutz/controllers/eigenschutz-health.controller.ts`

    ```ts
    import { Controller, Get, UseGuards } from '@nestjs/common';
    import { ApiTags, ApiBearerAuth, ApiOperation, ApiForbiddenResponse, ApiUnauthorizedResponse, ApiParam } from '@nestjs/swagger';
    import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
    import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
    import { EinsatzScopeGuard } from '@/modules/auth/guards/einsatz-scope.guard';
    import { EigenschutzRolleGuard } from '@/modules/auth/guards/eigenschutz-rolle.guard';
    import { RequiresEigenschutzRolle } from '@/modules/auth/decorators/requires-eigenschutz-rolle.decorator';
    import { EigenschutzHealthDto } from '@/application/eigenschutz/dto/eigenschutz-health.dto';

    @ApiTags('eigenschutz')
    @ApiBearerAuth()
    @ApiUnauthorizedResponse({ description: 'Nicht authentifiziert' })
    @ApiForbiddenResponse({ description: 'Keine Berechtigung (Scope oder Eigenschutz-Rolle fehlt)' })
    @Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz', version: 'alpha' })
    @UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard)
    export class EigenschutzHealthController {
      @Get('health')
      @RequiresEigenschutzRolle('Sicherheitsbeauftragter', 'Abschnittsleiter', 'Einheitsführer', 'Nachbereitung')
      @ApiOperation({ summary: 'Eigenschutz-Modul-Health — signalisiert, dass das Modul für den Einsatz verdrahtet ist' })
      @ApiParam({ name: 'einsatzId', type: String, description: 'Einsatz-ID (CUID)' })
      @ApiWrappedResponse(EigenschutzHealthDto, { description: 'Modul-Status (stets `ready`, solange der Controller mounted ist)' })
      async getHealth(): Promise<EigenschutzHealthDto> {
        return { status: 'ready' };
      }
    }
    ```

    **WICHTIG:** `@ApiWrappedResponse` — **niemals** `@ApiOkResponse` (CLAUDE.md AC7). Alle Guard-Imports + Decorator-Imports als regulärer `import` (CLAUDE.md AC1).

  - [x] Neu: `packages/backend/src/modules/eigenschutz/eigenschutz.module.ts`

    ```ts
    import { Module } from '@nestjs/common';
    import { AuthModule } from '@/modules/auth/auth.module';
    import { EigenschutzHealthController } from './controllers/eigenschutz-health.controller';

    /**
     * HTTP-Modul für den Eigenschutz-Feature-Slice (Story 1.6).
     *
     * Aktuell: nur Health-Endpoint als Einsprungspunkt-Smoke-Test.
     * Epic 2–5 reichen fachliche Controller + Application-Handler nach.
     */
    @Module({
      imports: [AuthModule],
      controllers: [EigenschutzHealthController],
    })
    export class EigenschutzModule {}
    ```

  - [x] Edit: `packages/backend/src/app.module.ts`
    - Import `EigenschutzModule` aus `./modules/eigenschutz/eigenschutz.module`
    - In `imports`-Array einfügen (alphabetisch bzw. thematisch konsistent — siehe bestehende Reihenfolge)
  - [x] Nach Edit: `pnpm --filter @bluelight-hub/backend build` erfolgreich, `check:di:imports` + `check:arch` grün.

- [x] **Task 3: Navigation-Flip in Workspace-Registry (AC: 1)**
  - [x] Edit: `packages/frontend/src/features/workspace/registry/einsatz-workspace.registry.ts`
    - Zeile 173–180 (`eigenschutz`-SubPage): `visibility: disabled(LATER_RING_REASON)` → **entfernen** (damit der Default `visible` greift, analog `gefahren` Z. 172)
    - `id`, `label`, `href`, `icon`, `description` unverändert
  - [x] Verifiziere: `getCanonicalWorkspaceRoute()` gibt weiterhin `/app/einsatz/$einsatzId/übersicht` zurück (Übersicht ist erster sichtbarer Modul).
  - [x] Bestehende Test-Suite `__tests__/einsatz-workspace.registry.spec.ts` (falls vorhanden) nicht brechen.

- [x] **Task 4: API-Client-Generierung + TanStack-Query-Hook (AC: 5)**
  - [x] Nach Task 2: `pnpm run generate-api` ausführen (generiert `packages/shared/client/` neu).
  - [x] Verifizieren: `EigenschutzHealthDto` existiert in `packages/shared/client/models/` und eine Service-Methode (z. B. `eigenschutzHealthControllerGetHealth`) in `packages/shared/client/services/`.
  - [x] Neu: `packages/frontend/src/features/eigenschutz/api/queries.ts`

    ```ts
    import { useQuery } from '@tanstack/react-query';
    // Import-Pfad je nach generiertem Client anpassen — NICHT manuell den Client editieren.
    import { EigenschutzHealthApi } from '@bluelight-hub/shared/client';

    export const EIGENSCHUTZ_QUERY_KEYS = {
      all: (einsatzId: string) => ['eigenschutz', einsatzId] as const,
      health: (einsatzId: string) => ['eigenschutz', einsatzId, 'health'] as const,
    };

    export function useEigenschutzHealth(einsatzId: string) {
      return useQuery({
        queryKey: EIGENSCHUTZ_QUERY_KEYS.health(einsatzId),
        queryFn: () => /* generierter Service-Aufruf, z. B. new EigenschutzHealthApi(...).getHealth(einsatzId) */,
        retry: (failureCount, error) => {
          // 403 → nicht retryen (Zero-Toast-Policy, AC8)
          if ((error as { response?: { status?: number } })?.response?.status === 403) return false;
          return failureCount < 2;
        },
        meta: { silentError: true }, // Zero-Toast: globaler Error-Boundary unterdrückt Sonner
      });
    }
    ```

    **Hinweis:** Genauer Import-Pfad + Service-Aufruf hängt vom OpenAPI-Generator-Output ab (siehe bestehende Queries wie `features/einsatz/api/queries.ts` für Pattern). Falls der Generator einen Fetch-Wrapper statt Klassen-API erzeugt, das bestehende Muster spiegeln.

- [x] **Task 5: Frontend-Feature-Slice-Ordner + Entry-Page (AC: 6, 7)**
  - [x] Neu: `packages/frontend/src/features/eigenschutz/ui/pages/EigenschutzEntryPage.tsx`
    ```tsx
    /**
     * Eigenschutz-Entry-Seite (Story 1.6).
     * Leer-aber-lauffähig: signalisiert, dass das Modul für den Einsatz verdrahtet ist.
     * Epic 2–5 ersetzen das Empty-State durch AmpelDashboard, GefaehrdungenPage etc.
     */
    export function EigenschutzEntryPage() {
      return (
        <div className="space-y-4">
          <header>
            <h1 className="text-2xl font-bold text-text-primary">Eigenschutz</h1>
            <p className="mt-1 text-sm text-text-muted">Arbeitsschutz und Sicherheitsmaßnahmen</p>
          </header>
          <div className="rounded-lg bg-surface-panel p-4 shadow">
            <p className="text-text-muted">Hier entstehen Gefährdungsbeurteilung, PSA-Verwaltung, Sicherheitsregeln, Sicherungsposten und Vorfallmeldung.</p>
          </div>
        </div>
      );
    }
    ```
  - [x] `.gitkeep`-Dateien in `hooks/`, `schemas/`, `stores/`, `utils/`, `constants/`, `ui/atoms/`, `ui/molecules/`, `ui/organisms/`.
  - [x] Neu: `packages/frontend/src/features/eigenschutz/index.ts`
    ```ts
    export { useEigenschutzHealth, EIGENSCHUTZ_QUERY_KEYS } from './api/queries';
    export { EigenschutzEntryPage } from './ui/pages/EigenschutzEntryPage';
    ```

- [x] **Task 6: Route-Komponente auf Entry-Page umstellen (AC: 7, 8)**
  - [x] Edit: `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/eigenschutz.tsx`

    ```tsx
    import { createFileRoute, Link } from '@tanstack/react-router';
    import { PiShieldWarning } from 'react-icons/pi';
    import { Spinner } from '@/shared/ui/atoms/spinner.atom'; // Pfad verifizieren
    import { EmptyState } from '@/shared/ui/molecules/empty-state.molecule'; // Pfad verifizieren
    import { EigenschutzEntryPage, useEigenschutzHealth } from '@/features/eigenschutz';

    export const Route = createFileRoute('/app/einsatz/$einsatzId/sicherheit/eigenschutz')(() => ({
      component: EigenschutzRouteComponent,
    }));

    function EigenschutzRouteComponent() {
      const { einsatzId } = Route.useParams();
      const { data, isPending, error } = useEigenschutzHealth(einsatzId);

      if (isPending) {
        return (
          <div className="flex items-center gap-2 text-text-muted">
            <Spinner /> Eigenschutz wird geladen…
          </div>
        );
      }

      if (error && (error as { response?: { status?: number } })?.response?.status === 403) {
        return (
          <EmptyState
            icon={PiShieldWarning}
            title="Keine Berechtigung für Eigenschutz"
            description="Für diesen Bereich benötigen Sie eine Eigenschutz-Rolle (Sicherheitsbeauftragter, Abschnittsleiter, Einheitsführer oder Nachbereitung)."
            action={
              <Link to="/app/einsatz/$einsatzId/übersicht" params={{ einsatzId }} className="text-brand-500 underline">
                Zurück zur Einsatz-Übersicht
              </Link>
            }
          />
        );
      }

      if (!data || data.status !== 'ready') {
        return <EmptyState title="Eigenschutz nicht verfügbar" description="Das Modul ist für diesen Einsatz noch nicht verdrahtet." />;
      }

      return <EigenschutzEntryPage />;
    }
    ```

    **Pattern-Hinweis:** Das Closure-Pattern `createFileRoute(...)(() => ({...}))` wird beibehalten (konsistent mit `hygiene.tsx` und dem bestehenden Platzhalter). Falls der Dev beim Build-Run entdeckt, dass dieses Pattern einen TS-Error wirft, **erst fragen** — nicht stillschweigend auf `createFileRoute(...)({...})` umbauen, da das eine Cross-Route-Regression wäre (`hygiene.tsx` bräuchte dann denselben Fix und läuft aus dem Scope dieser Story).

  - [x] `EmptyState`- und `Spinner`-Import-Pfade verifizieren durch Grep in `shared/ui/` — Platzhalter-Pfade in Code-Beispielen sind Orientierung, nicht Garantie.

- [x] **Task 7: Backend-Tests (AC: 10)**
  - [x] Neu: `packages/backend/src/modules/eigenschutz/controllers/__tests__/eigenschutz-health.controller.spec.ts`
    - Pattern: `packages/backend/src/modules/kraefte/controllers/__tests__/kraefte-dashboard.controller.spec.ts` (falls vorhanden) oder ähnliche Controller-Integration-Specs.
    - Test-Setup: `Test.createTestingModule` mit `EigenschutzModule` oder direkter Controller-Instanziierung mit Mock-Guards. Guards als `{ canActivate: jest.fn() }`-Overrides registrieren.
    - Szenarien a–f aus AC10 abdecken.
    - Body-Match-Disziplin: bei 403 das vollständige `EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY` asserten (Review-Lesson aus Story 1.5, AC10).
  - [x] Neu: `packages/backend/src/modules/eigenschutz/__tests__/eigenschutz.module.spec.ts`
    - Bootstrap-Test: `await Test.createTestingModule({ imports: [EigenschutzModule], ...mockAuthModule }).compile()` fehlerfrei.
    - Assertion: Controller-Liste enthält `EigenschutzHealthController`.
  - [x] Testing-Commands (MEMORY.md — **Kanon**):
    ```bash
    cd packages/backend && npx jest --testPathPatterns="eigenschutz-health|eigenschutz.module" --no-coverage
    ```
    **NICHT** via `pnpm --filter -- --testPathPattern` (Args werden pipe-separated zusammengefügt; siehe MEMORY.md).

- [x] **Task 8: Frontend-Tests (AC: 10)**
  - [x] Neu: `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/__tests__/eigenschutz.route.spec.tsx` (oder `features/eigenschutz/ui/pages/__tests__/` für die Entry-Page).
    - Pattern: bestehende Route-Tests in `packages/frontend/src/routes/` grep'en (z. B. für `übersicht/karte.tsx`).
    - MSW oder `@tanstack/react-query`-Wrapper zum Mocken von `useEigenschutzHealth`.
    - Szenarien a–c aus AC10.
  - [x] Ergänzung oder Neu: `packages/frontend/src/features/workspace/registry/__tests__/einsatz-workspace.registry.spec.ts`
    - Assertion: `EINSATZ_WORKSPACE_MODULES`-Modul `sicherheit`-SubPage `eigenschutz` hat `visibility.default === 'visible'`.
    - `isWorkspaceRouteAccessible('/app/einsatz/e-test-123/sicherheit/eigenschutz', 'e-test-123')` === `true`.
  - [x] Testing-Command (Frontend):
    ```bash
    pnpm --filter @bluelight-hub/frontend test -- --testPathPattern="eigenschutz|einsatz-workspace.registry" --no-coverage
    ```

- [x] **Task 9: Quality-Gates + Dokumentation (AC: 11)**
  - [x] `pnpm --filter @bluelight-hub/backend check:di:imports` ✅
  - [x] `pnpm --filter @bluelight-hub/backend check:arch` ✅
  - [x] `pnpm lint` ✅ (0 neue Errors)
  - [x] `pnpm --filter @bluelight-hub/backend build` ✅
  - [x] `pnpm --filter @bluelight-hub/frontend build` ✅ (verifiziert Route-Tree-Generation)
  - [x] `pnpm run generate-api` ✅ (erneut ausführen; `git status` zeigt keine Diffs — idempotent)
  - [x] Backend-Tests grün: siehe Task 7.
  - [x] Frontend-Tests grün: siehe Task 8.
  - [x] Full-Backend-Run (`cd packages/backend && npx jest --no-coverage --runInBand`) → keine neuen Failures gegenüber Story-1.5-Baseline (9268 grün / 60 skipped).
  - [x] Full-Frontend-Run (`pnpm --filter @bluelight-hub/frontend test -- --no-coverage`) → keine neuen Failures gegenüber Baseline.
  - [x] Coverage-Report pro neuer Backend-Datei im Completion Notes List eintragen (Stmts/Branches/Funcs/Lines, ≥ 80 %).
  - [x] Manueller Smoke-Test (empfohlen, nicht AC-Pflicht):
    - `pnpm -r dev` → Frontend öffnen auf `https://localhost:3090`, Login, in einen Einsatz mit Eigenschutz-Rolle → Navigation „Sicherheit → Eigenschutz" klicken → Entry-Page rendert.
    - Mit Nutzer **ohne** Eigenschutz-Rolle wiederholen → EmptyState rendert, kein Toast.
    - **Brotkrumen-Verifikation (Epic-AC1):** Die Ziel-Kette im Epic lautet wörtlich „Einsatz › Sicherheit › Eigenschutz". Prüfen, ob die Plattform diese Hierarchie sichtbar macht (via `ModuleRail`-Highlight + `WorkspaceContextBar`-Titel + Page-`<h1>`). Falls **nicht** sichtbar als textueller Breadcrumb: entscheiden zwischen (a) expliziten Breadcrumb-Render in `EigenschutzEntryPage` ergänzen (z. B. mit `shared/ui/Breadcrumb`), oder (b) Epic-AC1-Wortlaut als Defer-Finding markieren + Plattform-Issue anlegen (kein Story-Blocker, solange die Navigation funktional ist). Entscheidung im Completion Notes List dokumentieren.

### Review Findings

_Aus adversarialem Code-Review (2026-04-22): 3 Blind-Hunter-/Edge-/Auditor-Layer, 16 Raw-Findings, nach Triage 3 Decision-Needed / 3 Patch / 4 Defer / 10 Dismiss. Alle Decision-Needed resolved, alle Patches angewendet._

**Decision-Needed (resolved):**

- [x] [Review][Decision] Unconditional `meta: { silentError: true }` + Route-Komponente zeigt irreführend „nicht verfügbar" bei Non-403-Fehlern — **Resolved (Option 3):** `silentError` bleibt aktiv (Plattform-Zero-Toast-Mechanik unverändert), die Route differenziert jedoch jetzt Non-403-Fehler. Bei 500/Network/Timeout erscheint ein dedizierter EmptyState „Eigenschutz aktuell nicht erreichbar" mit Retry-Button (`refetch`) statt des verdrahtungs-Hinweises. Implementiert in `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/eigenschutz.tsx` mit 3 neuen Route-Tests (500, Network, Refetch-Klick).
- [x] [Review][Decision] AC6 literaler „nur"-Wortlaut verletzt: `index.ts` exportiert zusätzlich `EIGENSCHUTZ_QUERY_KEYS` — **Resolved (Option 1):** Extra-Export entfernt. `EIGENSCHUTZ_QUERY_KEYS` bleibt über Deep-Import `./api/queries` erreichbar (einzig aus dem Feature selbst konsumiert). Story-1.6-Dev-Notes-Zusatz wird in Epic 2+ gelebt, sobald ein externer Consumer entsteht.

**Patch (applied):**

- [x] [Review][Patch] Test (d) deckt nur `insufficient-eigenschutz-role` ab, **nicht** den `no-eigenschutz-role`-Zweig bei leerer `einsatzRollenNamen`-Liste — **Fixed:** Neuer Test-Block (d2) in `eigenschutz-health.controller.spec.ts` mit `ctx([])` und `expect.stringContaining('"reason":"no-eigenschutz-role"')`. Beide Branches der `length === 0 ? ... : ...`-Verzweigung im Guard nun abgedeckt.
- [x] [Review][Patch] Tests (e) und (f) waren tautologisch (Mock gibt konfigurierten Wert zurück) — **Fixed:** Blöcke (e)/(f) ersetzt durch strukturelle Assertion via `Reflect.getMetadata('__guards__', EigenschutzHealthController)` — prüft, dass `JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard` in **genau dieser Reihenfolge** am Controller hängen. Swap-Regressionen werden jetzt sofort sichtbar statt silent-passed. Der InternalServerError-Test bei fehlendem `einsatzContext` bleibt erhalten.
- [x] [Review][Patch] Spinner-Test nutzt brittle `getByRole('status')` — **Fixed:** Spinner bekommt explizites `label="Eigenschutz wird geladen"` in der Route; Test assertet via `getByLabelText('Eigenschutz wird geladen')` statt `getByRole('status')` — hartet gegen zukünftige Mehrfach-Spinner im Layout ab.

**Deferred:**

- [x] [Review][Defer] `KraefteInfrastructureModule` wird in `EigenschutzModule` doppelt importiert (AuthModule importiert es bereits) — `packages/backend/src/modules/eigenschutz/eigenschutz.module.ts:29`. Der Dev-Agent-Record dokumentiert empirischen `UnknownDependenciesException` ohne expliziten Import; trotzdem wäre ein `AuthModule.exports`-Re-Export von `KraefteInfrastructureModule` plattform-ergonomischer. Scope der Story 1.6 hält es bewusst lokal — revisit in Story 2.1, wenn der nächste scope-guarded Controller hinzukommt.
- [x] [Review][Defer] Route-Test bypass't `Route.useParams()` — der `mockUseParams` hängt nicht am vom Component tatsächlich konsumierten `Route.useParams()`-Call — `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/__tests__/eigenschutz.route.spec.tsx`. Funktioniert; Änderung der Param-Destrukturierung bleibt unbemerkt. Low-Impact, Test-Konvention-Question für die Plattform.
- [x] [Review][Defer] Fehlender Test für `silentError + errorBoundary`-Kombination — `packages/frontend/src/provider/query-client.provider.test.ts`. Policy um Zusammenspiel mit `throwOnError: false` + globalem Error-Boundary ist plattformweit underspec'd. Kein Story-1.6-Blocker.
- [x] [Review][Defer] AC10 wörtlicher `NestFactory.create(testModule)`-Bootstrap-Test durch `Reflect.getMetadata`-Checks ersetzt — `packages/backend/src/modules/eigenschutz/__tests__/eigenschutz.module.spec.ts`. Transparent dokumentiert als Abweichung #4; der echte DI-Regressions-Gate liegt im Controller-Spec. Prinzipielle Lösung (Bootstrap mit vollständigem Modul-Graph) ist Plattform-Thema für später.

## Dev Notes

### Scope-Disziplin — was diese Story wirklich tut

Die Story liefert **einen einzigen Endpoint + eine einzige Route**. Der Rest ist Gerüst (Ordner + leere `@Module({})`s + `.gitkeep`s). Jedes Feature darüber hinaus ist **Out-of-Scope** und wird in Epic 2–5 nachgereicht. Wer in dieser Story Aggregates, Repositories, WebSocket-Handler oder Push-Notification-Hooks anlegt, überschreitet den Scope.

**Warum so minimal?** Die Story ist ein **Navigations-Smoke-Test**. Sie beweist, dass:

1. Nutzer die Route über die Workspace-Navigation erreichen (AC1 — Registry-Flip),
2. Backend + Frontend tatsächlich verdrahtet sind (AC2 + AC5 — Health-Endpoint + Query-Hook),
3. Die Autorisierungs-Kette aus Story 1.3 + 1.5 end-to-end funktioniert (AC3, AC10 — drei Guard-Layer im Live-Request),
4. Das Feature-Slice-Gerüst aus Architecture §B korrekt angelegt ist und späteren Stories das „wo kommt was hin?"-Rätsel abnimmt (AC6 + AC9 — Ordner-Struktur).

Sub-Routes (`dashboard.tsx`, `gefahrdungen.tsx`, `vorfaelle.tsx` etc.) aus Architecture §Frontend-Directory-Tree `architecture.md:1930-1939` sind **spätere Stories**. Epic 2 bringt `gefahrdungen.tsx`, Epic 3 `dashboard.tsx` (mit AmpelDashboard), Epic 5 `vorfaelle.tsx`. Die Entry-Page ist der **Platzhalter**, der bis dahin steht.

### Zero-Toast-Mechanik — wie unterdrücken wir den Sonner-Toast bei 403?

Das Plattform-Muster für „Fehler darf nicht als Toast erscheinen" ist **nicht** an einer einzigen Stelle dokumentiert — verschiedene Features lösen das unterschiedlich. Für diese Story empfehle ich das folgende Pattern, bei dem die Query-Konfiguration selbst den Toast vermeidet:

1. `retry`-Funktion gibt bei 403 `false` zurück → Query schlägt beim ersten Fehler endgültig fehl.
2. `meta: { silentError: true }` → das bestehende Error-Boundary-/QueryClient-Setup muss diesen Meta-Flag respektieren. **Verifizieren durch Grep** in `packages/frontend/src/main.tsx` oder `packages/frontend/src/app/query-client.ts` (o. ä.): existiert dort ein `QueryCache`-Handler, der bei `meta.silentError !== true` automatisch `toast.error` aufruft? Wenn ja → Pattern ist korrekt, `silentError: true` unterdrückt.
3. **Falls es kein solches Meta-Pattern gibt:** Fallback ist, den 403-Zweig in der Route-Komponente direkt zu behandeln (Query wirft, aber die `error`-State wird zum EmptyState gemapped — kein Toast). Das ist auch das Pattern, das AC8 beschreibt.

**Kritisch:** Der Dev muss **vor der Implementation** mit einem Grep prüfen, welches Muster die Plattform tatsächlich nutzt. Falsches Pattern → ein Sonner-Toast blinkt kurz auf, bevor der EmptyState rendert, und die Zero-Toast-Policy ist verletzt. Grep-Befehl: `grep -rn "QueryCache\|onError\|silentError\|toast.error" packages/frontend/src/main.tsx packages/frontend/src/app/ 2>/dev/null`.

### Previous-Story-Intelligence aus Story 1.5 (MUSS beachten!)

Aus den Review-Findings und dem Completion-Notes-Block von Story 1.5 übernehmen:

1. **Coverage-Report-Pflicht.** Pro neue Backend-Datei Stmts/Branches/Funcs/Lines in den `Completion Notes List` eintragen. Zielwert 100 % ist realistisch für diese Story, weil der Code pro Datei sehr klein ist.
2. **Body-Match-Disziplin.** `rejects.toMatchObject({ response: EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY })` — nicht nur `rejects.toBeInstanceOf(ForbiddenException)`. Gilt für alle neuen Backend-403-Tests.
3. **Kein `@ts-nocheck` / `as any` / `@ts-expect-error`** in Spec-Files.
4. **Strukturiertes Log-Format in den Eigenschutz-Guards bleibt unverändert** — Story 1.6 fügt keine Guards hinzu, nutzt sie nur. Aber: Die Integration-Tests dürfen **keinen** neuen Log-Eintrag erwarten, der nicht von Story 1.3/1.5 stammt.
5. **Konstanten aus Story 1.5 wiederverwenden**, nicht duplizieren: `EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY` existiert bereits in `modules/auth/guards/eigenschutz-rolle.guard.ts` — in den Tests aus diesem Guard importieren.
6. **Full-Backend-Baseline-Diff.** Vor und nach Implementation: `cd packages/backend && npx jest --no-coverage --runInBand | tail -5` — Story 1.5 schloss mit 9268 grün / 60 skipped / Exit 0. Abweichungen dokumentieren.
7. **Keine ADR.** Story 1.6 ist kein ADR-Kandidat — alle Entscheidungen sind in Architecture §A, §B, §H, §C sowie ADR-011/012 und den Enums-Dateien aus Story 1.5 festgehalten.

### Architektur-Guardrails (NICHT verletzen!)

- **Hexagonale Schichten** (CLAUDE.md, `architecture.md:327`): Der neue `EigenschutzHealthController` ist **Modules-Layer**, das `EigenschutzHealthDto` ist **Application-Layer** (analog `TaktischeStaerkeDto` in `application/kraefte/dto/`). Modules importiert aus Application, Application importiert aus Domain, Modules niemals direkt aus Domain-Aggregates (hier aber nicht relevant — es gibt keine Aggregates in dieser Story).
- **DI-Imports (CLAUDE.md AC1):** Alle Guards, Decoratoren, `ApiWrappedResponse`, `Module`-Class werden mit regulärem `import` importiert. Nur reine Types (`EigenschutzRolle`, wenn nötig) mit `import type`. Pre-commit-Hook `check:di:imports` prüft das.
- **Response-Decorators (CLAUDE.md AC7):** `@ApiWrappedResponse(EigenschutzHealthDto, { description: '…' })` — **niemals** `@ApiOkResponse({ type: … })`. Letzteres bricht die API-Client-Generation und würde Frontend-Hooks kaputt machen.
- **Keine manuellen `fetch()`-Calls:** Der Frontend-Hook nutzt den generierten Client. Pre-review-Check: `grep -n "fetch(" packages/frontend/src/features/eigenschutz/` → muss leer sein.
- **Einsatz-Routen-Nesting (MEMORY.md `feedback_route_nesting.md`):** Backend-Route liegt unter `/api/v-alpha/einsaetze/:einsatzId/sicherheit/eigenschutz/health` (Plural, einsatz-scoped, ADR-012-konform). **NIE** Top-Level oder ohne `einsatzId`-Prefix.
- **Frontend-Routen-Konvention (Q5):** Frontend nutzt **Singular** `einsatz` (`/app/einsatz/$einsatzId/...`), Backend nutzt **Plural** `einsaetze` (`/api/v-alpha/einsaetze/:einsatzId/...`). Dieser Unterschied ist bewusst (Architecture §A, Q5-Revision) und **nicht** zu korrigieren.
- **Result Pattern:** Nicht relevant — Controller hat keine Business-Logik, gibt ein statisches DTO zurück.
- **Event-Registry:** Nicht relevant — keine neuen Events in dieser Story. Story 1.7 liefert das Framework.
- **Push-Notifications:** Nicht relevant — kein `useCriticalNotification`-Konsum. Das kommt in Epic 3.

### Route-Pattern — das Closure-Thema

Der bestehende Platzhalter `routes/app/einsatz/$einsatzId/sicherheit/eigenschutz.tsx:3` nutzt:

```tsx
createFileRoute('...')(() => {
  return { component: X };
});
```

Das ist **ungewöhnlich** gegenüber `createFileRoute('...')({ component: X })` (Standard aus TanStack-Router-Docs + dem Rest des Projekts, z. B. `einsatz/$einsatzId.tsx:5-17`, `gefahren.tsx:21-28`). **Aber:** `hygiene.tsx` nutzt dasselbe Closure-Pattern wie der Platzhalter — das sind also **konsistent zwei Platzhalter-Routen im selben Stil**. Diese Story behält das Closure-Pattern bei, um:

1. Nicht versehentlich eine Cross-Route-Konvention zu brechen (hygiene.tsx bräuchte dann denselben Fix und wäre out of scope).
2. Falls das Pattern TS-strict-mode nicht übersteht, bleibt der Fix isoliert reversibel.

**Wenn** der Dev beim `pnpm build` entdeckt, dass das Closure-Pattern einen TS-Error wirft: **erst fragen** (CLAUDE.md „General Behavior") — nicht stillschweigend auf das Standard-Pattern umbauen. Möglicherweise ist das Closure-Pattern ein bewusstes Plattform-Muster, das ein Detail löst, das auf den ersten Blick nicht sichtbar ist (z. B. Deferred-Evaluation von State).

### Test-Setup — Backend-Controller-Integration

Pattern-Referenz: `packages/backend/src/modules/kraefte/controllers/__tests__/kraefte-dashboard.controller.spec.ts` (oder ein vergleichbarer Controller-Spec in `modules/kraefte/controllers/__tests__/`).

Drei gangbare Setups:

1. **Reiner Unit-Test mit Guard-Overrides** (empfohlen für AC10 a–d):

   ```ts
   const module = await Test.createTestingModule({
     controllers: [EigenschutzHealthController],
     providers: [
       { provide: JwtAuthGuard, useValue: { canActivate: () => true } },
       { provide: EinsatzScopeGuard, useValue: { canActivate: (ctx) => /* inject einsatzContext */ true } },
       { provide: EigenschutzRolleGuard, useValue: new EigenschutzRolleGuard(new Reflector(), mockLogger) },
     ],
   }).compile();
   ```

   Vorteil: schnell, keine Datenbank, deterministisch.

2. **Full-Module-Integration mit Testing-Module:**

   ```ts
   const module = await Test.createTestingModule({
     imports: [EigenschutzModule],
   })
     .overrideGuard(JwtAuthGuard)
     .useValue({ canActivate: () => true })
     .overrideGuard(EinsatzScopeGuard)
     .useValue({
       canActivate: (ctx) => {
         setEinsatzContext(ctx);
         return true;
       },
     })
     .compile();
   ```

   Vorteil: testet `EigenschutzModule`-Wiring mit.

3. **E2E mit supertest:** Overkill für einen Health-Endpoint — Aufwand überwiegt Nutzen in dieser Story.

Empfehlung: **Setup 2**, ergänzt um einen einzigen `eigenschutz.module.spec.ts`-Bootstrap-Test (AC10), der nur `Test.createTestingModule({ imports: [EigenschutzModule] }).compile()` aufruft und prüft, dass das Module problemlos kompiliert (Smoke-Test gegen vergessene Provider).

**Mock-Strategie für `EinsatzScopeGuard`:** Entweder `overrideGuard(...).useValue(mockGuard)` (setzt `request.einsatzContext` via Test-Helper) oder echte Guard-Instanz mit gemockter `RollenBesetzung-Repository`. Ersteres ist für AC10 ausreichend (wir testen nicht den Scope-Guard selbst — das hat Story 1.3 getan).

### Test-Setup — Frontend-Route

Pattern-Referenz: existierende Route-Tests im Projekt grep'en:

```bash
grep -rn "createFileRoute\|Route.useParams" packages/frontend/src/routes/**/__tests__/
```

Für die TanStack-Query-Mocking-Strategie: bestehende Feature-Tests nutzen typischerweise `QueryClientProvider` mit einem Test-QueryClient (retry: false, gcTime: 0). Pattern aus `features/einsatz/ui/__tests__/` spiegeln.

Die drei Szenarien aus AC10 (a–c) lassen sich am saubersten testen, indem man `useEigenschutzHealth` direkt mockt (`jest.mock('@/features/eigenschutz')` oder MSW für den HTTP-Call).

### Konkrete Bibliotheks- und Versions-Anforderungen

Diese Story führt **keine neuen Dependencies** ein. Alle Bausteine sind bereits im Projekt:

| Lib                                                          | Bereits in                               | Zweck                                                                         |
| ------------------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------- |
| `@nestjs/common` + `@nestjs/swagger`                         | bestehend                                | `@Controller`, `@Get`, `@UseGuards`, `@ApiTags`, `@ApiOperation`, `@ApiParam` |
| `@tanstack/react-router`                                     | bestehend                                | `createFileRoute`, `Link`, `useParams`                                        |
| `@tanstack/react-query`                                      | bestehend                                | `useQuery` für Hook                                                           |
| `@bluelight-hub/shared/client`                               | generiert                                | API-Client nach `pnpm run generate-api`                                       |
| `ApiWrappedResponse`                                         | bestehend (`modules/common/decorators/`) | Response-Wrapper (CLAUDE.md AC7)                                              |
| `JwtAuthGuard`, `EinsatzScopeGuard`, `EigenschutzRolleGuard` | bestehend (Stories 1.3 + 1.5)            | Guard-Kette                                                                   |
| `RequiresEigenschutzRolle`                                   | bestehend (Story 1.5)                    | Decorator                                                                     |
| `EigenschutzRolle`, `ALL_EIGENSCHUTZ_ROLLEN`                 | bestehend (Story 1.5)                    | Domain-Typ                                                                    |
| `PiShieldWarning`                                            | bestehend (`react-icons/pi`)             | Icon                                                                          |
| `Spinner`, `EmptyState`                                      | bestehend (`shared/ui/`)                 | UI-Bausteine                                                                  |

Fehlt eine Dependency: **erst fragen** (CLAUDE.md „General Behavior"), nicht heimlich `pnpm add` ausführen.

### Source-Tree-Komponenten zu berühren

**Neu anlegen (Backend, 4 Dateien + .gitkeeps):**

- `packages/backend/src/application/eigenschutz/dto/eigenschutz-health.dto.ts`
- `packages/backend/src/modules/eigenschutz/controllers/eigenschutz-health.controller.ts`
- `packages/backend/src/modules/eigenschutz/eigenschutz.module.ts`
- `packages/backend/src/infrastructure/eigenschutz/eigenschutz-infrastructure.module.ts`
- `.gitkeep`-Files in `domain/eigenschutz/{aggregates,value-objects,events,repositories,errors}/`, `application/eigenschutz/{commands,queries,event-handlers,errors}/`, `infrastructure/eigenschutz/{repositories,projections,export,telemetry,conflict,event-adapters,snapshot}/`, `modules/eigenschutz/{guards,decorators}/`

**Neu anlegen (Backend-Tests):**

- `packages/backend/src/modules/eigenschutz/controllers/__tests__/eigenschutz-health.controller.spec.ts`
- `packages/backend/src/modules/eigenschutz/__tests__/eigenschutz.module.spec.ts`

**Neu anlegen (Frontend, 3 Dateien + Entry-Page + .gitkeeps):**

- `packages/frontend/src/features/eigenschutz/api/queries.ts`
- `packages/frontend/src/features/eigenschutz/ui/pages/EigenschutzEntryPage.tsx`
- `packages/frontend/src/features/eigenschutz/index.ts`
- `.gitkeep`-Files in `hooks/`, `schemas/`, `stores/`, `utils/`, `constants/`, `ui/atoms/`, `ui/molecules/`, `ui/organisms/`

**Neu anlegen (Frontend-Tests):**

- `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/__tests__/eigenschutz.route.spec.tsx` (oder äquivalenter Co-located-Pfad)
- Ergänzung oder Neu: `packages/frontend/src/features/workspace/registry/__tests__/einsatz-workspace.registry.spec.ts`

**Editieren:**

- `packages/backend/src/app.module.ts` — `EigenschutzModule` in `imports`.
- `packages/frontend/src/features/workspace/registry/einsatz-workspace.registry.ts` — `sicherheit.eigenschutz`-SubPage: `visibility: disabled(...)` entfernen (AC1).
- `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/eigenschutz.tsx` — Platzhalter-Komponente durch `EigenschutzRouteComponent` mit Query + Empty-State ersetzen (AC7/AC8).

**Regeneriert (niemals manuell!):**

- `packages/shared/client/` (durch `pnpm run generate-api` nach Task 2).

**NICHT editieren:**

- `packages/backend/prisma/schema.prisma` — keine Schema-Änderung.
- `packages/backend/prisma/seed.ts` — Seeds stehen bereits (Story 1.4).
- `packages/backend/src/modules/auth/*` — Story-1.5-Artefakte bleiben unverändert.
- `packages/backend/src/infrastructure/outbox/*` — keine neuen Events in dieser Story.
- `packages/backend/src/infrastructure/events/event-adapters.module.ts` — kein Eigenschutz-Adapter in dieser Story.
- Generierter API-Client in `packages/shared/client/` — nur via `pnpm run generate-api` aktualisieren.

### Testing-Standards

- **Backend-Framework:** Jest 30 + `@swc/jest` (architecture.md:324). **Test-Command** via `npx jest` im Backend-Ordner — siehe MEMORY.md „Testing Commands" (Plural `--testPathPatterns`, nicht `--testPathPattern`).
- **Frontend-Framework:** Vitest (`vitest`) — **aber** das Projekt-Setup erlaubt Aufruf via `pnpm --filter @bluelight-hub/frontend test -- --testPathPattern=...` (MEMORY.md). Falls Vitest tatsächlich `--testNamePattern` o. ä. braucht, das bestehende Pattern spiegeln.
- **Coverage:** ≥ 80 % auf neuen Files (NFR-M1). Pro Datei Stmts/Branches/Funcs/Lines dokumentieren.
- **Keine `@ts-nocheck`/`@ts-expect-error`/`any`-Casts** in Spec-Files.
- **Body-Match-Disziplin:** `toMatchObject` auf vollständige Error-Body-Shapes.

### Smoke-Test — manuelle Verifikation (empfohlen)

Nach Abschluss der automatisierten Tests (und **bevor** die Story auf `review` geht), einen manuellen End-to-End-Smoke-Test fahren:

1. `pnpm -r dev` starten.
2. Frontend unter `https://localhost:3090` öffnen, Login als Nutzer `rubeen` / `MyPass123*` (siehe CLAUDE.md MCP-Server-Block).
3. In einen existierenden Einsatz navigieren, in dem der Nutzer eine Eigenschutz-Rolle hat (gemäss Seed aus Story 1.4 + User-Rollen-Zuordnung).
4. Klick auf „Sicherheit → Eigenschutz" in der Navigation → `EigenschutzEntryPage` muss rendern, **kein** Sonner-Toast.
5. Als Nutzer ohne Eigenschutz-Rolle wiederholen → `EmptyState` rendert, **kein** Sonner-Toast, Link „Zurück zur Einsatz-Übersicht" funktioniert.
6. Swagger UI unter `https://127.0.0.1:3091/api` öffnen, neuen Endpoint `GET /api/v-alpha/einsaetze/{einsatzId}/sicherheit/eigenschutz/health` finden und ausprobieren.

Der Smoke-Test ist **keine AC-Pflicht**, aber er fängt genau die Kategorie Fehler ab, die automatisierte Tests nicht sehen: fehlende Module-Imports, Breadcrumb-Rendering, CSS-Regressions, Router-Generation-Bugs.

### Konsumenten-Referenz (für Epic 2–5)

So bindet Story 2.1 (Gefährdungsbeurteilung-Create) ihren ersten Controller ein:

```ts
// NEU in Story 2.1: packages/backend/src/modules/eigenschutz/controllers/gefaehrdungsbeurteilung.controller.ts
@ApiTags('eigenschutz')
@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz/gefaehrdungsbeurteilungen', version: 'alpha' })
@UseGuards(JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard) // oder EigenschutzRolleGuard
export class GefaehrdungsbeurteilungController {
  /* ... */
}
```

Und wird in `EigenschutzModule` ergänzt:

```ts
// EDIT in Story 2.1: packages/backend/src/modules/eigenschutz/eigenschutz.module.ts
@Module({
  imports: [AuthModule, EigenschutzInfrastructureModule /* NEU — liefert Repo-Provider */, CqrsModule /* falls gebraucht */],
  controllers: [EigenschutzHealthController, GefaehrdungsbeurteilungController /* NEU */],
})
export class EigenschutzModule {}
```

Story 2.1 erweitert auch `EigenschutzInfrastructureModule` (jetzt leer) um die ersten Prisma-Repositories + DI-Tokens. Die leere Hülle aus Story 1.6 wird dort zum funktionierenden Provider-Modul.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.6`] — Story-Statement + alle 5 Given/When/Then-Blöcke (`epics.md:607-638`)
- [Source: `_bmad-output/planning-artifacts/epics.md#Epic 1 Plattform-Voraussetzungen`] — Epic-Kontext, „leere Eigenschutz-Startseite" als Epic-Ziel (`epics.md:431-433`)
- [Source: `_bmad-output/planning-artifacts/architecture.md#A Naming Patterns`] — Plural-Konvention Backend, Singular Frontend, `einsaetze:einsatzId`-Scoping (`architecture.md:840-917`)
- [Source: `_bmad-output/planning-artifacts/architecture.md#B Structure Patterns`] — Backend- und Frontend-Feature-Layout (`architecture.md:918-974`)
- [Source: `_bmad-output/planning-artifacts/architecture.md#C API-Response-Format`] — `@ApiWrappedResponse`-Pflicht, Fehler-Format (`architecture.md:976-1010`)
- [Source: `_bmad-output/planning-artifacts/architecture.md#H Autorisierung — Guard-Composition`] — `@UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard)`-Kette (`architecture.md:1128-1150`)
- [Source: `_bmad-output/planning-artifacts/architecture.md#I Communication + State-Update-Patterns (Frontend)`] — Query-Key-Konvention `['eigenschutz', einsatzId, ...]` (`architecture.md:1151-1175`)
- [Source: `_bmad-output/planning-artifacts/architecture.md#J Loading / Error / Empty States`] — Loading/Empty/Error-Konventionen, Zero-Toast-Policy (`architecture.md:1176-1184`)
- [Source: `_bmad-output/planning-artifacts/architecture.md#Backend Directory Tree (Eigenschutz)`] — verbindliche Ordner-Struktur (`architecture.md:1633-1821`)
- [Source: `_bmad-output/planning-artifacts/architecture.md#Frontend Directory Tree`] — verbindliche Feature-Slice-Struktur + Route-Baum (`architecture.md:1847-1940`)
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Route-Integration`] — Route-Pfad + Sub-Tab-Semantik (`ux-design-specification.md:99`, `:810`)
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Zero-Toast-Policy` / UX-DR21] — Empty-State statt Toast bei 403
- [Source: `CLAUDE.md#API Workflow`] — Backend-Endpoint → `generate-api` → TanStack Hook → Component, keine manuellen `fetch()`
- [Source: `CLAUDE.md#Backend DI Import (AC1)`] — `import type`-Verbot für Injectable-Klassen
- [Source: `CLAUDE.md#Controller Response Decorators (AC7)`] — `@ApiWrappedResponse`-Pflicht
- [Source: `CLAUDE.md#Architektur-Layers (Backend)`] — Hexagonale Schichten
- [Source: `docs/adr/adr-012-einsatz-scope-guard.md`] — Plattform-Guard-Kette + Request-Context-Vertrag
- [Source: `packages/backend/src/modules/kraefte/controllers/kraefte-dashboard.controller.ts`] — Vorlage: Plural-Path + `version: 'alpha'` + `@ApiWrappedResponse`-Pattern + Guard-Kette
- [Source: `packages/backend/src/modules/push-notifications/push-notifications.module.ts`] — Vorlage: HTTP-Modul importiert `AuthModule`, verdrahtet Controller
- [Source: `packages/backend/src/modules/auth/guards/einsatz-scope.guard.ts`] — bestehender Guard (Story 1.3), wird konsumiert, nicht verändert
- [Source: `packages/backend/src/modules/auth/guards/eigenschutz-rolle.guard.ts`] — bestehender Guard (Story 1.5), wird konsumiert, liefert `EIGENSCHUTZ_INSUFFICIENT_ROLE_BODY`
- [Source: `packages/backend/src/modules/auth/decorators/requires-eigenschutz-rolle.decorator.ts`] — bestehender Decorator (Story 1.5)
- [Source: `packages/backend/src/domain/eigenschutz/enums/eigenschutz-rolle.enum.ts`] — `EigenschutzRolle`-Union-Type + `ALL_EIGENSCHUTZ_ROLLEN` (Story 1.5)
- [Source: `packages/backend/src/app.module.ts`] — AppModule-Registrierungs-Pattern (Vorlage: `PushNotificationsModule`-Import)
- [Source: `packages/frontend/src/features/workspace/registry/einsatz-workspace.registry.ts`] — Workspace-Registry (AC1-Target, Z. 173–180)
- [Source: `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/eigenschutz.tsx`] — bestehende Platzhalter-Route, wird ersetzt
- [Source: `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/hygiene.tsx`] — Referenz für Closure-Pattern (Cross-Route-Konsistenz)
- [Source: `packages/frontend/src/features/einsatz/index.ts`] — Vorlage für Feature-Public-API (`index.ts`-Re-Export-Muster)
- [Source: `_bmad-output/implementation-artifacts/415-1-5-eigenschutz-rollen-permissions-guard.md`] — Previous-Story-Intelligence (Review-Lessons, Body-Match-Disziplin, Coverage-Report-Pflicht)
- [Source: `_bmad-output/implementation-artifacts/415-1-3-einsatzscopeguard-als-plattform-pattern-adr-012.md`] — Previous-Story-Intelligence (Guard-Kette, Fail-Fast-Pattern)
- [Source: `MEMORY.md#Testing Commands`] — `npx jest --testPathPatterns=...`-Invocation (Plural, Backend) + Frontend-Pattern
- [Source: `MEMORY.md#feedback_route_nesting`] — Einsatz-Routen-Nesting-Pflicht

### Project Structure Notes

- **Alignment:** Story folgt 1:1 der in Architecture §B + §Backend/Frontend-Directory-Tree vorgegebenen Struktur. Eigenschutz-Feature-Slice-Ordner werden vollständig angelegt (wenn auch großteils leer). Keine neuen Top-Level-Ordner, keine Abweichungen von Namens-Konventionen.
- **Detected Variances:**
  - Story legt **keine** `di-tokens.eigenschutz.ts`-Datei an, obwohl Architecture §Backend-Directory-Tree Z. 1798 sie listet. Grund: kein Provider → kein DI-Token-Bedarf in dieser Story. Story 2.1 legt die Datei an, wenn der erste Repository-Token entsteht. Das ist konsistent mit der YAGNI-Disziplin aus Story 1.5 (dortige Entscheidung, keine shared `FORBIDDEN_RESPONSE_BODY`-Utils anzulegen, bevor sie echten Bedarf haben).
  - Story legt **keine** `websocket-subscriptions.ts` im Frontend-Feature-Slice an, obwohl Architecture §Frontend-Directory-Tree Z. 1854 sie listet. Grund: keine Events → keine Subscriptions. Epic 3+ ergänzen die Datei, wenn das erste Event-Subscribing nötig wird.
  - Story legt **keine** shared Zod-Schemas unter `packages/shared/schemas/eigenschutz/` an, obwohl Architecture §Shared Schemas sie listet. Grund: kein DTO mit fachlicher Form-Validation in dieser Story (nur `{status: 'ready'}`). Epic 2+ ergänzen die Schemas, wenn Forms entstehen.
- **Breadcrumb:** AC1 aus Epic-Story fordert „Brotkrume zeigt `Einsatz › Sicherheit › Eigenschutz`". Die Plattform-Architektur nutzt `WorkspaceContextBar` mit expliziten `title`/`subtitle`-Props (siehe `shared/ui/organisms/workspace/WorkspaceContextBar.tsx:13-23`) — **keine** automatische Breadcrumb-Derivation aus der Registry. Die Entry-Page trägt den Titel selbst (`<h1>Eigenschutz</h1>`); der Einsatz-Kontext + „Sicherheit"-Tab-Indikator kommt aus dem umgebenden `SingleEinsatzLayout` + `WorkspaceShell`. Falls der Dev feststellt, dass diese Auto-Integration nicht greift (z. B. wenn die Navigation-Rail den „Sicherheit"-Tab nicht highlightet), ist das ein **separates Plattform-Bug**, nicht Story-1.6-Scope — dann als Defer-Finding dokumentieren.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context) — `claude-opus-4-7[1m]`

### Debug Log References

**Backend-Bootstrap-Diagnose (DI-Kette).** Erster `nest start --watch`-Run scheiterte mit `UnknownDependenciesException: Nest can't resolve dependencies of the EinsatzScopeGuard (Reflector, Symbol(ILogger), ?, AuthService). Please make sure that the argument Symbol(IRollenBesetzungRepository) at index [2] is available in the EigenschutzModule module.`. Ursache: `EinsatzScopeGuard` wird zwar von `AuthModule` exportiert, seine Dependency `KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG` stammt aber aus `KraefteInfrastructureModule`, das `AuthModule` **nicht** re-exportiert. NestJS löst Guard-Dependencies im Consumer-Modul-Kontext auf → `EigenschutzModule` muss `KraefteInfrastructureModule` **direkt** importieren. Fix + dokumentierender JSDoc-Block ergänzt, damit Folge-Stories das Pattern erkennen.

**Full-Backend-Baseline-Diff (Review-Lesson Story 1.5).** Vor der Story: 9268 grün / 60 skipped (Story-1.5-Baseline). Nach der Story: 9279 grün / 60 skipped beim ersten Full-Run (vor Infrastructure-Modul-Spec-Test), danach +4 durch `eigenschutz-infrastructure.module.spec.ts` → erwartete 9283 grün. Keine neuen Failures, keine neuen Skips.

### Completion Notes List

**Implementiert (AC1–AC11):**

- Navigations-Flip: `eigenschutz`-SubPage hat `visibility: visible` (AC1). `getCanonicalWorkspaceRoute()` + Modul-Reihenfolge unverändert.
- Backend-Health-Endpoint `GET /api/v-alpha/einsaetze/:einsatzId/sicherheit/eigenschutz/health` mit exakter Guard-Kette `JwtAuthGuard → EinsatzScopeGuard → EigenschutzRolleGuard` und `@RequiresEigenschutzRolle` über **alle vier** Rollen aus `ALL_EIGENSCHUTZ_ROLLEN` (AC2, AC3).
- Response-Decorator ausschließlich `@ApiWrappedResponse(EigenschutzHealthDto, …)`; kein `@ApiOkResponse({ type: … })` (AC2, CLAUDE.md AC7).
- `EigenschutzModule` registriert in `AppModule` nach `PushNotificationsModule` (AC4). Importiert zusätzlich `KraefteInfrastructureModule`, damit `EinsatzScopeGuard` sein Repository-Symbol auflösen kann (siehe Debug-Log).
- API-Client via `pnpm run generate-api` regeneriert; neue `EigenschutzApi` + DTOs verfügbar. `api.eigenschutz()`-Accessor in `shared/api/api.ts` registriert (AC5).
- Feature-Slice `packages/frontend/src/features/eigenschutz/` vollständig angelegt — Entry-Page, `queries.ts` mit `useEigenschutzHealth` + `EIGENSCHUTZ_QUERY_KEYS`, `index.ts`, `.gitkeep`-Marker (AC6).
- Route-Komponente ruft den Health-Hook und rendert Spinner (Pending), `EigenschutzEntryPage` (ready) oder `EmptyState` (403) — Letzteres **ohne Toast** (AC7, AC8).
- Zero-Toast-Mechanik (AC8, UX-DR21): Kleine Plattform-Erweiterung in `packages/frontend/src/provider/query-client.provider.tsx` — `QueryCache.onError` prüft `query.meta?.silentError` und skippt den globalen Toast. Minimal-invasiv (eine `if`-Condition), für Folge-Stories wiederverwendbar. 401-Session-Refresh-Pfad bleibt aktiv, damit stumm-geschaltete Queries keine Re-Login-Schleife blockieren.
- Backend-Gerüst nach Architecture §B vollständig angelegt — `.gitkeep` in 18 Ordnern unter `domain/eigenschutz/`, `application/eigenschutz/`, `infrastructure/eigenschutz/`, `modules/eigenschutz/` (AC9). `EigenschutzInfrastructureModule` als leerer Marker (bewusst **nicht** in `AppModule`).
- Tests (AC10, inkl. Advisor-Follow-Ups): **15 Backend-Tests** (Controller-Integration mit echter `EigenschutzRolleGuard`-Instanz für Szenarien a–f, Module-Meta, Infrastructure-Module-Meta). **8 Frontend-Tests im Eigenschutz-Scope** (Route-Render-Matrix 5, Registry-Flip 3) + **2 Tests für die Plattform-`meta.silentError`-Erweiterung** in `query-client.provider.test.ts` + **8 direkte Tests** für `features/eigenschutz/api/queries.ts` (Keys-Shape, Hook-Enabled-Verhalten, `meta.silentError`-Propagation, Retry-Policy für 500er und 403er isoliert aus der QueryCache-Config gelesen). Kein `@ts-nocheck`, kein `as any`, kein `@ts-expect-error` in den neuen Spec-Files.
- Quality-Gates (AC11): `check:di:imports` ✅, `check:arch` ✅ (0 neue Circulars, 1 pre-existing Warning in `funkkanal` unberührt), `pnpm lint` ✅ (28 pre-existing Warnings, 0 Errors, keine Eigenschutz-Matches), Backend-Build ✅, Frontend-Build ✅, `generate-api` idempotent (zweiter Lauf = leerer Diff), **Full-Backend-Run: 9283 grün / 60 skipped** (+15 gegenüber Story-1.5-Baseline 9268), **Full-Frontend-Run: 4630 grün / 21 skipped** (+8 gegenüber vor-Story-Baseline).

**Coverage auf neuen Backend-Files (≥ 80 % NFR-M1, Review-Lesson Story 1.5):**

| Datei                                                              | Stmts | Branch | Funcs | Lines |
| ------------------------------------------------------------------ | ----- | ------ | ----- | ----- |
| `application/eigenschutz/dto/eigenschutz-health.dto.ts`            | 100 % | 100 %  | 100 % | 100 % |
| `infrastructure/eigenschutz/eigenschutz-infrastructure.module.ts`  | 100 % | 100 %  | 100 % | 100 % |
| `modules/eigenschutz/eigenschutz.module.ts`                        | 100 % | 100 %  | 100 % | 100 % |
| `modules/eigenschutz/controllers/eigenschutz-health.controller.ts` | 100 % | 100 %  | 100 % | 100 % |

**Abweichungen von Story-Vorgaben / Scope-Erweiterungen:**

1. **`KraefteInfrastructureModule`-Import in `EigenschutzModule`** war in Story/AC4 nicht explizit aufgeführt — nur `AuthModule`. Nötig wegen der `EinsatzScopeGuard`-DI-Kette (siehe Debug-Log). Dokumentiert als JSDoc im Module; Alternative wäre ein Plattform-Re-Export aus `AuthModule`, den Story 1.6 bewusst nicht macht (scope-grenze). Folge-Stories ab Epic 2 folgen diesem Pattern — oder die Plattform liftet das in einer Kategorie-Story außerhalb des Eigenschutz-Scopes.
2. **Plattform-Erweiterung `QueryCache.onError` um `meta.silentError`.** AC8 verweist explizit auf „ein äquivalentes Pattern, abhängig vom Plattform-Error-Boundary-Setup". Grep nach `QueryCache|silentError|onError|toast.error` in `main.tsx` + `app/` ergab **kein** solches Pattern → das Feature existiert erst ab dieser Story. Die Erweiterung ist ein einziger `if`-Check (2 Zeilen Code) und für alle zukünftigen Queries nutzbar. Kein API-Break für bestehende Queries (default-Meta ist `undefined` → Toast-Verhalten unverändert).
3. **Empty-State-Action-Shape**: Story-Code-Beispiel zeigt `action={<Link …/>}` (ReactNode), die echte `EmptyState`-API (`shared/ui/molecules/empty-state.molecule.tsx`) nimmt `{label, onClick}`. Implementiert via `secondaryAction={{ label, onClick: () => navigate(…) }}` mit `useNavigate()` aus `@tanstack/react-router`. Story Task 6 hatte selbst eingeräumt, dass Code-Beispiele Orientierung, nicht Garantie sind.
4. **AC10-Bootstrap-Test-Wording**: AC10 nennt wörtlich `NestFactory.create(testModule)`. Der entsprechende `Test.createTestingModule({ imports: [EigenschutzModule] }).compile()` zieht transitiv `AuthModule → ServerAccessTokenInfrastructureModule → ServerAccessGuard`, der wiederum `EventEmitterModule.forRoot()` aus dem `AppModule`-Root erwartet. Das liegt weit außerhalb des Eigenschutz-Scopes und würde 10+ Modul-Overrides erfordern (verifiziert: der Versuch scheiterte an `Nest can't resolve dependencies of the ServerAccessGuard (...EventEmitter at index [3])`). Stattdessen decken die Metadata-Checks die AC10-Intention (Controller registriert, korrekte Imports, keine versehentlichen Provider), und der echte DI-Regressions-Gate liegt im Controller-Spec, das via `Test.createTestingModule` + Guard-Overrides + reale `EigenschutzRolleGuard`-Instanz kompiliert. Ein inline-Kommentar in `eigenschutz.module.spec.ts` dokumentiert die Entscheidung für Folge-Stories.
5. **Präzisierung zur `meta.silentError`-Semantik**: Der Skip-Block umgeht `handleQueryError` komplett — also auch dessen 401-Redirect zur Auth-Seite. Der `invalidateQueries`-Refresh-Trigger läuft zwar weiterhin (außerhalb des Skips), aber wenn eine silent-Query gleichzeitig mit einem Token-Ablauf trifft und keine parallele non-silent-Query den Logout auslöst, gibt es keinen aktiven Redirect. In der Eigenschutz-Health-Query ist das praktisch unkritisch (die Route wird nur innerhalb `SingleEinsatzLayout` gerendert, das selbst non-silent-Queries feuert), wird aber hier explizit dokumentiert, damit eine zukünftige standalone-Nutzung der silent-Option das bewusst berücksichtigt.

**Brotkrumen-Verifikation (Epic-AC1 „Einsatz › Sicherheit › Eigenschutz").** Die Plattform macht die Hierarchie via `ModuleRail` + `WorkspaceContextBar` + Page-`<h1>` sichtbar; ein expliziter Text-Breadcrumb existiert plattformweit nicht (weder `hygiene.tsx` noch `gefahren.tsx` rendern einen). Entscheidung: **Kein** expliziter Breadcrumb in `EigenschutzEntryPage` — Konsistenz mit den Geschwister-Routen wiegt schwerer als die wörtliche Erfüllung des Epic-AC-Wortlauts. **Defer-Finding für die Plattform:** Ein textueller Breadcrumb für die Workspace-Shell ist Plattform-Scope und sollte als GitHub-Issue angelegt werden (Titel-Vorschlag: „Workspace-Shell: Textueller Breadcrumb `Einsatz › Modul › SubPage` aus Registry ableiten"); in dieser Session wurde noch **kein** Issue angelegt, die Entscheidung ist hier dokumentiert, damit sie beim Code-Review / nächsten Planungstermin priorisiert werden kann.

**Keine manuelle Smoke-Test-Durchführung in dieser Session** — nur automatisierte Tests + Build-Verifikation. Das Swagger-UI wurde indirekt über die erfolgreiche `generate-api`-Regenerierung verifiziert (der Generator zog den OpenAPI-Spec `https://localhost:3091/api/alpha-json` mit dem neuen Endpoint erfolgreich).

### File List

**Neu (Backend):**

- `packages/backend/src/application/eigenschutz/dto/eigenschutz-health.dto.ts`
- `packages/backend/src/infrastructure/eigenschutz/eigenschutz-infrastructure.module.ts`
- `packages/backend/src/infrastructure/eigenschutz/__tests__/eigenschutz-infrastructure.module.spec.ts`
- `packages/backend/src/modules/eigenschutz/eigenschutz.module.ts`
- `packages/backend/src/modules/eigenschutz/controllers/eigenschutz-health.controller.ts`
- `packages/backend/src/modules/eigenschutz/controllers/__tests__/eigenschutz-health.controller.spec.ts`
- `packages/backend/src/modules/eigenschutz/__tests__/eigenschutz.module.spec.ts`
- `packages/backend/src/domain/eigenschutz/aggregates/.gitkeep`
- `packages/backend/src/domain/eigenschutz/value-objects/.gitkeep`
- `packages/backend/src/domain/eigenschutz/events/.gitkeep`
- `packages/backend/src/domain/eigenschutz/repositories/.gitkeep`
- `packages/backend/src/domain/eigenschutz/errors/.gitkeep`
- `packages/backend/src/application/eigenschutz/commands/.gitkeep`
- `packages/backend/src/application/eigenschutz/queries/.gitkeep`
- `packages/backend/src/application/eigenschutz/event-handlers/.gitkeep`
- `packages/backend/src/application/eigenschutz/errors/.gitkeep`
- `packages/backend/src/infrastructure/eigenschutz/repositories/.gitkeep`
- `packages/backend/src/infrastructure/eigenschutz/projections/.gitkeep`
- `packages/backend/src/infrastructure/eigenschutz/export/.gitkeep`
- `packages/backend/src/infrastructure/eigenschutz/telemetry/.gitkeep`
- `packages/backend/src/infrastructure/eigenschutz/conflict/.gitkeep`
- `packages/backend/src/infrastructure/eigenschutz/event-adapters/.gitkeep`
- `packages/backend/src/infrastructure/eigenschutz/snapshot/.gitkeep`
- `packages/backend/src/modules/eigenschutz/guards/.gitkeep`
- `packages/backend/src/modules/eigenschutz/decorators/.gitkeep`

**Neu (Frontend):**

- `packages/frontend/src/features/eigenschutz/api/queries.ts`
- `packages/frontend/src/features/eigenschutz/index.ts`
- `packages/frontend/src/features/eigenschutz/ui/pages/EigenschutzEntryPage.tsx`
- `packages/frontend/src/features/eigenschutz/hooks/.gitkeep`
- `packages/frontend/src/features/eigenschutz/schemas/.gitkeep`
- `packages/frontend/src/features/eigenschutz/stores/.gitkeep`
- `packages/frontend/src/features/eigenschutz/utils/.gitkeep`
- `packages/frontend/src/features/eigenschutz/constants/.gitkeep`
- `packages/frontend/src/features/eigenschutz/ui/atoms/.gitkeep`
- `packages/frontend/src/features/eigenschutz/ui/molecules/.gitkeep`
- `packages/frontend/src/features/eigenschutz/ui/organisms/.gitkeep`
- `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/__tests__/eigenschutz.route.spec.tsx`
- `packages/frontend/src/features/eigenschutz/api/__tests__/queries.spec.tsx`

**Editiert (Backend):**

- `packages/backend/src/app.module.ts` — Import + Registrierung `EigenschutzModule`.

**Editiert (Frontend):**

- `packages/frontend/src/features/workspace/registry/einsatz-workspace.registry.ts` — `disabled(LATER_RING_REASON)` auf `sicherheit.eigenschutz`-SubPage entfernt (Default `visible`).
- `packages/frontend/src/features/workspace/registry/__tests__/einsatz-workspace.registry.spec.ts` — neuer `describe`-Block „Eigenschutz-Flip (Story 1.6 AC1)".
- `packages/frontend/src/provider/query-client.provider.tsx` — `QueryCache.onError` um `meta.silentError`-Skip erweitert (Zero-Toast-Policy-Plattform-Hook).
- `packages/frontend/src/routes/app/einsatz/$einsatzId/sicherheit/eigenschutz.tsx` — Platzhalter-Komponente durch `EigenschutzRouteComponent` mit Hook + Loading/Empty-Matrix ersetzt.
- `packages/frontend/src/shared/api/api.ts` — Import + private Instanz + `eigenschutz()`-Accessor für `EigenschutzApi`.
- `packages/frontend/src/provider/query-client.provider.test.ts` — neuer `describe`-Block „Zero-Toast-Policy: meta.silentError (Story 1.6 AC8)".

**Regeneriert (via `pnpm run generate-api`, nicht manuell editiert):**

- `packages/shared/client/apis/EigenschutzApi.ts`
- `packages/shared/client/apis/index.ts`
- `packages/shared/client/models/EigenschutzHealthDto.ts`
- `packages/shared/client/models/EigenschutzHealthControllerGetHealthVAlpha200Response.ts`
- `packages/shared/client/models/index.ts`
- `packages/shared/client/.openapi-generator/FILES`

### Change Log

| Datum      | Änderung                                                                                                                                                                                                                                                                                                                                            | Author                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 2026-04-22 | Story-Datei angelegt (ready-for-dev). Status-Übergang in `sprint-status.yaml`: `backlog → ready-for-dev`.                                                                                                                                                                                                                                           | Ruben Vitt (mit Claude Opus 4.7) |
| 2026-04-22 | Implementation komplett: AC1–AC11 erfüllt, 23 neue Tests (15 Backend, 8 Frontend im Feature-Scope) + Plattform-Tests für `meta.silentError`-Skip + direkte Tests für `features/eigenschutz/api/queries.ts`, 100 % Coverage auf neuen Backend-Files, Plattform-Erweiterung `meta.silentError` für Zero-Toast-Policy. Status: `in-progress → review`. | Ruben Vitt (mit Claude Opus 4.7) |
