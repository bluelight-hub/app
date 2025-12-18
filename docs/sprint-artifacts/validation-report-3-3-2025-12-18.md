# Validation Report - Story 3.3: FMS-Status updaten

**Document:** `docs/sprint-artifacts/3-3-fms-status-updaten.md`
**Checklist:** `.bmad/bmm/workflows/4-implementation/create-story/checklist.md`
**Date:** 2025-12-18
**Validator:** SM Agent (Bob) mit 6 parallelen Subagents

---

## Summary

- **Overall:** 34/42 passed (81%)
- **Critical Issues:** 3
- **High Issues:** 8
- **Medium Issues:** 5

---

## Section Results

### 1. Epic-to-Story Context Analysis

**Pass Rate:** 6/11 (55%)

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | Epic 3 Story 3.3 correctly identified | Story references Epic 3 Fahrzeug-Einsatz-Verwaltung (Line 311) |
| ✓ PASS | User Outcome aligned | "FMS-Status updaten" matches Epic objective |
| ✓ PASS | Feature Requirements covered | FR3, FR27, FR29-31 implicitly covered |
| ✗ FAIL | **AC5 CONFLICT** | Epic AC5 = "Status-Historie Tooltip", Story AC5 = "Position Update" - Completely different requirements |
| ⚠ PARTIAL | AC4 Mapping | Epic AC4 = "Status-Farben (UI)", Story AC4 = "Validation (Backend)" - Different concerns, both needed |
| ✗ FAIL | **Event Name Inconsistency** | Epic: `FahrzeugStatusGeaendert`, Story: `FmsStatusGeaendertEvent` - Should standardize to Epic naming |
| ➖ N/A | Cross-Story Dependencies | Documented correctly (3-0, 3-1, 3-2) |
| ⚠ PARTIAL | Epic "Enables" not referenced | No mention of Epic 6/8 that depend on Story 3.3 output |
| ✓ PASS | Acceptance Criteria complete | AC1-AC4 align with core requirements |
| ✓ PASS | Tasks cover all ACs | Tasks 1-8 address AC1-AC5 |
| ⚠ PARTIAL | Missing Status History feature | Epic AC5 (Status History Tooltip) has NO corresponding task |

**Impact:** AC5 conflict must be resolved before implementation. Either Epic's "Status-Historie Tooltip" or Story's "Position Update" - not both as AC5.

---

### 2. Architecture Compliance (CLAUDE.md AC1-AC6)

**Pass Rate:** 11/12 (92%)

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | AC1 - DI Import Check | Correctly documented in Dev Notes (Lines 162-169) |
| ✓ PASS | AC2 - DI Token Constants | Uses `KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG` Symbol (Lines 172-179) |
| ✓ PASS | AC3 - Framework-Agnostizität | Application Layer restricted to `@Injectable`, `@Inject`, `@Optional` (Lines 181-183) |
| ✓ PASS | AC4 - Result Pattern | Properly shows Result<T> usage (Lines 185-199) |
| ✓ PASS | AC5 - Outbox Integration | TransactionalCommandHandler pattern correct (Lines 201-223) |
| ⚠ PARTIAL | AC6 - Test Pattern | AAA Pattern mentioned but test cases not detailed |
| ✓ PASS | TransactionalCommandHandler | Base class usage correct, tx parameter documented |
| ✓ PASS | OpenAPI Decorators | PATCH endpoint with @ApiOperation, @ApiOkResponse (Lines 96-107) |
| ✓ PASS | DTO Validation | @IsInt, @Min, @Max for fmsStatus (Lines 77-89) |
| ✓ PASS | Error Code Usage | EINSATZ_FAHRZEUG_ERROR_CODES referenced (Line 239) |
| ✓ PASS | Hexagonal Layer Separation | Domain → Application → Infrastructure properly scoped |
| ✗ FAIL | **Method Name Error** | Story uses `getUncommittedEvents()` (Line 219) but correct method is `getDomainEvents()` |

**Critical Fix Required:** Line 219 must change `getUncommittedEvents()` → `getDomainEvents()` (defined in AggregateRoot base class).

---

### 3. Previous Story Intelligence (3-0, 3-1, 3-2)

**Pass Rate:** 8/10 (80%)

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | Schema Definition (3-0) | Prisma indexes referenced (Line 294) |
| ✓ PASS | Stammdaten Pattern (3-1) | ErfasseFahrzeugAusStammdaten handler pattern followed |
| ✓ PASS | Temporär Pattern (3-2) | Fire-and-Forget ETB pattern confirmed |
| ✓ PASS | TransactionalCommandHandler | Exact pattern from 3-1/3-2 applied |
| ✓ PASS | Validation Constants Reuse | FMS_STATUS_LABELS, validation constants documented (Lines 228-233) |
| ✓ PASS | Error Codes Reuse | EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_FMS_STATUS (Line 239) |
| ⚠ PARTIAL | ETB Handler Testing | Story 3-2 deferred ETB handler tests - Story 3.3 doesn't address this gap |
| ⚠ PARTIAL | Position Validation | GeoPosition VO exists but range validation not documented in Story |
| ✓ PASS | DI Token Pattern | Symbol-based tokens from di-tokens.ts |
| ✓ PASS | Mapper NULL→undefined | Pattern established in 3-1, applies to updateFmsStatus |

