# Story 5.0: Prisma Schema für Rollenbesetzung

Status: ready-for-dev

## Story

Als Entwickler,
möchte ich das Prisma Schema für die Rollenbesetzungs-Entität erweitern,
damit Epic 5 Stories auf einer stabilen Datenbankstruktur aufbauen können.

## Acceptance Criteria

### AC1: Rollenbesetzung-Entity definiert

**Given** das Epic-4-Schema existiert
**When** ich die Epic-5-Entity hinzufüge
**Then** existiert folgendes Model mit Audit-Trail:
- `EinsatzRollenbesetzung` (einsatzId FK, rollenDefinitionId FK, personId FK)

### AC2: UNIQUE Constraint (aus Epic 0 S0.2)

**Given** die Entity ist definiert
**When** ich die Constraints prüfe
**Then** existiert `@@unique([einsatzId, rollenDefinitionId])` (verhindert doppelte Besetzung)

### AC3: Migration erstellt

**Given** das Schema ist erweitert
**When** ich `prisma migrate dev` ausführe
**Then** wird Migration `add_rollenbesetzung` erfolgreich erstellt

## Tasks / Subtasks

### Task 1: Domain Model Vorbereitung (AC: 1, 2)

- [ ] **1.1 Epic 4 Schema Review** - Prüfe bestehende Entities als Foundation
  - Verifiziere `EinsatzPerson` Entity (Epic 4)
  - Verifiziere `RollenDefinition` Entity (Epic 1)
  - Bestätige M:N Pattern aus `EinsatzPersonQualifikation` als Vorlage

- [ ] **1.2 Value Object IDs planen** - Definiere benötigte Value Objects
  - `RollenBesetzungId` nach CUID2 Pattern
  - FK References: `EinsatzId`, `PersonId`, `RollenDefinitionId`
  - Alle IDs nutzen bestehende VO-Pattern aus `domain/kraefte/value-objects/`

### Task 2: Prisma Schema Extension (AC: 1, 2, 3)

- [ ] **2.1 Model Definition** - Erstelle `EinsatzRollenbesetzung` in `packages/backend/prisma/schema.prisma`
  ```prisma
  model EinsatzRollenbesetzung {
    id                    String            @id @default(cuid())
    einsatzId             String
    rollenDefinitionId    String
    personId              String

    // Audit Trail (PFLICHT gemäß Architecture)
    createdAt             DateTime          @default(now())
    createdBy             String
    updatedAt             DateTime          @updatedAt
    updatedBy             String

    // Relations
    einsatz               Einsatz           @relation(fields: [einsatzId], references: [id], onDelete: Cascade)
    rollenDefinition      RollenDefinition  @relation(fields: [rollenDefinitionId], references: [id], onDelete: Restrict)
    person                EinsatzPerson     @relation(fields: [personId], references: [id], onDelete: Restrict)

    // UNIQUE Constraint (AC2 - verhindert doppelte Besetzung)
    @@unique([einsatzId, rollenDefinitionId])
    @@index([einsatzId])
    @@index([personId])
    @@map("einsatz_rollen_besetzung")
  }
  ```

- [ ] **2.2 Inverse Relations** - Erweitere bestehende Models
  - `RollenDefinition`: `besetzungen EinsatzRollenbesetzung[]`
  - `EinsatzPerson`: `rollenBesetzungen EinsatzRollenbesetzung[]`
  - `Einsatz`: `rollenBesetzungen EinsatzRollenbesetzung[]`

- [ ] **2.3 Migration Generation** - Erstelle und teste Migration
  ```bash
  pnpm --filter @bluelight-hub/backend prisma migrate dev --name add_rollenbesetzung
  ```

- [ ] **2.4 Migration Verification** - Prüfe PostgreSQL Schema
  - Table `einsatz_rollen_besetzung` existiert
  - UNIQUE constraint auf `(einsatz_id, rollen_definition_id)`
  - Indexes auf `einsatz_id`, `person_id`
  - Foreign Keys: `ON DELETE CASCADE` (einsatz), `ON DELETE RESTRICT` (person, rolle)

### Task 3: Domain Layer Foundation (AC: 1)

- [ ] **3.1 RollenBesetzungId Value Object** - Erstelle in `domain/kraefte/value-objects/`
  ```typescript
  // packages/backend/src/domain/kraefte/value-objects/rollen-besetzung-id.ts
  export class RollenBesetzungId extends EntityId {
    private constructor(value: string) {
      super(value);
    }

    public static create(id?: string): Result<RollenBesetzungId> {
      if (!id) {
        return Result.ok(new RollenBesetzungId(createId()));
      }
      if (!isCuid(id)) {
        return Result.fail('RollenBesetzungId must be a valid CUID2');
      }
      return Result.ok(new RollenBesetzungId(id));
    }
  }
  ```

- [ ] **3.2 Error Codes** - Erstelle `domain/kraefte/common/rollen-besetzung-error-codes.ts`
  ```typescript
  export const ROLLEN_BESETZUNG_ERROR_CODES = {
    ROLLE_ALREADY_BESETZT: 'ROLLE_ALREADY_BESETZT',
    PERSON_NOT_FOUND: 'PERSON_NOT_FOUND',
    ROLLE_NOT_FOUND: 'ROLLE_NOT_FOUND',
    PERSON_NOT_QUALIFIED: 'PERSON_NOT_QUALIFIED',
    INVALID_EINSATZ_CONTEXT: 'INVALID_EINSATZ_CONTEXT',
  } as const;
  ```

