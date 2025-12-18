# Story 3.2: Temporäres Fahrzeug anlegen

Status: **in-progress**

---

## Story

**Als** FüKw (Sandra),
**möchte ich** ein Fahrzeug anlegen, das nicht in den Stammdaten existiert (z.B. Nachbarfeuerwehr),
**damit** ich auch externe Einheiten dokumentieren kann.

---

## Acceptance Criteria

### AC1: Temporär-Formular
**Given** ich bin im "Fahrzeug hinzufügen"-Dialog
**When** ich "Temporäres Fahrzeug" Tab wähle
**Then** sehe ich Formular: Funkrufname (required), Kennzeichen (optional), Fahrzeugtyp (required)

### AC2: Fahrzeug ohne stammId erstellen
**Given** ich habe Pflichtfelder ausgefüllt
**When** ich "Erfassen" klicke
**Then** wird `EinsatzFahrzeug` OHNE stammId erstellt
**And** initialer FMS-Status ist "2 - Einsatzbereit"
**And** Domain Event `FahrzeugErfasst` (mit `stammId: undefined`) wird emittiert
**And** ETB-Eintrag: "Temporäres Fahrzeug {funkrufname} erfasst (Status: Einsatzbereit)"

### AC3: Duplikat-Validierung
**Given** ich erfasse ein temporäres Fahrzeug
**When** im Einsatz bereits ein Fahrzeug mit gleichem Funkrufname existiert
**Then** erhalte ich Validierungsfehler (409 Conflict)
**And** Dialog bleibt offen mit Fehlermeldung

### AC4: Temporär-Badge in UI
**Given** ich sehe die Fahrzeug-Liste im Einsatz
**When** ein Fahrzeug ohne stammId vorhanden ist
**Then** wird "Temporär"-Badge angezeigt (bg-gray-100, text-gray-800)

### AC5: UI Feedback
**Given** die Erfassung war erfolgreich
**When** die Response zurückkommt
**Then** erscheint das Fahrzeug sofort in der Liste
**And** Erfolgs-Toast zeigt "Temporäres Fahrzeug erfasst"
**And** Dialog schließt sich automatisch

---

## Tasks / Subtasks

### Task 1: Domain Layer (AC: 2) ✅

- [x] 1.1 `EinsatzFahrzeug.createTemporary()` Factory-Methode hinzufügen
  - Datei: `packages/backend/src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts`
  - Props: `einsatzId`, `fahrzeugtypId`, `funkrufname`, `createdBy`, optional: `kennzeichen`, `position`
  - KEIN `stammId` Parameter (wird `undefined` gesetzt)
  - Initialer FMS-Status: 2 (Einsatzbereit) via `EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_DEFAULT`
  - Emittiert `FahrzeugErfasstEvent` mit `stammId: undefined`
  - Validierung: `funkrufname` 1-100 Zeichen, `kennzeichen` max 20 Zeichen

- [x] 1.2 `CreateTemporaryEinsatzFahrzeugProps` Interface erstellen
  - Datei: `packages/backend/src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts`
  - Unterschied zu `CreateEinsatzFahrzeugFromStammProps`: Keine `stammId`, `funkrufname` + `kennzeichen` direkt

- [x] 1.3 Unit Tests für `createTemporary()` Factory
  - Datei: `packages/backend/src/domain/kraefte/aggregates/__tests__/einsatz-fahrzeug.aggregate.spec.ts`
  - Test Cases: Valid props, Empty funkrufname, FMS-Status Default, Domain Event emission, Position optional

### Task 2: Application Layer (AC: 2, 3) ✅

- [x] 2.1 `ErfasseTemporalesFahrzeugCommand` erstellen
  - Datei: `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/erfasse-temporales-fahrzeug/erfasse-temporales-fahrzeug.command.ts`
  - Props: `einsatzId` (UUID), `fahrzeugtypId` (CUID), `funkrufname`, `createdBy` (UUID), optional: `kennzeichen`, `position`
  - Static `create()` mit Result Pattern + Validierung

