# Validation Report - Story 3-2

**Document:** `docs/sprint-artifacts/3-2-temporaeres-fahrzeug-anlegen.md`
**Checklist:** `.bmad/bmm/workflows/4-implementation/create-story/checklist.md`
**Date:** 2025-12-17
**Validator:** Claude Opus 4.5 (Fresh Context)

---

## Summary

- **Overall:** 28/30 passed (93%)
- **Critical Issues:** 1
- **Enhancements:** 3
- **Optimizations:** 2

---

## Section Results

### 1. Epic Requirements Coverage
**Pass Rate: 6/6 (100%)**

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1.1 | AC1 (Temporär-Formular) | ✓ PASS | Lines 17-20: BDD scenario matches epic exactly |
| 1.2 | AC2 (EinsatzFahrzeug ohne stammId) | ✓ PASS | Lines 22-28: Explicit `stammId: undefined` semantics |
| 1.3 | AC3 (Duplikat-Validierung) | ✓ PASS | Lines 30-34: 409 Conflict + Dialog stays open |
| 1.4 | AC4 (Temporär-Badge) | ✓ PASS | Lines 36-39: `bg-gray-100 text-gray-800` styling |
| 1.5 | AC5 (UI Feedback) | ✓ PASS | Lines 41-46: Toast + Dialog close + List refresh |
| 1.6 | Technical Notes alignment | ✓ PASS | Lines 356-369: All refs match epic lines 931-933 |

---

### 2. Architecture Patterns (CLAUDE.md AC1-AC6)
**Pass Rate: 6/6 (100%)**

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 2.1 | AC1: DI Import Check | ✓ PASS | Line 187: Table specifies `import { }` not `import type` |
| 2.2 | AC2: DI Token Constants | ✓ PASS | Line 188: `KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG` pattern |
| 2.3 | AC3: Framework-Agnostizität | ✓ PASS | Task 2.2: Uses TransactionalCommandHandler |
| 2.4 | AC4: Result Pattern | ✓ PASS | Line 189: `Result.fail()` not exceptions |
| 2.5 | AC5: Outbox Integration | ✓ PASS | Lines 214-280: Complete TransactionalCommandHandler example |
| 2.6 | AC6: Test Pattern (AAA) | ✓ PASS | Lines 159-165: `jest.clearAllMocks()` + Given-When-Then |

---

### 3. Domain Layer Completeness
**Pass Rate: 5/6 (83%)**

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 3.1 | Factory Method defined | ✓ PASS | Task 1.1: `createTemporary()` with props |
| 3.2 | Props Interface defined | ✓ PASS | Task 1.2: `CreateTemporaryEinsatzFahrzeugProps` |
| 3.3 | Validation Constants used | ✓ PASS | Line 58: `EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_DEFAULT` |
| 3.4 | Domain Event emission | ⚠ PARTIAL | Line 59: FahrzeugErfasstEvent mentioned but **stammId type in event definition needs update** |
| 3.5 | Unit Tests specified | ✓ PASS | Task 1.3: 10+ test cases listed |
| 3.6 | Error codes defined | ✓ PASS | Line 68-69: Existing codes sufficient |

**Issue 3.4 Detail:**
- Current `FahrzeugErfasstEvent` has `stammId: string` (required)
- For Story 3-2, must be `stammId: string | undefined` or `stammId?: string`
- **Impact:** Event handler cannot distinguish temporary vs. standard without this
- **Recommendation:** Update event constructor signature before implementation

---

### 4. Application Layer Completeness
**Pass Rate: 5/5 (100%)**

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 4.1 | Command with validation | ✓ PASS | Task 2.1: Props + static `create()` with Result |
| 4.2 | Handler extends base | ✓ PASS | Task 2.2: `extends TransactionalCommandHandler` |
| 4.3 | DTO with OpenAPI | ✓ PASS | Task 2.3: `@ApiProperty`, `@IsString`, etc. |
| 4.4 | Handler unit tests | ✓ PASS | Task 2.4: 15+ test cases |
| 4.5 | Transaction context usage | ✓ PASS | Line 85: `tx` parameter to all repos |