- [ ] **3.3 Repository Interface** - Erstelle `domain/kraefte/repositories/i-rollen-besetzung.repository.ts`
  ```typescript
  export interface IRollenBesetzungRepository {
    save(aggregate: RollenBesetzung, tx?: TransactionContext): Promise<Result<void>>;
    findById(id: RollenBesetzungId, tx?: TransactionContext): Promise<Result<RollenBesetzung | null>>;
    findByEinsatzId(einsatzId: EinsatzId, tx?: TransactionContext): Promise<Result<RollenBesetzung[]>>;
    findByEinsatzIdAndRolleId(
      einsatzId: EinsatzId,
      rolleId: RollenDefinitionId,
      tx?: TransactionContext
    ): Promise<Result<RollenBesetzung | null>>;
    delete(id: RollenBesetzungId, tx?: TransactionContext): Promise<Result<void>>;
  }
  ```

### Task 4: Infrastructure Layer Preparation (AC: 3)

- [ ] **4.1 DI Token Registration** - Erweitere `infrastructure/di-tokens.ts`
  ```typescript
  export const DI_TOKENS = {
    REPOSITORIES: {
      KRAEFTE: {
        ROLLEN_BESETZUNG: Symbol('IRollenBesetzungRepository'),
        // ... existing tokens
      }
    }
  } as const;
  ```

- [ ] **4.2 Mapper Skeleton** - Erstelle `infrastructure/kraefte/mappers/prisma-rollen-besetzung.mapper.ts`
  - `toDomain(entity: PrismaRollenBesetzung): Result<RollenBesetzung>`
  - `toPersistence(aggregate: RollenBesetzung): PrismaRollenBesetzungCreateInput`
  - undefined/null Mapping Pattern anwenden (siehe Dev Notes)

- [ ] **4.3 Repository Skeleton** - Erstelle `infrastructure/kraefte/repositories/prisma-rollen-besetzung.repository.ts`
  - Implements `IRollenBesetzungRepository`
  - Transaction context support
  - P2002 (Unique Constraint) error handling
  - P2003 (FK Constraint) error handling

### Task 5: Testing Foundation (AC: 1, 2, 3)

- [ ] **5.1 Integration Test** - Schema verification
  ```typescript
  // packages/backend/src/infrastructure/kraefte/__tests__/prisma-schema-rollenbesetzung.integration.spec.ts
  describe('Prisma Schema - RollenBesetzung', () => {
    it('AC2: should enforce unique constraint on (einsatzId, rollenDefinitionId)', async () => {
      // Given
      const firstBesetzung = await prisma.einsatzRollenbesetzung.create({...});

      // When/Then
      await expect(
        prisma.einsatzRollenbesetzung.create({
          data: {
            einsatzId: firstBesetzung.einsatzId,
            rollenDefinitionId: firstBesetzung.rollenDefinitionId,
            personId: 'different-person',
            createdBy: 'test',
            updatedBy: 'test',
          }
        })
      ).rejects.toThrow(); // P2002 Unique constraint violation
    });

    it('AC1: should cascade delete when Einsatz is deleted', async () => {
      // Test CASCADE behavior
    });

    it('AC1: should restrict delete when RollenDefinition has besetzungen', async () => {
      // Test RESTRICT behavior
    });
  });
  ```

- [ ] **5.2 Value Object Tests** - `RollenBesetzungId.spec.ts`
  - Valid CUID2 creation
  - Invalid ID rejection
  - Auto-generation without parameter

### Task 6: Documentation & Validation (AC: 1, 2, 3)

- [ ] **6.1 Architecture Compliance Check** - Verifiziere gegen Architecture Rules
  - ✅ Audit Trail (createdAt, createdBy, updatedAt, updatedBy)
  - ✅ onDelete: Cascade für Einsatz (kein Datenverlust)
  - ✅ onDelete: Restrict für RollenDefinition/Person (verhindert inkonsistente Daten)
  - ✅ UNIQUE Constraint (AC2 Requirement)
  - ✅ Indexes auf häufige Query-Felder

- [ ] **6.2 Epic 0 Story 0.2 Pattern Compliance** - Verifiziere UNIQUE Constraint Pattern
  - Prüfe gegen `docs/sprint-artifacts/0-2-unique-constraint-rollenbesetzung.md`
  - UNIQUE constraint verhindert doppelte Besetzung (1:1 zwischen Rolle und Person im Einsatz)

- [ ] **6.3 Prisma Validate** - Prüfe Schema-Konsistenz
  ```bash
  pnpm --filter @bluelight-hub/backend exec prisma validate
  ```

## Dev Notes

### Technical Specifications

**Prisma ORM:**
- Version: 5.22.0 (aus `packages/backend/package.json`)
- Migration Command: `pnpm --filter @bluelight-hub/backend prisma migrate dev`
- Type Generation: Automatic via `prisma generate` (post-install hook)
- Generated Types Location: `node_modules/.prisma/client/`

**Database:**
- PostgreSQL 17 (Docker Container, Port 3092)
- Connection: `DATABASE_URL` in `/Users/rubeen/dev/personal/bluelight-hub/packages/backend/.env`
- Schema: Default (keine Multi-Schema für Kräfte)
- Migration Files: `/Users/rubeen/dev/personal/bluelight-hub/packages/backend/prisma/migrations/`

**Breaking Changes zu beachten:**
- Prisma 5.x: `Decimal` statt `Float` für präzise Zahlen
- JSON Fields: Typed als `Prisma.JsonValue` (affects DTO mapping)
- Migration Guide: https://www.prisma.io/docs/guides/upgrade-guides/upgrading-versions

**Post-Migration Steps:**
```bash
# 1. Generate Prisma Client Types
pnpm --filter @bluelight-hub/backend exec prisma generate

# 2. Verify TypeScript Compilation
pnpm --filter @bluelight-hub/backend exec tsc --noEmit

# 3. Regenerate API Client (für Story 5.2 DTOs)
pnpm run generate-api

# 4. Run Integration Tests
pnpm --filter @bluelight-hub/backend test:e2e
```

### Architecture Patterns & Constraints

**Foundation Requirements:**