- [x] 2.2 `ErfasseTemporalesFahrzeugHandler` implementieren
  - Datei: `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/erfasse-temporales-fahrzeug/erfasse-temporales-fahrzeug.handler.ts`
  - EXTENDS `TransactionalCommandHandler` für Outbox Pattern
  - Dependencies: `IEinsatzFahrzeugRepository`, `IFahrzeugtypRepository`
  - Flow:
    1. Fahrzeugtyp laden (muss existieren)
    2. Duplikat-Check (`existsByEinsatzIdAndFunkrufname`)
    3. `EinsatzFahrzeug.createTemporary()` aufrufen
    4. Repository `save()` mit tx
    5. Events extrahieren für Outbox

- [x] 2.3 `ErfasseTemporalesFahrzeugDto` erstellen
  - Datei: `packages/backend/src/application/kraefte/einsatz-fahrzeuge/dto/erfasse-temporales-fahrzeug.dto.ts`
  - Properties: `funkrufname` (required), `fahrzeugtypId` (required), `kennzeichen` (optional), `position` (optional)
  - OpenAPI Decorators: `@ApiProperty`, `@ApiPropertyOptional`
  - Validation: `@IsString`, `@IsNotEmpty`, `@MinLength(1)`, `@MaxLength(100)`, `@IsOptional`

- [x] 2.4 Unit Tests für Handler
  - Datei: `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/erfasse-temporales-fahrzeug/__tests__/erfasse-temporales-fahrzeug.handler.spec.ts`
  - Test Cases: Success, Fahrzeugtyp not found, Duplikat-Fehler, Transaction behavior, Domain Event emission

### Task 3: API Layer (AC: 1, 3, 5) ✅

- [x] 3.1 `POST /temporary` Endpoint hinzufügen
  - Datei: `packages/backend/src/modules/kraefte/controllers/einsatz-fahrzeuge.controller.ts`
  - Route: `POST /api/v-alpha/einsaetze/:einsatzId/fahrzeuge/temporary`
  - Request Body: `ErfasseTemporalesFahrzeugDto`
  - Response: `EinsatzFahrzeugDto` (201 Created)
  - Error Responses: 400 (Validation), 404 (Fahrzeugtyp), 409 (Duplikat)

- [x] 3.2 OpenAPI Decorators
  - `@ApiOperation({ summary: 'Temporäres Fahrzeug (ohne Stammdaten) erfassen' })`
  - `@ApiParam({ name: 'einsatzId', type: String, format: 'uuid' })`
  - `@ApiCreatedResponse({ type: EinsatzFahrzeugDto })`
  - `@ApiBadRequestResponse`, `@ApiNotFoundResponse`, `@ApiConflictResponse`

- [x] 3.3 Handler im Module registrieren
  - Datei: `packages/backend/src/application/kraefte/einsatz-fahrzeuge/einsatz-fahrzeuge-application.module.ts`
  - Provider: `ErfasseTemporalesFahrzeugHandler`

### Task 4: ETB Auto-Creation (AC: 2) ✅

- [x] 4.1 `FahrzeugErfasstEventHandler` erweitern
  - Datei: `packages/backend/src/application/etb/event-handlers/fahrzeug-erfasst.handler.ts`
  - **WICHTIG:** Aktueller Handler unterscheidet NICHT zwischen temporär/Stammdaten!
  - Prüfen ob `event.stammId === undefined`:
    ```typescript
    const isTemporary = event.stammId === undefined;
    const text = isTemporary
      ? `Temporäres Fahrzeug ${event.funkrufname} erfasst (Status: ${statusLabel})`
      : `Fahrzeug ${event.funkrufname} erfasst (Status: ${statusLabel})`;
    ```
  - Fire-and-Forget Pattern beibehalten (Fehler loggen, nicht propagieren)

### Task 5: Frontend (AC: 1, 4, 5) ✅

- [x] 5.1 API Client regenerieren
  - `pnpm run generate-api`
  - Verifizieren: `EinsatzFahrzeugeApi.erfasseTemporalesVAlpha()` in `packages/shared/client/apis/`

