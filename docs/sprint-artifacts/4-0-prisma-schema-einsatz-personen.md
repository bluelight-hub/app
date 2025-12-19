# Story 4.0: Prisma Schema für Einsatz-Personen

**Status:** Done

---

## Quick Context

| Aspekt | Details |
|--------|---------|
| **Entities** | `EinsatzPerson`, `EinsatzPersonQualifikation` |
| **Relations** | → Einsatz (Cascade), → StammPerson? (SetNull), → User (NoAction) |
| **Pattern** | Snapshot (Daten kopiert, nicht referenziert) |
| **Migration** | 2 neue Tabellen, 4 User-Relations |
| **Aufwand** | ~0.5 Tage |

**Task Dependencies:** Task 1 → Task 2 → Task 3 → Task 4 (sequentiell)

---

## Story

Als **Entwickler**,
möchte ich das Prisma Schema für die Einsatz-Personen-Entitäten erweitern,
damit Epic 4 Stories (Helfer-Registrierung) auf einer stabilen Datenbankstruktur aufbauen können.

---

## Acceptance Criteria

### AC1: EinsatzPerson Model definiert

**Given:** Prisma Schema ist offen
**When:** EinsatzPerson Model hinzugefügt wird
**Then:** Das Model enthält folgende Felder mit vollständigem Audit-Trail:

| Feld | Typ | Nullable | Constraint | Beschreibung |
|------|-----|----------|-----------|--------------|
| `id` | String | NEIN | `@id @default(cuid())` | Primärschlüssel |
| `einsatzId` | String | NEIN | FK zu Einsatz | Einsatz-Zugehörigkeit |
| `stammId` | String? | JA | FK zu StammPerson, `onDelete: SetNull` | Nullable für temporäre Personen |
| `vorname` | String | NEIN | `@db.VarChar(100)` | KOPIERT von Stammdaten |
| `nachname` | String | NEIN | `@db.VarChar(100)` | KOPIERT von Stammdaten |
| `funkrufname` | String? | JA | `@db.VarChar(50)` | KOPIERT, optional |
| `position` | Json? | JA | `@db.JsonB` | GPS-Koordinaten (optional) |
| `createdAt` | DateTime | NEIN | `@default(now())` | Audit-Trail |
| `updatedAt` | DateTime | NEIN | `@updatedAt` | Audit-Trail + Optimistic Locking |
| `createdBy` | String | NEIN | `@db.VarChar(100)` | User-ID (FK) |
| `updatedBy` | String? | JA | `@db.VarChar(100)` | User-ID (FK) |

### AC2: EinsatzPersonQualifikation Junction Table definiert

**Given:** EinsatzPerson Model existiert
**When:** M:N Relation zu Qualifikation benötigt wird
**Then:** Junction Table `EinsatzPersonQualifikation` enthält vollständigen Audit-Trail:

| Feld | Typ | Nullable | Constraint |
|------|-----|----------|-----------|
| `id` | String | NEIN | `@id @default(cuid())` |
| `einsatzPersonId` | String | NEIN | FK zu EinsatzPerson, `onDelete: Cascade` |
| `qualifikationId` | String | NEIN | FK zu Qualifikation, `onDelete: Restrict` |
| `createdAt` | DateTime | NEIN | `@default(now())` |
| `updatedAt` | DateTime | NEIN | `@updatedAt` |
| `createdBy` | String | NEIN | `@db.VarChar(100)` |
| `updatedBy` | String? | JA | `@db.VarChar(100)` |

**And:** Unique Constraint `@@unique([einsatzPersonId, qualifikationId])`

### AC3: Relations korrekt definiert

**Given:** EinsatzPerson Model existiert
**When:** Relations geprüft werden
**Then:**
- `einsatzId` → `Einsatz.id` mit `onDelete: Cascade, onUpdate: Cascade`
- `stammId` → `StammPerson.id` mit `onDelete: SetNull, onUpdate: Cascade`
- `createdBy/updatedBy` → `User.id` mit `onDelete: NoAction, onUpdate: NoAction` (Audit-Trail erhalten)
- **KEIN** `fahrzeugId` in EinsatzPerson (Story 4-3 wird separate Zuweisungs-Tabelle nutzen)

### AC4: Indexes für Performance