**Hexagonale Architektur (docs/adr/0001-hexagonal-architecture.md):**
1. **§3.1 Entity Lifecycle Pattern:**
   - Domain Entities sind framework-agnostic (keine Prisma/NestJS Imports)
   - Value Objects immutable mit `Result<T>` Pattern
   - Aggregates verwalten Domain Events

2. **§4.2 Database Independence:**
   - Repositories nutzen Transaction Context (`TransactionContext`)
   - Mapper trennen Persistence-Model von Domain-Model
   - Infrastructure Layer: Prisma Repositories + Mappers

3. **Application Layer Constraints (docs/adr/0001-hexagonal-architecture.md §5.1):**
   - Nur `@Injectable`, `@Inject`, `@Optional` erlaubt
   - KEINE NestJS HTTP-Decorators (`@Controller`, `@Get`, etc.)
   - KEINE Framework-Exceptions (`HttpException`, `BadRequestException`)

2. **CQRS Pattern**
   - Commands für Write Operations (Story 5.1: BesetzeRolle, Story 5.2: GibRolleFrei)
   - Queries für Read Operations (GetRollenBesetzung)
   - TransactionalCommandHandler Base Class für alle Commands

3. **Outbox Pattern für Domain Events**
   - Events NIEMALS direkt emittieren
   - Atomic Persistierung: Aggregate + Events in gleicher Transaktion
   - Return Type: `{ result: T; events: DomainEvent[] }` (NICHT Result-Wrapper!)

4. **DI Token Constants (AC2 Rule)**
   - Constants in `infrastructure/di-tokens.ts` als Symbols
   - NIEMALS inline String-Literals: ❌ `@Inject('IRollenBesetzungRepository')`
   - IMMER Symbols: ✅ `@Inject(DI_TOKENS.REPOSITORIES.KRAEFTE.ROLLEN_BESETZUNG)`

5. **Daten-Patterns**
   - NO-DELETE Policy für Einsätze (CASCADE sorgt für automatisches Aufräumen)
   - Audit Trail PFLICHT auf ALLEN Entities
   - Stammdaten vs. Einsatzdaten Trennung (stammId als nullable Referenz)

**Prisma Schema Conventions:**

```prisma
// PFLICHT: Audit Trail
createdAt    DateTime   @default(now())
createdBy    String
updatedAt    DateTime   @updatedAt
updatedBy    String

// PFLICHT: onDelete Behavior
@relation(fields: [einsatzId], references: [id], onDelete: Cascade)
@relation(fields: [rollenDefinitionId], references: [id], onDelete: Restrict)
@relation(fields: [personId], references: [id], onDelete: Restrict)

// PFLICHT: Indexes für Performance
@@index([einsatzId])
@@index([personId])

// PFLICHT: UNIQUE Constraint (AC2)
@@unique([einsatzId, rollenDefinitionId])

// PFLICHT: snake_case Tabellennamen
@@map("einsatz_rollen_besetzung")
```

**API Design (für spätere Stories):**

- OpenAPI Decorators PFLICHT: `@ApiTags`, `@ApiOperation`, `@ApiCreatedResponse`
- class-validator + `@ApiProperty` auf DTOs
- API-Client generieren nach Backend-Änderungen: `pnpm run generate-api`
- Response Wrapping via Interceptor: `{ data, statusCode, timestamp }`

**Security:**

- `JwtAuthGuard` für Einsatz-Kräfte Endpoints
- `AdminJwtAuthGuard` für Admin Stammdaten Endpoints
- RBAC: USER (Kräfte erfassen), ADMIN (Stammdaten)

### Epic 4 Learnings & Patterns (CRITICAL!)

**📋 Pattern Analysis von Subagent a66beee:**

#### 1. Two Factories Pattern (NICHT relevant für Story 5-0)

Story 5-0 erstellt nur Schema - keine Factories. **Relevant für Story 5.1** (BesetzeRolle Command Handler).

#### 2. Snapshot Pattern (WICHTIG für Rollenbesetzung!)

**Pattern:** Wenn Entity Daten aus Master Data nutzt, KOPIERE Felder, keine Live-Referenzen.

```typescript
// FUTURE (Story 5.1): RollenBesetzung Aggregate
// Wird benötigt: Qualifikations-Requirements aus RollenDefinition KOPIEREN
{
  rollenDefinitionId: rolle.id,  // ID für Referenz
  rollenName: rolle.name,        // KOPIE für historische Korrektheit
  requiredQualifikationen: rolle.qualifikationen.map(...),  // KOPIE (Array)
}
```

**Why:** Änderungen an RollenDefinition (z.B. Qualifikations-Requirements) dürfen NICHT bestehende Besetzungen ändern.

#### 3. Idempotency in Domain Methods (WICHTIG für Story 5.1!)

**Pattern:** Business methods prüfen Idempotenz VOR State-Mutation.

```typescript
// FUTURE (Story 5.1): BesetzeRolle Handler
besetzeMitPerson(personId: PersonId): Result<void> {
  // Idempotency check FIRST
  if (this._personId === personId) {
    return Result.ok<void>(undefined);  // No event, no mutation
  }

  // Only if changed: mutate + emit
  this._personId = personId;
  this.addDomainEvent(new RolleBesetzt(...));
  return Result.ok<void>(undefined);
}
```

**For Story 5-0:** Schema allein braucht das nicht, aber Command Handler in 5.1 MUSS das implementieren.

#### 4. Value Object Pattern - Error Codes (TASK 3.2)

```typescript
// BEREITS IN TASK 3.2 eingeplant
export const ROLLEN_BESETZUNG_ERROR_CODES = {
  ROLLE_ALREADY_BESETZT: 'ROLLE_ALREADY_BESETZT',
  PERSON_NOT_QUALIFIED: 'PERSON_NOT_QUALIFIED',
  // ...
} as const;
```

#### 5. Mapper Pattern - undefined vs null (TASK 4.2)

**CRITICAL:** Domain nutzt `undefined`, Prisma nutzt `null`.

