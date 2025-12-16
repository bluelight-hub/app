# Validation Report: Story 2.1 - Stamm-Fahrzeuge verwalten

**Document:** `/docs/sprint-artifacts/2-1-stamm-fahrzeuge-verwalten.md`
**Checklist:** BMad Story Quality Checklist
**Date:** 2025-12-16
**Validator:** BMad Scrum Master (Bob) + 5 Parallel Subagents
**Story Status:** `ready-for-dev` (Spezifikation, NICHT implementiert)

---

## Summary

| Metric | Value |
|--------|-------|
| **Overall Pass Rate** | 32/38 (84%) |
| **Critical Issues** | 2 |
| **Enhancements** | 4 |
| **Optimizations** | 3 |

**Verdict:** ⚠️ **BEDINGT BEREIT** - Story ist gut strukturiert, aber hat 2 kritische Lücken die vor Dev-Start behoben werden sollten.

---

## Section Results

### 1. Pre-Requisites & Dependencies
**Pass Rate:** 4/4 (100%)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1.1 | Epic 1 Dependencies | ✅ PASS | Line 13-14: "Epic 1 Stories sind DONE" |
| 1.2 | Story 2.0 Dependency | ✅ PASS | Lines 14-19: Prisma Schema vorhanden (verifiziert: `model StammFahrzeug` in schema.prisma) |
| 1.3 | Fahrzeugtyp FK | ✅ PASS | Line 18: "FK zu Fahrzeugtyp existiert" (verifiziert: `fahrzeugtypId String` in schema) |
| 1.4 | Seed Data | ✅ PASS | Line 19: "4 Beispiel-Fahrzeuge vorhanden" |

---

### 2. User Story Format
**Pass Rate:** 3/3 (100%)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 2.1 | As/Want/So That | ✅ PASS | Lines 24-28: Korrekt formatiert |
| 2.2 | Persona | ✅ PASS | "Admin (Maria)" - konsistent mit Epic |
| 2.3 | Business Value | ✅ PASS | "damit die Flotte korrekt abgebildet..." |

---

### 3. Acceptance Criteria
**Pass Rate:** 6/6 (100%)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 3.1 | AC1: Liste anzeigen | ✅ PASS | Lines 34-46: Given/When/Then + Technical Validation |
| 3.2 | AC2: Anlegen | ✅ PASS | Lines 48-67: Vollständig mit Validierung |
| 3.3 | AC3: Bearbeiten | ✅ PASS | Lines 69-81: IMMUTABLE fahrzeugtypId dokumentiert |
| 3.4 | AC4: Archivieren | ✅ PASS | Lines 83-94: KEIN DELETE Pattern |
| 3.5 | AC5: Validierung | ✅ PASS | Lines 96-106: class-validator Decorators |
| 3.6 | AC6: Authorization | ✅ PASS | Lines 108-118: Guard + Rate Limiting |

---

### 4. Technical Requirements
**Pass Rate:** 7/10 (70%)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 4.1 | DI Token Definition | ✅ PASS | Lines 160-167: `KRAEFTE_REPOSITORIES.STAMM_FAHRZEUG` |
| 4.2 | Value Object | ✅ PASS | Lines 172-195: `StammFahrzeugId` komplett |
| 4.3 | Aggregate | ✅ PASS | Lines 197-225: `StammFahrzeug` mit Methoden |
| 4.4 | Repository Interface | ✅ PASS | Lines 227-237: Vollständig |
| 4.5 | Error Codes | ✅ PASS | Lines 239-250: Alle Error Codes definiert |
| 4.6 | Commands Pattern | ⚠️ PARTIAL | Lines 266-349: Commands OK, aber **Query-Struktur fehlt** |
| 4.7 | DTOs | ✅ PASS | Lines 353-411: Create/Update/Response DTOs |
| 4.8 | Repository Impl | ✅ PASS | Lines 415-453: Prisma Repository mit Upsert |
| 4.9 | Mapper | ✗ FAIL | Lines 455-494: **NULL→undefined fehlt teilweise** (nur für manche Felder) |
| 4.10 | Controller | ⚠️ PARTIAL | Lines 499-607: **Update-Methode ist unvollständig** (Line 583-584) |