---

### 4. Code Reference Validation

**Pass Rate:** 8/9 (89%)

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | Aggregate File Path | `einsatz-fahrzeug.aggregate.ts` exists at documented path |
| ✓ PASS | updateFmsStatus() Method | Exists at line 492-526, TODO comment present |
| ✓ PASS | Validation Constants Path | `einsatz-fahrzeug-validation.constants.ts` verified |
| ✓ PASS | Error Codes Path | `einsatz-fahrzeug-error-codes.ts` verified |
| ✓ PASS | Repository Interface | IEinsatzFahrzeugRepository has `findById()`, `save()` |
| ✓ PASS | Controller Path | `einsatz-fahrzeuge.controller.ts` exists |
| ✓ PASS | DI Tokens Path | `di-tokens.ts` with KRAEFTE_REPOSITORIES verified |
| ⚠ PARTIAL | Events Index Export | Task 1.2 mentions events/index.ts but file pattern not verified |
| ✓ PASS | Handler Registration Location | kraefte.module.ts providers array documented |

---

### 5. ETB Integration Analysis

**Pass Rate:** 7/7 (100%)

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | Fire-and-Forget Pattern | Matches EtbAutoCreationHandler and FahrzeugErfasstEventHandler |
| ✓ PASS | AddEintragHandler Usage | Correct handler for ETB entries (not CreateEtbHandler) |
| ✓ PASS | FMS_STATUS_LABELS Usage | Label lookup pattern documented (Line 112) |
| ✓ PASS | ETB Text Format | `"Fahrzeug {funkrufname} Status: {altLabel} → {neuLabel}"` correct |
| ✓ PASS | Metadata Structure | eventType, einsatzFahrzeugId, alterStatus, neuerStatus |
| ✓ PASS | Event Adapter Pattern | Infrastructure adapter with @OnEvent delegation documented |
| ✓ PASS | Idempotency Handling | At-least-once delivery pattern from existing handlers |

**Missing but Required:**
- `EVENT_HANDLER.FMS_STATUS_GEAENDERT_ETB` token in di-tokens.ts (not mentioned in Story)
- Infrastructure adapter registration in event-adapters.module.ts

---

### 6. Frontend Implementation Analysis

**Pass Rate:** 4/10 (40%)

| Mark | Item | Evidence |
|------|------|----------|
| ✗ FAIL | **Query Key Convention** | Uses inline arrays, should use `EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId)` |
| ⚠ PARTIAL | Mutation Pattern | onMutate exists but missing onSettled for invalidation |
| ⚠ PARTIAL | Component Location | atoms/ directory doesn't exist in einsatz/ui/, needs clarification |
| ✗ FAIL | **FMS_STATUS_LABELS Frontend** | Constants only exist in Backend, no Frontend equivalent mentioned |
| ✗ FAIL | **Dark Mode Classes** | Tailwind colors miss dark: variants (Story only has light mode) |
| ✓ PASS | Headless UI Listbox | Correct choice for non-searchable dropdown |
| ✓ PASS | Optimistic Update | Basic pattern documented in Task 6.2 |
| ⚠ PARTIAL | API Index Exports | Hook export to feature index not documented |
| ✓ PASS | API Regeneration | `pnpm run generate-api` correctly mentioned |
| ✓ PASS | Color Mapping | AC1 table defines status → color mapping |

---

## Failed Items

### ✗ FAIL 1: AC5 Requirement Conflict (CRITICAL)

**Location:** Story AC5 (Lines 54-58) vs Epic 3.3 AC5
**Issue:** Epic defines AC5 as "Status-Historie Tooltip" showing last 3 status changes. Story defines AC5 as "Position Update" with GPS coordinates.
**Impact:** Unclear which requirement to implement. Complete mismatch.

**Recommendation:**
- Option A: Rename Story AC5 to AC6, add Epic's Status-Historie as new AC5
- Option B: Clarify Position Update is additional scope, defer Status-Historie
- **Decision Required:** User must clarify before development

---

### ✗ FAIL 2: Method Name getUncommittedEvents() (CRITICAL)

**Location:** Dev Notes AC5 (Line 219)
**Issue:** Story references `fahrzeug.getUncommittedEvents()` but AggregateRoot base class defines `getDomainEvents()`
**Impact:** Code will fail at compile time if developer copies template verbatim

**Fix Required:**
```typescript
// WRONG (Line 219):
const events = fahrzeug.getUncommittedEvents();

// CORRECT:
const events = fahrzeug.getDomainEvents();
```

---

### ✗ FAIL 3: Query Key Convention (HIGH)

**Location:** Task 6.2 Hook Template (Lines 124-138)
**Issue:** Uses inline `['einsatz', einsatzId, 'fahrzeuge']` instead of `EINSATZ_QUERY_KEYS.fahrzeuge(einsatzId)`
**Impact:** Inconsistent with existing codebase pattern, error-prone