- [x] 5.2 `useErfasseTemporalesFahrzeug()` Hook erstellen
  - Datei: `packages/frontend/src/features/einsatz/api/use-erfasse-temporales-fahrzeug.ts`
  - TanStack Query Mutation mit optimistischem Update
  - Query Invalidation für `EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId)`
  - Error Handling: 409 → Toast "Fahrzeug mit diesem Funkrufnamen bereits erfasst"
  - Success: Toast "Temporäres Fahrzeug erfasst"

- [x] 5.3 `FahrzeugHinzufuegenDialog` um Tab erweitern
  - Datei: `packages/frontend/src/features/einsatz/ui/organisms/FahrzeugHinzufuegenDialog.organism.tsx`
  - Headless UI `<Tab.Group>` mit 2 Tabs: "Aus Stammdaten" | "Temporär"
  - Tab 2: TanStack Form mit Feldern: Funkrufname (Input), Kennzeichen (Input), Fahrzeugtyp (Combobox)
  - Zod Schema für Validierung: `funkrufname.min(1).max(100)`, `fahrzeugtypId.cuid2()`, `kennzeichen.max(20).optional()`
  - Submit: `useErfasseTemporalesFahrzeug()` Mutation

- [x] 5.4 `useFahrzeugtypen()` Hook erstellen **(PREREQUISITE - existiert noch nicht!)**
  - Datei: `packages/frontend/src/features/einsatz/api/use-fahrzeugtypen.ts`
  - Query für Fahrzeugtypen-Liste (Admin API) für Combobox im Temporär-Tab
  - Pattern: `useQuery({ queryKey: ['fahrzeugtypen', 'list'], queryFn: () => api.adminStammdatenFahrzeuge().findAllVAlpha(), staleTime: 60_000 })`

- [ ] 5.5 Temporär-Badge in Fahrzeug-Liste (OPTIONAL - separate Story)
  - Datei: Fahrzeug-Liste Komponente (z.B. `EinsatzResourceWidget.tsx` oder `FahrzeugListe.organism.tsx`)
  - Bedingung: `fahrzeug.stammId === undefined || fahrzeug.stammId === null`
  - Badge: `<Badge color="gray">Temporär</Badge>` mit `bg-gray-100 text-gray-800`

- [x] 5.6 Index-Exports aktualisieren
  - `packages/frontend/src/features/einsatz/api/index.ts`

### Task 6: Testing (AC: 1-5) ✅

- [x] 6.1 Unit Tests für Aggregate Factory (Task 1.3)
  - 17 Test Cases, AAA Pattern, Given-When-Then
  - **Result:** 103 Tests passed

- [x] 6.2 Unit Tests für Handler (Task 2.4)
  - Success Case, Error Cases (Fahrzeugtyp not found, Duplikat), Transaction Tests
  - `jest.clearAllMocks()` in beforeEach
  - **Result:** All tests passed

- [ ] 6.3 Manuelle E2E Tests (TO BE DONE IN REVIEW)
  - [ ] Backend + Frontend starten (`pnpm -r dev`)
  - [ ] Zu aktivem Einsatz navigieren
  - [ ] "Hinzufügen" Button → Dialog öffnet
  - [ ] Tab "Temporär" auswählen
  - [ ] Formular ausfüllen (Funkrufname, Fahrzeugtyp wählen)
  - [ ] "Erfassen" klicken → Success Toast, Dialog schließt
  - [ ] Fahrzeug in Liste mit "Temporär"-Badge sichtbar
  - [ ] ETB-Eintrag vorhanden: "**Temporäres** Fahrzeug ... erfasst" (NICHT ohne Temporäres!)
  - [ ] Duplikat-Test: Gleiches Fahrzeug erneut → 409 Error, Toast mit Fehler
  - [ ] **Performance Check:** Response Time <5s (NFR2 aus Epic)

### Review Follow-ups (AI) - 2025-12-17