```typescript
// toDomain: null → undefined
toDomain(entity: PrismaRollenBesetzung): Result<RollenBesetzung> {
  return Result.ok(new RollenBesetzung({
    id: RollenBesetzungId.create(entity.id).value!,
    // Optional fields: Convert null → undefined
    notesOptional: (entity.notes as string | null) ?? undefined,
  }));
}

// toPersistence: undefined → null
toPersistence(aggregate: RollenBesetzung) {
  return {
    id: aggregate.id.value,
    // Optional fields: Convert undefined → null
    notes: aggregate.notesOptional ?? null,
  };
}
```

**Epic 4 Debt:** Pattern 6x dupliziert → Consider utility function (siehe Tech Debt).

### Domain Entity Compatibility & Mapper Requirements

**CRITICAL: Schema muss mit bestehenden Domain Entities aligned sein!**

Diese Story erweitert das Prisma-Schema, aber Story 5.1 wird Domain Entities erstellen, die mit diesem Schema kompatibel sein müssen. Folgende bestehende Domain-Strukturen MÜSSEN beachtet werden:

#### Bestehende Domain Entities (NICHT ändern!)

**Person Entity (`packages/backend/src/domain/kraefte/entities/person.entity.ts`):**
```typescript
// Existierende Implementation nutzt:
- PersonId (CUID2 Value Object)
- Vorname, Nachname (validated strings)
- Dienstgrad (enumeration)
- Qualifikationen (Set<Qualifikation>)
```

**RollenDefinition Entity (`packages/backend/src/domain/admin/entities/rollen-definition.entity.ts`):**
```typescript
// Existierende Implementation nutzt:
- RollenDefinitionId (CUID2 Value Object)
- Name (validated string)
- RequiredQualifikationen (Qualifikation[])
- Beschreibung (optional string)
```

#### Mapper Requirements für Story 5.1

**File:** `packages/backend/src/infrastructure/kraefte/mappers/prisma-rollen-besetzung.mapper.ts`

```typescript
export class PrismaRollenBesetzungMapper {
  /**
   * Konvertiert Prisma Entity → Domain Aggregate
   *
   * WICHTIG:
   * - null → undefined für optionale Felder
   * - String IDs → Value Objects (PersonId, RollenDefinitionId)
   * - Prisma Relations → Domain Entity References
   */
  static toDomain(
    entity: PrismaEinsatzRollenbesetzung
  ): Result<RollenBesetzung> {
    // Value Object Instantiation
    const idResult = RollenBesetzungId.create(entity.id);
    const personIdResult = PersonId.create(entity.personId);
    const rollenDefIdResult = RollenDefinitionId.create(entity.rollenDefinitionId);
    const einsatzIdResult = EinsatzId.create(entity.einsatzId);

    // Combine Results (fail-fast pattern)
    if (idResult.isFailure) return Result.fail(idResult.error);
    if (personIdResult.isFailure) return Result.fail(personIdResult.error);
    // ... etc

    return RollenBesetzung.reconstitute({
      id: idResult.value,
      personId: personIdResult.value,
      rollenDefinitionId: rollenDefIdResult.value,
      einsatzId: einsatzIdResult.value,
      // Audit Trail
      createdAt: entity.createdAt,
      createdBy: entity.createdBy,
      updatedAt: entity.updatedAt,
      updatedBy: entity.updatedBy,
    });
  }

  /**
   * Konvertiert Domain Aggregate → Prisma Create Input
   *
   * WICHTIG:
   * - undefined → null für Prisma
   * - Value Objects → String IDs
   */
  static toPersistence(
    aggregate: RollenBesetzung
  ): Prisma.EinsatzRollenbesetzungCreateInput {
    return {
      id: aggregate.id.value,
      personId: aggregate.personId.value,
      rollenDefinitionId: aggregate.rollenDefinitionId.value,
      einsatzId: aggregate.einsatzId.value,
      // Audit Trail
      createdBy: aggregate.createdBy,
      updatedBy: aggregate.updatedBy,
      // Optional fields: undefined → null
      notesOptional: aggregate.notes ?? null,
    };
  }
}
```

#### Validation Alignment

**Schema Constraint → Domain Validation:**
- Prisma: `@@unique([einsatzId, rollenDefinitionId])`
- Domain: `RollenBesetzung.besetzeRolle()` prüft Duplikate vor Persistierung
- Repository: Wirft Domain Error bei P2002 (Unique Constraint Violation)

**Error Mapping (P2002 → Domain Error):**
```typescript
// In PrismaRollenBesetzungRepository.save()
try {
  await prisma.einsatzRollenbesetzung.create({ data });
} catch (error) {
  if (isPrismaError(error, 'P2002')) {
    return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_ALREADY_BESETZT);
  }
  throw error; // Programming error
}
```

### Breaking Change Analysis & Migration Strategy

**CRITICAL: Story 5.0 legt Schema-Foundation - Breaking Changes kommen in Story 5.2 (API)!**

#### Current State (vor Story 5.0)

**Keine direkten Breaking Changes in Story 5.0:**
- Story 5.0 erstellt NEUE Tabelle `einsatz_rollen_besetzung`
- Bestehende Tabellen NICHT geändert
- Keine API-Changes (API kommt erst in Story 5.2)

#### Future Breaking Changes (Story 5.2 API Implementation)

**Betroffene API Endpoints (werden in Story 5.2 erstellt):**

Story 5.2 wird folgende neue Endpoints einführen:
- `POST /api/einsatz/:einsatzId/rollen-besetzung` - Rolle besetzen
- `GET /api/einsatz/:einsatzId/rollen-besetzung` - Alle Besetzungen abrufen
- `DELETE /api/einsatz/:einsatzId/rollen-besetzung/:rollenDefId` - Rolle freigeben

**Migration Strategy für Story 5.2:**

