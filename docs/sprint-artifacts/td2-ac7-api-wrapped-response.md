# Story TD2.1: @ApiWrappedResponse in Admin-Controllern

Status: ✅ Done

## Story

Als **Backend-Entwickler**,
möchte ich **alle Admin-Controller im Kraefte-Modul auf @ApiWrappedResponse migrieren**,
damit **der generierte API-Client korrekte TypeScript-Typen mit WrappedResponse<T> erhält**.

## Hintergrund

**Epic:** Tech Debt Sprint 2 (Epic 6 Retro Action Items)

**Kontext:**
- CLAUDE.md AC7 fordert: "IMMER `@ApiWrappedResponse` / `@ApiWrappedCreatedResponse` statt Standard-Swagger-Decorators"
- Der generierte API-Client (`@bluelight-hub/shared/client`) erwartet `WrappedResponse<T>` mit `{ data, meta }` Struktur
- Standard-Decorators (`@ApiOkResponse`, `@ApiCreatedResponse`) generieren falsches OpenAPI-Schema

**Problem:**
3 Admin-Controller nutzen noch die Standard-Decorators, was zu falschen TypeScript-Typen im Frontend führt.

**Betroffene Controller:**
| Controller | Datei | Endpoints zu migrieren |
|------------|-------|------------------------|
| AdminRollenController | admin-rollen.controller.ts | 5 |
| AdminFahrzeugtypenController | admin-fahrzeugtypen.controller.ts | 5 |
| AdminFunkStatusController | admin-funk-status.controller.ts | 3 |

**Bereits korrekt migriert (kein Action nötig):**
- AdminQualifikationenController ✓
- AdminStammFahrzeugeController ✓
- AdminStammPersonenController ✓
- EinsatzFahrzeugeController ✓
- EinsatzPersonenController ✓
- RollenBesetzungController ✓
- KraefteDashboardController ✓
- StammFahrzeugeController ✓
- StammPersonenController ✓
- FahrzeugtypenController ✓

---

## Acceptance Criteria

### AC1: AdminRollenController migriert

- [x] **Given** AdminRollenController mit Standard-Decorators
- [x] **When** alle Endpoints auf @ApiWrappedResponse migriert werden
- [x] **Then** nutzen alle 5 Endpoints die korrekten Decorators:
  - `findAll` → `@ApiWrappedResponse(RollenDefinitionDto, { isArray: true, description: '...' })`
  - `findOne` → `@ApiWrappedResponse(RollenDefinitionDto, { description: '...' })`
  - `create` → `@ApiWrappedCreatedResponse(RollenDefinitionDto, { description: '...' })`
  - `update` → `@ApiWrappedResponse(RollenDefinitionDto, { description: '...' })`
  - `deactivate` → `@ApiWrappedResponse(RollenDefinitionDto, { description: '...' })`

### AC2: AdminFahrzeugtypenController migriert

- [x] **Given** AdminFahrzeugtypenController mit Standard-Decorators
- [x] **When** alle Endpoints auf @ApiWrappedResponse migriert werden
- [x] **Then** nutzen alle 5 Endpoints die korrekten Decorators:
  - `findAll` → `@ApiWrappedResponse(FahrzeugtypDto, { isArray: true, description: '...' })`
  - `findOne` → `@ApiWrappedResponse(FahrzeugtypDto, { description: '...' })`
  - `create` → `@ApiWrappedCreatedResponse(FahrzeugtypDto, { description: '...' })`
  - `update` → `@ApiWrappedResponse(FahrzeugtypDto, { description: '...' })`
  - `deactivate` → `@ApiWrappedResponse(FahrzeugtypDto, { description: '...' })`

### AC3: AdminFunkStatusController migriert

- [x] **Given** AdminFunkStatusController mit Standard-Decorators
- [x] **When** alle Endpoints auf @ApiWrappedResponse migriert werden
- [x] **Then** nutzen alle 3 Endpoints die korrekten Decorators:
  - `findAll` → `@ApiWrappedResponse(FunkStatusConfigDto, { isArray: true, description: '...' })`
  - `findByCode` → `@ApiWrappedResponse(FunkStatusConfigDto, { description: '...' })`
  - `update` → `@ApiWrappedResponse(FunkStatusConfigDto, { description: '...' })`

### AC4: API-Client Regeneration