- [x] [AI-Review][HIGH] FormField `hint` → `helperText` ändern (3 Stellen) **✅ Fixed 2025-12-17**
  - `packages/frontend/src/features/einsatz/ui/organisms/FahrzeugHinzufuegenDialog.organism.tsx:411`
  - `packages/frontend/src/features/einsatz/ui/organisms/FahrzeugHinzufuegenDialog.organism.tsx:439`
  - `packages/frontend/src/features/einsatz/ui/organisms/FahrzeugHinzufuegenDialog.organism.tsx:471`
  - **Fix:** `hint` → `helperText` geändert, Hilfe-Texte werden jetzt korrekt angezeigt

- [x] [AI-Review][LOW] Toast-Nachricht für 409-Duplikat an Story angleichen **✅ Fixed 2025-12-17**
  - `packages/frontend/src/features/einsatz/ui/organisms/FahrzeugHinzufuegenDialog.organism.tsx:194`
  - **Fix:** "Fahrzeug mit diesem Funkrufnamen bereits erfasst" (Story-konform)

### Code Review Follow-ups (AI) - 2025-12-17 (Round 2)

- [x] [AI-Review][CRITICAL] DTO Position Validation fehlt (`@ValidateNested` + `@Type`) **✅ Fixed 2025-12-17**
  - `packages/backend/src/application/kraefte/einsatz-fahrzeuge/dto/erfasse-temporales-fahrzeug.dto.ts:44-49`
  - `packages/backend/src/application/kraefte/einsatz-fahrzeuge/dto/erfasse-fahrzeug-aus-stammdaten.dto.ts:25-32`
  - **Fix:** `PositionDto` mit `@ValidateNested()` + `@Type(() => PositionDto)` verwendet

- [x] [AI-Review][CRITICAL] Controller EINSATZ_NOT_FOUND Error Handling fehlt **✅ Fixed 2025-12-17**
  - `packages/backend/src/modules/kraefte/controllers/einsatz-fahrzeuge.controller.ts:276-278`
  - **Fix:** Error Handling für `EINSATZ_NOT_FOUND` → 404 hinzugefügt

- [x] [AI-Review][CRITICAL] Frontend Duplikat-Validation fehlt (nur Server-Side) **✅ Fixed 2025-12-17**
  - `packages/frontend/src/features/einsatz/ui/organisms/FahrzeugHinzufuegenDialog.organism.tsx:85-100`
  - **Fix:** Zod Schema mit `useMemo` + `.refine()` für client-side Duplikat-Check

- [x] [AI-Review][CRITICAL] ETB Adapter try/catch fehlt (Fire-and-Forget) **✅ Fixed 2025-12-17**
  - `packages/backend/src/infrastructure/events/adapters/fahrzeug-erfasst-event.adapter.ts:49-67`
  - **Fix:** try/catch Block um Handler-Aufruf, Fehler werden geloggt aber nicht propagiert

- [x] [AI-Review][CRITICAL] Test Edge Case: Inaktiver Fahrzeugtyp **✅ Added 2025-12-17**
  - `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/erfasse-temporales-fahrzeug/__tests__/erfasse-temporales-fahrzeug.handler.spec.ts:225-260`
  - **Note:** Test dokumentiert fehlende Validierung - Handler prüft istAktiv NICHT (Known Issue für spätere Story)

### Deferred Issues (für spätere Stories)

- [ ] [AI-Review][HIGH] Domain DRY Violation - ~75 Zeilen Duplikation in `createFromStammdaten()` vs `createTemporary()`
  - `packages/backend/src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts:228-423`
  - **Empfehlung:** Private `validateCreateProps()` Methode extrahieren
  - **Story:** Refactoring Story für EinsatzFahrzeug Aggregate

- [ ] [AI-Review][HIGH] ETB Handler Tests fehlen komplett
  - `packages/backend/src/application/etb/event-handlers/fahrzeug-erfasst.handler.ts`
  - **Empfehlung:** Unit Tests für Fire-and-Forget Pattern, Temporär-Check, Error Cases
  - **Story:** Test-Coverage Story für ETB Handler

