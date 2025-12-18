# Story 3.0: Prisma Schema für Einsatz-Fahrzeuge

Status: done

---

## Story

**Als** Entwickler,
**möchte ich** das Prisma Schema für die Einsatz-Fahrzeug-Entitäten erweitern,
**damit** Epic 3 Stories auf einer stabilen Datenbankstruktur aufbauen können.

---

## Acceptance Criteria

### AC1: EinsatzFahrzeug Entity definiert

**Given** das Epic-2-Schema existiert (StammFahrzeug, Fahrzeugtyp, FunkStatusConfig)
**When** ich die Epic-3-Entity hinzufüge
**Then** existiert folgendes Model mit Audit-Trail:

```prisma
model EinsatzFahrzeug {
  id             String   @id @default(cuid())
  einsatzId      String
  stammId        String?  // Nullable für temporäre Fahrzeuge
  funkrufname    String   @db.VarChar(50)
  kennzeichen    String?  @db.VarChar(20)
  fahrzeugtypId  String
  fmsStatus      Int      @default(0) // 0-9 per FunkStatusConfig
  position       Json?    @db.JsonB   // GeoPosition | null

  // Audit Trail
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String   @db.VarChar(100)
  updatedBy String?  @db.VarChar(100)

  // Relations + Indexes + Constraints + @@map("einsatz_fahrzeuge")
}
```

### AC2: Relations korrekt

**Given** die Entity ist definiert
**When** ich die Relations prüfe
**Then**:
- `stammId` → `StammFahrzeug.id` (nullable, `onDelete: SetNull`)
- `einsatzId` → `Einsatz.id` (`onDelete: Cascade`)
- `fahrzeugtypId` → `Fahrzeugtyp.id` (`onDelete: Restrict`)
- `createdBy` → `User.id` (`onDelete: NoAction`, `onUpdate: NoAction`)
- `updatedBy` → `User.id` (`onDelete: NoAction`, `onUpdate: NoAction`)

### AC3: Unique Constraint für Duplikat-Validierung

**Given** die Entity ist definiert
**When** ich die Constraints prüfe
**Then** existiert `@@unique([einsatzId, funkrufname])` zur Verhinderung doppelter Funkrufnamen pro Einsatz

### AC4: Migration erstellt

**Given** das Schema ist erweitert
**When** ich `prisma migrate dev --name add_einsatz_fahrzeuge` ausführe
**Then** wird Migration erfolgreich erstellt und angewendet

---

## Tasks / Subtasks

- [x] **Task 1: Prisma Schema erweitern** (AC: 1, 2, 3)
  - [x] 1.1 EinsatzFahrzeug Model in schema.prisma hinzufügen
  - [x] 1.2 Relations zu Einsatz, StammFahrzeug, Fahrzeugtyp, User definieren
  - [x] 1.3 Unique Constraint `[einsatzId, funkrufname]` definieren
  - [x] 1.4 Inverse Relations in bestehenden Models ergänzen
  - [x] 1.5 Indexes für Performance definieren

- [x] **Task 2: Migration erstellen** (AC: 4)
  - [x] 2.1 `pnpm --filter @bluelight-hub/backend exec prisma migrate dev --name add_einsatz_fahrzeuge`
  - [x] 2.2 Migration SQL validieren
  - [x] 2.3 `pnpm --filter @bluelight-hub/backend exec prisma validate`

- [x] **Task 3: API-Client regenerieren**
  - [x] 3.1 `pnpm run generate-api`

---

## Dev Notes

### Stammdaten vs. Einsatzdaten (KRITISCH)

| Aspekt | StammFahrzeug | EinsatzFahrzeug |
|--------|---------------|-----------------|
| **Lebenszyklus** | Persistent (org-weit) | Snapshot (einsatz-gebunden) |
| **Verwaltung** | Admin | Automatisch bei Erfassung |
| **Löschung** | Archive-Pattern (`archivedAt`) | Cascade-Delete mit Einsatz |
| **Daten** | Live-Referenz | KOPIE zum Erfassungszeitpunkt |
| **stammId** | - | Rückverfolgbarkeit, NICHT Live-Referenz |