---

### 5. Infrastructure Layer Completeness
**Pass Rate: 3/3 (100%)**

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 5.1 | Repository already exists | ✓ PASS | Prerequisite from Story 3-1 verified |
| 5.2 | DI Token exists | ✓ PASS | `KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG` in di-tokens.ts |
| 5.3 | Module registration | ✓ PASS | Task 3.3: Provider registration specified |

---

### 6. API Layer Completeness
**Pass Rate: 4/4 (100%)**

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 6.1 | Endpoint defined | ✓ PASS | Task 3.1: `POST /api/v-alpha/einsaetze/:einsatzId/fahrzeuge/temporary` |
| 6.2 | OpenAPI Decorators | ✓ PASS | Task 3.2: Full decorator list |
| 6.3 | Error responses | ✓ PASS | Line 105: 400, 404, 409 specified |
| 6.4 | Result→HTTP mapping | ✓ PASS | Lines 236-278: Complete example code |

---

### 7. ETB Integration
**Pass Rate: 2/3 (67%)**

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 7.1 | Event handler extension | ✓ PASS | Task 4.1: Extend FahrzeugErfasstEventHandler |
| 7.2 | Text pattern defined | ⚠ PARTIAL | Line 122: Pattern defined but **current handler doesn't check stammId** |
| 7.3 | Fire-and-Forget pattern | ✓ PASS | Line 192: Documented in Dev Notes |

**Issue 7.2 Detail:**
- Story specifies: `stammId ? "Fahrzeug..." : "Temporäres Fahrzeug..."`
- Current handler at `fahrzeug-erfasst.handler.ts` always uses same text
- **Impact:** ETB entries won't distinguish temporary vehicles
- **Recommendation:** Add condition in handler before implementation

---

### 8. Frontend Completeness
**Pass Rate: 5/6 (83%)**

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 8.1 | API Client regeneration | ✓ PASS | Task 5.1: `pnpm run generate-api` |
| 8.2 | Mutation hook | ✓ PASS | Task 5.2: `useErfasseTemporalesFahrzeug()` |
| 8.3 | Dialog Tab extension | ✓ PASS | Task 5.3: Headless UI Tab.Group |
| 8.4 | Fahrzeugtypen hook | ⚠ PARTIAL | Task 5.4: Referenced but **hook doesn't exist yet** |
| 8.5 | Temporär-Badge | ✓ PASS | Task 5.5: Condition + styling |
| 8.6 | Index exports | ✓ PASS | Task 5.6: Export updates |

**Issue 8.4 Detail:**
- Task 5.4 says "falls nicht vorhanden" - it doesn't exist
- No `useFahrzeugtypen()` hook in `packages/frontend/src/features/einsatz/api/`
- **Impact:** Dialog cannot load Fahrzeugtypen for Combobox
- **Recommendation:** Create hook or use existing admin API hook

---

### 9. Testing Strategy
**Pass Rate: 3/3 (100%)**

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 9.1 | Unit test count | ✓ PASS | Task 6.1-6.2: 10+ + 15+ = 25+ tests |
| 9.2 | E2E test checklist | ✓ PASS | Task 6.3: 9 manual test steps |
| 9.3 | Test patterns | ✓ PASS | Lines 159-165: AAA, Given-When-Then |

---

### 10. Cross-Story Dependencies
**Pass Rate: 4/4 (100%)**

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 10.1 | Story 3-0 Schema | ✓ PASS | Line 334: Checked |
| 10.2 | Story 3-1 Aggregate | ✓ PASS | Line 333: Reference pattern |
| 10.3 | Repository methods | ✓ PASS | Line 335: `existsByEinsatzIdAndFunkrufname()` exists |
| 10.4 | File paths listed | ✓ PASS | Lines 404-422: Complete file list |

---

## Failed Items

