# Validation Report: Story 4.1 - Person manuell registrieren

**Document:** `docs/sprint-artifacts/4-1-person-manuell-registrieren.md`
**Checklist:** `bmm/workflows/4-implementation/create-story/checklist.md`
**Date:** 2025-12-18
**Validator:** SM Agent (Bob) + 5 Parallel Subagents

---

## Summary

| Metric | Value |
|--------|-------|
| **Overall Score** | 62/100 |
| **Critical Issues** | 8 |
| **High Priority** | 6 |
| **Medium Priority** | 9 |
| **Low Priority** | 4 |
| **Recommendation** | 🔴 **REVISE BEFORE IMPLEMENTATION** |

---

## Section Results

### 1. Epic Alignment (Epic 4 Requirements)
**Pass Rate:** 3/6 (50%)

| Item | Status | Evidence |
|------|--------|----------|
| AC1: Formular Felder (Vorname, Nachname, **Funktion**, Qualifikationen) | ✗ FAIL | **"Funktion" field MISSING** - Lines 36-40 only show Nachname, Vorname, Qualifikationen |
| AC2: Stammdaten-Autocomplete (max 10, auto-fill) | ⚠ PARTIAL | Lines 50-58 - Autocomplete documented but Funktion auto-fill not specified |
| AC3: Registrierung mit/ohne Stammdaten | ⚠ PARTIAL | Lines 65-77 - Pattern OK but Event name differs from Epic ("PersonRegistriert" vs "EinsatzPersonHinzugefuegtEvent") |
| AC4: UI Feedback (Toast, List update) | ✓ PASS | Lines 79-91 - Fully documented |
| Cross-Story Dependencies (4.0 → 4.1 → 4.2) | ⚠ PARTIAL | Lines 598-607 - References present but DRK-App QR format not considered |
| Schema Completeness (Story 4.0) | ✗ FAIL | Story 4.0 schema missing `funktion` field required by Epic 4 |

### 2. Backend Patterns (EinsatzFahrzeug Reference)
**Pass Rate:** 6/10 (60%)

| Item | Status | Evidence |
|------|--------|----------|
| DI Token Registration | ⚠ PARTIAL | Task 2.3 (Line 141) mentions token but no `Symbol()` syntax shown |
| Repository NULL→undefined Mapping | ✓ PASS | Lines 452-491 - Complete mapper pattern documented |
| Mapper Class Pattern | ⚠ PARTIAL | Lines 454-491 - Mapper shown but missing `import type` for Prisma |
| TransactionalCommandHandler | ✓ PASS | Lines 322-394 - Handler extends correctly |
| Domain Event + Idempotency | ⚠ PARTIAL | Lines 288-290 - Events emitted but no idempotency check pattern |
| Logger Port Injection | ✗ FAIL | **MISSING** - No `@Inject(DI_TOKENS.PORTS.LOGGER)` in Handler examples |
| DTO Validation Pattern | ⚠ PARTIAL | Lines 159-163 - Basic DTO shown but missing `@ValidateNested()`, `@Type()` |
| Controller Result→HTTP Translation | ⚠ PARTIAL | Task 4.1 mentioned but no `WrappedResponse<T>` example |
| Module Provider Registration | ✗ FAIL | **MISSING** - No `EinsatzPersonenApplicationModule` setup documented |
| Command Private Constructor | ✗ FAIL | **MISSING** - Commands shown without private constructor + static `create()` |

### 3. Previous Story Learnings (Epic 3 + Story 4.0)
**Pass Rate:** 10/16 (63%)

| Learning | Status | Evidence |
|----------|--------|----------|
| Snapshot Pattern | ✓ PASS | Lines 254, 262-320 - "KOPIERT Daten" documented |
| Fire-and-Forget ETB | ✓ PASS | Lines 631-655 - Handler with try/catch pattern |
| undefined vs null Semantics | ✓ PASS | Lines 259, 452-491 - NULL→undefined conversion |
| TransactionalCommandHandler | ✓ PASS | Lines 322-394 - Correct pattern |
| Domain Event Emission | ✓ PASS | Lines 288-290, 313-315 - Events in factories |
| DI Token Pattern | ✓ PASS | Task 2.3, Lines 141-142, 330-336 |
| Repository with Transaction | ✓ PASS | Task 2.1 - `tx?: TransactionContext` |
| Two Factories Pattern | ✓ PASS | Lines 109-111, 262-319 |
| AAA Test Pattern | ✓ PASS | Lines 703-751 - Given-When-Then comments |
| Framework-Agnostizität | ✓ PASS | Lines 692-693 - AC3 compliance noted |
| **Optimistic Locking** | ✗ FAIL | **MISSING** - No `updatedAt` handling for future updates |
| **ETB Handler Unit Tests** | ✗ FAIL | **MISSING** - Task 6 doesn't include ETB handler tests |
| **StammPerson istAktiv Check** | ✗ FAIL | **MISSING** - No validation if StammPerson is active |
| **UUID/CUID Validation** | ✗ FAIL | **MISSING** - No ID format validation in factories |
| **Error Code Constants** | ⚠ PARTIAL | Task 1.2 (Lines 103-105) - Listed but no implementation |
| **Duplicate-Check Result.fail()** | ✗ FAIL | Line 357 - Shows exception instead of `Result.fail()` |