**MERKE:** `funkrufname`, `kennzeichen` werden KOPIERT, nicht referenziert!

### FMS-Status (Funk-Melde-System)

| Code | Label | Farbe | Alarmierbar |
|------|-------|-------|-------------|
| 0 | Nicht einsatzbereit | Grau | Nein |
| 1 | Einsatzbereit auf Wache | Grau | Ja |
| 2 | Einsatzbereit | Grün | Ja |
| 3 | Ausgerückt | Blau | Nein |
| 4 | Am Einsatzort | Gelb | Nein |
| 5 | Sprechwunsch | Orange | Nein |
| 6 | Außer Dienst | Grau | Nein |
| 7-9 | Regional konfigurierbar | Lila | Konfigurierbar |

**Validierung (PFLICHT für Story 3.1):**
```typescript
if (fmsStatus < 0 || fmsStatus > 9) {
  return Result.fail(EINSATZ_FAHRZEUG_ERRORS.INVALID_FMS_STATUS);
}
```

### GeoPosition Type-Definition

```typescript
// packages/backend/src/domain/kraefte/value-objects/geo-position.vo.ts
export interface GeoPosition {
  lat: number;  // Latitude (-90 to 90)
  lng: number;  // Longitude (-180 to 180)
}
```

### Nullable stammId für temporäre Fahrzeuge

```typescript
// Stammdaten-Fahrzeug (Story 3.1)
{ stammId: "clp123...", funkrufname: "Rotkreuz 83/1" }

// Temporäres Fahrzeug (Story 3.2)
{ stammId: null, funkrufname: "FF Musterstadt" }
```

---

## Prisma Schema Pattern (KOPIERVORLAGE)

```prisma
/// Einsatz-Fahrzeug: Snapshot eines Fahrzeugs im Einsatz-Kontext
/// - stammId nullable für spontane/temporäre Fahrzeuge
/// - funkrufname, kennzeichen werden KOPIERT (nicht live referenziert)
/// - Cascade-Delete mit Einsatz
model EinsatzFahrzeug {
  id             String   @id @default(cuid())
  einsatzId      String   @map("einsatz_id")
  stammId        String?  @map("stamm_id")
  funkrufname    String   @db.VarChar(50)
  kennzeichen    String?  @db.VarChar(20)
  fahrzeugtypId  String   @map("fahrzeugtyp_id")
  fmsStatus      Int      @default(0) @map("fms_status")
  position       Json?    @db.JsonB

  // Audit Trail (PFLICHT)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  createdBy String   @db.VarChar(100) @map("created_by")
  updatedBy String?  @db.VarChar(100) @map("updated_by")

  // Relations (Naming Pattern: "CreatedBy<Entity>" / "UpdatedBy<Entity>")
  einsatz       Einsatz        @relation(fields: [einsatzId], references: [id], onDelete: Cascade)
  stamm         StammFahrzeug? @relation(fields: [stammId], references: [id], onDelete: SetNull)
  fahrzeugtyp   Fahrzeugtyp    @relation(fields: [fahrzeugtypId], references: [id], onDelete: Restrict)
  createdByUser User           @relation("CreatedByEinsatzFahrzeug", fields: [createdBy], references: [id], onDelete: NoAction, onUpdate: NoAction)
  updatedByUser User?          @relation("UpdatedByEinsatzFahrzeug", fields: [updatedBy], references: [id], onDelete: NoAction, onUpdate: NoAction)

  // Constraints
  @@unique([einsatzId, funkrufname], name: "einsatz_fahrzeug_einsatz_funkrufname_unique")

  // Indexes
  @@index([einsatzId])
  @@index([stammId])
  @@index([fmsStatus])
  @@index([fahrzeugtypId])
  @@index([einsatzId, fmsStatus])
  @@index([createdBy])
  @@map("einsatz_fahrzeuge")
}
```