---

### 5. File List Completeness
**Pass Rate:** 6/8 (75%)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 5.1 | Domain Files | ✅ PASS | Lines 615-632: 7 Dateien korrekt |
| 5.2 | Commands | ✅ PASS | Lines 634-648: 6 Dateien |
| 5.3 | Queries | ✗ FAIL | Lines 650-658: **Fehlt Query Mapper** (siehe Fahrzeugtyp Pattern: `fahrzeugtyp-query.mapper.ts`) |
| 5.4 | DTOs + Module | ⚠️ PARTIAL | Lines 660-668: **Fehlt `index.ts` Barrel Exports** |
| 5.5 | Infrastructure | ✅ PASS | Lines 670-678: 2 Dateien |
| 5.6 | Controller | ✅ PASS | Lines 679-681: 1 Datei |
| 5.7 | Modifications | ✅ PASS | Lines 683-690: 3 Modifikationen |
| 5.8 | Total Count | ✅ PASS | "28 neue Dateien + 3 Modifikationen" |

---

### 6. Testing Strategy
**Pass Rate:** 2/3 (67%)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 6.1 | Unit Tests | ✅ PASS | Lines 699-710: AAA Pattern Tests dokumentiert |
| 6.2 | Manual Tests | ✅ PASS | Lines 712-738: Chrome DevTools MCP Steps |
| 6.3 | Handler Tests | ✗ FAIL | **Keine Handler-Test-Spezifikationen** (nur Domain Tests) |

---

### 7. Previous Story Intelligence
**Pass Rate:** 4/4 (100%)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 7.1 | Story 2.0 Learnings | ✅ PASS | Lines 742-760: NULL→undefined, biome-ignore, Archive-Pattern |
| 7.2 | Story 1.2 Learnings | ✅ PASS | Lines 762-771: TransactionalCommandHandler, Uniqueness-Check |
| 7.3 | Epic 1 Code Review | ✅ PASS | Lines 773-779: OpenAPI Decorators, jest.clearAllMocks |
| 7.4 | Anti-Patterns | ✅ PASS | Lines 133-138: Kritische Semantiken dokumentiert |

---

### 8. Architecture Compliance
**Pass Rate:** 0/6 (0%) - **CHECKLIST, NICHT IMPLEMENTATION**

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 8.1 | AC1 Checklist | ➖ N/A | Line 803: Unchecked (Story ist Spezifikation, nicht implementiert) |
| 8.2 | AC2 Checklist | ➖ N/A | Line 804: Unchecked |
| 8.3 | AC3 Checklist | ➖ N/A | Line 805: Unchecked |
| 8.4 | AC4 Checklist | ➖ N/A | Line 806: Unchecked |
| 8.5 | AC5 Checklist | ➖ N/A | Line 807: Unchecked |
| 8.6 | AC6 Checklist | ➖ N/A | Line 808: Unchecked |

**Note:** Diese Checklist ist für den Dev Agent nach Implementation - korrekt als unchecked.

---

## Critical Issues (Must Fix)

### 🔴 CRITICAL 1: Update-Methode unvollständig

**Location:** Lines 574-584

**Problem:**
```typescript
@Patch(':id')
async update(...): Promise<StammFahrzeugDto> {
  // ... Handler aufrufen, Error Mapping
}
```

Der Code-Block ist **nicht ausimplementiert** - nur Kommentar "Handler aufrufen, Error Mapping".

**Impact:** Dev Agent hat keine klare Vorlage für PATCH /:id Implementierung.