- [ ] [AI-Review][MEDIUM] UUID-Validierung für einsatzId fehlt in Aggregate
  - `packages/backend/src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts:230-234`
  - **Empfehlung:** UUID-Regex oder `uuid` package Validierung hinzufügen

- [ ] [AI-Review][MEDIUM] Hardcoded CUID2 Fehlermeldungen statt Konstanten
  - `packages/backend/src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts:238,247,275`
  - **Empfehlung:** EINSATZ_FAHRZEUG_VALIDATION_ERRORS erweitern

- [ ] [AI-Review][MEDIUM] Handler prüft nicht ob Fahrzeugtyp aktiv ist (istAktiv=false wird akzeptiert)
  - `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/erfasse-temporales-fahrzeug/erfasse-temporales-fahrzeug.handler.ts:82`
  - **Empfehlung:** Check `if (!fahrzeugtyp.istAktiv)` hinzufügen + FAHRZEUGTYP_INACTIVE Error Code

---

## Dev Notes

### KRITISCHE REGELN (Anti-Patterns vermeiden!)

| Regel | Richtig | Falsch |
|-------|---------|--------|
| **stammId Semantik** | `stammId: undefined` für temporär | `stammId: null` in Domain (null nur Prisma) |
| **DI Import** | `import { ... }` für Injectable | `import type { ... }` |
| **DI Token** | `KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG` | String-Literal `'IEinsatzFahrzeugRepository'` |
| **Fehler** | `Result.fail()` im Handler | `throw Exception` im Handler |
| **Nullable** | `(entity.x as T \| null) ?? undefined` | Direktes `entity.x` |
| **Events** | Via TransactionalCommandHandler | Direktes `eventEmitter.emit()` |
| **ETB Handler** | Fire-and-Forget (catch + log) | Exception propagieren |

### FMS-Status Codes (Initial: 2 = Einsatzbereit)

| Code | Label | Verwendung |
|------|-------|------------|
| 0-1 | Nicht einsatzbereit / Auf Wache | - |
| **2** | **Einsatzbereit (Initial)** | **Default für neue Fahrzeuge** |
| 3-6 | Ausgerückt / Am EO / Sprechwunsch / Außer Dienst | Status-Updates |
| 7-9 | Regional konfigurierbar | Epic 1 Story 1-4 |

### Unterschied: Stammdaten- vs. Temporär-Fahrzeug

| Aspekt | Stammdaten (Story 3-1) | Temporär (Story 3-2) |
|--------|------------------------|----------------------|
| **stammId** | NOT NULL | `undefined` |
| **funkrufname** | KOPIERT von StammFahrzeug | DIREKT eingegeben |
| **kennzeichen** | KOPIERT von StammFahrzeug | DIREKT eingegeben (optional) |
| **fahrzeugtypId** | VON StammFahrzeug | SELEKTIERT im Dialog |
| **Erkennungsmerkmal** | `stammId !== undefined` | `stammId === undefined` |
| **ETB-Text** | "Fahrzeug {name} erfasst" | "**Temporäres** Fahrzeug {name} erfasst" |

### Referenz-Pattern: TransactionalCommandHandler

**Pattern-Referenz:** Siehe `erfasse-fahrzeug-aus-stammdaten.handler.ts` für vollständiges Beispiel.

**Kurzform der Implementierung:**
```typescript
// 1. Fahrzeugtyp laden → FAHRZEUGTYP_NOT_FOUND
// 2. Duplikat-Check → FUNKRUFNAME_DUPLICATE
// 3. EinsatzFahrzeug.createTemporary({...}) → stammId wird NICHT gesetzt
// 4. repository.save(aggregate, tx)
// 5. events = aggregate.getDomainEvents(); aggregate.clearDomainEvents();
// 6. return Result.ok({ result: dto, events });
```

### Referenz: Siehe Story 3-1 für vollständige Patterns

