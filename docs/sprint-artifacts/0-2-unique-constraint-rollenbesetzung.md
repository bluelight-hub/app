# Story 0.2: UNIQUE Constraint + Upsert Pattern DOKUMENTIEREN für Rollenbesetzung

**Status:** ✅ Approved

---

## Story

**Als** Entwickler für Epic 5 (Rollen & Führung),
**möchte ich** ein dokumentiertes Pattern für UNIQUE Constraint + Upsert haben,
**damit** ich in Story 5.0/5.1 Race Conditions zu doppelten Rollenbesetzungen verhindern kann.

**Dies ist eine DOKUMENTATIONS-Story (Epic 0 - Foundation).**
Die tatsächliche Implementierung erfolgt in:
- **Story 5.0:** Prisma Schema mit UNIQUE Constraint erstellen
- **Story 5.1:** Handler mit Upsert-Pattern + Frontend umsetzen

**Risiko-Referenz:** R-E5-002 (Score: 9, Kategorie: DATA)
**FRs covered:** FR11 (Rollen zuweisen), FR12 (Rollen freigeben) - DOKUMENTIERT für Epic 5

---

## Kontext & Abhängigkeiten

### Warum jetzt? (Epic 0 = Foundation)

Diese Story ist Teil von Epic 0 (Technical Foundation) und muss VOR Epic 5 (Rollen & Führung) **dokumentiert** werden. Der Grund:

1. **Risiko-Mitigation:** Race Conditions bei parallelen Rollenzuweisungen können zu inkonsistenten Daten führen
2. **Pattern-Definition:** Das Upsert-Pattern wird hier etabliert und in Epic 5 verwendet
3. **Datenintegrität:** Der UNIQUE Constraint auf DB-Ebene ist die letzte Verteidigungslinie

**WICHTIG:** Diese Story DOKUMENTIERT das Pattern. Epic 5 IMPLEMENTIERT es.

### Epic-Zuordnung

| Aspekt | Epic 0 (Foundation) | Epic 5 (Rollen & Führung) |
|--------|---------------------|---------------------------|
| **Inhalt dieser Story** | Pattern-Dokumentation, ADR, Test-Design | Prisma Schema, Handler, Frontend |
| **Warum getrennt?** | Foundation-Patterns MÜSSEN vor Implementierung geklärt sein | Implementierung braucht dokumentierte Patterns als Basis |

### Abhängigkeiten

| Typ | Beschreibung |
|-----|--------------|
| **Depends on** | Story 0-1 (AdminJwtAuthGuard) - ABGESCHLOSSEN |
| **Blocks** | Story 5.0 (Prisma Schema für Rollenbesetzung) |
| **Blocks** | Story 5.1 (Rolle besetzen mit Qualifikationsvalidierung) |

### Vorherige Story Learnings (0-1)

Aus Story 0-1 (AdminJwtAuthGuard) können folgende Learnings übernommen werden:
- **Test-Pattern:** AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
- **Code Review:** Parallele Subagents für Review beschleunigen den Prozess
- **Dokumentation:** ADRs und Quick Reference parallel aktualisieren
- **Security:** Input Validation bei allen Methoden hinzufügen

---

## Acceptance Criteria

### AC1: Prisma Migration DOKUMENTIERT (nicht ausgeführt)

**Given** das bestehende Prisma Schema (noch OHNE EinsatzRollenbesetzung)
**When** ich die Pattern-Dokumentation für Epic 5 erstelle
**Then** wird folgende Constraint-Definition dokumentiert als Referenz:

```prisma
model EinsatzRollenbesetzung {
  id                  String @id @default(cuid())
  einsatzId           String
  rollenDefinitionId  String
  personId            String

  // Audit Trail
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  createdBy           String   @db.VarChar(100)
  updatedBy           String?  @db.VarChar(100)

  // Relations
  // einsatz           Einsatz @relation(...)
  // rollenDefinition  RollenDefinition @relation(...)
  // person            EinsatzPerson @relation(...)

  // KRITISCH: UNIQUE Constraint verhindert doppelte Besetzung
  @@unique([einsatzId, rollenDefinitionId], name: "unique_rolle_per_einsatz")

  @@map("einsatz_rollenbesetzungen")
}
```