**Given:** EinsatzPerson Model existiert
**When:** Queries optimiert werden müssen
**Then:** Folgende Indexes existieren:
```prisma
@@index([einsatzId])              // Filter by mission
@@index([stammId])                // Traceability
@@index([einsatzId, nachname])    // Suche nach Name im Einsatz
@@index([createdBy])              // Audit queries
```

### AC5: Migration erstellt und angewendet

**Given:** Schema-Änderungen definiert
**When:** `prisma migrate dev --name add_einsatz_personen` ausgeführt wird
**Then:** Migration wird erfolgreich erstellt und angewendet

---

## Tasks / Subtasks

- [x] **Task 1: EinsatzPerson Model erstellen** (AC: 1, 3, 4)
  - [x] 1.1 Model mit allen Feldern definieren (analog zu EinsatzFahrzeug)
  - [x] 1.2 Relations zu Einsatz, StammPerson, User definieren (mit `onUpdate: Cascade`)
  - [x] 1.3 Indexes hinzufügen
  - [x] 1.4 `@@map("einsatz_personen")` für Table-Name

- [x] **Task 2: EinsatzPersonQualifikation Junction Table erstellen** (AC: 2)
  - [x] 2.1 M:N Junction Table analog zu StammPersonQualifikation
  - [x] 2.2 Relations zu EinsatzPerson (`onDelete: Cascade`) und Qualifikation (`onDelete: Restrict`)
  - [x] 2.3 Unique Constraint für Duplikat-Vermeidung
  - [x] 2.4 Vollständiger Audit-Trail (createdAt, updatedAt, createdBy, updatedBy)
  - [x] 2.5 `@@map("einsatz_person_qualifikationen")` für Table-Name

- [x] **Task 3: Bestehende Models erweitern** (AC: 3)
  - [x] 3.1 User: `einsatzPersonenCreated/Updated` Relations
  - [x] 3.2 User: `einsatzPersonQualifikationenCreated/Updated` Relations
  - [x] 3.3 StammPerson: `einsatzPersonen` Relation
  - [x] 3.4 Qualifikation: `einsatzPersonQualifikationen` Relation
  - [x] 3.5 Einsatz: `einsatzPersonen` Relation

- [x] **Task 4: Migration erstellen und testen** (AC: 5)
  - [x] 4.1 `prisma migrate dev --name add_einsatz_personen`
  - [x] 4.2 Prisma Client generieren
  - [x] 4.3 Backend startet erfolgreich

### Review Follow-ups (AI) - 2025-12-18

**🔴 HIGH SEVERITY (Blocker)**

- [x] [AI-Review][HIGH] Migration enthält orphaned Index für einsatz_fahrzeuge - Zeilen 58-59 entfernen [`migrations/20251218142744_add_einsatz_personen/migration.sql:59`] ✅ Fixed
- [x] [AI-Review][HIGH] EinsatzFahrzeug fehlt `onUpdate: Cascade` auf 3 FK Relations (Einsatz, Stamm, Fahrzeugtyp) - Epic 3 Learning nachträglich anwenden [`schema.prisma:869-871`] ✅ Fixed

**🟡 MEDIUM SEVERITY (Should Fix)**

- [x] [AI-Review][MEDIUM] Story AC2 Spec-Fehler: Dokumentiert `onDelete: Cascade` für qualifikationId, aber `Restrict` ist korrekt - Story-Text bereits korrekt ✅ Verified
- [x] [AI-Review][MEDIUM] StammPersonQualifikation: User Relations nutzen `Restrict/SetNull` statt `NoAction` - inkonsistent mit EinsatzPersonQualifikation [`schema.prisma:832-833`] ✅ Fixed
- [x] [AI-Review][MEDIUM] StammPersonQualifikation fehlt `onUpdate: Cascade` auf Person/Qualifikation FK [`schema.prisma:830-831`] ✅ Fixed
- [x] [AI-Review][MEDIUM] Optional: Reverse-Lookup Index `@@index([qualifikationId, einsatzPersonId])` in Junction Table hinzufügen [`schema.prisma:955-957`] ✅ Added
- [x] [AI-Review][MEDIUM] Optional: Audit Composite Index `@@index([einsatzId, createdBy])` in EinsatzPerson hinzufügen [`schema.prisma:929`] ✅ Added
- [ ] [AI-Review][MEDIUM] Migration: Constraint-Name weicht von Prisma Convention ab (auto-generiert vs. explicit) [`migration.sql:44`] → Won't fix (cosmetic)

**🟢 LOW SEVERITY (Nice to Have)**