```typescript
// Step 1: Neue DTOs erstellen (Story 5.2)
export class RollenBesetzungDto {
  @ApiProperty({ description: 'CUID2 der Rollenbesetzung' })
  id: string;

  @ApiProperty({ description: 'Einsatz-ID' })
  einsatzId: string;

  @ApiProperty({ description: 'RollenDefinition-ID' })
  rollenDefinitionId: string;

  @ApiProperty({ description: 'Person-ID' })
  personId: string;

  @ApiProperty({ description: 'Audit Trail' })
  createdAt: string;
  createdBy: string;
}

// Step 2: Backward Compatible API Response
export class EinsatzDetailDto {
  // Existing fields
  id: string;
  nummer: string;
  // ...

  // NEW (Story 5.2): Optional field for backward compatibility
  @ApiProperty({ required: false, type: [RollenBesetzungDto] })
  rollenBesetzungen?: RollenBesetzungDto[];
}
```

**API Client Regeneration (Story 5.2):**
```bash
# Nach API-Endpoint-Implementation in Story 5.2:
pnpm run generate-api

# Frontend Migration (Story 5.3):
# - Alte Mock-Daten durch API-Calls ersetzen
# - RollenBesetzung UI-Components aktualisieren
```

#### Database Migration Rollback

**Rollback Plan (falls Migration fehlschlägt):**

```bash
# Option 1: Prisma Migration Rollback (manuell)
cd packages/backend
pnpm exec prisma migrate resolve --rolled-back 20251223_add_rollenbesetzung

# Option 2: Manual SQL Rollback
psql $DATABASE_URL -c "DROP TABLE einsatz_rollen_besetzung CASCADE;"
```

**Data Backup (vor Migration):**
```bash
# Backup vor Migration erstellen
pg_dump $DATABASE_URL -t einsatz_person -t rollen_definition > backup_before_5-0.sql

# Bei Rollback-Bedarf:
psql $DATABASE_URL < backup_before_5-0.sql
```

**Rollback Testing:**
- Migration MUSS in Staging-Environment getestet werden
- Rollback-Procedure dokumentiert in `docs/backend-data-models/migration-rollback-procedures.md`

#### Impact Assessment

**Downstream Dependencies:**
- ✅ Story 5.1 (Domain Entities): Abhängig von Schema, keine Breaking Changes
- ✅ Story 5.2 (API): Neue Endpoints, keine Breaking Changes zu bestehenden APIs
- ✅ Story 5.3 (Frontend): Neue Features, keine Breaking Changes

**Kein Impact auf:**
- Bestehende Einsatz-APIs (Epic 3)
- Bestehende Kräfte-APIs (Epic 4)
- Bestehende Admin-APIs (Epic 1)

### Edge Cases & Business Rules Specification

**CRITICAL: Diese Business Rules MÜSSEN in Story 5.1 (Domain Entity) implementiert werden!**

#### 1. Uniqueness Constraints & Overlap Prevention

**Business Rule:** Eine Rolle kann im Einsatz nur EINMAL besetzt werden.

**Schema Enforcement:**
```prisma
@@unique([einsatzId, rollenDefinitionId])
```

**Domain Validation (Story 5.1):**
```typescript
// In RollenBesetzung.create() oder BesetzeRolleHandler
async besetzeRolle(
  einsatzId: EinsatzId,
  rollenDefId: RollenDefinitionId,
  personId: PersonId
): Promise<Result<void>> {
  // Check 1: Ist Rolle bereits besetzt?
  const existingBesetzung = await repository.findByEinsatzIdAndRolleId(
    einsatzId,
    rollenDefId
  );

  if (existingBesetzung.isSuccess && existingBesetzung.value !== null) {
    return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_ALREADY_BESETZT);
  }

  // Proceed with assignment...
}
```

**Error Handling:**
- Repository P2002 Error → `ROLLE_ALREADY_BESETZT`
- Domain Check → Fail before persistence (prevent unnecessary DB call)

#### 2. Referential Integrity & Cascade Behavior

**Cascade Delete (Einsatz):**
```prisma
einsatz Einsatz @relation(fields: [einsatzId], references: [id], onDelete: Cascade)
```
- **Scenario:** Einsatz wird gelöscht
- **Behavior:** Alle RollenBesetzungen für diesen Einsatz automatisch gelöscht
- **Rationale:** Einsatzdaten sind transient, keine historische Archivierung

**Restrict Delete (Person/RollenDefinition):**
```prisma
person EinsatzPerson @relation(fields: [personId], references: [id], onDelete: Restrict)
rollenDefinition RollenDefinition @relation(fields: [rollenDefinitionId], references: [id], onDelete: Restrict)
```
- **Scenario:** Person oder RollenDefinition soll gelöscht werden
- **Behavior:** Löschen wird verhindert, wenn aktive Besetzungen existieren
- **Error Handling (Story 5.1):**
  ```typescript
  // P2003 Foreign Key Constraint Violation
  if (isPrismaError(error, 'P2003')) {
    const fieldName = error.meta?.field_name;
    if (fieldName.includes('personId')) {
      return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_FOUND);
    }
    if (fieldName.includes('rollenDefinitionId')) {
      return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_NOT_FOUND);
    }
  }
  ```

#### 3. Qualifikations-Validierung (Story 5.1 Domain Rule)

**Business Rule:** Person muss ALLE required Qualifikationen der Rolle besitzen.

**Implementation (Story 5.1):**
```typescript
// In RollenBesetzung.create() oder BesetzeRolleHandler
const person = await personRepository.findById(personId);
const rollenDef = await rollenDefRepository.findById(rollenDefId);

// Check: Hat Person alle required Qualifikationen?
const hasAllQualifikationen = rollenDef.requiredQualifikationen.every(
  (requiredQual) => person.qualifikationen.has(requiredQual)
);

if (!hasAllQualifikationen) {
  return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_QUALIFIED);
}
```

