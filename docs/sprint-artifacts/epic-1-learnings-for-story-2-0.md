# Epic 1 Development Patterns & Learnings for Story 2-0

**Document Purpose:** Extract and document proven patterns from Epic 1 (Stories 1-1 through 1-4) to inform Story 2-0 implementation.

**Generated:** 2025-12-16
**Source Commits:** Analyzed commits 70fa8fb6 through 62119e84 (20 commits)
**Stories Analyzed:** 1-1 (Qualifikationen), 1-2 (Fahrzeugtypen), 1-3 (Rollen-Definitionen), 1-4 (FunkStatusConfig)

---

## Table of Contents

1. [Critical Architecture Patterns (AC1-AC6)](#critical-architecture-patterns)
2. [Layer-Specific Patterns](#layer-specific-patterns)
3. [Common Pitfalls & Fixes](#common-pitfalls--fixes)
4. [Code Review Learnings](#code-review-learnings)
5. [Testing Patterns (Temporarily Skipped)](#testing-patterns)
6. [Story 2-0 Specific Considerations](#story-2-0-specific-considerations)

---

## Critical Architecture Patterns

### AC1: DI Import Check (BREAKING RULE)

**Pattern:**
```typescript
// ✅ RICHTIG: import für Injectable Classes (Runtime DI benötigt!)
import { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';

// ❌ FALSCH: import type bricht NestJS DI zur Laufzeit!
import type { IStammPersonRepository } from '...';
```

**Reason:** TypeScript's `import type` wird zur Compile-Zeit entfernt. NestJS DI benötigt das Runtime-Symbol für Dependency Injection.

**Biome Conflict Resolution:**
```typescript
// biome-ignore lint/style/useImportType: IStammPersonRepository needed for DI at runtime
import { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
```

**Evidence:**
- Fixed in Story 1-1 (commit 60f086e5)
- Documented in `ac1-di-import-fix-summary.md`
- Applied consistently in Stories 1-2, 1-3, 1-4

---

### AC2: DI Token Constants (MANDATORY)

**Pattern:**
```typescript
// packages/backend/src/infrastructure/di-tokens.ts
export const KRAEFTE_REPOSITORIES = {
  QUALIFIKATION: Symbol('IQualifikationRepository'),
  FAHRZEUGTYP: Symbol('IFahrzeugtypRepository'),
  ROLLEN_DEFINITION: Symbol('IRollenDefinitionRepository'),
  FUNK_STATUS_CONFIG: Symbol('IFunkStatusConfigRepository'),
  // Story 2-0: NEU
  STAMM_PERSON: Symbol('IStammPersonRepository'),
  STAMM_FAHRZEUG: Symbol('IStammFahrzeugRepository'),
} as const;

// Verwendung im Handler:
@Inject(KRAEFTE_REPOSITORIES.STAMM_PERSON)
private readonly repository: IStammPersonRepository
```

**Why:**
- Typo-sicher (IDE Autocomplete)
- Type-safe (TypeScript prüft Symbol-Existenz)
- Zentralisierte Definition (Single Source of Truth)

**Evidence:** All Epic 1 stories use this pattern consistently.

---

### AC3: Framework-Agnostizität (Application Layer)

**Allowed in Application Layer:**
- `@Injectable`, `@Inject`, `@Optional` (DI-only)
- `Logger` aus `@nestjs/common` (documented exception, see below)

**FORBIDDEN in Application Layer:**
- `@Controller`, `@Get`, `@Post`, etc.
- `HttpException`, `BadRequestException`, etc.
- `Response`, `Request` (Express types)

**Logger Exception (Documented Pattern):**
```typescript
/**
 * **AC3 Compliance Note (NestJS Logger):**
 * Logger Import aus @nestjs/common ist im Application Layer akzeptiert, weil:
 * - Logger ist ein Infrastruktur-Utility ohne Business-Logik-Kopplung
 * - TransactionalCommandHandler Base Class verwendet bereits NestJS Logger
 * - Logger beeinflusst nicht die Testbarkeit (kann gemockt werden)
 * - Etabliertes Pattern im gesamten Codebase (konsistent mit Qualifikation-Modul)
 * - Alternative (Domain Logger Interface) wäre Over-Engineering für diesen Use Case
 */
@Injectable()
export class CreateStammPersonHandler extends TransactionalCommandHandler<...> {
  protected readonly logger = new Logger(CreateStammPersonHandler.name);
  // ...
}
```

**Evidence:** Applied in all Command Handlers (Stories 1-1 through 1-4).

---

### AC4: Result Pattern (NO Exceptions for Business Errors)

**Pattern:**
```typescript
// Handler gibt Result<T> zurück, Controller mapped zu HTTP
async execute(command: CreateStammPersonCommand): Promise<Result<StammPersonDto>> {
  // Validierung
  const validation = command.validate();
  if (validation.isFailure) {
    return Result.fail(validation.error); // Kein throw!
  }

  // Uniqueness Check
  const existing = await this.repository.findByPersonalnummer(command.personalnummer, tx);
  if (existing.isSuccess && existing.value) {
    return Result.fail(StammPersonError.format(
      STAMM_PERSON_ERROR_CODES.PERSONALNUMMER_DUPLICATE,
      `Personalnummer '${command.personalnummer}' ist bereits vergeben`
    ));
  }

  // Create Aggregate
  const aggregateResult = StammPerson.create({ ... });
  if (aggregateResult.isFailure) {
    return Result.fail(aggregateResult.error);
  }

  return Result.ok(dto);
}
```

**Controller Error Mapping:**
```typescript
// Controller mapped Result.fail zu HTTP Exceptions
const result = await this.handler.execute(command);
if (result.isFailure) {
  this.mapErrorToResponse(result.error);
}

private mapErrorToResponse(error: string) {
  if (error.includes(STAMM_PERSON_ERROR_CODES.PERSONALNUMMER_DUPLICATE)) {
    throw new ConflictException(error);
  }
  if (error.includes(STAMM_PERSON_ERROR_CODES.NOT_FOUND)) {
    throw new NotFoundException(error);
  }
  throw new BadRequestException(error);
}
```

**Evidence:** All Handlers in Epic 1 use Result Pattern consistently.

---

### AC5: TransactionalCommandHandler (Outbox Pattern)

**Pattern:**
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
// biome-ignore lint/style/useImportType: IOutboxRepository needed for DI at runtime
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { TransactionContext } from '@domain/kraefte/repositories/i-stamm-person.repository';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';

@Injectable()
export class CreateStammPersonHandler extends TransactionalCommandHandler<
  CreateStammPersonCommand,
  StammPersonDto
> {
  protected readonly logger = new Logger(CreateStammPersonHandler.name);

  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.STAMM_PERSON)
    private readonly repository: IStammPersonRepository,
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly qualifikationRepository: IQualifikationRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: CreateStammPersonCommand,
    tx: TransactionContext,
  ): Promise<Result<{ result: StammPersonDto; events: DomainEvent[] }>> {
    // 1. Validierungen VOR Aggregate-Erstellung
    // 2. Erstelle Aggregate
    // 3. Speichere Aggregate in TX
    // 4. Extrahiere Domain Events
    // 5. Return { result, events } → Base Class speichert Events in Outbox (atomar!)

    const stammPerson = aggregateResult.value;
    const events = stammPerson.getDomainEvents();
    stammPerson.clearDomainEvents();

    return Result.ok({ result: dto, events });
  }
}
```

**Why:**
- Atomare Persistierung von Aggregate + Events in einer Transaction
- Base Class handled Outbox-Speicherung automatisch
- Transaction Rollback bei Fehler in jedem Schritt

**Evidence:** All Command Handlers in Epic 1 extend TransactionalCommandHandler.

---

## Layer-Specific Patterns

### Domain Layer

#### 1. Aggregate Structure

**Pattern (from Story 1-1, 1-2, 1-3):**
```typescript
export class StammPerson extends AggregateRoot<StammPersonId> {
  // Private Properties (Domain Encapsulation)
  private _personalnummer: string;
  private _nachname: string;
  private _vorname: string;
  private _qualifikationen: ErforderlicheQualifikation[]; // M:N Relation embedded
  private _istAktiv: boolean;
  private _archiviertAt?: Date; // NEU in Epic 2
  private _archiviertBy?: string;

  // Audit Trail (Read-Only Access)
  private readonly _createdAt: Date;
  private readonly _createdBy: string;
  private _updatedAt: Date;
  private _updatedBy?: string;

  // Factory Methods
  public static create(props: CreateStammPersonProps): Result<StammPerson> {
    // Defense-in-Depth Validierung
    // Code-Normalisierung (z.B. Personalnummer UPPERCASE)
    // Domain Events emittieren
  }

  public static reconstitute(props: ReconstituteStammPersonProps): Result<StammPerson> {
    // VOR Konstruktor: sortOrder Defense-in-Depth Validierung!
    if (!Number.isFinite(props.sortOrder) || !Number.isInteger(props.sortOrder)) {
      return Result.fail('Ungültiger sortOrder');
    }
    if (props.sortOrder < 0) {
      return Result.fail('sortOrder muss >= 0 sein');
    }
    // Construktor...
  }

  // Business Methods
  public update(props: UpdateStammPersonProps): Result<void> {
    // Validierung + Event Emission
  }

  public deactivate(): Result<void> {
    if (!this._istAktiv) {
      return Result.fail(StammPersonError.format(
        STAMM_PERSON_ERROR_CODES.ALREADY_DEACTIVATED,
        'StammPerson ist bereits deaktiviert'
      ));
    }
    this._istAktiv = false;
    this.addDomainEvent(new StammPersonDeactivatedEvent(this.id.value));
    return Result.ok();
  }

  public archivieren(archiviertBy: string): Result<void> {
    if (this._archiviertAt) {
      return Result.fail('StammPerson ist bereits archiviert');
    }
    this._archiviertAt = new Date();
    this._archiviertBy = archiviertBy;
    this.addDomainEvent(new StammPersonArchiviert(this.id.value));
    return Result.ok();
  }

  // Public Getters (WICHTIG: JSDoc mit "WARUM")
  /**
   * Gibt die Personalnummer zurück.
   *
   * Die Personalnummer ist ein eindeutiger Identifier für die Person im Organisationskontext.
   * Sie wird automatisch auf UPPERCASE normalisiert um Duplikate zu vermeiden.
   */
  public get personalnummer(): string {
    return this._personalnummer;
  }
}
```

**Key Points:**
- Private Properties + Public Getters (Encapsulation)
- Static Factory Methods (`create`, `reconstitute`)
- Business Methods emit Domain Events
- Defense-in-Depth Validierung (auch in `reconstitute`!)
- JSDoc erklärt "WARUM", nicht "WAS"

**Evidence:**
- All Aggregates in Epic 1 follow this structure
- sortOrder Defense-in-Depth added in Story 1-2 (Bug-Fix)
- JSDoc "WARUM" enforced in Story 1-1 R11 (commit 25042263)

---

#### 2. Code Normalisierung

**Pattern (from Stories 1-1, 1-2):**
```typescript
// Qualifikation: trim() only
private static normalizeName(name: string): string {
  return name.trim();
}

// Fahrzeugtyp: trim() + toUpperCase()
private static normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

// StammPerson: UPPERCASE für Personalnummer (Konsistent mit Fahrzeugtyp.code)
private static normalizePersonalnummer(personalnummer: string): string {
  return personalnummer.trim().toUpperCase();
}
```

**Evidence:** Applied in all 4 Epic 1 stories consistently.

---

#### 3. Error Codes + Validation Constants

**Pattern (from all Epic 1 stories):**
```typescript
// packages/backend/src/domain/kraefte/common/stamm-person-error-codes.ts
export const STAMM_PERSON_ERROR_CODES = {
  PERSONALNUMMER_DUPLICATE: 'STAMM_PERSON_PERSONALNUMMER_DUPLICATE',
  NOT_FOUND: 'STAMM_PERSON_NOT_FOUND',
  ALREADY_DEACTIVATED: 'STAMM_PERSON_ALREADY_DEACTIVATED',
  ALREADY_ARCHIVED: 'STAMM_PERSON_ALREADY_ARCHIVED',
  VALIDATION_ERROR: 'STAMM_PERSON_VALIDATION_ERROR',
  QUALIFIKATION_NOT_FOUND: 'STAMM_PERSON_QUALIFIKATION_NOT_FOUND',
} as const;

export class StammPersonError {
  public static format(code: keyof typeof STAMM_PERSON_ERROR_CODES, message: string): string {
    return `[${STAMM_PERSON_ERROR_CODES[code]}] ${message}`;
  }

  public static hasCode(error: string, code: keyof typeof STAMM_PERSON_ERROR_CODES): boolean {
    return error.includes(`[${STAMM_PERSON_ERROR_CODES[code]}]`);
  }
}

// packages/backend/src/domain/kraefte/constants/stamm-person-validation.constants.ts
export const STAMM_PERSON_VALIDATION = {
  PERSONALNUMMER_MIN_LENGTH: 2,
  PERSONALNUMMER_MAX_LENGTH: 20,
  NACHNAME_MIN_LENGTH: 2,
  NACHNAME_MAX_LENGTH: 100,
  VORNAME_MIN_LENGTH: 2,
  VORNAME_MAX_LENGTH: 100,
} as const;
```

**Evidence:** All Epic 1 stories have Error Codes + Validation Constants modules.

---

### Application Layer

#### 1. Command Structure

**Pattern (from all Epic 1 stories):**
```typescript
export class CreateStammPersonCommand {
  private constructor(
    public readonly personalnummer: string,
    public readonly nachname: string,
    public readonly vorname: string,
    public readonly qualifikationIds: string[],
    public readonly createdBy: string,
  ) {}

  public static create(props: {
    personalnummer: string;
    nachname: string;
    vorname: string;
    qualifikationIds: string[];
    createdBy: string;
  }): Result<CreateStammPersonCommand> {
    // Defense-in-Depth Validierung (WICHTIG: VOR Aggregate!)

    // 1. Trim + Validate Required Fields
    const trimmedPersonalnummer = props.personalnummer.trim();
    if (!trimmedPersonalnummer) {
      return Result.fail('[STAMM_PERSON_VALIDATION_ERROR] Personalnummer ist erforderlich');
    }
    if (trimmedPersonalnummer.length < STAMM_PERSON_VALIDATION.PERSONALNUMMER_MIN_LENGTH) {
      return Result.fail(`[STAMM_PERSON_VALIDATION_ERROR] Personalnummer muss mindestens ${STAMM_PERSON_VALIDATION.PERSONALNUMMER_MIN_LENGTH} Zeichen lang sein`);
    }

    // 2. Validate Arrays
    if (!Array.isArray(props.qualifikationIds)) {
      return Result.fail('[STAMM_PERSON_VALIDATION_ERROR] qualifikationIds muss ein Array sein');
    }

    // 3. Validate CUID2 Format (if needed)
    for (const id of props.qualifikationIds) {
      if (!isCuid(id)) {
        return Result.fail(`[STAMM_PERSON_VALIDATION_ERROR] Ungültige qualifikationId: ${id}`);
      }
    }

    return Result.ok(
      new CreateStammPersonCommand(
        trimmedPersonalnummer,
        props.nachname.trim(),
        props.vorname.trim(),
        props.qualifikationIds,
        props.createdBy,
      ),
    );
  }
}
```

**Key Points:**
- Private Constructor (Factory Pattern)
- Static `create()` with Validation
- Result Pattern für Validierungsfehler
- Defense-in-Depth (Command validiert VOR Handler)

**Evidence:** All Commands in Epic 1 follow this pattern.

---

#### 2. Query Structure

**Pattern (from Story 1-3, 1-4):**
```typescript
export class GetAllStammPersonenQuery {
  private constructor(
    public readonly istAktiv?: boolean,
    public readonly istArchiviert?: boolean, // NEU in Epic 2
  ) {}

  public static create(props: {
    istAktiv?: boolean;
    istArchiviert?: boolean;
  }): Result<GetAllStammPersonenQuery> {
    // Validierung der Filter (optional)
    if (props.istAktiv !== undefined && typeof props.istAktiv !== 'boolean') {
      return Result.fail('[STAMM_PERSON_VALIDATION_ERROR] istAktiv muss boolean sein');
    }

    return Result.ok(new GetAllStammPersonenQuery(props.istAktiv, props.istArchiviert));
  }
}

@Injectable()
export class GetAllStammPersonenHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.STAMM_PERSON)
    private readonly repository: IStammPersonRepository,
  ) {}

  async execute(query: GetAllStammPersonenQuery): Promise<Result<StammPersonDto[]>> {
    const filter: FindAllStammPersonenFilter = {};
    if (query.istAktiv !== undefined) {
      filter.istAktiv = query.istAktiv;
    }
    if (query.istArchiviert !== undefined) {
      filter.istArchiviert = query.istArchiviert;
    }

    const result = await this.repository.findAll(filter);
    if (result.isFailure) {
      return Result.fail(result.error);
    }

    const dtos = result.value.map((entity) => StammPersonQueryMapper.toDto(entity));
    return Result.ok(dtos);
  }
}
```

**Key Points:**
- Query Objects mit optionalen Filtern
- Separate Mapper für Query-Response-DTOs
- KEINE Transaction bei Read-Only Queries

**Evidence:** All Query Handlers in Epic 1 follow this pattern.

---

#### 3. DTOs with OpenAPI

**Pattern (from all Epic 1 stories):**
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsArray, MinLength, MaxLength, IsOptional } from 'class-validator';
import { IsCuid2 } from '@shared/validators/is-cuid2.validator'; // Custom Validator

export class CreateStammPersonDto {
  @ApiProperty({
    description: 'Eindeutige Personalnummer (wird automatisch auf UPPERCASE normalisiert)',
    example: 'MA-2025-001',
    minLength: STAMM_PERSON_VALIDATION.PERSONALNUMMER_MIN_LENGTH,
    maxLength: STAMM_PERSON_VALIDATION.PERSONALNUMMER_MAX_LENGTH,
  })
  @IsString()
  @MinLength(STAMM_PERSON_VALIDATION.PERSONALNUMMER_MIN_LENGTH)
  @MaxLength(STAMM_PERSON_VALIDATION.PERSONALNUMMER_MAX_LENGTH)
  personalnummer: string;

  @ApiProperty({
    description: 'Nachname der Person',
    example: 'Müller',
  })
  @IsString()
  @MinLength(STAMM_PERSON_VALIDATION.NACHNAME_MIN_LENGTH)
  @MaxLength(STAMM_PERSON_VALIDATION.NACHNAME_MAX_LENGTH)
  nachname: string;

  @ApiProperty({
    description: 'Liste der Qualifikations-IDs (M:N Relation)',
    type: [String],
    example: ['cuid2-qualifikation-id'],
  })
  @IsArray()
  @IsCuid2({ each: true }) // Custom Validator für CUID2 Format
  qualifikationIds: string[];

  @ApiPropertyOptional({
    description: 'Zusätzliche Bemerkungen',
    example: 'Sprachkenntnisse: Deutsch, Englisch',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bemerkung?: string;
}

export class StammPersonDto {
  @ApiProperty() id: string;
  @ApiProperty() personalnummer: string;
  @ApiProperty() nachname: string;
  @ApiProperty() vorname: string;
  @ApiProperty() istAktiv: boolean;
  @ApiPropertyOptional() archiviertAt?: Date; // NEU in Epic 2
  @ApiPropertyOptional() archiviertBy?: string;
  @ApiProperty({ type: [ErforderlicheQualifikationDto] })
  qualifikationen: ErforderlicheQualifikationDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() createdBy: string;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional() updatedBy?: string;
}
```

**Key Points:**
- `@ApiProperty` für OpenAPI Documentation
- `class-validator` Decorators für DTO Validation
- Custom Validators (z.B. `@IsCuid2`) für Domain-spezifische Formate
- Defense-in-Depth: DTO validiert, Command validiert, Aggregate validiert

**Evidence:** All DTOs in Epic 1 have comprehensive OpenAPI + class-validator decorators.

---

### Infrastructure Layer

#### 1. Repository Error Handling

**Pattern (from Story 1-2, 1-3):**
```typescript
import { isPrismaError } from '../../../shared/utils/prisma.util';

@Injectable()
export class PrismaStammPersonRepository implements IStammPersonRepository {
  private readonly logger = new Logger(PrismaStammPersonRepository.name);

  async save(aggregate: StammPerson, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const persistenceData = PrismaStammPersonMapper.toPersistence(aggregate);
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      await client.stammPerson.upsert({
        where: { id: persistenceData.id },
        create: { ...persistenceData },
        update: { ...persistenceData },
      });

      return Result.ok();
    } catch (error) {
      // P2002: Unique Constraint Violation (Personalnummer bereits vergeben)
      if (isPrismaError(error, 'P2002')) {
        const fieldName = this.extractFieldNameFromMeta(error, 'P2002');
        if (fieldName.includes('personalnummer')) {
          return Result.fail(
            StammPersonError.format(
              STAMM_PERSON_ERROR_CODES.PERSONALNUMMER_DUPLICATE,
              `Personalnummer '${persistenceData.personalnummer}' ist bereits vergeben`
            )
          );
        }
        return Result.fail(`Eindeutiger Wert für Feld "${fieldName}" existiert bereits`);
      }

      // P2003: Foreign Key Constraint (createdBy/updatedBy User existiert nicht)
      if (isPrismaError(error, 'P2003')) {
        const fieldName = this.extractFieldNameFromMeta(error, 'P2003');
        return Result.fail(`Referenzierter Benutzer (${fieldName}) existiert nicht`);
      }

      // P2025: Record Not Found (bei Update)
      if (isPrismaError(error, 'P2025')) {
        return Result.fail(
          StammPersonError.format(STAMM_PERSON_ERROR_CODES.NOT_FOUND, 'StammPerson nicht gefunden')
        );
      }

      // Unbekannter Fehler
      this.logger.error('Unexpected database error in save()', error);
      return Result.fail('Datenbankfehler beim Speichern');
    }
  }

  async findByPersonalnummer(personalnummer: string, tx?: TransactionContext): Promise<Result<StammPerson | null>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
      const entity = await client.stammPerson.findUnique({
        where: { personalnummer: personalnummer.toUpperCase() }, // Normalisiert!
        include: {
          qualifikationen: {
            include: { qualifikation: true }
          }
        }
      });

      if (!entity) {
        return Result.ok(null); // "Not found" ist SUCCESS mit null (kein FAILURE!)
      }

      const aggregateResult = PrismaStammPersonMapper.toDomain(entity);
      if (aggregateResult.isFailure) {
        return Result.fail(aggregateResult.error);
      }

      return Result.ok(aggregateResult.value);
    } catch (error) {
      this.logger.error('Database error in findByPersonalnummer()', error);
      return Result.fail('Datenbankfehler beim Abrufen');
    }
  }

  // Batch-Validierung (Performance-Optimierung aus Story 1-3 R2)
  async existsMany(ids: string[], tx?: TransactionContext): Promise<boolean> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
      const count = await client.stammPerson.count({
        where: {
          id: { in: ids },
          archiviertAt: null, // WICHTIG: Nur nicht-archivierte Personen!
        },
      });
      return count === ids.length;
    } catch (error) {
      this.logger.error('Database error in existsMany()', error);
      return false;
    }
  }
}
```

**Key Points:**
- `isPrismaError()` Utility für Type-Safe Error Checking
- Spezifische Error Codes → Domain Error Codes
- "Not found" ist SUCCESS mit `null` (kein FAILURE!)
- Batch-Methoden für Performance (N+1 Query vermeiden)
- Logger für unbekannte Fehler

**Evidence:**
- All Repositories in Epic 1 follow this pattern
- `existsMany()` added in Story 1-3 R2 (commit f31e57ed)

---

#### 2. Mapper (Prisma ↔ Domain)

**Pattern (from all Epic 1 stories):**
```typescript
export class PrismaStammPersonMapper {
  /**
   * Domain Aggregate → Prisma Persistence Model
   */
  public static toPersistence(aggregate: StammPerson): Prisma.StammPersonCreateInput {
    return {
      id: aggregate.id.value,
      personalnummer: aggregate.personalnummer,
      nachname: aggregate.nachname,
      vorname: aggregate.vorname,
      istAktiv: aggregate.istAktiv,
      sortOrder: aggregate.sortOrder,
      archiviertAt: aggregate.archiviertAt, // NEU in Epic 2
      archiviertBy: aggregate.archiviertBy,
      bemerkung: aggregate.bemerkung,
      createdAt: aggregate.createdAt,
      createdBy: aggregate.createdBy,
      updatedAt: aggregate.updatedAt,
      updatedBy: aggregate.updatedBy,
      // NOTE: qualifikationen NICHT hier - separate Junction Table Handling!
    };
  }

  /**
   * Prisma Entity → Domain Aggregate
   *
   * CRITICAL: NULL → undefined Mapping!
   */
  public static toDomain(
    entity: Prisma.StammPersonGetPayload<{
      include: { qualifikationen: { include: { qualifikation: true } } };
    }>
  ): Result<StammPerson> {
    // 1. Value Object Reconstruction
    const idResult = StammPersonId.create(entity.id);
    if (idResult.isFailure) {
      return Result.fail(idResult.error);
    }

    // 2. Reconstitute Aggregate
    return StammPerson.reconstitute({
      id: idResult.value!,
      personalnummer: entity.personalnummer,
      nachname: entity.nachname,
      vorname: entity.vorname,
      istAktiv: entity.istAktiv,
      sortOrder: entity.sortOrder,
      // CRITICAL: NULL → undefined Mapping (Prisma gibt null zurück, Domain erwartet undefined)
      archiviertAt: (entity.archiviertAt as Date | null) ?? undefined,
      archiviertBy: (entity.archiviertBy as string | null) ?? undefined,
      bemerkung: (entity.bemerkung as string | null) ?? undefined,
      qualifikationen: entity.qualifikationen.map((sq) => ({
        qualifikationId: sq.qualifikationId,
        istPflicht: sq.istPflicht,
      })),
      createdAt: entity.createdAt,
      createdBy: entity.createdBy,
      updatedAt: entity.updatedAt,
      updatedBy: (entity.updatedBy as string | null) ?? undefined,
    });
  }

  /**
   * Prisma Entity → DTO (für Query Responses)
   *
   * CRITICAL: NULL → undefined Mapping!
   */
  public static toDto(
    entity: Prisma.StammPersonGetPayload<{
      include: { qualifikationen: { include: { qualifikation: true } } };
    }>
  ): StammPersonDto {
    return {
      id: entity.id,
      personalnummer: entity.personalnummer,
      nachname: entity.nachname,
      vorname: entity.vorname,
      istAktiv: entity.istAktiv,
      sortOrder: entity.sortOrder,
      // CRITICAL: NULL → undefined Mapping
      archiviertAt: (entity.archiviertAt as Date | null) ?? undefined,
      archiviertBy: (entity.archiviertBy as string | null) ?? undefined,
      bemerkung: (entity.bemerkung as string | null) ?? undefined,
      qualifikationen: entity.qualifikationen.map((sq) => ({
        qualifikationId: sq.qualifikationId,
        qualifikationName: sq.qualifikation.name,
        qualifikationAbkuerzung: sq.qualifikation.abkuerzung,
        istPflicht: sq.istPflicht,
      })),
      createdAt: entity.createdAt,
      createdBy: entity.createdBy,
      updatedAt: entity.updatedAt,
      updatedBy: (entity.updatedBy as string | null) ?? undefined,
    };
  }
}
```

**Key Points:**
- **CRITICAL:** NULL → undefined Mapping mit `?? undefined` (häufigstes Problem in Epic 1!)
- Separate Methoden: `toPersistence`, `toDomain`, `toDto`
- Junction Table Handling NICHT im Mapper (separate Repository-Methoden)
- Type-Safe mit Prisma Generated Types

**Evidence:**
- NULL → undefined Bug in ALL Epic 1 stories initially
- Fixed in Story 1-2 R1 (commit 70fa8fb6)
- Applied consistently in Stories 1-3, 1-4

---

### Modules Layer (Controller)

#### 1. Controller Structure

**Pattern (from all Epic 1 stories):**
```typescript
import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiNotFoundResponse, ApiBadRequestResponse, ApiConflictResponse, ApiForbiddenResponse, ApiUnauthorizedResponse, ApiTooManyRequestsResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminJwtAuthGuard } from '@modules/auth/guards/admin-jwt-auth.guard';
import { ADMIN_RATE_LIMIT, ADMIN_MUTATION_RATE_LIMIT } from '@infrastructure/http/constants/rate-limit.constants';

@Controller({ path: 'admin/kraefte/stamm-personen', version: 'alpha' })
@ApiTags('admin-kraefte-stamm-personen')
@UseGuards(AdminJwtAuthGuard)
@Throttle(ADMIN_RATE_LIMIT) // Class-Level Rate Limit für Read-Endpoints
@ApiBearerAuth('admin-jwt')
@ApiForbiddenResponse({ description: 'Keine Admin-Berechtigung' })
@ApiUnauthorizedResponse({ description: 'Ungültiger/abgelaufener Token' })
@ApiTooManyRequestsResponse({ description: 'Rate Limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Interner Serverfehler' })
export class AdminStammPersonenController {
  constructor(
    private readonly createHandler: CreateStammPersonHandler,
    private readonly updateHandler: UpdateStammPersonHandler,
    private readonly deactivateHandler: DeactivateStammPersonHandler,
    private readonly getAllHandler: GetAllStammPersonenHandler,
    private readonly getByIdHandler: GetStammPersonByIdHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Alle StammPersonen abrufen' })
  @ApiOkResponse({ type: [StammPersonDto] })
  async findAll(
    @Query('istAktiv') istAktiv?: string,
    @Query('istArchiviert') istArchiviert?: string,
  ): Promise<StammPersonDto[]> {
    const queryResult = GetAllStammPersonenQuery.create({
      istAktiv: istAktiv === 'true' ? true : istAktiv === 'false' ? false : undefined,
      istArchiviert: istArchiviert === 'true' ? true : istArchiviert === 'false' ? false : undefined,
    });

    if (queryResult.isFailure) {
      throw new BadRequestException(queryResult.error);
    }

    const result = await this.getAllHandler.execute(queryResult.value!);
    if (result.isFailure) {
      throw new InternalServerErrorException(result.error);
    }

    return result.value;
  }

  @Post()
  @Throttle(ADMIN_MUTATION_RATE_LIMIT) // Method-Level Override für Mutations
  @ApiOperation({ summary: 'Neue StammPerson erstellen' })
  @ApiCreatedResponse({ type: StammPersonDto })
  @ApiBadRequestResponse({ description: 'Validierungsfehler' })
  @ApiConflictResponse({ description: 'Personalnummer bereits vergeben' })
  async create(
    @Body() dto: CreateStammPersonDto,
    @GetUser() user: JwtPayload,
  ): Promise<StammPersonDto> {
    const commandResult = CreateStammPersonCommand.create({
      ...dto,
      createdBy: user.sub,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.createHandler.execute(commandResult.value!);
    if (result.isFailure) {
      this.mapErrorToResponse(result.error);
    }

    return result.value;
  }

  @Patch(':id/deactivate')
  @Throttle(ADMIN_MUTATION_RATE_LIMIT)
  @ApiOperation({ summary: 'StammPerson deaktivieren' })
  @ApiOkResponse({ type: StammPersonDto })
  @ApiNotFoundResponse({ description: 'StammPerson nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Bereits deaktiviert' })
  async deactivate(@Param('id') id: string): Promise<StammPersonDto> {
    const commandResult = DeactivateStammPersonCommand.create({ id });
    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.deactivateHandler.execute(commandResult.value!);
    if (result.isFailure) {
      this.mapErrorToResponse(result.error);
    }

    return result.value;
  }

  /**
   * Mapped Domain Error Codes zu HTTP Exceptions.
   *
   * SECURITY: Verwendet Error Code Pattern (keine User-Input in Message für XSS-Prevention)
   */
  private mapErrorToResponse(error: string): never {
    if (StammPersonError.hasCode(error, 'PERSONALNUMMER_DUPLICATE')) {
      throw new ConflictException(error);
    }
    if (StammPersonError.hasCode(error, 'NOT_FOUND')) {
      throw new NotFoundException(error);
    }
    if (StammPersonError.hasCode(error, 'ALREADY_DEACTIVATED')) {
      throw new BadRequestException(error);
    }
    if (StammPersonError.hasCode(error, 'QUALIFIKATION_NOT_FOUND')) {
      throw new BadRequestException(error);
    }
    throw new BadRequestException(error);
  }
}
```

**Key Points:**
- Class-Level Decorators für alle Endpoints (DRY)
- Rate Limiting: `ADMIN_RATE_LIMIT` (Read) vs `ADMIN_MUTATION_RATE_LIMIT` (Write)
- OpenAPI Documentation mit allen Error Codes
- Error Code Mapping mit `hasCode()` (Type-Safe, kein String-Matching)
- Security: Keine User-Input in Exception Messages (XSS Prevention)

**Evidence:**
- All Controllers in Epic 1 follow this structure
- Rate Limit Constants added in Story 1-3 R2 (commit f31e57ed)
- Error Code Pattern enforced in Story 1-1 R12 (commit 60f086e5)

---

## Common Pitfalls & Fixes

### 1. NULL → undefined Mapping (CRITICAL)

**Problem:** Prisma gibt `null` zurück für nullable Felder, aber Domain/DTOs erwarten `undefined`.

**Symptom:**
```typescript
// BAD: Type Error bei Aggregate.reconstitute()
// Error: Expected 'string | undefined', got 'string | null'
bemerkung: entity.bemerkung, // ❌ Prisma gibt null zurück
```

**Fix:**
```typescript
// GOOD: Explizites NULL → undefined Mapping
bemerkung: (entity.bemerkung as string | null) ?? undefined, // ✅
```

**Where:** In ALLEN Mappern (`toDomain`, `toDto`) für ALLE optionalen Felder!

**Evidence:**
- Bug in Stories 1-2, 1-3 initial implementations
- Fixed in ALL stories by end of Epic 1
- Documented in Epic 1 Retro (commit 62119e84)

---

### 2. `import type` breaks DI (CRITICAL)

**Problem:** TypeScript `import type` wird zur Compile-Zeit entfernt → NestJS DI findet Symbol nicht.

**Symptom:**
```
Error: Nest can't resolve dependencies of the CreateStammPersonHandler (?).
Please make sure that the argument dependency at index [0] is available in the ...
```

**Fix:**
```typescript
// BAD: import type für Injectable Class
import type { IStammPersonRepository } from '...'; // ❌

// GOOD: Regulärer import + biome-ignore Kommentar
// biome-ignore lint/style/useImportType: IStammPersonRepository needed for DI at runtime
import { IStammPersonRepository } from '...'; // ✅
```

**Evidence:**
- Fixed in Story 1-1 R12 (commit 60f086e5)
- Documented in `ac1-di-import-fix-summary.md`

---

### 3. N+1 Query in Batch-Validierung (PERFORMANCE)

**Problem:** Loop mit einzelnen `exists()` Calls → N Datenbankabfragen.

**Symptom:**
```typescript
// BAD: N+1 Query
for (const id of qualifikationIds) {
  const exists = await repository.exists(id, tx);
  if (!exists) return Result.fail('...');
}
```

**Fix:**
```typescript
// GOOD: Batch-Validierung
const allExist = await repository.existsMany(qualifikationIds, tx);
if (!allExist) return Result.fail('...');

// Repository Implementation:
async existsMany(ids: string[], tx?: TransactionContext): Promise<boolean> {
  const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
  const count = await client.qualifikation.count({
    where: { id: { in: ids } },
  });
  return count === ids.length;
}
```

**Evidence:**
- Fixed in Story 1-3 R2 (commit f31e57ed)
- Applied in Story 1-4

---

### 4. Race Condition bei Uniqueness Check (EDGE CASE)

**Problem:** Handler prüft Uniqueness, aber zwischen Check und Save könnte parallel Insert erfolgen.

**Solution:** DB Constraint ist autoritative Quelle, Handler-Check ist UX-Optimization.

**Pattern:**
```typescript
// 1. Handler-Check für bessere UX (early return)
const existingResult = await this.repository.findByPersonalnummer(command.personalnummer, tx);
if (existingResult.value) {
  return Result.fail(StammPersonError.format(
    STAMM_PERSON_ERROR_CODES.PERSONALNUMMER_DUPLICATE,
    `Personalnummer '${command.personalnummer}' ist bereits vergeben`
  ));
}

// 2. DB Constraint fängt Race Condition ab
// Repository.save() gibt Result.fail bei P2002 zurück
// → Controller mapped zu HTTP 409 Conflict
```

**Evidence:**
- Documented in all Create Handlers (JSDoc)
- Repository always handles P2002 with Error Code

---

### 5. sortOrder Defense-in-Depth fehlt (BUG)

**Problem:** `reconstitute()` validiert sortOrder nicht → korrupte Daten aus DB crashen Application.

**Symptom:**
```typescript
// BAD: Keine Validierung in reconstitute()
public static reconstitute(props: ReconstituteProps): Result<StammPerson> {
  return Result.ok(new StammPerson(props)); // ❌ sortOrder nicht validiert!
}
```

**Fix:**
```typescript
// GOOD: Defense-in-Depth Validierung auch in reconstitute()
public static reconstitute(props: ReconstituteProps): Result<StammPerson> {
  // WICHTIG: sortOrder VOR Konstruktor validieren!
  if (!Number.isFinite(props.sortOrder) || !Number.isInteger(props.sortOrder)) {
    return Result.fail('[STAMM_PERSON_VALIDATION_ERROR] Ungültiger sortOrder');
  }
  if (props.sortOrder < 0) {
    return Result.fail('[STAMM_PERSON_VALIDATION_ERROR] sortOrder muss >= 0 sein');
  }
  return Result.ok(new StammPerson(props));
}
```

**Evidence:**
- Bug found in Story 1-1 Code Review
- Fixed in ALL Aggregates starting Story 1-2 (commit 70fa8fb6)

---

## Code Review Learnings

### Review Process (from Epic 1)

**Statistics:**
- Story 1-1: 12 Review Rounds (Pattern Learning)
- Story 1-2: 2 Review Rounds (Pattern Established)
- Story 1-3: 3 Review Rounds (M:N Complexity)
- Story 1-4: 2 Review Rounds (Pattern Reuse)

**Key Insight:** Pattern-Reuse beschleunigt spätere Stories signifikant.

---

### Common Review Issues

#### 1. Fehlende JSDoc "WARUM" (HIGH)

**Pattern:**
```typescript
// BAD: JSDoc erklärt "WAS" (obvious)
/**
 * Gibt die Personalnummer zurück.
 */
public get personalnummer(): string {
  return this._personalnummer;
}

// GOOD: JSDoc erklärt "WARUM" (context)
/**
 * Gibt die Personalnummer zurück.
 *
 * Die Personalnummer ist ein eindeutiger Identifier für die Person im Organisationskontext.
 * Sie wird automatisch auf UPPERCASE normalisiert um Duplikate zu vermeiden (z.B. "ma-001" und "MA-001" sind identisch).
 *
 * Verwendung:
 * - Primärschlüssel für Stammdaten-Synchronisation mit externen Systemen
 * - Einzigartig innerhalb der Organisation
 * - Unveränderlich nach Erstellung
 */
public get personalnummer(): string {
  return this._personalnummer;
}
```

**Evidence:** Enforced in Story 1-1 R11 (commit 25042263).

---

#### 2. String-Matching statt Error Code Pattern (MEDIUM)

**Problem:**
```typescript
// BAD: String-Matching ist fragil (typo-anfällig, nicht type-safe)
if (result.error.includes('Validierung')) { // ❌
  throw new BadRequestException(result.error);
}
```

**Fix:**
```typescript
// GOOD: Error Code Pattern ist type-safe
if (StammPersonError.hasCode(result.error, 'VALIDATION_ERROR')) { // ✅
  throw new BadRequestException(result.error);
}
```

**Evidence:** Fixed in Story 1-3 R1 (commit a3abad70).

---

#### 3. Decorator-Duplikation (HIGH)

**Problem:** `@ApiInternalServerErrorResponse` auf JEDEM Endpoint.

**Fix:** Class-Level Decorator für alle Endpoints:
```typescript
@Controller(...)
@ApiInternalServerErrorResponse({ description: 'Interner Serverfehler' })
export class AdminStammPersonenController {
  // Gilt für ALLE Methoden
}
```

**Evidence:** Fixed in Story 1-2 R1 (commit 70fa8fb6).

---

#### 4. Security: User-Input in Exception Messages (CRITICAL)

**Problem:** XSS-Risiko wenn User-Input direkt in Exception Message eingebettet wird.

**Bad:**
```typescript
// SECURITY RISK: User könnte XSS-Payload in Personalnummer injizieren
throw new ConflictException(`Personalnummer '${command.personalnummer}' ist bereits vergeben`);
```

**Fix:**
```typescript
// GOOD: Error Code Pattern verhindert User-Input in Message
return Result.fail(
  StammPersonError.format(
    STAMM_PERSON_ERROR_CODES.PERSONALNUMMER_DUPLICATE,
    `Personalnummer ist bereits vergeben` // NO User-Input!
  )
);
```

**Evidence:** Fixed in Story 1-1 R12 (commit 60f086e5).

---

## Testing Patterns (Temporarily Skipped)

**Status:** Unit Tests TEMPORÄR übersprungen gemäß CLAUDE.md.

**Established Patterns (from Story 1-4):**

### 1. AAA Pattern mit Given-When-Then

```typescript
describe('CreateStammPersonHandler', () => {
  let handler: CreateStammPersonHandler;
  let mockRepository: jest.Mocked<IStammPersonRepository>;

  beforeEach(() => {
    jest.clearAllMocks(); // WICHTIG: Mock Reset VOR jedem Test!
    mockRepository = createMockStammPersonRepository();
    handler = new CreateStammPersonHandler(
      mockPrisma,
      mockOutbox,
      mockRepository,
      mockQualifikationRepository,
    );
  });

  it('should create stamm person successfully', async () => {
    // Given (Arrange)
    const command = CreateStammPersonCommand.create({
      personalnummer: 'MA-001',
      nachname: 'Müller',
      vorname: 'Anna',
      qualifikationIds: ['cuid-qual-1'],
      createdBy: 'admin-id',
    }).value!;
    mockQualifikationRepository.existsMany.mockResolvedValue(true);
    mockRepository.findByPersonalnummer.mockResolvedValue(Result.ok(null));
    mockRepository.save.mockResolvedValue(Result.ok());

    // When (Act)
    const result = await handler.execute(command);

    // Then (Assert)
    expect(result.isSuccess).toBe(true);
    expect(mockQualifikationRepository.existsMany).toHaveBeenCalledWith(['cuid-qual-1'], expect.any(Object));
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should fail when personalnummer already exists', async () => {
    // Given
    const command = CreateStammPersonCommand.create({
      personalnummer: 'MA-001',
      nachname: 'Müller',
      vorname: 'Anna',
      qualifikationIds: [],
      createdBy: 'admin-id',
    }).value!;
    const existingPerson = createMockStammPerson();
    mockRepository.findByPersonalnummer.mockResolvedValue(Result.ok(existingPerson));

    // When
    const result = await handler.execute(command);

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('STAMM_PERSON_PERSONALNUMMER_DUPLICATE');
    expect(mockRepository.save).not.toHaveBeenCalled();
  });
});
```

**Evidence:** Story 1-4 has 44 Handler Tests + 26 Aggregate Tests following this pattern.

---

## Story 2-0 Specific Considerations

### 1. Archivierung Pattern (NEU in Epic 2)

**Unterschied zu Deaktivierung:**
- **Deaktivierung:** `istAktiv = false` → Nicht mehr in Dropdowns, aber weiterhin in Admin-Tabelle sichtbar
- **Archivierung:** `archiviertAt / archiviertBy` → Soft Delete, standardmäßig ausgeblendet

**Pattern:**
```typescript
// Aggregate Method
public archivieren(archiviertBy: string): Result<void> {
  if (this._archiviertAt) {
    return Result.fail(
      StammPersonError.format(
        STAMM_PERSON_ERROR_CODES.ALREADY_ARCHIVED,
        'StammPerson ist bereits archiviert'
      )
    );
  }
  this._archiviertAt = new Date();
  this._archiviertBy = archiviertBy;
  this.addDomainEvent(new StammPersonArchiviertEvent(this.id.value));
  return Result.ok();
}

// Repository Query Default Filter
async findAll(filter?: FindAllFilter, tx?: TransactionContext): Promise<Result<StammPerson[]>> {
  const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

  const where: Prisma.StammPersonWhereInput = {
    // DEFAULT: Nur nicht-archivierte Personen (außer explizit angefragt)
    archiviertAt: filter?.istArchiviert === true ? { not: null } : filter?.istArchiviert === false ? null : null,
  };

  if (filter?.istAktiv !== undefined) {
    where.istAktiv = filter.istAktiv;
  }

  const entities = await client.stammPerson.findMany({ where, include: { ... } });
  // ...
}

// Controller Endpoint
@Patch(':id/archivieren')
@Throttle(ADMIN_MUTATION_RATE_LIMIT)
@ApiOperation({ summary: 'StammPerson archivieren (Soft Delete)' })
async archivieren(@Param('id') id: string, @GetUser() user: JwtPayload): Promise<StammPersonDto> {
  const commandResult = ArchivierenStammPersonCommand.create({ id, archiviertBy: user.sub });
  // ...
}
```

**Evidence:** Documented in Epic 1 Retro as new complexity for Epic 2.

---

### 2. M:N Relations (StammPersonQualifikation)

**Pattern (from Story 1-3):**

**Create Flow:**
```typescript
// Handler validates BEFORE aggregate creation
const allQualifikationsExist = await this.qualifikationRepository.existsMany(
  command.qualifikationIds,
  tx
);
if (!allQualifikationsExist) {
  return Result.fail(
    StammPersonError.format(
      STAMM_PERSON_ERROR_CODES.QUALIFIKATION_NOT_FOUND,
      'Eine oder mehrere Qualifikationen existieren nicht'
    )
  );
}

// Aggregate stores embedded value
const stammPerson = StammPerson.create({
  qualifikationen: command.qualifikationIds.map((id) => ({
    qualifikationId: id,
    istPflicht: true, // Default
  })),
  // ...
});

// Repository saves junction entries
await this.repository.saveQualifikationen(
  stammPerson.id,
  command.qualifikationIds,
  command.createdBy,
  tx
);
```

**Update Flow (REPLACE Strategy):**
```typescript
// WICHTIG: REPLACE statt MERGE!
if (command.qualifikationIds !== undefined) {
  // 1. Lösche alle bestehenden Verknüpfungen
  await this.repository.deleteQualifikationen(stammPerson.id, tx);

  // 2. Erstelle neue Verknüpfungen
  if (command.qualifikationIds.length > 0) {
    await this.repository.saveQualifikationen(
      stammPerson.id,
      command.qualifikationIds,
      command.updatedBy,
      tx
    );
  }
}
```

**Evidence:**
- Pattern established in Story 1-3 (commit 70fa8fb6)
- Fixed in Story 1-3 R1 (REPLACE semantics, commit a3abad70)

---

### 3. Validation: Archivierte Personen nicht in aktiven Einsätzen

**Challenge:** StammPerson darf nicht archiviert werden wenn sie in aktiven Einsätzen verwendet wird.

**Pattern:**
```typescript
// Handler: Validate BEFORE archivieren()
protected async executeInTransaction(
  command: ArchivierenStammPersonCommand,
  tx: TransactionContext,
): Promise<Result<{ result: StammPersonDto; events: DomainEvent[] }>> {
  // 1. Check: Person existiert
  const personResult = await this.repository.findById(command.id, tx);
  if (!personResult.value) {
    return Result.fail(StammPersonError.format(
      STAMM_PERSON_ERROR_CODES.NOT_FOUND,
      'StammPerson nicht gefunden'
    ));
  }

  const person = personResult.value;

  // 2. Check: Nicht in aktiven Einsätzen verwendet
  // TODO: Story 3-X (Einsätze) → Inject IEinsatzRepository
  // const hasActiveEinsaetze = await this.einsatzRepository.existsActiveEinsaetzeWithPerson(person.id, tx);
  // if (hasActiveEinsaetze) {
  //   return Result.fail(StammPersonError.format(
  //     STAMM_PERSON_ERROR_CODES.IN_ACTIVE_EINSATZ,
  //     'StammPerson kann nicht archiviert werden - wird in aktiven Einsätzen verwendet'
  //   ));
  // }

  // 3. Archivieren
  const archivierenResult = person.archivieren(command.archiviertBy);
  if (archivierenResult.isFailure) {
    return Result.fail(archivierenResult.error);
  }

  // 4. Save
  const saveResult = await this.repository.save(person, tx);
  if (saveResult.isFailure) {
    return Result.fail(saveResult.error);
  }

  // 5. Return DTO + Events
  const dto = StammPersonQueryMapper.toDto(person);
  const events = person.getDomainEvents();
  person.clearDomainEvents();

  return Result.ok({ result: dto, events });
}
```

**Evidence:** Documented in Epic 1 Retro as Story 2-0 challenge.

---

### 4. Shared Utilities (Tech Debt)

**Problem:** Code-Duplikation in 3+ Stories.

**To Extract (Story 2-0 or separate Tech-Debt Story):**

1. **validatePositiveInteger()** (used in all Commands):
```typescript
// packages/backend/src/shared/utils/validation.util.ts
export function validatePositiveInteger(value: number, fieldName: string): Result<void> {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return Result.fail(`[VALIDATION_ERROR] ${fieldName} muss eine ganze Zahl sein`);
  }
  if (value < 0) {
    return Result.fail(`[VALIDATION_ERROR] ${fieldName} muss >= 0 sein`);
  }
  return Result.ok();
}
```

2. **formatPrismaError()** (used in all Repositories):
```typescript
// packages/backend/src/shared/utils/prisma-error.util.ts
export function formatPrismaError(
  error: unknown,
  context: string,
  uniqueFields?: Record<string, string>
): string {
  // ... (aus PrismaFahrzeugtypRepository.formatPrismaError)
}
```

3. **extractFieldNameFromMeta()** (used in all Repositories):
```typescript
export function extractFieldNameFromMeta(
  error: unknown,
  errorCode: 'P2002' | 'P2003'
): string {
  // ... (aus PrismaFahrzeugtypRepository.extractFieldNameFromMeta)
}
```

**Evidence:** Documented in Epic 1 Retro as MEDIUM priority Tech Debt.

---

## File Structure Template (Story 2-0)

### Domain Layer (StammPerson)
```
packages/backend/src/domain/kraefte/
├── aggregates/
│   ├── stamm-person.aggregate.ts
│   └── __tests__/
│       └── stamm-person.aggregate.spec.ts (temporarily skipped)
├── value-objects/
│   └── stamm-person-id.ts
├── repositories/
│   └── i-stamm-person.repository.ts
├── constants/
│   └── stamm-person-validation.constants.ts
├── common/
│   └── stamm-person-error-codes.ts
└── events/
    ├── stamm-person-created.event.ts
    ├── stamm-person-updated.event.ts
    ├── stamm-person-deactivated.event.ts
    └── stamm-person-archiviert.event.ts (NEU!)
```

### Application Layer
```
packages/backend/src/application/kraefte/stamm-personen/
├── commands/
│   ├── create-stamm-person/
│   │   ├── create-stamm-person.command.ts
│   │   ├── create-stamm-person.handler.ts
│   │   └── index.ts
│   ├── update-stamm-person/
│   ├── deactivate-stamm-person/
│   └── archivieren-stamm-person/ (NEU!)
├── queries/
│   ├── get-all-stamm-personen/
│   │   ├── get-all-stamm-personen.query.ts
│   │   ├── get-all-stamm-personen.handler.ts
│   │   └── index.ts
│   ├── get-stamm-person-by-id/
│   └── stamm-person-query.mapper.ts
├── dto/
│   ├── create-stamm-person.dto.ts
│   ├── update-stamm-person.dto.ts
│   ├── stamm-person.dto.ts
│   ├── stamm-person-qualifikation.dto.ts
│   └── index.ts
└── stamm-personen-application.module.ts
```

### Infrastructure Layer
```
packages/backend/src/infrastructure/kraefte/
├── repositories/
│   └── prisma-stamm-person.repository.ts
└── mappers/
    └── prisma-stamm-person.mapper.ts
```

### Modules Layer
```
packages/backend/src/modules/kraefte/
└── controllers/
    └── admin-stamm-personen.controller.ts
```

### DI Token Update
```
packages/backend/src/infrastructure/di-tokens.ts
// Add:
STAMM_PERSON: Symbol('IStammPersonRepository'),
```

---

## Summary: Key Patterns for Story 2-0

### ✅ MUST Apply (AC1-AC6)
1. **DI Imports:** Regular `import`, NICHT `import type` für Injectable Classes
2. **DI Tokens:** Symbols in `di-tokens.ts`, NICHT inline Strings
3. **Result Pattern:** `Result<T>` für Business Errors, NO Exceptions
4. **TransactionalCommandHandler:** Für atomare Outbox-Integration
5. **NULL → undefined Mapping:** In ALLEN Mappern für ALLE optionalen Felder

### ✅ SHOULD Apply (Best Practices)
1. **Defense-in-Depth:** Validierung auf ALLEN Layern (Domain, Application, Controller)
2. **Error Code Pattern:** `StammPersonError.format()` statt String-Matching
3. **Batch-Validierung:** `existsMany()` statt Loop mit `exists()`
4. **Rate Limiting:** `ADMIN_RATE_LIMIT` (Read) vs `ADMIN_MUTATION_RATE_LIMIT` (Mutations)
5. **JSDoc "WARUM":** Erkläre Kontext, nicht offensichtliche Fakten

### ⚠️ WATCH OUT (Common Pitfalls)
1. **NULL → undefined:** Häufigster Fehler in Epic 1, IMMER `?? undefined` verwenden
2. **sortOrder Defense:** AUCH in `reconstitute()` validieren!
3. **M:N REPLACE:** Bei Update: DELETE + INSERT, NICHT merge
4. **Race Conditions:** Handler-Check ist UX, DB-Constraint ist autoritative Quelle
5. **Security:** KEINE User-Input in Exception Messages (XSS-Risiko)

### 🚀 NEW in Story 2-0
1. **Archivierung:** `archiviertAt/archiviertBy` + Domain Event
2. **Archivierungs-Validierung:** Nicht archivieren wenn in aktiven Einsätzen (TODO: Story 3-X)
3. **Default Filter:** `archiviertAt: null` als Standard in `findAll()`

---

## References

### Commits Analyzed
- 70fa8fb6: RollenDefinition + Fahrzeugtyp CRUD Implementation
- 60f086e5: Security + AC3 Compliance Fixes (Story 1-1 R12)
- 25042263: MEDIUM/LOW Review Issues Fixes (Story 1-1 R11)
- f31e57ed: Story 1.3 tasks update + API client regeneration
- a3abad70: Story 1.3 code review fixes (4 fixes)
- 62119e84: Story 1-4 marked as done after code review

### Documentation
- `/docs/sprint-artifacts/1-1-qualifikationen-verwalten.md` - Primary Blueprint
- `/docs/sprint-artifacts/1-2-fahrzeugtypen-verwalten.md` - JSON + Code Normalization
- `/docs/sprint-artifacts/1-3-rollen-definitionen-verwalten.md` - M:N Relations Blueprint
- `/docs/sprint-artifacts/epic-1-retro-2025-12-16.md` - Learnings + Tech Debt
- `/docs/sprint-artifacts/validation-report-1-3-2025-12-15.md` - AI Review Insights
- `CLAUDE.md` - AC1-AC6 Code Review Checklist

### Files Referenced
- `packages/backend/src/application/kraefte/fahrzeugtypen/commands/create-fahrzeugtyp/create-fahrzeugtyp.handler.ts` - Handler Pattern
- `packages/backend/src/infrastructure/kraefte/repositories/prisma-fahrzeugtyp.repository.ts` - Repository Pattern
- `packages/backend/src/infrastructure/http/constants/rate-limit.constants.ts` - Rate Limiting
- `packages/backend/src/infrastructure/di-tokens.ts` - DI Token Constants

---

**Document Status:** Ready for Story 2-0 Development
**Generated:** 2025-12-16
**Next Action:** Create Story 2-0 Blueprint based on these patterns