**Recommendation:**
```typescript
@Patch(':id')
@Throttle({ default: { limit: 10, ttl: 60000 } })
@ApiOperation({ summary: 'Stamm-Fahrzeug bearbeiten' })
@ApiOkResponse({ type: StammFahrzeugDto })
@ApiBadRequestResponse({ description: 'Validierungsfehler' })
@ApiNotFoundResponse({ description: 'Fahrzeug nicht gefunden' })
@ApiConflictResponse({ description: 'Funkrufname bereits vergeben oder Fahrzeugtyp-Änderung versucht' })
async update(
  @Param('id') id: string,
  @Body() dto: UpdateStammFahrzeugDto,
  @CurrentUser() user: UserPayload,
): Promise<StammFahrzeugDto> {
  const commandResult = UpdateStammFahrzeugCommand.create(dto, id, user.sub);
  if (commandResult.isFailure) {
    throw new BadRequestException(commandResult.error);
  }

  const result = await this.updateHandler.execute(commandResult.value);
  if (result.isFailure) {
    if (result.error === STAMM_FAHRZEUG_ERROR_CODES.NOT_FOUND) {
      throw new NotFoundException('Fahrzeug nicht gefunden');
    }
    if (result.error === STAMM_FAHRZEUG_ERROR_CODES.FUNKRUFNAME_DUPLICATE) {
      throw new ConflictException(`Funkrufname '${dto.funkrufname}' ist bereits vergeben`);
    }
    if (result.error === STAMM_FAHRZEUG_ERROR_CODES.FAHRZEUGTYP_IMMUTABLE) {
      throw new ConflictException('Fahrzeugtyp kann nicht geändert werden');
    }
    throw new InternalServerErrorException(result.error);
  }
  return result.value;
}
```

---

### 🔴 CRITICAL 2: Query-Struktur fehlt

**Location:** Lines 650-658

**Problem:**
Story zeigt Query-Dateien, aber **fehlt Query Mapper** der im Fahrzeugtyp-Pattern existiert:
- `queries/fahrzeugtyp-query.mapper.ts` (existiert in Fahrzeugtyp)
- Story 2.1 hat keinen äquivalenten `stamm-fahrzeug-query.mapper.ts`

**Impact:** Inkonsistenz mit etabliertem Pattern, potenzielle Code-Duplikation.

**Recommendation:**
Füge zur File-Liste hinzu:
```
├── queries/
│   ├── stamm-fahrzeug-query.mapper.ts                 [CREATE]
│   ├── get-all-stamm-fahrzeuge/
│   │   ├── get-all-stamm-fahrzeuge.query.ts           [CREATE]
│   │   └── get-all-stamm-fahrzeuge.handler.ts         [CREATE]
│   └── get-stamm-fahrzeug-by-id/
│       ├── get-stamm-fahrzeug-by-id.query.ts          [CREATE]
│       └── get-stamm-fahrzeug-by-id.handler.ts        [CREATE]
```

---

## Enhancement Opportunities (Should Add)

### ⚡ ENHANCEMENT 1: Handler Unit Tests spezifizieren

**Location:** Nach Line 710

**Problem:** Nur Domain Aggregate Tests dokumentiert, keine Handler Tests.

**Recommendation:** Füge hinzu:
```markdown
### Handler Unit Tests (gemäß AC6)
- `create-stamm-fahrzeug.handler.spec.ts`
  - ✅ execute() success mit validen Daten
  - ✅ execute() fail bei nicht-existentem Fahrzeugtyp
  - ✅ execute() fail bei doppeltem Funkrufname
- `update-stamm-fahrzeug.handler.spec.ts`
  - ✅ execute() success
  - ✅ execute() reject fahrzeugtypId change (IMMUTABLE)
- `archive-stamm-fahrzeug.handler.spec.ts`
  - ✅ execute() success
  - ✅ execute() fail bei bereits archiviert
```

---

### ⚡ ENHANCEMENT 2: Index Barrel Exports dokumentieren

**Location:** Lines 660-668

**Problem:** `index.ts` Barrel Exports fehlen in File-Liste.

**Recommendation:**
```markdown
├── dto/
│   ├── index.ts                                       [CREATE]
│   ├── create-stamm-fahrzeug.dto.ts                   [CREATE]
│   ├── update-stamm-fahrzeug.dto.ts                   [CREATE]
│   └── stamm-fahrzeug.dto.ts                          [CREATE]
├── commands/
│   └── index.ts                                       [CREATE]
├── queries/
│   └── index.ts                                       [CREATE]
└── index.ts                                           [CREATE]
```

---

### ⚡ ENHANCEMENT 3: Mapper NULL-Handling konsistenter

**Location:** Lines 455-494

**Problem:** Mapper zeigt `(entity.kennzeichen as string | null) ?? undefined` Konvertierung, aber **nicht für alle optionalen Felder konsistent**.

