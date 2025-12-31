# Validation Report - Story 6.1a Taktische Stärke-Anzeige

**Document:** `docs/sprint-artifacts/6-1a-taktische-staerke-anzeige.md`
**Checklist:** `create-story/checklist.md`
**Date:** 2025-12-29
**Validator:** 4 Parallel Subagents (Backend, Frontend, Architecture, Previous Stories)

---

## Summary

- **Overall:** 38/42 passed (90%)
- **Critical Issues:** 2
- **Enhancement Opportunities:** 4
- **LLM Optimizations:** 3

---

## Section Results

### 1. Epics & Source Document Analysis
**Pass Rate:** 7/7 (100%)

| Status | Item | Evidence |
|--------|------|----------|
| ✓ PASS | Epic 6 referenced correctly | `docs/epics.md` Lines 303-312: "Epic 6: Taktische Übersicht 📊" |
| ✓ PASS | FR15-FR18 covered | Story lines 23-52 map to FR15 (calc), FR16 (function), FR17 (Ärzte), FR18 (auto-update) |
| ✓ PASS | NFR5 Performance referenced | AC1 Line 27: "Berechnung dauert <500ms (NFR5)" |
| ✓ PASS | PRD requirements traceable | References section Lines 248-254 lists all sources |
| ✓ PASS | Architecture-kraefte.md aligned | API Endpoint matches: `GET /einsaetze/{einsatzId}/kraefte/staerke` |
| ✓ PASS | UX specification present | AC2 Lines 32-37: font 24px, color coding blue/green/gray |
| ✓ PASS | Cross-story dependencies clear | Background Lines 12-19 explain taktische Stärke context |

---

### 2. Backend Architecture Validation
**Pass Rate:** 9/11 (82%)

| Status | Item | Evidence |
|--------|------|----------|
| ✓ PASS | Handler location correct | Task 1 Line 57: `src/application/kraefte/queries/get-taktische-staerke/` |
| ✓ PASS | DI Token exists | `KRAEFTE_REPOSITORIES.EINSATZ_PERSON` in `di-tokens.ts` Line 81 |
| ✓ PASS | Repository interface exists | `IEinsatzPersonRepository.findByEinsatzId()` method available |
| ✓ PASS | Result Pattern specified | Handler Pattern Lines 109: `Promise<Result<TaktischeStaerkeDto>>` |
| ✓ PASS | @ApiWrappedResponse usage | Task 2 Line 65: `@ApiWrappedResponse(TaktischeStaerkeDto)` |
| ✓ PASS | Logger DI pattern | ⛔ DO NOT Line 246: "NICHT `new Logger()` im Handler" |
| ⚠ PARTIAL | Repository method for aggregation | `findByEinsatzId()` returns persons but no qualification eager-loading specified |
| ✗ FAIL | **N+1 Query Prevention** | No eager-loading strategy documented for Person→Qualifikation chain |
| ✓ PASS | Controller path correct | Task 2 Line 64: `GET /einsaetze/{einsatzId}/kraefte/staerke` |
| ✓ PASS | DTO structure defined | Task 1 Line 58: `{ fuehrung, unterfuehrung, mannschaft, gesamt }` |
| ⚠ PARTIAL | Handler registration | Module registration mentioned but not explicit (RollenBesetzungApplicationModule) |

**Impact (N+1 Query):** Without eager-loading, fetching 50 persons requires 50+1 queries. Performance NFR5 (<500ms) at risk.

---

### 3. Frontend Architecture Validation
**Pass Rate:** 8/9 (89%)