### Inverse Relations ergänzen

```prisma
// In model Einsatz ergänzen:
einsatzFahrzeuge EinsatzFahrzeug[]

// In model StammFahrzeug ergänzen:
einsatzFahrzeuge EinsatzFahrzeug[]

// In model Fahrzeugtyp ergänzen:
einsatzFahrzeuge EinsatzFahrzeug[]

// In model User ergänzen:
einsatzFahrzeugeCreated EinsatzFahrzeug[] @relation("CreatedByEinsatzFahrzeug")
einsatzFahrzeugeUpdated EinsatzFahrzeug[] @relation("UpdatedByEinsatzFahrzeug")
```

---

## Previous Story Intelligence (Epic 2 Learnings)

### Checklist für Story 3.1+ (MUST CHECK)

- [ ] **DI Token Export:** Nur `KRAEFTE_REPOSITORIES.*` Symbols exportieren, NICHT konkrete Classes
- [ ] **NULL → undefined Mapper:** `(entity.field as T | null) ?? undefined` für: `stammId`, `kennzeichen`, `position`, `updatedBy`
- [ ] **biome-ignore:** Bei DI Imports verwenden: `// biome-ignore lint/style/useImportType: Required for NestJS DI at runtime`
- [ ] **Kein Archive-Pattern:** EinsatzFahrzeug nutzt Cascade-Delete (NICHT `archivedAt`)
- [ ] **fmsStatus Validierung:** 0-9 Range-Check im Domain Aggregate
- [ ] **Eager Loading:** `findAll()` muss fahrzeugtyp + stamm includen (N+1 Prevention)

---

## Technical Requirements

### Naming Conventions
| Typ | Convention | Beispiel |
|-----|------------|----------|
| Table | snake_case, Deutsch, Plural | `einsatz_fahrzeuge` |
| Model | PascalCase | `EinsatzFahrzeug` |
| Fields | camelCase, Deutsch | `funkrufname`, `kennzeichen` |
| Column Mapping | snake_case | `@map("einsatz_id")` |

### Field Sizes (VarChar)
| Size | Verwendung |
|------|------------|
| `@db.VarChar(20)` | Codes, Kennzeichen |
| `@db.VarChar(50)` | Funkrufname |
| `@db.VarChar(100)` | User IDs, längere Namen |

### Audit Trail (PFLICHT)
```prisma
createdAt DateTime @default(now()) @map("created_at")
updatedAt DateTime @updatedAt @map("updated_at")
createdBy String   @db.VarChar(100) @map("created_by")  // + onDelete: NoAction
updatedBy String?  @db.VarChar(100) @map("updated_by")  // + onDelete: NoAction
```

### Index Strategy
| Index | Zweck |
|-------|-------|
| `[einsatzId]` | Filter by mission |
| `[fmsStatus]` | Dashboard: Status-Übersicht |
| `[einsatzId, fmsStatus]` | Dashboard: Mission + Status |
| `[stammId]` | Traceability to master data |
| `[fahrzeugtypId]` | Stärke-Berechnung |
| `[createdBy]` | Audit queries |

---

## Architecture Compliance

### AC3: Framework-Agnostizität (für Stories 3.1-3.3)
- Application Layer: NUR `@Injectable`, `@Inject`, `@Optional`
- KEINE HTTP-Konzepte (`HttpException`, `Response`)
- Result<T> Pattern für Business-Fehler

### AC5: Transactional Outbox (für Stories 3.1-3.3)
- `TransactionalCommandHandler` für atomare Event-Persistierung
- Events: `FahrzeugErfasst`, `FahrzeugStatusGeaendert`
- ETB-Auto-Creation über Event-Handler

---

## Testing Requirements