**Edge Case:** Was wenn Person Qualifikation VERLIERT nach Besetzung?
- **Decision:** Besetzung bleibt gültig (historische Korrektheit)
- **Snapshot Pattern:** RollenBesetzung kopiert Qualifikations-Requirements bei Creation

#### 4. Concurrent Assignment Prevention

**Race Condition Scenario:**
- User A besetzt Rolle "Gruppenführer" mit Person X
- User B besetzt GLEICHZEITIG Rolle "Gruppenführer" mit Person Y
- Beide Requests kommen simultan an

**Prevention Strategy:**
```typescript
// Transaction + Database Constraint
async besetzeRolle(...): Promise<Result<void>> {
  return this.transactionService.execute(async (tx) => {
    // Domain check (optimistic)
    const existing = await repository.findByEinsatzIdAndRolleId(einsatzId, rollenDefId, tx);
    if (existing.value) {
      return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_ALREADY_BESETZT);
    }

    // Persist (database constraint as final guard)
    const result = await repository.save(besetzung, tx);
    // If P2002 despite check: transaction rollback, return error
    return result;
  });
}
```

**Multi-Layer Protection:**
1. Application Layer: Optimistic Check
2. Database Layer: UNIQUE Constraint (final guard)
3. Transaction Isolation: SERIALIZABLE (if needed)

#### 5. Invalid Einsatz Context

**Business Rule:** Rollenbesetzung nur für ACTIVE Einsätze erlaubt.

**Domain Validation (Story 5.1):**
```typescript
// In BesetzeRolleHandler
const einsatz = await einsatzRepository.findById(einsatzId);

if (!einsatz) {
  return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.EINSATZ_NOT_FOUND);
}

if (einsatz.status === EinsatzStatus.ABGESCHLOSSEN) {
  return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.INVALID_EINSATZ_CONTEXT);
}
```

**Edge Case:** Einsatz wird während Besetzung abgeschlossen?
- Transaction Isolation: BesetzeRolle-Transaction sperrt Einsatz-Row (FOR UPDATE)
- Alternative: Optimistic Locking mit `version` field

### Performance Optimization & Index Strategy

**Query Patterns & Index Requirements**

#### Most Frequent Queries (Expected Load)

**Query 1: Get all Besetzungen für Einsatz** (Dashboard View)
```sql
SELECT * FROM einsatz_rollen_besetzung
WHERE einsatz_id = ?
```
**Optimization:** `@@index([einsatzId])` (BEREITS in Task 2.1 Schema enthalten)
**Expected Frequency:** 1000+ requests/day
**Performance Target:** < 50ms (95th percentile)

**Query 2: Get specific Besetzung für Rolle** (Validation Check)
```sql
SELECT * FROM einsatz_rollen_besetzung
WHERE einsatz_id = ? AND rollen_definition_id = ?
```
**Optimization:** `@@unique([einsatzId, rollenDefinitionId])` creates implicit index
**Expected Frequency:** 500+ requests/day
**Performance Target:** < 20ms (database constraint check)

**Query 3: Get all Besetzungen für Person** (Person Detail View)
```sql
SELECT * FROM einsatz_rollen_besetzung
WHERE person_id = ?
```
**Optimization:** `@@index([personId])` (BEREITS in Task 2.1 Schema enthalten)
**Expected Frequency:** 200+ requests/day
**Performance Target:** < 50ms (95th percentile)

#### Index Strategy Verification

**Indexes in Schema (Task 2.1):**
```prisma
@@unique([einsatzId, rollenDefinitionId])  // ← Primary constraint + index
@@index([einsatzId])                       // ← Dashboard queries
@@index([personId])                        // ← Person detail queries
```

**Database Size Estimation:**
- Assumption: 100 Einsätze/year × 15 roles/Einsatz = 1,500 Besetzungen/year
- Historical data (5 years): ~7,500 records
- Index overhead: ~500 KB per B-tree index (3 indexes = 1.5 MB total)
- Table size: ~5 MB (with audit trail fields)

**Performance Monitoring:**
```sql
-- Check index usage (PostgreSQL)
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'einsatz_rollen_besetzung'
ORDER BY idx_scan DESC;

-- Slow query analysis
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%einsatz_rollen_besetzung%'
ORDER BY mean_exec_time DESC;
```

**Future Optimization (wenn Tabelle wächst):**
- Partitioning by year (bei > 100k records)
- Materialized View für Dashboard-Aggregation
- Redis-Cache für häufig abgerufene Einsatz-Besetzungen

### File Structure & Absolute Paths

**Primary Implementation Files (Story 5.0):**

```
/Users/rubeen/dev/personal/bluelight-hub/packages/backend/
├── prisma/
│   ├── schema.prisma                                                    # ← Task 2.1, 2.2: Model definition
│   └── migrations/
│       └── 20251223_add_rollenbesetzung/                               # ← Task 2.3: Generated migration
│           ├── migration.sql                                            # ← SQL DDL statements
│           └── migration_lock.toml                                      # ← Prisma lock file
│
├── src/
│   ├── domain/kraefte/
│   │   ├── value-objects/
│   │   │   └── rollen-besetzung-id.ts                                   # ← Task 3.1: CUID2 Value Object
│   │   ├── common/
│   │   │   └── rollen-besetzung-error-codes.ts                          # ← Task 3.2: Error Constants
│   │   └── repositories/
│   │       └── i-rollen-besetzung.repository.ts                         # ← Task 3.3: Repository Interface
│   │
│   ├── infrastructure/
│   │   ├── di-tokens.ts                                                 # ← Task 4.1: DI Token Registration
│   │   └── kraefte/
│   │       ├── mappers/
│   │       │   └── prisma-rollen-besetzung.mapper.ts                    # ← Task 4.2: Mapper (toDomain/toPersistence)
│   │       └── repositories/
│   │           └── prisma-rollen-besetzung.repository.ts                # ← Task 4.3: Repository Implementation
│   │
│   └── infrastructure/kraefte/__tests__/
│       └── prisma-schema-rollenbesetzung.integration.spec.ts            # ← Task 5.1: Integration Tests
│
└── node_modules/.prisma/client/                                         # ← Generated Prisma Client (auto)
    ├── index.d.ts                                                       # ← TypeScript types
    └── index.js                                                         # ← Runtime client
```