**HINWEIS:** Dieses Schema existiert noch NICHT in der Datenbank.
**Erstellt wird es in Story 5.0** mit Migration `add_unique_rolle_constraint`.

---

### AC2: Upsert Handler-Pattern DOKUMENTIERT (Pattern-Referenz für Story 5.1)

**Given** zwei parallele Requests versuchen die gleiche Rolle zu besetzen
**When** BesetzeRolleHandler beide Requests verarbeitet (Story 5.1)
**Then** wird Prisma Upsert verwendet (create OR update)
**And** genau ein Datensatz existiert in der Datenbank
**And** der letzte Request "gewinnt" (last-write-wins)
**And** Input-Validierung stellt sicher: personId, einsatzId, rollenDefinitionId dürfen nicht leer sein

**Pattern-Zusammenfassung:** Handler nutzt `prisma.upsert` mit `where: unique_rolle_per_einsatz` und `TransactionalCommandHandler` für atomare Outbox-Events.

> **Hinweis:** Qualifikations-Check wird in Story 5.1 implementiert (nicht Teil dieser Dokumentation, siehe PRD FR13).

<details>
<summary>📝 Handler-Implementierung (klicken zum Erweitern - für Story 5.1)</summary>

```typescript
// packages/backend/src/application/kraefte/commands/besetze-rolle.handler.ts
@Injectable()
export class BesetzeRolleHandler extends TransactionalCommandHandler<
  BesetzeRolleCommand,
  string
> {
  protected async executeInTransaction(
    command: BesetzeRolleCommand,
    tx: TransactionContext
  ): Promise<{ result: string; events: DomainEvent[] }> {
    // KRITISCH: Upsert statt create verhindert DuplicateKeyError
    const besetzung = await tx.einsatzRollenbesetzung.upsert({
      where: {
        unique_rolle_per_einsatz: {
          einsatzId: command.einsatzId,
          rollenDefinitionId: command.rollenDefinitionId,
        },
      },
      create: {
        einsatzId: command.einsatzId,
        rollenDefinitionId: command.rollenDefinitionId,
        personId: command.personId,
        createdBy: command.userId,
      },
      update: {
        personId: command.personId,
        updatedBy: command.userId,
        updatedAt: new Date(),
      },
    });

    // ETB-Event für Rollenwechsel
    const event = new RolleBesetzt({
      einsatzId: command.einsatzId,
      rollenDefinitionId: command.rollenDefinitionId,
      personId: command.personId,
      previousPersonId: besetzung.personId !== command.personId
        ? besetzung.personId
        : undefined,
    });

    return { result: besetzung.id, events: [event] };
  }
}
```

</details>

---

### AC3: Concurrent Request Simulation Test DOKUMENTIERT

**Given** ein Einsatz mit einer LNA-Rolle (unbesetzt)
**When** 10 parallele Requests versuchen verschiedene Personen als LNA zuzuweisen
**Then** existiert am Ende genau 1 Eintrag für diese Rolle
**And** keine DuplicateKeyError Exceptions werden geworfen

**Pattern-Zusammenfassung:** `Promise.all` mit Map simuliert Concurrency. Alle Requests erfolgreich, DB garantiert nur 1 Eintrag.

<details>
<summary>🧪 Test-Implementierung (klicken zum Erweitern - für Story 5.1)</summary>