### Schema Validation (Story 3.0)
```bash
pnpm --filter @bluelight-hub/backend exec prisma validate
pnpm --filter @bluelight-hub/backend exec prisma migrate dev --name add_einsatz_fahrzeuge
pnpm run generate-api
```

### Manuelle Tests
1. Migration läuft ohne Fehler durch
2. Prisma Studio zeigt neue Tabelle `einsatz_fahrzeuge`
3. Relations sind korrekt (FK-Constraints)
4. Unique Constraint verhindert doppelte Funkrufnamen pro Einsatz

---

## Project Structure Notes

| Typ | Pfad |
|-----|------|
| Schema | `packages/backend/prisma/schema.prisma` |
| Migrations | `packages/backend/prisma/migrations/` |
| Domain (3.1+) | `packages/backend/src/domain/kraefte/aggregates/einsatz-fahrzeug.aggregate.ts` |
| Repository (3.1+) | `packages/backend/src/domain/kraefte/repositories/i-einsatz-fahrzeug.repository.ts` |
| GeoPosition VO | `packages/backend/src/domain/kraefte/value-objects/geo-position.vo.ts` |

---

## References

- [Source: docs/epics.md#Epic-3-Story-3.0]
- [Source: packages/backend/prisma/schema.prisma#StammFahrzeug]
- [Source: packages/backend/prisma/schema.prisma#FunkStatusConfig]
- [Source: docs/sprint-artifacts/epic-2-retro-2025-12-16.md#Learnings]

---

## Dev Agent Record

### Context Reference
- Epic: 3 - Fahrzeug-Einsatz-Verwaltung
- Story Key: 3-0-prisma-schema-einsatz-fahrzeuge
- Dependencies: Epic 1 (Fahrzeugtyp, FunkStatusConfig), Epic 2 (StammFahrzeug)

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101) - Scrum Master Agent (Bob)
Claude Opus 4.5 (claude-opus-4-5-20251101) - Developer Agent (Amelia)

### Completion Notes List
- Story generated via *create-story workflow with parallel subagents
- Validated via *validate-create-story with 4 parallel analysis agents
- Applied 9 improvements (2 critical, 4 enhancements, 3 optimizations)
- **[2025-12-17] Implementation completed:**
  - EinsatzFahrzeug model added to Prisma schema with all fields per AC1
  - Relations defined: Einsatz (Cascade), StammFahrzeug (SetNull), Fahrzeugtyp (Restrict), User (NoAction) per AC2
  - Unique constraint `[einsatzId, funkrufname]` added per AC3
  - Inverse relations added to: User, Einsatz, StammFahrzeug, Fahrzeugtyp
  - 6 indexes added for performance (einsatzId, stammId, fmsStatus, fahrzeugtypId, composite, createdBy)
  - Migration `20251217075553_add_einsatz_fahrzeuge` created and applied per AC4
  - API client regenerated
- **[2025-12-17] Code Review Fixes (Amelia):**
  - Fixed naming convention: `createdByUser`/`updatedByUser` → `creator`/`updater` (consistency with StammFahrzeug/Einsatz)
  - Fixed relation names: `CreatedByEinsatzFahrzeug` → `EinsatzFahrzeugCreator`
  - Updated User inverse relations: `einsatzFahrzeugeCreated` → `createdEinsatzFahrzeuge`
  - Added composite performance index: `@@index([einsatzId, fahrzeugtypId])` for Admin-UI filter queries
  - Total indexes now: 7 (was 6)
  - Prisma validate: ✅ passed

### File List
- `packages/backend/prisma/schema.prisma` (MODIFY)
- `packages/backend/prisma/migrations/20251217075553_add_einsatz_fahrzeuge/migration.sql` (CREATE)

### Change Log
- **2025-12-17:** Story 3.0 implemented - EinsatzFahrzeug Prisma schema with migration
- **2025-12-17:** Code Review completed - Fixed naming conventions + added performance index