**Downstream Files (Story 5.1 - Domain Entities):**
```
/Users/rubeen/dev/personal/bluelight-hub/packages/backend/src/
├── domain/kraefte/
│   ├── aggregates/
│   │   └── rollen-besetzung.aggregate.ts                                # ← Story 5.1: Domain Aggregate
│   │   └── rollen-besetzung.aggregate.spec.ts                           # ← Story 5.1: Unit Tests
│   └── events/
│       ├── rolle-besetzt.event.ts                                       # ← Story 5.1: Domain Event
│       └── rolle-freigegeben.event.ts                                   # ← Story 5.1: Domain Event
│
├── application/kraefte/rollen-besetzung/
│   ├── commands/
│   │   ├── besetze-rolle.command.ts                                     # ← Story 5.1: Command
│   │   ├── besetze-rolle.handler.ts                                     # ← Story 5.1: Handler
│   │   └── besetze-rolle.handler.spec.ts                                # ← Story 5.1: Tests
│   └── queries/
│       ├── get-rollen-besetzung.query.ts                                # ← Story 5.1: Query
│       └── get-rollen-besetzung.handler.ts                              # ← Story 5.1: Handler
```

**Naming Conventions:**
- Files: kebab-case (`rollen-besetzung-id.ts`)
- Classes: PascalCase (`RollenBesetzungId`)
- Database: snake_case (`einsatz_rollen_besetzung`)
- Prisma Model: PascalCase (`EinsatzRollenbesetzung`)

**Migration File Naming:**
- Format: `YYYYMMDD_descriptive_name`
- Example: `20251223_add_rollenbesetzung`
- Auto-generated by: `prisma migrate dev --name add_rollenbesetzung`

### Enhanced Testing Requirements

**Integration Test Cases (Task 5.1 - ERWEITERT):**

```typescript
// File: packages/backend/src/infrastructure/kraefte/__tests__/prisma-schema-rollenbesetzung.integration.spec.ts

describe('Prisma Schema - RollenBesetzung Integration Tests', () => {
  let prisma: PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Setup test database with test data
  });

  describe('AC2: Unique Constraint Enforcement', () => {
    it('should enforce unique constraint on (einsatzId, rollenDefinitionId)', async () => {
      // Given
      const firstBesetzung = await prisma.einsatzRollenbesetzung.create({
        data: {
          id: createId(),
          einsatzId: 'einsatz_123',
          rollenDefinitionId: 'rolle_456',
          personId: 'person_789',
          createdBy: 'test',
          updatedBy: 'test',
        },
      });

      // When: Attempt duplicate assignment
      const duplicateAttempt = prisma.einsatzRollenbesetzung.create({
        data: {
          id: createId(),
          einsatzId: firstBesetzung.einsatzId,  // ← Same einsatz
          rollenDefinitionId: firstBesetzung.rollenDefinitionId,  // ← Same role
          personId: 'different_person_999',  // ← Different person
          createdBy: 'test',
          updatedBy: 'test',
        },
      });

      // Then
      await expect(duplicateAttempt).rejects.toThrow();  // P2002 Unique Constraint Violation
    });

    it('should allow same person in different roles', async () => {
      // Given
      const personId = 'person_123';
      const einsatzId = 'einsatz_456';

      // When
      const besetzung1 = await prisma.einsatzRollenbesetzung.create({
        data: {
          id: createId(),
          einsatzId,
          rollenDefinitionId: 'rolle_gruppenführer',
          personId,
          createdBy: 'test',
          updatedBy: 'test',
        },
      });

      const besetzung2 = await prisma.einsatzRollenbesetzung.create({
        data: {
          id: createId(),
          einsatzId,
          rollenDefinitionId: 'rolle_maschinist',  // ← Different role
          personId,  // ← Same person
          createdBy: 'test',
          updatedBy: 'test',
        },
      });

      // Then
      expect(besetzung1.id).toBeDefined();
      expect(besetzung2.id).toBeDefined();
      expect(besetzung1.personId).toBe(besetzung2.personId);
    });
  });

  describe('AC1: Cascade Delete Behavior', () => {
    it('should cascade delete besetzungen when Einsatz is deleted', async () => {
      // Given
      const einsatzId = 'einsatz_cascade_test';
      await prisma.einsatz.create({ data: { id: einsatzId, /* ... */ } });
      await prisma.einsatzRollenbesetzung.create({
        data: {
          id: createId(),
          einsatzId,
          rollenDefinitionId: 'rolle_123',
          personId: 'person_456',
          createdBy: 'test',
          updatedBy: 'test',
        },
      });

      // When
      await prisma.einsatz.delete({ where: { id: einsatzId } });

      // Then
      const besetzungen = await prisma.einsatzRollenbesetzung.findMany({
        where: { einsatzId },
      });
      expect(besetzungen).toHaveLength(0);  // ← Cascaded deletion
    });
  });

  describe('AC1: Restrict Delete Behavior', () => {
    it('should restrict delete when RollenDefinition has active besetzungen', async () => {
      // Given
      const rollenDefId = 'rolle_restrict_test';
      await prisma.rollenDefinition.create({ data: { id: rollenDefId, /* ... */ } });
      await prisma.einsatzRollenbesetzung.create({
        data: {
          id: createId(),
          einsatzId: 'einsatz_123',
          rollenDefinitionId: rollenDefId,
          personId: 'person_456',
          createdBy: 'test',
          updatedBy: 'test',
        },
      });

      // When/Then
      await expect(
        prisma.rollenDefinition.delete({ where: { id: rollenDefId } })
      ).rejects.toThrow();  // P2003 Foreign Key Constraint Violation
    });
  });

  describe('AC3: Migration Verification', () => {
    it('should have correct table name in database', async () => {
      // Query: Check table exists
      const result = await prisma.$queryRaw`
        SELECT table_name FROM information_schema.tables
        WHERE table_name = 'einsatz_rollen_besetzung'
      `;
      expect(result).toHaveLength(1);
    });

    it('should have correct indexes', async () => {
      // Query: Check indexes exist
      const indexes = await prisma.$queryRaw`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'einsatz_rollen_besetzung'
      `;
      expect(indexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ indexname: expect.stringContaining('einsatz_id') }),
          expect.objectContaining({ indexname: expect.stringContaining('person_id') }),
        ])
      );
    });
  });
});
```