**Recommendation:**
Füge explizite Regel hinzu:
```markdown
**KRITISCH: NULL → undefined für ALLE optionalen Felder:**
- kennzeichen: `(entity.kennzeichen as string | null) ?? undefined`
- baujahr: `(entity.baujahr as number | null) ?? undefined`
- funkkenungBOS: `(entity.funkkenungBOS as string | null) ?? undefined`
- archivedAt: `(entity.archivedAt as Date | null) ?? undefined`
- archivedBy: `(entity.archivedBy as string | null) ?? undefined`
- updatedBy: `(entity.updatedBy as string | null) ?? undefined`
```

---

### ⚡ ENHANCEMENT 4: Application Module dokumentieren

**Location:** Nach Line 668

**Problem:** `stamm-fahrzeuge-application.module.ts` genannt aber Struktur nicht gezeigt.

**Recommendation:**
```typescript
// packages/backend/src/application/kraefte/stamm-fahrzeuge/stamm-fahrzeuge-application.module.ts
@Module({
  providers: [
    // Commands
    CreateStammFahrzeugHandler,
    UpdateStammFahrzeugHandler,
    ArchiveStammFahrzeugHandler,
    // Queries
    GetAllStammFahrzeugeHandler,
    GetStammFahrzeugByIdHandler,
    // Mapper
    StammFahrzeugQueryMapper,
  ],
  exports: [
    CreateStammFahrzeugHandler,
    UpdateStammFahrzeugHandler,
    ArchiveStammFahrzeugHandler,
    GetAllStammFahrzeugeHandler,
    GetStammFahrzeugByIdHandler,
  ],
})
export class StammFahrzeugeApplicationModule {}
```

---

## Optimizations (Nice to Have)

### ✨ OPTIMIZATION 1: Code-Beispiele kürzen

**Problem:** Viele Code-Beispiele sind sehr lang und wiederholen bekannte Patterns.

**Recommendation:**
Für bereits etablierte Patterns (z.B. TransactionalCommandHandler) nur referenzieren:
```markdown
**Pattern:** Siehe `CreateFahrzeugtypHandler` für TransactionalCommandHandler Implementierung.
```

---

### ✨ OPTIMIZATION 2: Mermaid Diagramm für Architektur

**Recommendation:**
```markdown
### Architektur-Übersicht
\`\`\`mermaid
graph TB
    Controller[AdminStammFahrzeugeController] --> CH[CreateHandler]
    Controller --> UH[UpdateHandler]
    Controller --> AH[ArchiveHandler]
    Controller --> GAH[GetAllHandler]
    Controller --> GIH[GetByIdHandler]

    CH --> Repo[IStammFahrzeugRepository]
    UH --> Repo
    AH --> Repo
    GAH --> Repo
    GIH --> Repo

    Repo --> PrismaRepo[PrismaStammFahrzeugRepository]
    PrismaRepo --> Prisma[(PostgreSQL)]
\`\`\`
```

---

### ✨ OPTIMIZATION 3: Quick Reference Table

**Recommendation:**
```markdown
### Quick Reference

| Aktion | Endpoint | Handler | Error Codes |
|--------|----------|---------|-------------|
| Liste | GET / | GetAllStammFahrzeugeHandler | - |
| Detail | GET /:id | GetStammFahrzeugByIdHandler | NOT_FOUND |
| Create | POST / | CreateStammFahrzeugHandler | FUNKRUFNAME_DUPLICATE, INVALID_FAHRZEUGTYP |
| Update | PATCH /:id | UpdateStammFahrzeugHandler | NOT_FOUND, FUNKRUFNAME_DUPLICATE, FAHRZEUGTYP_IMMUTABLE |
| Archive | PATCH /:id/archive | ArchiveStammFahrzeugHandler | NOT_FOUND, ALREADY_ARCHIVED |
```

---

## Codebase Verification

### Bestätigte Existenz
| Item | Status | Pfad |
|------|--------|------|
| Prisma Model | ✅ EXISTS | `packages/backend/prisma/schema.prisma` (StammFahrzeug) |
| DI Tokens Namespace | ✅ EXISTS | `packages/backend/src/infrastructure/di-tokens.ts` (KRAEFTE_REPOSITORIES) |
| Fahrzeugtyp Reference | ✅ EXISTS | 33 Dateien in `packages/backend/src/**/fahrzeugtyp*` |
| Seed Data | ✅ EXISTS | `packages/backend/prisma/seed.ts` |