- [x] **Given** alle Controller migriert
- [x] **When** `pnpm run generate-api` ausgeführt wird
- [x] **Then** werden keine TypeScript-Fehler generiert
- [x] **And** die generierten Typen enthalten `WrappedResponse<T>` mit `{ data, meta }` Struktur

### AC5: TypeScript Kompilierung

- [x] **Given** migrierte Controller und regenerierter Client
- [x] **When** `pnpm --filter @bluelight-hub/backend exec tsc --noEmit` ausgeführt wird
- [x] **Then** keine TypeScript-Fehler

---

## Implementation Checklist

### Task 1: AdminRollenController migrieren

- [x] **1.1** Öffne: `packages/backend/src/modules/kraefte/controllers/admin-rollen.controller.ts`
- [x] **1.2** Importiere Decorator:
  ```typescript
  import { ApiWrappedResponse, ApiWrappedCreatedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
  ```
- [x] **1.3** Migriere `findAll` (Line ~120):
  ```typescript
  // VORHER:
  @ApiOkResponse({ type: RollenDefinitionDto, isArray: true })

  // NACHHER:
  @ApiWrappedResponse(RollenDefinitionDto, { isArray: true, description: 'Liste aller Rollendefinitionen' })
  ```
- [x] **1.4** Migriere `findOne` (Line ~180):
  ```typescript
  // VORHER:
  @ApiOkResponse({ type: RollenDefinitionDto })

  // NACHHER:
  @ApiWrappedResponse(RollenDefinitionDto, { description: 'Rollendefinition gefunden' })
  ```
- [x] **1.5** Migriere `create` (Line ~226):
  ```typescript
  // VORHER:
  @ApiCreatedResponse({ type: RollenDefinitionDto })

  // NACHHER:
  @ApiWrappedCreatedResponse(RollenDefinitionDto, { description: 'Rollendefinition erfolgreich erstellt' })
  ```
- [x] **1.6** Migriere `update` (Line ~298):
  ```typescript
  // VORHER:
  @ApiOkResponse({ type: RollenDefinitionDto })

  // NACHHER:
  @ApiWrappedResponse(RollenDefinitionDto, { description: 'Rollendefinition erfolgreich aktualisiert' })
  ```
- [x] **1.7** Migriere `deactivate` (Line ~374):
  ```typescript
  // VORHER:
  @ApiOkResponse({ type: RollenDefinitionDto })

  // NACHHER:
  @ApiWrappedResponse(RollenDefinitionDto, { description: 'Rollendefinition erfolgreich deaktiviert' })
  ```
- [x] **1.8** Entferne alte Imports falls nicht mehr benötigt:
  ```typescript
  // Entfernen wenn nicht mehr verwendet:
  import { ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
  ```

### Task 2: AdminFahrzeugtypenController migrieren

- [x] **2.1** Öffne: `packages/backend/src/modules/kraefte/controllers/admin-fahrzeugtypen.controller.ts`
- [x] **2.2** Importiere Decorator (gleich wie Task 1.2)
- [x] **2.3** Migriere `findAll` (Line ~120): `@ApiWrappedResponse(FahrzeugtypDto, { isArray: true, description: 'Liste aller Fahrzeugtypen' })`
- [x] **2.4** Migriere `findOne` (Line ~188): `@ApiWrappedResponse(FahrzeugtypDto, { description: 'Fahrzeugtyp gefunden' })`
- [x] **2.5** Migriere `create` (Line ~233): `@ApiWrappedCreatedResponse(FahrzeugtypDto, { description: 'Fahrzeugtyp erfolgreich erstellt' })`
- [x] **2.6** Migriere `update` (Line ~298): `@ApiWrappedResponse(FahrzeugtypDto, { description: 'Fahrzeugtyp erfolgreich aktualisiert' })`
- [x] **2.7** Migriere `deactivate` (Line ~368): `@ApiWrappedResponse(FahrzeugtypDto, { description: 'Fahrzeugtyp erfolgreich deaktiviert' })`
- [x] **2.8** Entferne alte Imports falls nicht mehr benötigt

### Task 3: AdminFunkStatusController migrieren