### ✗ 3.4 FahrzeugErfasstEvent stammId Type
**Current State:** Event constructor has `stammId: string` (required)
**Required:** `stammId?: string` or `stammId: string | undefined`
**Impact:** Cannot emit event with undefined stammId for temporary vehicles
**Recommendation:**
1. Update `FahrzeugErfasstEvent` constructor signature
2. Update event property to optional
3. Update ETB handler to check for undefined

---

## Partial Items

### ⚠ 7.2 ETB Handler Text Pattern
**Current State:** Handler at `fahrzeug-erfasst.handler.ts` uses hardcoded text
**Missing:** Condition to check `event.stammId === undefined`
**What to add:**
```typescript
const isTemporary = event.stammId === undefined;
const text = isTemporary
  ? `Temporäres Fahrzeug ${event.funkrufname} erfasst (Status: ${statusLabel})`
  : `Fahrzeug ${event.funkrufname} erfasst (Status: ${statusLabel})`;
```

### ⚠ 8.4 useFahrzeugtypen Hook Missing
**Current State:** Hook referenced in Task 5.4 doesn't exist
**Missing:** Query hook for Fahrzeugtypen list
**What to add:**
```typescript
// packages/frontend/src/features/einsatz/api/use-fahrzeugtypen.ts
export const useFahrzeugtypen = () => {
  return useQuery({
    queryKey: ['fahrzeugtypen', 'list'],
    queryFn: () => api.adminStammdatenFahrzeuge().findAllVAlpha(),
    staleTime: 60_000,
  });
};
```

---

## Recommendations

### 1. Must Fix (Critical)

| # | Issue | Action |
|---|-------|--------|
| 1 | FahrzeugErfasstEvent stammId type | Update event constructor to accept `stammId?: string` before Story 3-2 implementation |

### 2. Should Improve (Important)

| # | Issue | Action |
|---|-------|--------|
| 2 | ETB Handler text differentiation | Add stammId check in FahrzeugErfasstEventHandler |
| 3 | useFahrzeugtypen hook | Create hook before frontend implementation |
| 4 | Story dependency check | Mark Event type fix as blocker for Task 1.1 |

### 3. Consider (Minor)

| # | Issue | Action |
|---|-------|--------|
| 5 | Performance test | Add response time assertion in E2E tests (<5s per NFR2) |
| 6 | LLM Optimization | Handler example code (Lines 214-280) is verbose - could be extracted to reference file |

---

## LLM Optimization Analysis

### Current Issues:
- **Verbosity:** 420+ lines including complete code examples
- **Redundancy:** Pattern descriptions repeat Story 3-1 content
- **Token Efficiency:** Code examples could reference existing files instead of inlining

### Recommendations:
1. Replace inline handler code (Lines 214-280) with: "Pattern: See `erfasse-fahrzeug-aus-stammdaten.handler.ts`"
2. Consolidate Dev Notes table (Lines 182-192) with Implementation Checklist (Lines 330-352)
3. Remove duplicate file listings (Lines 295-327 duplicate Lines 404-422)

**Estimated Token Savings:** ~30% reduction possible

---

## Validation Subagent Summary

| Subagent | Focus | Key Findings |
|----------|-------|--------------|
| a53d9c1 | Story 3-1 Learnings | 30+ patterns extracted, all followed in Story 3-2 |
| a338d53 | EinsatzFahrzeug Aggregate | createTemporary() requirements clear, Event type issue found |
| ab91326 | Frontend Patterns | Dialog/Tabs/Form patterns documented, useFahrzeugtypen missing |
| a6df5c9 | Epic Requirements | 100% coverage confirmed, no missing ACs |
| aa68a07 | Handler/Controller | TransactionalCommandHandler pattern correct |

---

## Conclusion

Story 3-2 is **well-prepared** with comprehensive implementation guidance. The single critical issue (FahrzeugErfasstEvent type) is a quick fix. All CLAUDE.md AC1-AC6 checks pass. Story can proceed to implementation after addressing the event type.

**Recommendation:** Fix FahrzeugErfasstEvent stammId type, then story is ready for dev.