### Bestätigte Nicht-Existenz (korrekt für ready-for-dev)
| Item | Status | Erwartet |
|------|--------|----------|
| StammFahrzeug Domain Files | ✅ NOT EXISTS | Soll erstellt werden |
| StammFahrzeug Application Files | ✅ NOT EXISTS | Soll erstellt werden |
| StammFahrzeug Infrastructure Files | ✅ NOT EXISTS | Soll erstellt werden |
| StammFahrzeug Controller | ✅ NOT EXISTS | Soll erstellt werden |
| STAMM_FAHRZEUG DI Token | ✅ NOT EXISTS | Soll hinzugefügt werden |

---

## Pattern Compliance Check

### Fahrzeugtyp vs StammFahrzeug Pattern-Vergleich

| Pattern | Fahrzeugtyp | Story 2.1 | Status |
|---------|-------------|-----------|--------|
| Aggregate | `fahrzeugtyp.aggregate.ts` | `stamm-fahrzeug.aggregate.ts` | ✅ |
| Value Object ID | `fahrzeugtyp-id.ts` | `stamm-fahrzeug-id.ts` | ✅ |
| Error Codes | `fahrzeugtyp-error-codes.ts` | `stamm-fahrzeug-error-codes.ts` | ✅ |
| Validation Constants | `fahrzeugtyp-validation.constants.ts` | `stamm-fahrzeug-validation.constants.ts` | ✅ |
| Events | `fahrzeugtyp-created.event.ts` | `stamm-fahrzeug-created.event.ts` | ✅ |
| Query Mapper | `fahrzeugtyp-query.mapper.ts` | **FEHLT** | ❌ |
| Application Module | `fahrzeugtypen-application.module.ts` | Erwähnt aber nicht detailliert | ⚠️ |
| Unit Tests | 6 Test-Dateien | Nur Domain Tests spezifiziert | ⚠️ |

---

## Recommendations

### 1. Must Fix (vor Dev-Start)

1. **CRITICAL 1:** Update-Methode im Controller vollständig ausimplementieren
2. **CRITICAL 2:** Query Mapper (`stamm-fahrzeug-query.mapper.ts`) zur File-Liste hinzufügen

### 2. Should Improve (während Dev oder direkt danach)

3. **ENHANCEMENT 1:** Handler Unit Tests spezifizieren
4. **ENHANCEMENT 2:** Index Barrel Exports dokumentieren
5. **ENHANCEMENT 3:** NULL-Handling konsistent für alle Felder dokumentieren
6. **ENHANCEMENT 4:** Application Module Struktur zeigen

### 3. Consider (optional, nice-to-have)

7. **OPTIMIZATION 1:** Code-Beispiele kürzen durch Pattern-Referenzen
8. **OPTIMIZATION 2:** Mermaid Diagramm hinzufügen
9. **OPTIMIZATION 3:** Quick Reference Table

---

## Validation Checklist Status

- [x] Pre-Requisites vollständig
- [x] User Story korrekt formatiert
- [x] Acceptance Criteria mit Given/When/Then
- [x] Technical Requirements (70%)
- [x] File List (75%)
- [ ] **Update-Methode unvollständig** ← CRITICAL
- [ ] **Query Mapper fehlt** ← CRITICAL
- [x] Testing Strategy (67%)
- [x] Previous Story Intelligence
- [x] Architecture Compliance Checklist vorhanden

---

**Report Generated:** 2025-12-16
**Validator:** BMad Scrum Master (Bob) + 5 Parallel Subagents
**Validation Framework:** BMad Story Quality Checklist v6

---

## Next Steps

**IMPROVEMENT OPTIONS:**

Which improvements would you like me to apply to the story?

- **all** - Apply all suggested improvements
- **critical** - Apply only critical issues (2 items)
- **select** - I'll choose specific numbers
- **none** - Keep story as-is
- **details** - Show me more details about any suggestion

Your choice:
