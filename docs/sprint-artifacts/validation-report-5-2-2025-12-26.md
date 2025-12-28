# Validation Report: Story 5.2 - Rolle freigeben

**Document:** `/docs/sprint-artifacts/5-2-rolle-freigeben.md`
**Checklist:** `/bmad/bmm/workflows/4-implementation/create-story/checklist.md`
**Date:** 2025-12-26
**Validator:** Scrum Master (Bob) mit Subagent-Unterstützung

---

## Summary

- **Overall:** 18/23 passed (78%)
- **Critical Issues:** 3
- **Partial Issues:** 2
- **Enhancements:** 3

---

## Section Results

### 1. Existing Code References

Pass Rate: 7/8 (88%)

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | `RollenBesetzung.freigeben()` exists | Lines 193-205 in `rollen-besetzung.aggregate.ts` - Correct implementation with `BEREITS_FREIGEGEBEN` guard |
| ✓ PASS | `RolleFreigegeben` Event exists | `domain/kraefte/events/rolle-freigegeben.event.ts` - Complete with all snapshot fields |
| ✓ PASS | `RolleFreigegebenEventHandler` exists | `application/etb/event-handlers/rolle-freigegeben.handler.ts` - Fire-and-Forget pattern implemented |
| ✓ PASS | `BEREITS_FREIGEGEBEN` Error Code exists | Line 78 in `rollen-besetzung-error-codes.ts` |
| ✓ PASS | Event Serializer registered | Line 218-219 in `event-serializer.ts` - `'rollen_besetzung.freigegeben'` handled |
| ✓ PASS | Event Deserializer registered | Line 190 in `event-deserializer.ts` |
| ✓ PASS | Event Adapter exists | `infrastructure/events/adapters/rolle-freigegeben-event.adapter.ts` with `@OnEvent` decorator |
| ✗ FAIL | Prisma Schema has soft-delete fields | **MISSING!** Schema has NO `freigegebenAm` and `freigegebenVon` columns (Lines 991-1021 in schema.prisma) |

**Impact:** Prisma Schema Gap macht `save()` nach `freigeben()` Aufruf unmöglich - Felder können nicht persistiert werden!

---

### 2. Handler Code Pattern (Task 2.1)

Pass Rate: 2/5 (40%)

| Mark | Item | Evidence |
|------|------|----------|
| ✗ FAIL | **Result Pattern statt Exceptions** | Handler verwendet `throw new Error()` statt `return Result.fail()` - VERLETZT AC4! |
| ✗ FAIL | **TransactionalCommandHandler Return Type** | Sollte `Result<void> \| { result: void; events }` zurückgeben, nicht throw |
| ✓ PASS | DI Token Usage | Verwendet `KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG` Symbol korrekt |
| ✓ PASS | Outbox Repository Injection | Korrekt via `DI_TOKENS.REPOSITORIES.OUTBOX` |
| ⚠ PARTIAL | Repository Method Call | `findById` existiert, aber `save()` kann `freigegebenAm/Von` nicht persistieren (Schema fehlt) |

**KRITISCHE CODE-KORREKTUR ERFORDERLICH:**

```typescript
// ❌ FALSCH (Story 5.2 aktuell):
if (!besetzung) {
  throw new Error(ROLLEN_BESETZUNG_ERROR_CODES.ROLLEN_BESETZUNG_NOT_FOUND);
}

// ✅ RICHTIG (nach BesetzeRolleHandler Pattern):
if (!besetzung) {
  return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLEN_BESETZUNG_NOT_FOUND);
}
```

---

### 3. Repository & Mapper Implementation

Pass Rate: 3/5 (60%)

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | `findById` Method exists | Lines 108-124 in `prisma-rollen-besetzung.repository.ts` - Returns `Result<RollenBesetzung \| null>` |
| ✗ FAIL | Mapper handles soft-delete fields | Lines 68-69: `freigegebenAm: undefined, // TODO: Schema noch nicht aktualisiert` |
| ✗ FAIL | `toPersistence` supports Update | Nur `CreateInput`, kein `UpdateInput` für `save()` mit freigegebenen Feldern |
| ✓ PASS | `findByEinsatzIdAndRolleId` filters active | Line 179-182: `WHERE freigegebenAm = null` Filter korrekt |
| ⚠ PARTIAL | `findByEinsatzId` filters active (AC4) | NEIN - Zeigt alle Besetzungen, keine `WHERE freigegebenAm IS NULL` Filterung |

---

### 4. Test Code Quality (Task 6)

Pass Rate: 4/5 (80%)

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | AAA Pattern mit Given-When-Then | Korrekte Kommentare in Tests |
| ✓ PASS | `jest.clearAllMocks()` in beforeEach | Vorhanden |
| ✓ PASS | `jest.Mocked<T>` für Repository Mocks | Korrekt verwendet |
| ⚠ PARTIAL | Vollständige Test-Daten | Placeholder `{...}` statt echten CUID2 IDs: `'cm5h8k...'` |
| ✓ PASS | Separate Tests für ACs | AC1, AC3 Tests definiert |

---

### 5. Controller Implementation (Task 3)

Pass Rate: 4/4 (100%)

| Mark | Item | Evidence |
|------|------|----------|
| ✓ PASS | DELETE Endpoint Decorator | `@Delete(':rollenBesetzungId')` korrekt |
| ✓ PASS | HTTP 204 No Content | `@HttpCode(HttpStatus.NO_CONTENT)` |
| ✓ PASS | Swagger Decorators | `@ApiNoContentResponse`, `@ApiBadRequestResponse`, `@ApiNotFoundResponse` |
| ✓ PASS | Error Code Mapping | `ROLLEN_BESETZUNG_NOT_FOUND` → 404, `BEREITS_FREIGEGEBEN` → 400 |

---

## 🚨 Critical Issues (Must Fix)

### C1: Prisma Schema fehlt Soft-Delete Felder

**Problem:** `EinsatzRollenbesetzung` Model hat keine `freigegebenAm` und `freigegebenVon` Spalten.

**Evidence:**
- Schema Lines 991-1021: Nur `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- Mapper Lines 68-69: `// TODO: Schema noch nicht aktualisiert`

**Impact:**
- `freigeben()` setzt `this._freigegebenAm = new Date()` im Domain Aggregate
- `save()` kann diese Felder nicht persistieren → **BLOCKER!**

**Required Fix:**
```prisma
// In EinsatzRollenbesetzung model hinzufügen:
freigegebenAm  DateTime?  @map("freigegeben_am")
freigegebenVon String?    @map("freigegeben_von") @db.VarChar(100)
```

**Migration Command:** `pnpm --filter @bluelight-hub/backend prisma migrate dev --name add_soft_delete_to_rollen_besetzung`

---

### C2: Handler verwendet `throw` statt `Result.fail()`

**Problem:** Der GebeRolleFreiHandler in Task 2.1 verwendet `throw new Error()` für Business-Fehler.

**Evidence:** Story Lines 158-165, 168-171

**Impact:** Verletzt AC4 (Result Pattern) - Controller kann Fehler nicht korrekt unterscheiden.

**Required Fix:** Alle `throw new Error(...)` ersetzen durch `return Result.fail(...)`:
```typescript
// Zeile 163-165 ersetzen:
if (!besetzung) {
  return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLEN_BESETZUNG_NOT_FOUND);
}

// Zeile 168-171 ersetzen:
const freigebenResult = besetzung.freigeben(command.freigegebenVon);
if (freigebenResult.isFailure) {
  return Result.fail(freigebenResult.error);
}
```

---

### C3: Mapper fehlt Update-Persistenz Methode

**Problem:** `PrismaRollenBesetzungMapper.toPersistence()` erstellt nur `CreateInput`, kein `UpdateInput`.

**Evidence:** Mapper Lines 89-100 - Nur `create` Syntax mit `connect`.

**Impact:** Repository `save()` kann bestehende Records nicht updaten mit `freigegebenAm/Von`.

**Required Fix:** Neue Methode hinzufügen:
```typescript
static toUpdatePersistence(aggregate: RollenBesetzung): Prisma.EinsatzRollenbesetzungUpdateInput {
  return {
    freigegebenAm: aggregate.freigegebenAm ?? null,
    freigegebenVon: aggregate.freigegebenVon ?? null,
    updatedBy: aggregate.updatedBy ?? null,
  };
}
```

---

## ⚠ Partial Issues (Should Fix)

### P1: findByEinsatzId filtert keine freigegebenen Rollen (AC4)

**Problem:** `findByEinsatzId()` in Repository hat keinen `WHERE freigegebenAm IS NULL` Filter.

**Evidence:** Lines 135-160 in `prisma-rollen-besetzung.repository.ts`

**Impact:** AC4 nicht erfüllt - Freigegebene Rollen erscheinen weiterhin in Listen.

**Required Fix:** Filter hinzufügen:
```typescript
const entities = await client.einsatzRollenbesetzung.findMany({
  where: {
    einsatzId: einsatzId.value,
    freigegebenAm: null,  // ← NEU: Nur aktive Besetzungen
  },
  orderBy: { createdAt: 'asc' },
});
```

---

### P2: Test CUID2 IDs sind Platzhalter

**Problem:** Tests verwenden `'cm5h8k...'` statt gültige CUID2 IDs.