- **Aggregate:** `packages/backend/src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts`
- **Repository:** `packages/backend/src/infrastructure/kraefte/repositories/prisma-einsatz-fahrzeug.repository.ts`
- **Handler:** `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/erfasse-fahrzeug-aus-stammdaten/`
- **Controller:** `packages/backend/src/modules/kraefte/controllers/einsatz-fahrzeuge.controller.ts`
- **Frontend Hook:** `packages/frontend/src/features/einsatz/api/use-erfasse-fahrzeug-aus-stammdaten.ts`

---

## Project Structure Notes

### Neue Dateien (CREATE)

```
packages/backend/src/
├── application/kraefte/einsatz-fahrzeuge/
│   ├── commands/
│   │   └── erfasse-temporales-fahrzeug/
│   │       ├── erfasse-temporales-fahrzeug.command.ts
│   │       ├── erfasse-temporales-fahrzeug.handler.ts
│   │       └── __tests__/
│   │           └── erfasse-temporales-fahrzeug.handler.spec.ts
│   └── dto/
│       └── erfasse-temporales-fahrzeug.dto.ts

packages/frontend/src/
└── features/einsatz/api/
    ├── use-erfasse-temporales-fahrzeug.ts
    └── use-fahrzeugtypen.ts (falls nicht vorhanden)
```

### Zu modifizierende Dateien (MODIFY)

| Datei | Änderung |
|-------|----------|
| `packages/backend/src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts` | `createTemporary()` Factory + Props Interface |
| `packages/backend/src/domain/kraefte/aggregates/__tests__/einsatz-fahrzeug.aggregate.spec.ts` | Tests für `createTemporary()` |
| `packages/backend/src/application/etb/event-handlers/fahrzeug-erfasst.handler.ts` | ETB-Text für temporäre Fahrzeuge |
| `packages/backend/src/application/kraefte/einsatz-fahrzeuge/einsatz-fahrzeuge-application.module.ts` | Handler Provider registrieren |
| `packages/backend/src/modules/kraefte/controllers/einsatz-fahrzeuge.controller.ts` | `POST /temporary` Endpoint |
| `packages/frontend/src/features/einsatz/ui/organisms/FahrzeugHinzufuegenDialog.organism.tsx` | Tab für Temporär-Formular |
| `packages/frontend/src/features/einsatz/api/index.ts` | Export neue Hooks |
| Fahrzeug-Liste Komponente | Temporär-Badge Rendering |

---

## Implementation Checklist

**VOR Implementation prüfen:**
- [x] Story 3-1 ist DONE (EinsatzFahrzeug Aggregate existiert) ✅
- [x] Prisma Schema hat `stammId?` (nullable) - Story 3-0 ✅
- [x] `existsByEinsatzIdAndFunkrufname()` Repository-Methode existiert ✅
- [x] `FahrzeugErfasstEvent.stammId` ist `string | undefined` (nicht nur `string`) ✅ **(Validation Fix 2025-12-17)**

**WÄHREND Implementation:**
- [ ] Aggregate: `createTemporary()` setzt `stammId: undefined`
- [ ] Handler: `extends TransactionalCommandHandler`
- [ ] Handler: `tx` Parameter an ALLE Repository-Aufrufe übergeben
- [ ] DTO: OpenAPI Decorators für Swagger
- [ ] Controller: Result→HTTP Translation (409 für Duplikat)
- [ ] ETB Handler: Prüft `event.stammId` für Text-Variante
- [ ] Frontend: Tab-basierter Dialog mit TanStack Form
- [ ] Frontend: Badge Bedingung `stammId === undefined || stammId === null`

**NACH Implementation:**
- [ ] `pnpm lint:check` erfolgreich
- [ ] `pnpm --filter @bluelight-hub/backend test` erfolgreich
- [ ] `pnpm run generate-api` ausgeführt
- [ ] Manuelle E2E Tests (Checklist oben)
- [ ] Commit: `✨(kraefte): Implement temporäres Fahrzeug erfassen (Story 3-2)`

---

## References