```typescript
// packages/backend/src/application/kraefte/__tests__/besetze-rolle.handler.spec.ts
describe('BesetzeRolleHandler - Concurrent Requests', () => {
  it('sollte nur einen Eintrag bei 10 parallelen Requests erstellen', async () => {
    // Given
    const einsatzId = 'test-einsatz-1';
    const rollenDefinitionId = 'lna-rolle';
    const personIds = Array.from({ length: 10 }, (_, i) => `person-${i}`);

    // When - 10 parallele Requests
    const results = await Promise.all(
      personIds.map((personId) =>
        handler.execute({
          einsatzId,
          rollenDefinitionId,
          personId,
          userId: 'test-user',
        })
      )
    );

    // Then - Alle erfolgreich, nur ein DB-Eintrag
    expect(results.every((r) => r.isSuccess)).toBe(true);

    const count = await prisma.einsatzRollenbesetzung.count({
      where: { einsatzId, rollenDefinitionId },
    });
    expect(count).toBe(1);
  });
});
```

</details>

**HINWEIS zu Concurrency-Limitation:**
`Promise.all` simuliert Application-Level Concurrency (parallele Handler-Aufrufe).
Dies testet NICHT echte DB-Level Concurrency (Row-Level Locks, Serializable Isolation).
Für DB-Level Tests (z.B. mit pgTAP oder isolierte Transactions) siehe Story 5.1.

---

### AC4: Frontend optimistisches Update DOKUMENTIERT (Pattern-Referenz für Story 5.1)

**Given** User A und User B besetzen gleichzeitig die gleiche Rolle
**When** User A's Request zuerst ankommt
**Then** sieht User A sofort sein Update (optimistic)
**When** User B's Request überschreibt
**Then** sieht User A nach Query-Invalidierung User B's Zuweisung
**And** API Response enthält `wasOverwritten: boolean` + `previousPersonId`
**And** ein Toast informiert über "Rolle wurde zwischenzeitlich geändert" NUR wenn `wasOverwritten === true`

**Pattern-Zusammenfassung:** TanStack Query Mutation mit `onMutate` (optimistic), `onError` (rollback), `onSettled` (server-sync + toast wenn abweichend).

> **⚠️ Trade-off:** Optimistic Update zeigt sofortiges Feedback, kann aber bei Konflikten zu kurzzeitig falscher Anzeige führen (wird durch Toast-Nachricht kommuniziert).

<details>
<summary>⚛️ Frontend Hook-Implementierung (klicken zum Erweitern - für Story 5.1)</summary>

```typescript
// packages/frontend/src/hooks/kraefte/useAssignRolle.ts
export const useAssignRolle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AssignRolleDto) =>
      api.kraefte.assignRolle(data),

    // Optimistic Update
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.kraefte.rollen });
      const previousRollen = queryClient.getQueryData(QUERY_KEYS.kraefte.rollen);

      queryClient.setQueryData(QUERY_KEYS.kraefte.rollen, (old) => ({
        ...old,
        [newData.rollenDefinitionId]: {
          personId: newData.personId,
          isPending: true,
        },
      }));

      return { previousRollen };
    },

    // Rollback bei Fehler
    onError: (err, newData, context) => {
      queryClient.setQueryData(
        QUERY_KEYS.kraefte.rollen,
        context?.previousRollen
      );
    },

    // Server-State übernehmen
    onSettled: async (data, error, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.kraefte.rollen });

      // Prüfe ob Server-Daten von lokalem Update abweichen
      if (data?.wasOverwritten) {
        toast.info('Rolle wurde zwischenzeitlich geändert');
      }
    },
  });
};
```

</details>

---

### AC5: ETB-Eintrag für jeden Wechsel DOKUMENTIERT

**Given** Person A besetzt LNA-Rolle
**When** Person B überschreibt via Upsert
**Then** wird ein ETB-Eintrag erstellt: "LNA: Person A → Person B"
**And** der Wechsel ist nachvollziehbar dokumentiert

**ETB-Text-Template (Referenz für Story 5.1):**

| Event | ETB-Text |
|-------|----------|
| `RolleBesetzt` (neu) | `Rolle "{rollenName}" besetzt durch "{personName}"` |
| `RolleBesetzt` (wechsel) | `Rolle "{rollenName}": {altPersonName} → {neuPersonName}` |
| `RolleFreigegeben` | `Rolle "{rollenName}" freigegeben (war: {personName})` |