### 4. Frontend Patterns (FahrzeugHinzufuegenDialog Reference)
**Pass Rate:** 4/10 (40%)

| Item | Status | Evidence |
|------|--------|----------|
| Generated API Client Usage | ✓ PASS | Lines 399-411 - `api.stammPersonen.suche()` pattern |
| TanStack Query Hooks | ✓ PASS | Lines 399-411 - Hook pattern documented |
| Query Key Hierarchy | ✗ FAIL | **MISSING** - No `QUERY_KEYS.kraefte.personen` structure |
| Combobox Component | ✓ PASS | Lines 434-449 - Headless UI Combobox pattern |
| Server-Side Search | ✗ FAIL | **WRONG** - Story shows client-side pattern, needs server-side |
| Debounce Implementation | ✗ FAIL | **MISSING** - No `useDebouncedValue()` hook shown |
| Minimum Search Length | ⚠ PARTIAL | Line 49 - "1 Zeichen" mentioned but no `enabled: query.length >= 1` |
| Form Validation (Zod) | ✓ PASS | Lines 213-220 - @tanstack/react-form + Zod |
| Cache Invalidation | ✗ FAIL | **MISSING** - No queries to invalidate after mutation |
| Loading/Empty States | ✗ FAIL | **MISSING** - No placeholder text defined |

### 5. Architecture Compliance (AC1-AC6)
**Pass Rate:** 3/6 (50%)

| Check | Status | Evidence |
|-------|--------|----------|
| **AC1:** DI Import (`import` not `import type`) | ✓ PASS | Lines 245-247 - Correct import shown |
| **AC2:** DI Token Constants (Symbol in di-tokens.ts) | ⚠ PARTIAL | Task 2.3 - Token mentioned but Symbol syntax missing |
| **AC3:** Framework-Agnostizität (Domain/App layer clean) | ✗ FAIL | Lines 168-173 - Commands use plain strings instead of Value Objects; Layer separation unclear |
| **AC4:** Result Pattern (`Result.fail()` not throw) | ✓ PASS | Lines 181-193 - Result pattern shown |
| **AC5:** Outbox Pattern (TransactionalCommandHandler) | ✗ FAIL | **CRITICAL** - Lines 345-348 show direct `eventEmitter.emit()` - violates Outbox! |
| **AC6:** Test Pattern (AAA + jest.clearAllMocks) | ✗ FAIL | Lines 703-751 - Missing `jest.clearAllMocks()` in beforeEach |

### 6. LLM Optimization (Token Efficiency & Clarity)
**Pass Rate:** 7/10 (70%)

| Item | Status | Evidence |
|------|--------|----------|
| Actionable Task Breakdown | ✓ PASS | Lines 95-245 - Clear subtasks with file paths |
| Code Examples | ✓ PASS | Lines 262-491 - Complete code snippets |
| Anti-Pattern Table | ✓ PASS | Lines 250-260 - Clear Richtig/Falsch comparison |
| File Structure Documentation | ✓ PASS | Lines 497-570 - CREATE/MODIFY files listed |
| References Section | ✓ PASS | Lines 596-607 - Pattern files linked |
| Verbosity Issues | ⚠ PARTIAL | Some sections could be more concise (e.g., Dev Notes repetition) |
| Ambiguity Issues | ✗ FAIL | Funktion field missing creates ambiguity |
| Context Overload | ⚠ PARTIAL | 806 lines may overwhelm LLM context |
| Missing Critical Signals | ✗ FAIL | AC5 violation not flagged; Funktion field missing |
| Poor Structure | ✓ PASS | Well-organized with clear headings |

---

## Failed Items (Must Fix)

### 🔴 CRITICAL (8 Items)