**Value Object Tests (Task 5.2 - NEU):**

```typescript
// File: packages/backend/src/domain/kraefte/value-objects/rollen-besetzung-id.spec.ts

describe('RollenBesetzungId Value Object', () => {
  describe('create', () => {
    it('should create valid CUID2 without parameter', () => {
      // Given/When
      const result = RollenBesetzungId.create();

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toMatch(/^[a-z0-9]{24,32}$/);  // CUID2 format
    });

    it('should create with valid CUID2 parameter', () => {
      // Given
      const validCuid = createId();

      // When
      const result = RollenBesetzungId.create(validCuid);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe(validCuid);
    });

    it('should fail with invalid ID format', () => {
      // Given
      const invalidId = 'not-a-cuid-123';

      // When
      const result = RollenBesetzungId.create(invalidId);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('RollenBesetzungId must be a valid CUID2');
    });

    it('should fail with UUID format (common mistake)', () => {
      // Given
      const uuid = '123e4567-e89b-12d3-a456-426614174000';

      // When
      const result = RollenBesetzungId.create(uuid);

      // Then
      expect(result.isFailure).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for same CUID values', () => {
      // Given
      const id1 = RollenBesetzungId.create('cuid_test_123').value;
      const id2 = RollenBesetzungId.create('cuid_test_123').value;

      // When/Then
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different CUID values', () => {
      // Given
      const id1 = RollenBesetzungId.create().value;
      const id2 = RollenBesetzungId.create().value;

      // When/Then
      expect(id1.equals(id2)).toBe(false);
    });
  });
});
```

**Test Coverage Targets:**
- Value Objects: 100% (critical for domain integrity)
- Integration Tests: 90% (schema constraints, cascade behavior)
- Story 5.1 Domain Tests: 95% (business logic)
- Story 5.2 API Tests: 85% (controller layer)

### Epic 4 Learnings & Patterns (Continued)

**95% Pattern Compliance:** Epic 4 applied Epic 3 learnings almost perfectly:
- ✅ Snapshot-Pattern (100%)
- ✅ undefined vs null (100%)
- ✅ Fire-and-Forget ETB (100%)
- ✅ Domain Event Idempotency (100%)

**Tech Debt (Open):**
- ❌ DRY Violation (~75 lines validation duplication)
- ❌ NULL→undefined Mapper duplication (6x repeated)

**Review Overhead:** 35-45% of story time was code review (11 rounds total for Epic 4).

**Recurring Issues to AVOID:**
1. Logger Pattern Confusion (4x violations) - Use DI Port Injection: `@Inject(LOGGER)`
2. Memory Leak Awareness (5x violations) - useEffect ALWAYS with cleanup
3. Event Deserializer Registration (2x forgotten) - Use checklist!
4. AC7 Decorator Violations (3x) - Use @ApiWrappedResponse, NOT @ApiOkResponse

### References

**Source Documents:**
- [Epic 5 Definition: docs/epics.md#Story-5.0](file:///Users/rubeen/dev/personal/bluelight-hub/docs/epics.md)
- [Architecture Decisions: docs/architecture-kraefte.md#ADR-K1-K5](file:///Users/rubeen/dev/personal/bluelight-hub/docs/architecture-kraefte.md)
- [Epic 4 Retrospective: docs/sprint-artifacts/epic-4-retro-2025-12-23.md](file:///Users/rubeen/dev/personal/bluelight-hub/docs/sprint-artifacts/epic-4-retro-2025-12-23.md)
- [Epic 0 Story 0.2: UNIQUE Constraint Pattern](file:///Users/rubeen/dev/personal/bluelight-hub/docs/sprint-artifacts/0-2-unique-constraint-rollenbesetzung.md)
- [Project Context: docs/project-context.md](file:///Users/rubeen/dev/personal/bluelight-hub/docs/project-context.md)
- [CLAUDE.md: Essential Commands & Patterns](file:///Users/rubeen/dev/personal/bluelight-hub/CLAUDE.md)

**Pattern Analysis:**
- [Subagent Epic 4 Analysis: 8 Kategorie Patterns] - Umfassende Code-Pattern-Analyse aus Epic 3/4

**Test Coverage:**
- Domain: 48+ Tests (Value Objects)
- Integration: Schema constraints, CASCADE/RESTRICT behavior
- Total Target: ~50-60 Tests für Story 5-0 (nur Foundation)

**Dependencies:**
- ✅ Story 4-0: `EinsatzPerson` Entity (Epic 4 Complete)
- ✅ Story 1-3: `RollenDefinition` Entity (Epic 1 Complete)
- ✅ Epic 0 Story 0.2: UNIQUE Constraint Pattern etabliert

## Dev Agent Record

### Context Reference

Story context: Prisma Schema Extension für Rollenbesetzung (Epic 5 Foundation)

### Agent Model Used

_To be filled by Dev Agent_

### Debug Log References

_To be filled by Dev Agent_

### Completion Notes List

_To be filled by Dev Agent after implementation_

### File List

_To be filled by Dev Agent - files created/modified during implementation_