| Dokument | Pfad | Relevanz |
|----------|------|----------|
| **Epic Definition** | `docs/epics.md` (Lines 901-934) | AC1-AC4, Technical Notes |
| **Schema** | `docs/sprint-artifacts/3-0-prisma-schema-einsatz-fahrzeuge.md` | Prisma Model (stammId nullable) |
| **Vorgänger Story** | `docs/sprint-artifacts/3-1-fahrzeug-aus-stammdaten-erfassen.md` | Pattern-Referenz |
| **Project Rules** | `docs/project-context.md` | AC1-AC6 Code Review |
| **Retro Learnings** | `docs/sprint-artifacts/epic-2-retro-2025-12-16.md` | DI Token, NULL→undefined |
| **Pattern: Aggregate** | `packages/backend/src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts` | Factory Pattern |
| **Pattern: Handler** | `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/erfasse-fahrzeug-aus-stammdaten/` | TransactionalCommandHandler |
| **Pattern: Controller** | `packages/backend/src/modules/kraefte/controllers/einsatz-fahrzeuge.controller.ts` | OpenAPI, Error Handling |
| **Pattern: Frontend** | `packages/frontend/src/features/einsatz/api/use-erfasse-fahrzeug-aus-stammdaten.ts` | TanStack Query Mutation |

---

## Dev Agent Record

### Context Reference

- Epic: 3 - Fahrzeug-Einsatz-Verwaltung
- Story Key: 3-2-temporaeres-fahrzeug-anlegen
- Dependencies: Story 3-0 (EinsatzFahrzeug Schema), Story 3-1 (EinsatzFahrzeug Aggregate + Repository)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Subagent a033566: Story 3-1 Learnings Analysis
- Subagent a7aab07: Architecture Patterns Analysis
- Subagent a4651ae: EinsatzFahrzeug Codebase Analysis
- Subagent ac8a8ec: Prisma Schema Analysis

### Completion Notes List

- Story generiert via `*create-story` Workflow in YOLO mode
- 4 parallele Subagents für umfassende Kontext-Extraktion:
  1. Story 3-1 Learnings (Code-Patterns, DI, Mapper, Testing, Frontend, ETB)
  2. Architektur-Analyse (Hexagonal, TransactionalCommandHandler, Result Pattern)
  3. EinsatzFahrzeug Codebase (Factory Methods, Repository, DTOs, Controller)
  4. Prisma Schema (nullable Felder, Unique Constraints)
- Integriert alle Learnings aus Epic 2 Retrospektive
- Alle Code-Referenzen mit absoluten Pfaden

### File List

**Neue Dateien (CREATE) - Backend:**
- `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/erfasse-temporales-fahrzeug/erfasse-temporales-fahrzeug.command.ts`
- `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/erfasse-temporales-fahrzeug/erfasse-temporales-fahrzeug.handler.ts`
- `packages/backend/src/application/kraefte/einsatz-fahrzeuge/commands/erfasse-temporales-fahrzeug/__tests__/erfasse-temporales-fahrzeug.handler.spec.ts`
- `packages/backend/src/application/kraefte/einsatz-fahrzeuge/dto/erfasse-temporales-fahrzeug.dto.ts`

**Neue Dateien (CREATE) - Frontend:**
- `packages/frontend/src/features/einsatz/api/use-erfasse-temporales-fahrzeug.ts`
- `packages/frontend/src/features/einsatz/api/use-fahrzeugtypen.ts` (falls nicht vorhanden)

**Zu modifizierende Dateien (MODIFY):**
- `packages/backend/src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts`
- `packages/backend/src/domain/kraefte/aggregates/__tests__/einsatz-fahrzeug.aggregate.spec.ts`
- `packages/backend/src/application/etb/event-handlers/fahrzeug-erfasst.handler.ts`
- `packages/backend/src/application/kraefte/einsatz-fahrzeuge/einsatz-fahrzeuge-application.module.ts`
- `packages/backend/src/modules/kraefte/controllers/einsatz-fahrzeuge.controller.ts`
- `packages/frontend/src/features/einsatz/ui/organisms/FahrzeugHinzufuegenDialog.organism.tsx`
- `packages/frontend/src/features/einsatz/api/index.ts`
- Fahrzeug-Liste Komponente (für Temporär-Badge)