- [ ] [AI-Review][LOW] Unique Constraint NULL-Verhalten dokumentieren (mehrere temporäre Personen erlaubt) [`schema.prisma:923`] → Deferred
- [ ] [AI-Review][LOW] EinsatzFahrzeug: `@@unique([einsatzId, stammId])` fehlt - gleiche StammFahrzeug kann mehrfach in Einsatz [`schema.prisma:876`] → Deferred (separate Story)
- [ ] [AI-Review][LOW] Optional: `@@index([updatedBy])` für Audit-Konsistenz hinzufügen → Deferred
- [x] [AI-Review][LOW] Index-Strategie asymmetrisch: EinsatzFahrzeug 7 Indexes vs EinsatzPerson 4 Indexes ✅ Fixed (now 6 indexes)

---

## Dev Notes

### Snapshot Pattern (KRITISCH - aus Epic 3 gelernt!)

**EinsatzPerson kopiert Daten von StammPerson, referenziert nicht!**

```typescript
// ✅ RICHTIG (Story 4.1-4.2 wird so implementieren):
const einsatzPerson = EinsatzPerson.createFromStammPerson({
  vorname: stammPerson.vorname,           // KOPIE
  nachname: stammPerson.nachname,         // KOPIE
  funkrufname: stammPerson.funkkenungBOS, // KOPIE (optional)
  qualifikationIds: stammPerson.qualifikationIds, // KOPIE der IDs
  stammId: stammPerson.id,                // Rückverfolgbarkeit
  einsatzId: einsatzId,
  createdBy: userId,
});

// ❌ FALSCH: Live-Referenz würde alte Einsätze rückwirkend ändern!
```

**Warum:** Wenn Stammdaten später geändert werden (z.B. neue Qualifikation), soll der Einsatz NICHT rückwirkend geändert werden.

### Optimistic Locking (Learning aus Story 3.3)

**Pattern für Story 4.1+ Handler:**
```typescript
// UpdateEinsatzPersonDto MUSS updatedAt enthalten
export class UpdateEinsatzPersonDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ description: 'Für Optimistic Locking' })
  @IsDateString()
  updatedAt: string; // Client sendet letzten bekannten Timestamp

  // ... weitere Felder
}

// Handler prüft vor Update:
const existing = await this.repository.findById(command.id, tx);
if (existing.updatedAt > new Date(command.updatedAt)) {
  return Result.fail('Concurrent modification detected - bitte neu laden');
}
```

**Grund:** Verhindert Lost Updates bei parallelen Änderungen (z.B. zwei Dispatcher ändern gleichzeitig eine Person).

### Cascade Delete Entscheidung

**Gewählte Strategie:** `onDelete: Cascade` für EinsatzPerson → Einsatz

**Begründung:**
- EinsatzPerson ist ein **Snapshot** im Einsatz-Kontext
- Wenn Einsatz gelöscht wird, sind die zugehörigen Personen-Snapshots nicht mehr relevant
- Für Auditing/Compliance: Einsätze sollten archiviert (Soft-Delete), nicht hart gelöscht werden

**Für Story 4.1+ relevant:** Falls Soft-Delete für Einsätze eingeführt wird, bleibt CASCADE sicher, da Einsätze dann nie hart gelöscht werden.

### Keine Fahrzeug-Zuweisung in diesem Model!

**Story 4-3 (Person zu Fahrzeug zuweisen) wird eine SEPARATE Zuweisungs-Logik nutzen:**

- Option A: `fahrzeugId` nullable auf `EinsatzPerson` (einfach)
- Option B: Separate `EinsatzPersonFahrzeugZuweisung` Tabelle (flexibler für Historie)

**Entscheidung in Story 4-3 treffen!** Dieses Schema enthält bewusst kein `fahrzeugId`.

### NULL vs undefined Mapper-Regel

```typescript
// Domain (Story 4.1+) nutzt undefined:
stammId: undefined  // Temporäre Person

// Prisma/DB nutzt null:
stammId: null

// Mapper MUSS konvertieren:
toDomain: (entity) => ({
  stammId: (entity.stammId as string | null) ?? undefined,
}),
toPrisma: (aggregate) => ({
  stammId: aggregate.stammId ?? null,
})
```

---

## Domain Events (Vorlage für Story 4.1+)

**Pattern aus Story 3.1 - Events für EinsatzPerson Lifecycle:**