| # | Issue | Location | Impact | Recommended Fix |
|---|-------|----------|--------|-----------------|
| 1 | **"Funktion" field MISSING from AC1** | Lines 36-40 | Schema incomplete, Epic 4 requirement violated | Add `Funktion (required, Select Dropdown)` to AC1 form fields |
| 2 | **Funktion field MISSING from Schema (Story 4.0)** | Story 4.0 | Cannot implement required field | Add `funktion: String` to EinsatzPerson Prisma model + migration |
| 3 | **AC5 Outbox Pattern VIOLATION** | Lines 345-348 | Direct event emission breaks eventual consistency | Remove `eventEmitter.emit()`, use TransactionalCommandHandler events array |
| 4 | **AC6 Test Pattern - Missing jest.clearAllMocks()** | Lines 703-751 | Test pollution, flaky tests | Add `jest.clearAllMocks()` to all beforeEach blocks |
| 5 | **Logger Port Injection MISSING** | Handler examples | No logging in handlers | Add `@Inject(DI_TOKENS.PORTS.LOGGER) private readonly logger: ILoggerPort` |
| 6 | **Module Provider Registration MISSING** | Task 2.4 | DI will fail without module setup | Document `EinsatzPersonenApplicationModule` creation |
| 7 | **Command Private Constructor MISSING** | Lines 168-173 | Validation bypassed | Add private constructor + static `create(): Result<Command>` |
| 8 | **Frontend Debounce MISSING** | Task 5.3 | Performance issues, API overload | Add `useDebouncedValue(query, 300)` pattern |

---

## Partial Items (Should Fix)

### 🟡 HIGH PRIORITY (6 Items)

| # | Issue | Location | Gap | Recommended Fix |
|---|-------|----------|-----|-----------------|
| 1 | Event name inconsistency | Lines 14, 74, 112 | Epic 4 says "PersonRegistriert", Story uses "EinsatzPersonHinzugefuegtEvent" | Align naming with Epic 4 OR update Epic 4 |
| 2 | AC3 Layer Separation unclear | Lines 168-173, 302-305 | Commands use strings instead of Value Objects | Use `EinsatzId`, `PersonName` Value Objects in Commands |
| 3 | DI Token Symbol syntax | Task 2.3 | Token name mentioned but no `Symbol()` example | Add: `EINSATZ_PERSON: Symbol('IEinsatzPersonRepository')` |
| 4 | DTO Validation incomplete | Lines 159-163 | Missing `@ValidateNested()`, `@Type()` | Add complete class-validator decorators |
| 5 | Query Key Structure | Task 5.2 | No `QUERY_KEYS.kraefte.personen` documented | Add query key factory functions |
| 6 | Cache Invalidation Strategy | Task 5.2 | Mutation doesn't specify invalidations | Document: invalidate `byEinsatz`, `available`, `einsatz.detail` |

### 🟢 MEDIUM PRIORITY (9 Items)

| # | Issue | Location | Gap |
|---|-------|----------|-----|
| 1 | Autocomplete Funktion handling | Lines 50-58 | Should Funktion auto-fill from Stammdaten? |
| 2 | DRK-App QR format not considered | N/A | Story 4.2 compatibility (Mitgliedsnummer lookup) |
| 3 | Qualifikationen auto-fill behavior | Lines 56-58 | Can user modify auto-filled qualifications? |
| 4 | Idempotency checks in aggregate | Lines 288-290 | No check if same person already registered |
| 5 | StammPerson.istAktiv validation | Handler examples | No check if StammPerson is active |
| 6 | Error Code Constants implementation | Task 1.2 | Codes listed but no enum shown |
| 7 | Duplicate-Check uses exception | Line 357 | Should use `Result.fail(EINSATZ_PERSON_ERRORS.DUPLICATE)` |
| 8 | ETB Handler Unit Tests | Task 6 | Missing test file for ETB handler |
| 9 | Controller WrappedResponse | Task 4.1 | No `WrappedResponse<T>` return type example |

### ⚪ LOW PRIORITY (4 Items)

| # | Issue | Location |
|---|-------|----------|
| 1 | Optimistic Locking (future updates) | N/A - Out of Scope for 4.1 |
| 2 | UUID/CUID validation in factories | Lines 262-319 |
| 3 | Position field handling | N/A - Marked Out of Scope |
| 4 | Document verbosity (806 lines) | Entire document |

---

## Recommendations

### 1. Must Fix (Before Implementation)

#### 1.1 Add Funktion Field to Story 4.0 Schema