| Status | Item | Evidence |
|--------|------|----------|
| ✓ PASS | Feature folder location | Task 3 Line 69: `src/features/kraefte/` |
| ✓ PASS | Hook pattern correct | Lines 134-146: `useTaktischeStaerke` with TanStack Query |
| ✓ PASS | Query keys defined | Lines 224-232: `KRAEFTE_QUERY_KEYS.staerke(einsatzId)` |
| ✓ PASS | Generated API client usage | Line 136: `api.kraefte().getTaktischeStaerke({ einsatzId })` |
| ✓ PASS | Molecule component location | Task 4 Line 74: `src/features/kraefte/ui/molecules/StaerkeCard.tsx` |
| ✓ PASS | Tailwind-only styling | Lines 167-189: All classes are Tailwind (`text-2xl`, `text-blue-600`) |
| ✓ PASS | refetchInterval set | Line 144: `refetchInterval: 30_000` for dashboard auto-refresh |
| ⚠ PARTIAL | Loading state skeleton | Line 163 mentions `StaerkeCardSkeleton` but no implementation shown |
| ✓ PASS | Query invalidation triggers | Task 5 Lines 79-82: `useAssignPersonToFahrzeug`, `useRegisterPerson` |

---

### 4. Categorization Business Logic
**Pass Rate:** 6/6 (100%)

| Status | Item | Evidence |
|--------|------|----------|
| ✓ PASS | Führung patterns defined | Lines 197-198: "Leiter", "LNA", "OrgL", "Zugführer" |
| ✓ PASS | Arzt → Führung rule | Lines 198, AC5: "Qualifikation enthält: Arzt, Notarzt" |
| ✓ PASS | Unterführung patterns | Lines 201: "Gruppenführer", "GF", "Truppführer" |
| ✓ PASS | Mannschaft default | Lines 203-204: "Alle anderen: Rettungshelfer, Sanitäter, Helfer" |
| ✓ PASS | Function > Qualification | Line 206: "Reihenfolge: Funktion hat Vorrang vor Qualifikation!" |
| ✓ PASS | AC4 test case | Lines 44-47: Person with "Rettungssanitäter" + "Gruppenführer" → Unterführung |

---

### 5. Test Specification
**Pass Rate:** 3/4 (75%)

| Status | Item | Evidence |
|--------|------|----------|
| ✓ PASS | Unit tests mentioned | Task 1 Line 61: "Unit Tests für Berechnung" |
| ✓ PASS | AC test scenarios clear | AC1, AC4, AC5 provide explicit test cases |
| ⚠ PARTIAL | AAA Pattern not shown | No test example code in story (should have Given-When-Then template) |
| ✗ FAIL | **Mock setup missing** | No `jest.Mocked<T>` or `jest.clearAllMocks()` patterns documented |

**Impact:** Epic 5 Retro identified test coverage gap. Without explicit test patterns, developers may skip tests.

---

### 6. Previous Story Learnings Integration
**Pass Rate:** 5/5 (100%)

| Status | Item | Evidence |
|--------|------|----------|
| ✓ PASS | Query Handler pattern (not direct repo) | Handler Pattern Lines 103-115 shows correct architecture |
| ✓ PASS | @Inject(LOGGER) pattern | ⛔ DO NOT Line 246 explicitly forbids `new Logger()` |
| ✓ PASS | Epic 5 RollenBesetzung as template | Similar query structure to `FindAllRollenBesetzungQueryHandler` |
| ✓ PASS | Optimistic locking mentioned | Task 5 Lines 79-82 describe query invalidation on mutations |
| ✓ PASS | Event handler integration not needed | Read-only query, no domain events required |

---

## Failed Items

### 1. ✗ N+1 Query Prevention (CRITICAL)

**Location:** Dev Notes section (missing)

**Issue:** Story doesn't document eager-loading strategy for the query chain:
```
EinsatzPerson → EinsatzPersonQualifikation → Qualifikation
```

**Why Critical:**
- NFR5 requires <500ms response
- Without eager-loading, N persons = N+1 database queries
- At 50 persons, this could exceed 500ms

**Recommendation:** Add to Dev Notes:
```typescript
// Prisma eager-loading required for performance
const persons = await prisma.einsatzPerson.findMany({
  where: { einsatzId },
  include: {
    qualifikationen: {
      include: { qualifikation: true }
    }
  }
});
```

---

### 2. ✗ Test Pattern Documentation (MEDIUM)