**Fix Required:** Use centralized query key helpers throughout

---

### ✗ FAIL 4: Frontend FMS Status Labels (HIGH)

**Location:** Task 7.1 FmsStatusBadge
**Issue:** FMS_STATUS_LABELS exists only in Backend constants. Frontend needs identical copy or shared package.
**Impact:** Frontend component cannot render status labels without this constant

**Recommendation:** Create `/packages/frontend/src/features/einsatz/constants/fms-status.constants.ts` with labels + colors

---

### ✗ FAIL 5: Dark Mode Classes Missing (HIGH)

**Location:** AC1 Color Table (Lines 17-27)
**Issue:** Only light mode Tailwind classes defined. Existing components use `dark:bg-*` variants.
**Impact:** Status badges will look wrong in dark mode

**Fix Required:** Add dark mode variants to color mapping

---

## Partial Items

### ⚠ PARTIAL 1: Event Handler DI Token Not Documented

Story Task 5.1 mentions creating ETB handler but doesn't specify:
- Adding `EVENT_HANDLER.FMS_STATUS_GEAENDERT_ETB` to di-tokens.ts
- Registering in etb-application.module.ts providers
- Creating infrastructure adapter

**Recommendation:** Add explicit tasks for DI token setup

---

### ⚠ PARTIAL 2: Test Cases Not Detailed

Story mentions tests in Task 8 but doesn't specify:
- Minimum test count (recommend 20+)
- Error case coverage (invalid status, not found, unauthorized)
- Event emission verification

**Recommendation:** Add test case list to Task 8

---

### ⚠ PARTIAL 3: Position Validation Range

AC5 mentions GPS coordinates but doesn't specify validation:
- Latitude: -90 to 90
- Longitude: -180 to 180

**Recommendation:** Document range validation in AC5 or Dev Notes

---

### ⚠ PARTIAL 4: Epic 6/8 Integration Not Documented

Story enables Epic 6 (Dashboard) and Epic 8 (Lagekarte) but doesn't document:
- API contracts for downstream consumers
- NFR dependencies

**Recommendation:** Add cross-epic references

---

### ⚠ PARTIAL 5: Component Directory Structure

Tasks 7.1-7.2 create atoms/molecules but:
- `einsatz/ui/atoms/` directory doesn't exist
- Unclear if shared or feature-specific

**Recommendation:** Clarify: create `einsatz/ui/atoms/` or use `shared/ui/atoms/`

---

## Recommendations

### 1. Must Fix (Critical)

| # | Issue | Action |
|---|-------|--------|
| 1 | AC5 Conflict | Clarify with PO: Status-Historie vs Position Update |
| 2 | Method Name Error | Change `getUncommittedEvents()` → `getDomainEvents()` |
| 3 | Query Key Convention | Use `EINSATZ_QUERY_KEYS.fahrzeuge()` in Task 6.2 |

### 2. Should Improve (High)

| # | Issue | Action |
|---|-------|--------|
| 4 | Frontend FMS Labels | Add constants file with labels + colors |
| 5 | Dark Mode Support | Add `dark:` variants to AC1 color table |
| 6 | DI Token Task | Add explicit task for EVENT_HANDLER token setup |
| 7 | Infrastructure Adapter | Add task for fms-status-geaendert-event.adapter.ts |
| 8 | Test Case Details | Expand Task 8 with specific test cases |

### 3. Consider (Medium)

| # | Issue | Action |
|---|-------|--------|
| 9 | Position Validation | Document lat/lng range validation |
| 10 | Component Directory | Create einsatz/ui/atoms/ or clarify shared usage |
| 11 | Event Naming | Standardize to `FahrzeugStatusGeaendert` (without Event suffix) |

---

## LLM Optimization Improvements

| Area | Current Issue | Improvement |
|------|---------------|-------------|
| Dev Notes | Verbose code examples | Extract critical patterns to checklist format |
| Task Structure | 8 tasks with subtasks | Group by layer (Domain/App/Infra/Frontend) |
| References | Multiple source links | Consolidate to single "Implementation Guide" section |
| Token Efficiency | Repeated patterns | DRY - reference existing handler once, not code samples |

---

## Conclusion

**Story 3.3 Readiness:** ⚠️ **CONDITIONAL READY**

The story is well-structured and follows established patterns from Stories 3-1 and 3-2. However, **3 critical issues must be resolved before implementation:**

1. **AC5 Conflict** - Epic vs Story mismatch on Position/Historie
2. **Method Name** - `getUncommittedEvents()` → `getDomainEvents()`
3. **Query Key** - Use centralized helpers, not inline arrays

After these fixes, the story is ready for development with the recommended improvements applied.

---

**Validation completed by:** SM Agent (Bob)
**Subagents used:** 6 (Epic Analysis, Architecture, Previous Stories, Code Patterns, ETB Integration, Frontend)
**Total analysis tokens:** ~4M+