```prisma
// packages/backend/prisma/schema.prisma
model EinsatzPerson {
  // ... existing fields
  funktion    String  @db.VarChar(50)  // ADD THIS
}
```

**Migration required:** `prisma migrate dev --name add_einsatz_person_funktion`

#### 1.2 Update Story 4.1 AC1

```markdown
**Then** öffnet sich ein Formular mit:
- Nachname (required, Text Input mit Autocomplete)
- Vorname (required, Text Input)
- Funktion (required, Select Dropdown - z.B. "Helfer", "Gruppenführer", "Zugführer")
- Qualifikationen (optional, Multi-Select aus aktiven Qualifikationen)
```

#### 1.3 Fix AC5 - Remove Direct Event Emission

Replace Lines 345-348:
```typescript
// ❌ FALSCH - Direkte Event-Emission
this.eventEmitter.emit('einsatz.person.created', event);

// ✅ RICHTIG - Events über TransactionalCommandHandler
return { result: person.id.value, events }; // Base class saves to Outbox
```

#### 1.4 Fix AC6 - Add jest.clearAllMocks()

```typescript
describe('RegistrierePersonHandler', () => {
  let handler: RegistrierePersonHandler;
  let mockRepository: jest.Mocked<IEinsatzPersonRepository>;

  beforeEach(() => {
    jest.clearAllMocks(); // ADD THIS LINE
    // ... mock setup
  });
});
```

#### 1.5 Add Logger Injection to Handler

```typescript
constructor(
  @Inject(DI_TOKENS.KRAEFTE.REPOSITORIES.EINSATZ_PERSON)
  private readonly personRepository: IEinsatzPersonRepository,
  @Inject(DI_TOKENS.PORTS.LOGGER)
  private readonly logger: ILoggerPort, // ADD THIS
  prismaService: PrismaService,
) {
  super(prismaService, logger, 'RegistrierePersonHandler');
}
```

#### 1.6 Add Debounce to Frontend

```typescript
// PersonHinzufuegenDialog.organism.tsx
import { useDebouncedValue } from '@react-hookz/web';

const [query, setQuery] = useState('');
const debouncedQuery = useDebouncedValue(query, 300);

const { data: suggestions } = useStammPersonenSuche(
  debouncedQuery,
  isOpen && debouncedQuery.length >= 1
);
```

### 2. Should Improve (High Priority)

1. **Align Event Names:** Decide on `PersonRegistriertEvent` vs `EinsatzPersonHinzugefuegtEvent`
2. **Add Value Objects to Commands:** Use `EinsatzId`, `PersonName` instead of strings
3. **Document Module Setup:** Add `EinsatzPersonenApplicationModule` example
4. **Add Query Keys:** Define `QUERY_KEYS.kraefte.personen` structure

### 3. Consider (Medium Priority)

1. Clarify Funktion auto-fill behavior from Stammdaten
2. Add Mitgliedsnummer support for Story 4.2 compatibility
3. Add `Result.fail()` for duplicate check instead of exception
4. Add ETB Handler unit tests to Task 6

---

## Validation Conclusion

**Story 4.1 Status:** 🔴 **NOT READY FOR IMPLEMENTATION**

**Blocking Issues:**
1. "Funktion" field missing from Epic 4 requirement
2. AC5 Outbox Pattern violation (direct event emission)
3. AC6 Test Pattern incomplete

**Estimated Revision Time:** 3-4 hours

**Next Steps:**
1. Update Story 4.0 Prisma schema (add `funktion` field) + migration
2. Update Story 4.1 AC1, AC2, Tasks with Funktion handling
3. Fix all 8 Critical issues listed above
4. Re-validate after fixes

---

## Appendix: Subagent Analysis Sources

| Agent | Focus Area | Key Findings |
|-------|------------|--------------|
| **Epic 4 Analyzer** | Cross-story alignment | 6 gaps: Funktion field, Event naming, DRK-App format |
| **Pattern Detector (Backend)** | EinsatzFahrzeug patterns | 10 missing patterns: DI, Mapper, Logger, Module |
| **Learnings Extractor** | Epic 3 + Story 4.0 | 66% incorporation (10/16 learnings) |
| **Pattern Detector (Frontend)** | FahrzeugDialog patterns | 6 missing: Debounce, Query Keys, Cache Invalidation |
| **Architecture Reviewer** | AC1-AC6 compliance | 3 HIGH violations: AC3, AC5, AC6 |

---

**Report Generated:** 2025-12-18T15:30:00Z
**Validator:** Scrum Master Agent (Bob) with 5 Parallel Subagents