---

### AC6: Rollback bei Fehler DOKUMENTIERT

**Given** Upsert schlägt fehl (z.B. Person existiert nicht, Validierung fehlgeschlagen)
**When** der Transaction Rollback ausgelöst wird
**Then** bleibt der vorherige Zustand erhalten
**And** kein inkonsistenter Zustand entsteht
**And** Outbox-Eintrag wird ebenfalls verworfen (atomare Garantie)

**Rollback-Szenarien:**
- Person nicht gefunden → `Result.fail('Person existiert nicht')`
- Einsatz nicht gefunden → `Result.fail('Einsatz existiert nicht')`
- RollenDefinition ungültig → `Result.fail('Ungültige Rollendefinition')`
- Qualifikation fehlt → `Result.fail('Person nicht qualifiziert')` (Story 5.1)

**Wichtig:** Da TransactionalCommandHandler verwendet wird, ist atomares Rollback garantiert.

---

### AC7: Outbox-Integration Pattern DOKUMENTIERT (CLAUDE.md AC5)

**Given** BesetzeRolleHandler erstellt ein RolleBesetzt-Event
**When** die Transaktion erfolgreich committed wird
**Then** wird das Event atomar mit der Rollenbesetzung in der Outbox gespeichert
**And** ETB-Module kann das Event asynchron verarbeiten

**Wenn** die Transaktion fehlschlägt (Rollback)
**Then** wird auch der Outbox-Eintrag verworfen (atomare Garantie)
**And** kein inkonsistentes Event existiert

**Pattern-Garantie:**
1. Handler erstellt `RolleBesetzt` Event
2. `TransactionalCommandHandler` base class speichert in Outbox **innerhalb derselben Transaktion**
3. Bei Rollback: Sowohl Rollenbesetzung ALS AUCH Outbox-Eintrag werden verworfen
4. Event-Publishing erfolgt asynchron nach erfolgreichem Commit

**Verweis:** `TransactionalCommandHandler` in `src/application/common/handlers/`

---

## Tasks / Subtasks

### Phase 1: Dokumentation (DIESE STORY - NUR Dokumentation!)

- [x] Task 1: Pattern-Dokumentation in Architecture Docs
  - [x] ADR für UNIQUE Constraint + Upsert Pattern erstellen (`docs/architecture/9-architecture-decisions-adrs.md`) → **ADR-023**
  - [x] Pattern in ADR-Format dokumentieren (Kontext, Entscheidung, Konsequenzen)
  - [x] Quick Reference um Upsert-Pattern erweitern (`docs/architecture/12-quick-reference.md`) → Neue Sektion "Database Patterns"

- [x] Task 2: Test-Design dokumentieren
  - [x] Concurrent Request Test-Pattern in Test Design dokumentieren
  - [x] TC-P0-014 (UNIQUE Constraint DB-Level Test) verifizieren → 3 Testfälle dokumentiert
  - [x] TC-P0-015 (Upsert Handler Concurrent Test) verifizieren → 3 Testfälle dokumentiert
  - [x] DB-Level vs Application-Level Concurrency-Tests unterscheiden → Limitation von Promise.all dokumentiert

- [x] Task 3: DI Token Constants dokumentieren
  - [x] DI Token `DI_TOKENS.REPOSITORIES.KRAEFTE.ROLLENBESETZUNG` in Architecture Docs dokumentieren
  - [x] Pattern für neue DI Tokens in Epic 5 definieren (`docs/architecture/3-backend-architecture.md`) → Erweiterte DI Token Section

### Phase 2: Implementierung (NICHT in dieser Story!)

Die tatsächliche Implementierung erfolgt in:
- **Story 5.0:** Prisma Schema mit UNIQUE Constraint erstellen
- **Story 5.1:** Handler mit Upsert + Frontend implementieren

---

## Technical Requirements

### Architektur-Compliance