**Location:** Dev Notes → Tests section (missing)

**Issue:** No test skeleton or mock patterns provided

**Why Important:** Epic 5 had 81% fewer tests than Epic 4. Developers need explicit guidance.

**Recommendation:** Add test template:
```typescript
describe('GetTaktischeStaerkeHandler', () => {
  let handler: GetTaktischeStaerkeHandler;
  let mockRepository: jest.Mocked<IEinsatzPersonRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = createMockRepository();
    handler = new GetTaktischeStaerkeHandler(mockRepository);
  });

  it('should count Arzt as Führung (AC5)', async () => {
    // Given
    mockRepository.findByEinsatzId.mockResolvedValue([
      createMockPerson({ qualifikation: 'Arzt', funktion: 'Helfer' })
    ]);

    // When
    const result = await handler.execute(query);

    // Then
    expect(result.value.fuehrung).toBe(1);
  });
});
```

---

## Partial Items

### 1. ⚠ Repository Aggregation Method

**Location:** Task 1, Line 57-61

**Current:** Story assumes using existing `findByEinsatzId()` method

**Gap:** Method returns `EinsatzPerson[]` but doesn't specify if qualifications are included

**Recommendation:** Either:
1. Document that existing method already eager-loads qualifications, OR
2. Add new repository method `findWithQualifikationenByEinsatzId()`

---

### 2. ⚠ Loading Skeleton Implementation

**Location:** Task 4, Line 74-77

**Current:** Line 163 references `StaerkeCardSkeleton` but no code shown

**Recommendation:** Add skeleton pattern:
```typescript
function StaerkeCardSkeleton() {
  return (
    <Card className="p-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
      <div className="flex gap-4">
        <div className="h-8 bg-gray-200 rounded w-12" />
        <div className="h-8 bg-gray-200 rounded w-12" />
        <div className="h-8 bg-gray-200 rounded w-12" />
        <div className="h-8 bg-gray-200 rounded w-12" />
      </div>
    </Card>
  );
}
```

---

### 3. ⚠ Handler Module Registration

**Location:** Dev Notes, Line 238

**Current:** "Backend hat bereits `modules/kraefte/`" but doesn't specify WHERE to register handler

**Recommendation:** Add explicit:
```
Register GetTaktischeStaerkeHandler in:
- packages/backend/src/application/kraefte/rollen-besetzung/rollen-besetzung-application.module.ts
  (providers array)
```

---

### 4. ⚠ Empty State Handling

**Location:** AC1 (missing edge case)

**Current:** AC1 assumes data exists (3 vehicles, 12 persons)

**Gap:** What if einsatzId has no persons?

**Recommendation:** Add to AC or Dev Notes:
```
Edge Case: Empty Einsatz
- Given: Einsatz without persons
- When: Query executed
- Then: Return { fuehrung: 0, unterfuehrung: 0, mannschaft: 0, gesamt: 0 }
```

---

## LLM Optimization Improvements

### 1. Token-Efficient Categorization Table

**Current (Lines 194-206):** Verbose paragraph format

**Optimized:**
```markdown
### Kategorisierung (Priorität: Funktion > Qualifikation)

| Kategorie | Funktion-Match | Qualifikation-Match |
|-----------|----------------|---------------------|
| Führung | "Leiter", "LNA", "OrgL", "Zugführer" | "Arzt", "Notarzt" |
| Unterführung | "Gruppenführer", "GF", "Truppführer" | - |
| Mannschaft | (default) | (default) |
```

---

### 2. Consolidated Handler Pattern

**Current:** Handler pattern split across Lines 100-115 and 92-98