```typescript
// EinsatzPersonHinzugefuegtEvent
export class EinsatzPersonHinzugefuegtEvent extends DomainEvent {
  constructor(
    public readonly einsatzId: EinsatzId,
    public readonly einsatzPersonId: EinsatzPersonId,
    public readonly stammId: StammPersonId | undefined,
    public readonly vorname: string,
    public readonly nachname: string,
    public readonly timestamp: Date = new Date()
  ) { super(); }
}

// EinsatzPersonEntferntEvent
export class EinsatzPersonEntferntEvent extends DomainEvent {
  constructor(
    public readonly einsatzId: EinsatzId,
    public readonly einsatzPersonId: EinsatzPersonId,
    public readonly timestamp: Date = new Date()
  ) { super(); }
}

// EinsatzPersonAktualiziertEvent (z.B. Position Update)
export class EinsatzPersonAktualiziertEvent extends DomainEvent {
  constructor(
    public readonly einsatzPersonId: EinsatzPersonId,
    public readonly changes: Partial<{ position: Position }>,
    public readonly timestamp: Date = new Date()
  ) { super(); }
}
```

**Event Handler Integration (Story 4.2+):**
- ETB-Eintrag erstellen bei `EinsatzPersonHinzugefuegtEvent`
- Lagekarte aktualisieren bei `EinsatzPersonAktualiziertEvent`

---

## Out of Scope (für spätere Stories)

| Thema | Ziel-Story | Beschreibung |
|-------|-----------|--------------|
| Business Logic Constraints | 4.1 | "Maximal ein aktiver Einsatz pro Person" im Domain Layer |
| Two Factories Pattern | 4.1 | `createFromStammPerson()` + `createTemporary()` |
| Domain Events Implementation | 4.1 | Event-Klassen und Handler |
| REST API / DTOs | 4.2 | `AddEinsatzPersonDto`, `UpdateEinsatzPersonDto` |
| Fahrzeug-Zuweisung | 4.3 | Person → Fahrzeug Mapping |
| Archive-Strategie | 4.x | Soft-Delete für alte Einsätze (Performance) |
| Position Tracking | TBD | GPS-Positionen für Personen auf Lagekarte? |

---

## DI Token Pattern (für Story 4.1+)

```typescript
// packages/backend/src/infrastructure/di-tokens.ts
export const DI_TOKENS = {
  // ... existing tokens
  KRAEFTE: {
    REPOSITORIES: {
      // Existing
      EINSATZ_FAHRZEUG: Symbol('IEinsatzFahrzeugRepository'),
      STAMM_FAHRZEUG: Symbol('IStammFahrzeugRepository'),
      STAMM_PERSON: Symbol('IStammPersonRepository'),
      QUALIFIKATION: Symbol('IQualifikationRepository'),
      // NEU für Story 4.0
      EINSATZ_PERSON: Symbol('IEinsatzPersonRepository'),
    },
  },
} as const;
```

---

## Architecture Compliance

### Hexagonal Architecture Layers (für Story 4.1+)

| Layer | Komponente | Pfad |
|-------|-----------|------|
| **Domain** | `EinsatzPerson` Aggregate | `src/domain/kraefte/aggregates/einsatz-person.aggregate.ts` |
| **Domain** | `EinsatzPersonId` Value Object | `src/domain/kraefte/value-objects/einsatz-person-id.ts` |
| **Domain** | `IEinsatzPersonRepository` Interface | `src/domain/kraefte/repositories/i-einsatz-person.repository.ts` |
| **Domain** | Domain Events | `src/domain/kraefte/events/einsatz-person-*.event.ts` |
| **Infrastructure** | `PrismaEinsatzPersonRepository` | `src/infrastructure/kraefte/repositories/prisma-einsatz-person.repository.ts` |
| **Infrastructure** | `PrismaEinsatzPersonMapper` | `src/infrastructure/kraefte/mappers/prisma-einsatz-person.mapper.ts` |
| **Application** | Command Handlers | `src/application/kraefte/einsatz-personen/commands/*.handler.ts` |
| **Application** | Event Handlers | `src/application/kraefte/einsatz-personen/event-handlers/*.handler.ts` |

### Code Review Checklist Relevanz