- [x] **3.1** Öffne: `packages/backend/src/modules/kraefte/controllers/admin-funk-status.controller.ts`
- [x] **3.2** Importiere Decorator (gleich wie Task 1.2)
- [x] **3.3** Migriere `findAll` (Line ~78): `@ApiWrappedResponse(FunkStatusConfigDto, { isArray: true, description: 'Liste aller konfigurierten FMS-Status' })`
- [x] **3.4** Migriere `findByCode` (Line ~101): `@ApiWrappedResponse(FunkStatusConfigDto, { description: 'FMS-Status gefunden' })`
- [x] **3.5** Migriere `update` (Line ~144): `@ApiWrappedResponse(FunkStatusConfigDto, { description: 'FMS-Status erfolgreich aktualisiert' })`
- [x] **3.6** Entferne alte Imports falls nicht mehr benötigt

### Task 4: API-Client Regenerieren & Verifizieren

- [x] **4.1** Führe aus: `pnpm run generate-api`
- [x] **4.2** Prüfe auf Fehler in der Generierung
- [x] **4.3** Verifiziere TypeScript: `pnpm --filter @bluelight-hub/backend exec tsc --noEmit`
- [x] **4.4** Prüfe generierte Typen in `packages/shared/client/` auf korrekte WrappedResponse-Struktur

---

## Dev Notes

### Decorator-Pfad

```typescript
import { ApiWrappedResponse, ApiWrappedCreatedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
```

### Korrekte Verwendung

| HTTP Status | Decorator | Beispiel |
|-------------|-----------|----------|
| 200 OK | `@ApiWrappedResponse` | `@ApiWrappedResponse(DtoClass, { description: '...' })` |
| 200 OK (Array) | `@ApiWrappedResponse` | `@ApiWrappedResponse(DtoClass, { isArray: true, description: '...' })` |
| 201 Created | `@ApiWrappedCreatedResponse` | `@ApiWrappedCreatedResponse(DtoClass, { description: '...' })` |

### Unterschied zu Standard-Decorators

**Standard (FALSCH):**
```typescript
@ApiOkResponse({ type: EinsatzDto })
// Generiert: EinsatzDto als Root-Objekt
```

**Custom Wrapper (RICHTIG):**
```typescript
@ApiWrappedResponse(EinsatzDto, { description: 'Einsatz gefunden' })
// Generiert: { data: EinsatzDto, meta: { timestamp, version, requestId } }
```

### Referenz-Controller (korrektes Pattern)

**AdminQualifikationenController** - Bereits korrekt migriert:
- Pfad: `packages/backend/src/modules/kraefte/controllers/admin-qualifikationen.controller.ts`
- Line 119: `@ApiWrappedResponse(QualifikationDto, { isArray: true, description: '...' })`
- Line 232: `@ApiWrappedCreatedResponse(QualifikationDto, { description: '...' })`

### Checkliste nach jeder Datei

1. ✅ Import hinzugefügt
2. ✅ Alle @ApiOkResponse → @ApiWrappedResponse
3. ✅ Alle @ApiCreatedResponse → @ApiWrappedCreatedResponse
4. ✅ Alte Imports entfernt (falls nicht mehr benötigt)
5. ✅ Biome Lint: `pnpm --filter @bluelight-hub/backend exec biome check --write`

---

## References

| Dokument | Pfad |
|----------|------|
| CLAUDE.md AC7 | `CLAUDE.md` → "Controller Response Decorator Check (AC7)" |
| Decorator Implementation | `packages/backend/src/modules/common/decorators/api-wrapped-response.decorator.ts` |
| AdminQualifikationenController (Referenz) | `packages/backend/src/modules/kraefte/controllers/admin-qualifikationen.controller.ts` |
| EinsatzController (Referenz) | `packages/backend/src/modules/einsatz/controllers/einsatz.controller.ts` |
| Project Context | `docs/project-context.md` |

---

## Dev Agent Record

### Context Reference

Erstellt via BMad create-story Workflow (YOLO-Modus) mit parallelen Subagents.

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

**2025-12-31 - Story TD2.1 Draft erstellt:**

1. **Subagent-Analyse (3 parallel):**
   - Explore Agent #1: @ApiWrappedResponse Decorator Implementation
   - Explore Agent #2: Kraefte Controller Analyse (alle 13 Controller)
   - Explore Agent #3: Referenz-Pattern aus EinsatzController

2. **Analyse-Ergebnis:**
   - 3 Controller brauchen Migration (13 Endpoints)
   - 10 Controller bereits korrekt migriert
   - Decorator in `@/modules/common/decorators/api-wrapped-response.decorator.ts`

3. **Pattern-Entscheidungen:**
   - AdminQualifikationenController als Referenz-Pattern
   - Gleiche Description-Texte wie in migrierten Controllern
   - Nach jeder Datei Biome Lint ausführen