**Optimized:** Single code block with all required elements:
```typescript
@Injectable()
export class GetTaktischeStaerkeHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON)
    private readonly personRepository: IEinsatzPersonRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  async execute(query: GetTaktischeStaerkeQuery): Promise<Result<TaktischeStaerkeDto>> {
    const persons = await this.personRepository.findWithQualifikationen(query.einsatzId);
    const counts = this.categorize(persons);
    return Result.ok(counts);
  }

  private categorize(persons: EinsatzPerson[]): TaktischeStaerkeDto {
    let fuehrung = 0, unterfuehrung = 0, mannschaft = 0;
    for (const p of persons) {
      // 1. Function-based (priority)
      if (/Leiter|LNA|OrgL|Zugführer/i.test(p.funktion)) { fuehrung++; continue; }
      if (/Gruppenführer|GF|Truppführer/i.test(p.funktion)) { unterfuehrung++; continue; }
      // 2. Qualification-based (Arzt override)
      if (p.qualifikationen.some(q => /Arzt|Notarzt/.test(q.name))) { fuehrung++; continue; }
      // 3. Default
      mannschaft++;
    }
    return { fuehrung, unterfuehrung, mannschaft, gesamt: fuehrung + unterfuehrung + mannschaft };
  }
}
```

---

### 3. Actionable Task Checklist

**Current:** Tasks are verbose paragraphs

**Optimized:** Checkable format:
```markdown
## Implementation Checklist

### Backend
- [ ] Create `get-taktische-staerke.query.ts` (Query DTO)
- [ ] Create `get-taktische-staerke.handler.ts` (with categorization logic)
- [ ] Add eager-loading to repository query (N+1 prevention)
- [ ] Add handler to `rollen-besetzung-application.module.ts` providers
- [ ] Create controller endpoint with `@ApiWrappedResponse`
- [ ] Write unit tests (AC1, AC4, AC5 scenarios)

### Frontend
- [ ] Create `features/kraefte/` folder structure
- [ ] Create `api/queries.ts` with KRAEFTE_QUERY_KEYS
- [ ] Create `api/use-taktische-staerke.ts` hook
- [ ] Create `ui/molecules/StaerkeCard.tsx` component
- [ ] Add skeleton loading state
- [ ] Add query invalidation to person mutations
- [ ] Run `pnpm run generate-api`
```

---

## Recommendations

### Must Fix (Critical Failures)
1. **Add N+1 Query Prevention:** Document eager-loading strategy for `EinsatzPerson.qualifikationen`
2. **Add Test Template:** Include AAA pattern with `jest.Mocked<T>` and `jest.clearAllMocks()`

### Should Improve (Partial Items)
3. **Specify Repository Method:** Clarify if existing method suffices or new method needed
4. **Add Skeleton Implementation:** Provide StaerkeCardSkeleton code
5. **Add Empty State Handling:** Document 0/0/0/0 edge case
6. **Explicit Module Registration:** Name exact file and line for handler registration

### Consider (LLM Optimizations)
7. **Table-format categorization rules** for faster LLM parsing
8. **Consolidated handler code block** with all DI patterns
9. **Checkable task list** format for clearer progress tracking

---

## File Paths Reference

**Story File:** `/docs/sprint-artifacts/6-1a-taktische-staerke-anzeige.md`

**Backend (to create):**
- `packages/backend/src/application/kraefte/queries/get-taktische-staerke/get-taktische-staerke.query.ts`
- `packages/backend/src/application/kraefte/queries/get-taktische-staerke/get-taktische-staerke.handler.ts`
- `packages/backend/src/application/kraefte/queries/get-taktische-staerke/get-taktische-staerke.handler.spec.ts`
- `packages/backend/src/application/kraefte/dto/taktische-staerke.dto.ts`

**Frontend (to create):**
- `packages/frontend/src/features/kraefte/api/queries.ts`
- `packages/frontend/src/features/kraefte/api/use-taktische-staerke.ts`
- `packages/frontend/src/features/kraefte/ui/molecules/StaerkeCard.tsx`
- `packages/frontend/src/features/kraefte/index.ts`

**Reference Files:**
- `packages/backend/src/application/kraefte/rollen-besetzung/queries/find-all-rollen-besetzung/find-all-rollen-besetzung.handler.ts` (template)
- `packages/frontend/src/features/einsatz/ui/molecules/EinsatzStatsCard.tsx` (UI reference)