| Check | Relevant für Story 4.0? | Details |
|-------|-------------------------|---------|
| AC1 (DI Import) | Nein | Nur Schema, kein TypeScript |
| AC2 (DI Tokens) | Vorbereitung | Token-Struktur dokumentiert |
| AC3 (Framework-Agnostik) | Nein | Nur Schema |
| AC4 (Result Pattern) | Nein | Nur Schema |
| AC5 (Outbox Pattern) | Vorbereitung | Events dokumentiert |
| AC6 (Test Pattern) | Nein | Nur Schema-Validation |

---

## Project Structure Notes

### Prisma Schema Location

```
packages/backend/prisma/schema.prisma
```

### Bestehende Models als Referenz

| Model | Pattern | Referenz |
|-------|---------|----------|
| `EinsatzFahrzeug` | Snapshot Pattern für Einsatz-Entitäten | Line 835-870 |
| `StammPerson` | Stammdaten mit M:N Qualifikationen | Line 767-797 |
| `StammPersonQualifikation` | M:N Junction Table Pattern | Line 800-823 |

### Erwartete Platzierung im Schema

```prisma
// ========================================
// Kräfte-Management: Einsatz-Personen
// Epic 4 - Story 4.0
// ========================================

// Nach EinsatzFahrzeug (Line ~871), vor anderen Einsatz-Entitäten
```

---

## Technical Requirements

### Prisma Schema Code

```prisma
// ========================================
// Kräfte-Management: Einsatz-Personen
// Epic 4 - Story 4.0
// ========================================

/// Einsatz-Person: Snapshot einer Person im Einsatz-Kontext
/// - stammId nullable für spontane/temporäre Personen
/// - vorname, nachname, funkrufname werden KOPIERT (nicht live referenziert)
/// - Cascade-Delete mit Einsatz
model EinsatzPerson {
  id          String  @id @default(cuid())
  einsatzId   String  @map("einsatz_id")
  stammId     String? @map("stamm_id")
  vorname     String  @db.VarChar(100)
  nachname    String  @db.VarChar(100)
  funkrufname String? @db.VarChar(50) // KOPIE von StammPerson.funkkenungBOS
  position    Json?   @db.JsonB

  // Audit Trail (PFLICHT - vollständig!)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at") // Auch für Optimistic Locking
  createdBy String   @db.VarChar(100) @map("created_by")
  updatedBy String?  @db.VarChar(100) @map("updated_by")

  // Relations (mit onUpdate: Cascade für Konsistenz)
  einsatz Einsatz      @relation(fields: [einsatzId], references: [id], onDelete: Cascade, onUpdate: Cascade)
  stamm   StammPerson? @relation(fields: [stammId], references: [id], onDelete: SetNull, onUpdate: Cascade)
  creator User         @relation("EinsatzPersonCreator", fields: [createdBy], references: [id], onDelete: NoAction, onUpdate: NoAction)
  updater User?        @relation("EinsatzPersonUpdater", fields: [updatedBy], references: [id], onDelete: NoAction, onUpdate: NoAction)

  // M:N: Qualifikationen dieser Person (KOPIE zum Erfassungszeitpunkt)
  qualifikationen EinsatzPersonQualifikation[]

  // Constraints
  @@unique([einsatzId, stammId], name: "einsatz_person_einsatz_stamm_unique")

  // Indexes
  @@index([einsatzId])
  @@index([stammId])
  @@index([einsatzId, nachname])
  @@index([createdBy])
  @@map("einsatz_personen")
}

/// M:N Junction Table: EinsatzPerson <-> Qualifikation
/// KOPIE der Qualifikationen zum Erfassungszeitpunkt
/// VOLLSTÄNDIGER Audit-Trail (auch für Junction Tables!)
model EinsatzPersonQualifikation {
  id              String @id @default(cuid())
  einsatzPersonId String @map("einsatz_person_id")
  qualifikationId String @map("qualifikation_id")

  // Audit-Trail (PFLICHT - auch für Junction Tables!)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  createdBy String   @db.VarChar(100) @map("created_by")
  updatedBy String?  @db.VarChar(100) @map("updated_by")

  // Relations (mit onUpdate: Cascade)
  einsatzPerson EinsatzPerson @relation(fields: [einsatzPersonId], references: [id], onDelete: Cascade, onUpdate: Cascade)
  qualifikation Qualifikation @relation(fields: [qualifikationId], references: [id], onDelete: Restrict, onUpdate: Cascade)
  creator       User          @relation("EinsatzPersonQualifikationCreator", fields: [createdBy], references: [id], onDelete: NoAction, onUpdate: NoAction)
  updater       User?         @relation("EinsatzPersonQualifikationUpdater", fields: [updatedBy], references: [id], onDelete: NoAction, onUpdate: NoAction)

  // Unique Constraint (keine Duplikate in M:N)
  @@unique([einsatzPersonId, qualifikationId])
  @@index([einsatzPersonId])
  @@index([qualifikationId])
  @@index([createdBy])
  @@map("einsatz_person_qualifikationen")
}
```