**2025-12-31 - Implementierung abgeschlossen:**

1. **Migrierte Endpoints (13 total):**
   - AdminRollenController: 5 Endpoints (findAll, findOne, create, update, deactivate)
   - AdminFahrzeugtypenController: 5 Endpoints (findAll, findOne, create, update, deactivate)
   - AdminFunkStatusController: 3 Endpoints (findAll, findByCode, update)

2. **Änderungen pro Controller:**
   - Import hinzugefügt: `ApiWrappedResponse`, `ApiWrappedCreatedResponse`
   - Alte Imports entfernt: `ApiOkResponse`, `ApiCreatedResponse`
   - Alle `@ApiOkResponse` → `@ApiWrappedResponse` mit description
   - Alle `@ApiCreatedResponse` → `@ApiWrappedCreatedResponse` mit description

3. **Validierung:**
   - ✅ TypeScript-Kompilierung: Keine Fehler
   - ✅ API-Client Regenerierung: Erfolgreich
   - ✅ WrappedResponse-Struktur: Korrekt generiert (`{ data, meta, pagination? }`)
   - ⚠️ Biome Lint: 3 Logger-Warnungen (bekanntes Tech Debt, nicht durch Migration verursacht)

### File List

**Geändert:**
- `packages/backend/src/modules/kraefte/controllers/admin-rollen.controller.ts` (Task 1) ✅
- `packages/backend/src/modules/kraefte/controllers/admin-fahrzeugtypen.controller.ts` (Task 2) ✅
- `packages/backend/src/modules/kraefte/controllers/admin-funk-status.controller.ts` (Task 3) ✅

**Regeneriert (neu):**
- `packages/shared/client/models/AdminRollenControllerFindAllVAlpha200Response.ts` ✅
- `packages/shared/client/models/AdminRollenControllerCreateVAlpha201Response.ts` ✅
- `packages/shared/client/models/AdminFahrzeugtypenControllerFindAllVAlpha200Response.ts` ✅
- `packages/shared/client/models/AdminFahrzeugtypenControllerCreateVAlpha201Response.ts` ✅
- `packages/shared/client/models/AdminFunkStatusControllerFindAllVAlpha200Response.ts` ✅
- `packages/shared/client/models/AdminFunkStatusControllerFindByCodeVAlpha200Response.ts` ✅

**Gelöscht (ersetzt durch WrappedResponse-Typen):**
- `packages/shared/client/models/FahrzeugtypenControllerFindAllActiveVAlpha200Response.ts` ❌

### Change Log

| Datum | Änderung |
|-------|----------|
| 2025-12-31 | Story TD2.1 Draft erstellt via BMad create-story YOLO |
| 2025-12-31 | SM Validation (4 Subagents): 90% Pass, FunkStatusDto→FunkStatusConfigDto Fix, Token-Optimierung |
| 2025-12-31 | **Implementierung abgeschlossen**: 13 Endpoints migriert, API-Client regeneriert, TypeScript-Check bestanden |
| 2026-01-01 | **Code Review (4 Subagents)**: APPROVED - Alle 3 Controller korrekt migriert, WrappedResponse-Struktur verifiziert, File List erweitert |

---

## Senior Developer Review (AI)

**Reviewer:** Dev Agent (Amelia)
**Datum:** 2026-01-01
**Ergebnis:** ✅ **APPROVED**

### Review Summary

| Kriterium | Status |
|-----------|--------|
| AC1-AC5 implementiert | ✅ PASS |
| Code Quality | ✅ Excellent |
| Security | ✅ No issues |
| WrappedResponse korrekt generiert | ✅ Verified |

### Review Methodik

4 parallele Subagents eingesetzt:
1. **AdminRollenController Review** → 5/5 Endpoints korrekt
2. **AdminFahrzeugtypenController Review** → 5/5 Endpoints korrekt
3. **AdminFunkStatusController Review** → 3/3 Endpoints korrekt
4. **API-Client Verification** → Alle 6 Response-Typen korrekt strukturiert

### Gefundene Issues (gefixt)

| Severity | Issue | Fix |
|----------|-------|-----|
| MEDIUM | File List unvollständig (gelöschte + neue Dateien) | File List erweitert |
| LOW | Status noch "Ready for Review" | Status → Done |

### Empfehlung

Story ist **production-ready** und kann committed werden.