**Impact:** Tests könnten fehlschlagen wegen ID-Validierung.

**Required Fix:** Echte CUID2 IDs verwenden:
```typescript
// Generator: import { createId } from '@paralleldrive/cuid2';
const validCuid = 'cm5h8k2x1000008l87v8g3c5a'; // Beispiel
```

---

## ✨ Enhancement Opportunities (Nice to Have)

### E1: Error Code `ROLLEN_BESETZUNG_NOT_FOUND` bereits im Task definiert

**Observation:** Task 7.1 definiert das Hinzufügen von `ROLLEN_BESETZUNG_NOT_FOUND`, aber die Story-Beschreibung sagt "existiert bereits" in der Tabelle.

**Recommendation:** Prüfen ob Error Code bereits existiert, sonst Task-Beschreibung korrigieren.

---

### E2: Logger DI in Handler fehlt

**Pattern aus Story 5.1:** BesetzeRolleHandler nutzt `@Inject(LOGGER) private readonly logger: ILogger` für Debug-Output.

**Observation:** GebeRolleFreiHandler in Story 5.2 hat keinen Logger injiziert.

**Recommendation:** Logger hinzufügen für Konsistenz und Debugging:
```typescript
@Inject(LOGGER)
private readonly logger: ILogger,
```

---

### E3: Integration Tests fehlen

**Observation:** Story definiert nur Unit Tests (Task 6). Keine Integration Tests für Prisma soft-delete Verhalten.

**Recommendation:** Nach Schema-Migration Integration Test hinzufügen:
```typescript
describe('RollenBesetzung Soft-Delete Integration', () => {
  it('should persist freigegebenAm when calling freigeben()', async () => { ... });
  it('should filter released roles in findByEinsatzId()', async () => { ... });
});
```

---

## 🤖 LLM Optimization Improvements

### O1: Handler Code-Snippet korrigieren

Der Handler-Code in Task 2.1 ist inkonsistent mit dem etablierten Pattern. Empfehlung:

**Vorher (verbos + falsch):**
```typescript
if (besetzungResult.isFailure) {
  throw new Error(besetzungResult.error);
}
const besetzung = besetzungResult.value;
if (!besetzung) {
  throw new Error(ROLLEN_BESETZUNG_ERROR_CODES.ROLLEN_BESETZUNG_NOT_FOUND);
}
```

**Nachher (prägnant + korrekt):**
```typescript
if (besetzungResult.isFailure || !besetzungResult.value) {
  return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLEN_BESETZUNG_NOT_FOUND);
}
const besetzung = besetzungResult.value;
```

---

### O2: Task-Reihenfolge optimieren

**Aktuelle Reihenfolge:** Command → Handler → Controller → Module → Repository → Tests → Error Code → TypeScript

**Optimierte Reihenfolge:**
1. ~~Task 7~~ **Zuerst:** Error Code hinzufügen (Dependency)
2. **NEU:** Schema Migration (BLOCKER für alles andere!)
3. **NEU:** Mapper Update-Methode
4. Task 5: Repository prüfen
5. Task 1: Command
6. Task 2: Handler
7. Task 3: Controller
8. Task 4: Module
9. Task 6: Tests
10. Task 8: TypeScript + API Client

---

## Recommendations Summary

### 1. Must Fix (Blocker)

| # | Issue | Action | Owner |
|---|-------|--------|-------|
| C1 | Schema fehlt | Prisma Migration erstellen | Dev |
| C2 | throw statt Result | Handler-Code korrigieren | SM (Story Update) |
| C3 | Mapper fehlt Update | `toUpdatePersistence()` hinzufügen | Dev |

### 2. Should Improve

| # | Issue | Action |
|---|-------|--------|
| P1 | findByEinsatzId Filter | AC4 Filter hinzufügen |
| P2 | Test CUIDs | Echte CUID2 IDs verwenden |

### 3. Consider

| # | Issue | Action |
|---|-------|--------|
| E1 | Error Code Klarheit | Task 7 prüfen |
| E2 | Logger DI | Konsistenz mit 5.1 |
| E3 | Integration Tests | Nach Migration hinzufügen |

---

## Next Steps

1. **Story 5.2 aktualisieren** mit kritischen Fixes (Handler-Code, Task-Reihenfolge)
2. **Schema Migration Task** als neuen Task 0 hinzufügen
3. **Mapper Update Task** als neuen Task 0.5 hinzufügen
4. Nach Fixes: Story erneut validieren oder direkt in Entwicklung gehen

---

**Report generiert von:** Scrum Master Agent (Bob)
**Subagents verwendet:** 4 (Story 5.1 Analysis, Code Verification, Epic Context, Repository Analysis)