### Bestehende Models erweitern

```prisma
// In model User hinzufügen:
einsatzPersonenCreated              EinsatzPerson[]              @relation("EinsatzPersonCreator")
einsatzPersonenUpdated              EinsatzPerson[]              @relation("EinsatzPersonUpdater")
einsatzPersonQualifikationenCreated EinsatzPersonQualifikation[] @relation("EinsatzPersonQualifikationCreator")
einsatzPersonQualifikationenUpdated EinsatzPersonQualifikation[] @relation("EinsatzPersonQualifikationUpdater")

// In model StammPerson hinzufügen:
einsatzPersonen EinsatzPerson[]

// In model Qualifikation hinzufügen:
einsatzPersonQualifikationen EinsatzPersonQualifikation[]

// In model Einsatz hinzufügen:
einsatzPersonen EinsatzPerson[]
```

---

## References

### Source Documents

| Document | Section | Relevanz |
|----------|---------|----------|
| [docs/epics.md](../epics.md) | Epic 4, Story 4-0 | Acceptance Criteria |
| [docs/prd.md](../prd.md) | FR6-FR10, NFR3 | Personen-Management Requirements |
| [docs/architecture-kraefte.md](../architecture-kraefte.md) | Domain Model | Kraefte Bounded Context |
| [docs/project-context.md](../project-context.md) | AC1-AC6 | Code Review Checklist |

### Code References

| Pattern | File | Zeile |
|---------|------|-------|
| EinsatzFahrzeug Model | `prisma/schema.prisma` | 835-870 |
| StammPerson Model | `prisma/schema.prisma` | 767-797 |
| StammPersonQualifikation | `prisma/schema.prisma` | 800-823 |
| EinsatzFahrzeug Aggregate | `src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts` | 1-543 |
| StammPerson Aggregate | `src/domain/kraefte/aggregates/stamm-person.aggregate.ts` | 1-596 |

---

## Epic 3 Learnings Applied

| Learning | Anwendung in Story 4-0 |
|----------|------------------------|
| **Snapshot Pattern** | vorname, nachname, funkrufname werden KOPIERT |
| **Two Factories** | Dokumentiert für Story 4.1: `createFromStammPerson()` + `createTemporary()` |
| **NULL vs undefined** | Mapper-Konvertierung dokumentiert |
| **onDelete: NoAction** | Audit-Trail Relations zu User |
| **onUpdate: Cascade** | Alle FK außer User-Relations |
| **@@map()** | Snake_case Table-Namen |
| **Junction Table Pattern** | EinsatzPersonQualifikation analog zu StammPersonQualifikation |
| **Junction Table Audit-Trail** | Vollständiger Audit-Trail auch für M:N Tables |
| **Index-Strategie** | Indexes für häufige Queries |
| **Optimistic Locking** | updatedAt für Concurrency-Checks dokumentiert |
| **Domain Events** | Event-Vorlagen für Story 4.1+ dokumentiert |

---

## Testing Requirements

### Schema Validation

```bash
# Prisma Schema validieren
pnpm --filter @bluelight-hub/backend exec prisma validate

# Migration erstellen
pnpm --filter @bluelight-hub/backend exec prisma migrate dev --name add_einsatz_personen

# Prisma Client generieren
pnpm --filter @bluelight-hub/backend exec prisma generate

# Backend startet erfolgreich
pnpm --filter @bluelight-hub/backend dev
```

### Erwartete Test-Cases für Story 4.1+

| Test | Beschreibung |
|------|--------------|
| EinsatzPerson aus Stammdaten | Kopiert Daten + setzt stammId |
| Temporäre EinsatzPerson | stammId = null |
| Cascade Delete | EinsatzPerson wird mit Einsatz gelöscht |
| Qualifikationen M:N | Kopie der Qualifikationen zum Zeitpunkt |
| Unique Constraint | Keine Duplikate (einsatzId, stammId) |
| Optimistic Locking | Concurrent Modification Detection |
| Domain Events | Events werden in Outbox gespeichert |