| Pattern | Anforderung | Status |
|---------|-------------|--------|
| UNIQUE Constraint | `@@unique([einsatzId, rollenDefinitionId])` | Dokumentiert (Story 5.0 implementiert) |
| Upsert Pattern | Prisma `upsert` in Handler | Dokumentiert (Story 5.1 implementiert) |
| TransactionalCommandHandler | Atomare Events | Standard (bestehend) |
| Outbox Pattern | ETB-Events via Outbox | Standard (bestehend) |
| Result Pattern | `Result<T>` statt Exceptions | Standard (bestehend) |

### DI Token Constants (AC2 aus CLAUDE.md) - DOKUMENTIERT für Story 5.0

```typescript
// packages/backend/src/infrastructure/di-tokens.ts
export const DI_TOKENS = {
  REPOSITORIES: {
    // ... bestehende Tokens ...
    KRAEFTE: {
      ROLLENBESETZUNG: Symbol('IRollenbesetzungRepository'),
    },
  },
} as const;
```

**HINWEIS:** Dieser Code wird in Story 5.0 erstellt. Diese Story dokumentiert nur das Pattern.

### Framework-Agnostizität (AC3 aus CLAUDE.md)

- Handler in `src/application/kraefte/commands/` - keine HTTP-Konzepte
- Controller in `src/modules/kraefte/controllers/` - nur hier HTTP
- Repository Interface in `src/domain/kraefte/repositories/`

---

## Risiko-Referenz

| Aspekt | Wert |
|--------|------|
| **Risiko ID** | R-E5-002 |
| **Score** | 9 (KRITISCH) |
| **Kategorie** | DATA (Datenintegrität) |
| **Test-Coverage** | TC-P0-014, TC-P0-015 |
| **Mitigation** | UNIQUE Constraint + Upsert Pattern (dokumentiert in Story 0.2, implementiert in Story 5.0/5.1) |

### Warum kritisch?

Ohne DB-Level Constraint können Race Conditions zu:
1. **Doppelten Besetzungen** - Zwei Personen als LNA eingetragen
2. **Inkonsistente ETB-Einträge** - Widersprüchliche Dokumentation
3. **Taktische Stärke-Fehler** - Falsche Berechnung der Führungskräfte

---

## Dev Notes

### Quick Reference: Pattern-Übersicht

| Pattern | Implementierung | Referenz |
|---------|-----------------|----------|
| **UNIQUE Constraint** | `@@unique([einsatzId, rollenDefinitionId], name: "unique_rolle_per_einsatz")` | Story 5.0 |
| **Upsert Syntax** | `prisma.model.upsert({ where: { unique_rolle_per_einsatz: {...} }, create, update })` | [Prisma Docs](https://www.prisma.io/docs/concepts/components/prisma-client/crud#upsert) |
| **Concurrent Test** | `Promise.all(requests.map(r => handler.execute(r)))` | AC3 |
| **ETB Integration** | `TransactionalCommandHandler` → Outbox Pattern | AC7 |
| **Frontend Optimistic** | `onMutate` + `onSettled` mit `invalidateQueries` | [TanStack Query](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates) |

### Warum Upsert statt Insert?

Race Conditions bei parallelen Requests könnten zu `DuplicateKeyError` führen. Upsert garantiert:
1. **Idempotenz:** Gleicher Request 2x → gleiches Ergebnis
2. **Last-Write-Wins:** Letzter Request überschreibt (gewünschtes Verhalten)
3. **Keine Exceptions:** Handler muss keine Fehlerbehandlung für Duplikate implementieren

### Concurrent Request Flow (Diagramm)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONCURRENT REQUEST FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User A ─────┐                        User B ─────┐             │
│               │                                    │             │
│               ▼                                    ▼             │
│        ┌──────────┐                        ┌──────────┐          │
│        │ Request  │                        │ Request  │          │
│        │  LNA →   │                        │  LNA →   │          │
│        │ Person A │                        │ Person B │          │
│        └────┬─────┘                        └────┬─────┘          │
│             │                                   │                │
│             ▼                                   ▼                │
│    ┌─────────────────────────────────────────────────────┐       │
│    │              BesetzeRolleHandler                    │       │
│    │                                                     │       │
│    │   Upsert (NOT Insert)                               │       │
│    │   ┌─────────────────────────────────────────────┐   │       │
│    │   │  WHERE: einsatzId + rollenDefinitionId      │   │       │
│    │   │  CREATE: if not exists                      │   │       │
│    │   │  UPDATE: if exists (last-write-wins)        │   │       │
│    │   └─────────────────────────────────────────────┘   │       │
│    └─────────────────────────────────────────────────────┘       │
│                           │                                      │
│                           ▼                                      │
│    ┌─────────────────────────────────────────────────────┐       │
│    │                PostgreSQL                           │       │
│    │                                                     │       │
│    │   UNIQUE Constraint: unique_rolle_per_einsatz       │       │
│    │   ┌───────────────────────────────────────────┐     │       │
│    │   │  (einsatz_id, rollen_definition_id)       │     │       │
│    │   │  → Garantiert: Max 1 Eintrag pro Rolle    │     │       │
│    │   └───────────────────────────────────────────┘     │       │
│    └─────────────────────────────────────────────────────┘       │
│                           │                                      │
│                           ▼                                      │
│    ┌─────────────────────────────────────────────────────┐       │
│    │                   Result                            │       │
│    │                                                     │       │
│    │   • Genau 1 Eintrag in DB                          │       │
│    │   • Person B "gewinnt" (last-write)                 │       │
│    │   • ETB: "LNA: Person A → Person B"                 │       │
│    │   • User A sieht nach Refresh: Person B             │       │
│    └─────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### RolleBesetzt Event-Klasse Struktur (Referenz für Story 5.1)

```typescript
// packages/backend/src/domain/kraefte/events/rolle-besetzt.event.ts
export class RolleBesetzt extends DomainEvent {
  readonly eventType = 'kraefte.rolle-besetzt';

  // Core IDs
  readonly einsatzId: string;
  readonly rollenDefinitionId: string;
  readonly personId: string;

  // Change Tracking (für Wechsel-Detection)
  readonly previousPersonId?: string;

  // Human-Readable Names (für ETB-Text-Generierung)
  readonly rollenName: string;
  readonly personName: string;
  readonly previousPersonName?: string;

  /**
   * Generiert ETB-Text basierend auf Event-Daten.
   * Unterscheidet zwischen Neu-Besetzung und Wechsel.
   */
  toEtbText(): string {
    if (this.previousPersonId) {
      return `Rolle "${this.rollenName}": ${this.previousPersonName} → ${this.personName}`;
    }
    return `Rolle "${this.rollenName}" besetzt durch "${this.personName}"`;
  }
}
```

### Prisma Upsert Syntax (Referenz für Story 5.1)

```typescript
// Der unique constraint name wird in der where-clause verwendet
await prisma.einsatzRollenbesetzung.upsert({
  where: {
    unique_rolle_per_einsatz: {  // Name des @@unique constraints
      einsatzId: '...',
      rollenDefinitionId: '...',
    },
  },
  create: { /* ... */ },
  update: { /* ... */ },
});
```

### Test-Setup für Concurrent Requests (Referenz für Story 5.1)

```typescript
/**
 * Testet parallele Zugriffe auf denselben UNIQUE-Key.
 *
 * WICHTIG: Verwendet Promise.all um Application-Level Concurrency zu simulieren.
 * Dies testet NICHT echte DB-Level Concurrency (Row-Level Locks, Serializable Isolation).
 *
 * Für echte DB-Level Tests:
 * - Verwende separate Prisma Clients (separate Connections)
 * - Teste mit Serializable Isolation Level
 * - Prüfe Deadlock-Handling
 *
 * Diese Tests kommen in Story 5.1 (erweiterte Test-Suite).
 */
async function testConcurrentUpserts(count: number): Promise<void> {
  const requests = Array.from({ length: count }, (_, i) => ({
    einsatzId: 'test-einsatz',
    rollenDefinitionId: 'lna',
    personId: `person-${i}`,
    userId: 'test-user',
  }));

  // Parallele Ausführung (Application-Level)
  const results = await Promise.all(
    requests.map((req) => handler.execute(req))
  );

  // Alle erfolgreich (kein DuplicateKeyError)
  expect(results.every((r) => r.isSuccess)).toBe(true);

  // Nur ein Eintrag in DB
  const count = await prisma.einsatzRollenbesetzung.count({
    where: {
      einsatzId: 'test-einsatz',
      rollenDefinitionId: 'lna'
    },
  });
  expect(count).toBe(1);
}
```

---

## File List

### Zu erstellen (in dieser Story - NUR Dokumentation)

| Datei | Beschreibung |
|-------|--------------|
| `docs/architecture/9-architecture-decisions-adrs.md` | ADR für UNIQUE + Upsert Pattern hinzufügen |
| `docs/architecture/12-quick-reference.md` | Upsert Pattern dokumentieren |
| `docs/test-design-kraeftemanagement.md` | TC-P0-014, TC-P0-015 erweitern mit Concurrency-Tests |
| `docs/architecture/8-concepts.md` | DI Token Pattern für Epic 5 dokumentieren |

### Zu erstellen (in Story 5.0 - Schema)

| Datei | Beschreibung |
|-------|--------------|
| `packages/backend/prisma/migrations/xxx_add_rollenbesetzung/` | Migration mit UNIQUE Constraint |
| `packages/backend/prisma/schema.prisma` | EinsatzRollenbesetzung Model |
| `packages/backend/src/infrastructure/di-tokens.ts` | DI Token für IRollenbesetzungRepository |

### Zu erstellen (in Story 5.1 - Handler)

| Datei | Beschreibung |
|-------|--------------|
| `packages/backend/src/application/kraefte/commands/besetze-rolle.handler.ts` | Handler mit Upsert |
| `packages/backend/src/application/kraefte/commands/__tests__/besetze-rolle.handler.spec.ts` | Unit + Concurrent Tests |
| `packages/frontend/src/hooks/kraefte/useAssignRolle.ts` | Mutation Hook mit Optimistic Update |

---

## References

- [Source: docs/epics.md#Story S0.2]
- [Source: docs/architecture-kraefte.md#ADR-K3]
- [Source: docs/test-design-kraeftemanagement.md#TC-P0-014, TC-P0-015]
- [Pattern: Prisma Upsert Documentation](https://www.prisma.io/docs/concepts/components/prisma-client/crud#upsert)
- [Pattern: TanStack Query Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Completion Notes

- Story fokussiert auf **Dokumentation** des Patterns, nicht Implementierung
- Implementierung erfolgt in Stories 5.0 (Schema) und 5.1 (Handler)
- Pattern ist kritisch für Datenintegrität in Epic 5 (Rollen & Führung)
- UNIQUE Constraint auf DB-Ebene ist letzte Verteidigungslinie
- Upsert verhindert DuplicateKeyError bei Race Conditions
- **Code-Snippets sind Pattern-Referenzen** für Story 5.x, keine Implementierung in dieser Story

### Pre-Requisites Verified

- [x] Story 0-1 (AdminJwtAuthGuard) ist APPROVED
- [x] Epic 0 ist in-progress
- [x] Prisma Schema ist bereit für Erweiterung (Story 5.0)
- [x] TransactionalCommandHandler Pattern existiert
- [x] Outbox Pattern für ETB-Integration existiert

### Review History

- **Review 1 (2025-12-11):** 6 Critical Issues, 6 Enhancements, 8 Optimizations identifiziert
- **Review 2 (2025-12-11):** Alle Issues behoben:
  - ✅ CR-1: Scope Creep → Story als DOKUMENTATION klargestellt
  - ✅ CR-2: Epic-Zuordnung → Trennung Epic 0 (Doku) / Epic 5 (Impl) dokumentiert
  - ✅ CR-3: Prisma Schema → "existiert noch NICHT" Hinweis hinzugefügt
  - ✅ CR-4: Widersprüchliche Tasks → Phase 1/Phase 2 klar getrennt
  - ✅ CR-5: Race Condition Test → Concurrency-Limitation dokumentiert
  - ✅ CR-6: DI Token → Task 3 hinzugefügt
  - ✅ EN-1: Outbox Pattern → AC7 hinzugefügt
  - ✅ EN-2: Event Format → RolleBesetzt Klasse dokumentiert
  - ✅ EN-3-6: Input Validation, wasOverwritten, Trade-off Hinweise
  - ✅ LO-1-5: Details Tags, Quick Reference, Pattern-Zusammenfassungen

### Implementation (2025-12-11) - Amelia (Dev Agent)

**Alle 3 Tasks mit parallelen Subagents abgeschlossen:**

1. **Task 1: ADR-023 erstellt** (`docs/architecture/9-architecture-decisions-adrs.md`)
   - UNIQUE Constraint + Upsert Pattern vollständig dokumentiert
   - Kontext, Entscheidung, Konsequenzen, Alternativen
   - Verweis auf R-E5-002 (Score 9 → 3)

2. **Task 1b: Quick Reference erweitert** (`docs/architecture/12-quick-reference.md`)
   - Neue Sektion "Database Patterns" hinzugefügt
   - Upsert-Syntax mit named UNIQUE constraint
   - Verweis auf ADR-023

3. **Task 2: Test-Design dokumentiert** (`docs/test-design-kraeftemanagement.md`)
   - TC-P0-014: 3 Testfälle für DB-Level UNIQUE Constraint
   - TC-P0-015: 3 Testfälle für Application-Level Upsert
   - Limitation von Promise.all klar dokumentiert
   - Unterscheidung Application-Level vs DB-Level Concurrency

4. **Task 3: DI Token Pattern dokumentiert** (`docs/architecture/3-backend-architecture.md`)
   - DI Token Naming Convention
   - Symbol vs String Rationale
   - Epic 5 Token-Struktur (KRAEFTE Bounded Context)
   - Anti-Patterns Section

**Status:** ✅ Approved - Alle Dokumentations-Tasks abgeschlossen

### Review Follow-ups (AI) - 2025-12-11

#### 🟡 MEDIUM (2 Issues) - OFFEN

- [ ] [ME-1][MEDIUM] **File List Inkonsistenz**
  - **Datei:** Story Zeile 597
  - **Problem:** Story listet `docs/architecture/8-concepts.md`, aber Dokumentation wurde in `docs/architecture/3-backend-architecture.md` erstellt
  - **Fix:** File List korrigieren auf `docs/architecture/3-backend-architecture.md`

- [ ] [ME-2][MEDIUM] **Fehlende Transaction Timeout Dokumentation**
  - **Datei:** Story (nach AC7)
  - **Problem:** Pattern-Dokumentation erwähnt nicht `maxWait: 5000ms`, `timeout: 10000ms` für Deadlock Prevention
  - **Fix:** Section "Transaction Timeout Konfiguration" mit Verweis auf `3-backend-architecture.md` hinzufügen

#### 🟢 LOW (3 Issues) - OPTIONAL

- [ ] [LO-1][LOW] **Model-Name inkonsistent: EinsatzRollenbesetzung vs EinsatzRolle**
  - **Problem:** Story verwendet `EinsatzRollenbesetzung`, ADR-023 verwendet `EinsatzRolle`
  - **Fix:** Entscheidung treffen und konsistent verwenden

- [ ] [LO-2][LOW] **Fehlende Verlinkung zu ADR-023**
  - **Problem:** Story referenziert ADR-023 aber ohne relativen Link
  - **Fix:** Markdown-Link hinzufügen

- [ ] [LO-3][LOW] **Fehlende Status-History**
  - **Problem:** Kein Datum für Status-Transitions (DRAFT → APPROVED)
  - **Fix:** Status History Section hinzufügen