---

## Definition of Done

- [x] `pnpm --filter @bluelight-hub/backend exec prisma validate` passes
- [x] `pnpm --filter @bluelight-hub/backend exec prisma migrate dev` succeeds
- [x] Prisma Client generiert ohne Fehler
- [x] Backend startet erfolgreich (`pnpm --filter @bluelight-hub/backend dev`)
- [x] Code Review bestanden ✅ (2025-12-18, 8/12 Issues fixed, 4 deferred)
- [x] Story Status: `done`

---

## Estimation

**Aufwand:** ~0.5 Tage

| Task | Zeit |
|------|------|
| Schema definieren | 1h |
| Migration erstellen | 15min |
| Testen + Validieren | 30min |
| Code Review Fixes | 30min |

---

## Dev Agent Record

### Context Reference

- `/Users/rubeen/dev/personal/bluelight-hub/docs/sprint-artifacts/4-0-prisma-schema-einsatz-personen.md`
- `/Users/rubeen/dev/personal/bluelight-hub/docs/project-context.md`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101) via BMad SM Agent

### Validation

Story validiert durch 5 parallele Subagents (2025-12-18):
- Epic Alignment Check: 90%
- Prisma Pattern Validation: 100% (nach Fixes)
- Epic 3 Learnings: 100% (nach Fixes)
- Architecture Compliance: 100% (nach Fixes)
- LLM Optimization: 9/10 (nach Verbesserungen)

### File List

| Datei | Änderung |
|-------|----------|
| `packages/backend/prisma/schema.prisma` | EinsatzPerson + EinsatzPersonQualifikation Models + inverse Relations + Fixes |
| `packages/backend/prisma/migrations/20251218142744_add_einsatz_personen/migration.sql` | Auto-generierte Migration (orphaned Index entfernt) |
| `packages/backend/prisma/migrations/20251218145844_fix_onupdate_cascade_and_indexes/migration.sql` | Code Review Fixes: NoAction + Indexes |

### Implementation Notes (2025-12-18)

**Implementiert:**
- EinsatzPerson Model (Lines 881-914 in schema.prisma)
- EinsatzPersonQualifikation Junction Table (Lines 916-942)
- User inverse Relations (Lines 130-136)
- StammPerson.einsatzPersonen Relation (Line 800-801)
- Qualifikation.einsatzPersonQualifikationen Relation (Line 592-593)
- Einsatz.einsatzPersonen Relation (Line 190-191)

**Acceptance Criteria Erfüllt:**
- AC1: EinsatzPerson mit allen Feldern ✅
- AC2: Junction Table mit Audit-Trail ✅
- AC3: Relations korrekt definiert ✅
- AC4: Indexes für Performance ✅
- AC5: Migration erfolgreich angewendet ✅

**Patterns aus Epic 3 angewendet:**
- Snapshot Pattern (Daten kopiert, nicht referenziert)
- Vollständiger Audit-Trail
- onDelete: NoAction für User Relations
- onUpdate: Cascade für FK Relations
- @@map() für snake_case Table-Namen

### Code Review (2025-12-18)

**Reviewer:** Amelia (Dev Agent) mit 5 parallelen Subagents
**Outcome:** ✅ Approved (after fixes)

**Findings Summary:**
- 🔴 HIGH: 2 → ✅ 2 Fixed
- 🟡 MEDIUM: 6 → ✅ 5 Fixed, 1 Won't Fix (cosmetic)
- 🟢 LOW: 4 → ✅ 1 Fixed, 3 Deferred

**Fixes Applied:**
1. ✅ Migration: orphaned einsatz_fahrzeuge Index entfernt
2. ✅ EinsatzFahrzeug: onUpdate: Cascade auf 3 FK Relations
3. ✅ StammPersonQualifikation: User Relations auf NoAction
4. ✅ StammPersonQualifikation: onUpdate: Cascade hinzugefügt
5. ✅ EinsatzPerson: Audit Composite Index hinzugefügt
6. ✅ EinsatzPersonQualifikation: Reverse-Lookup Index hinzugefügt

**Deferred Items (LOW):**
- Unique Constraint NULL-Dokumentation
- EinsatzFahrzeug @@unique([einsatzId, stammId]) → separate Story
- Optional updatedBy Index

**Schema validated:** `prisma validate` ✅

**Migration erstellt:** `20251218145844_fix_onupdate_cascade_and_indexes` ✅
