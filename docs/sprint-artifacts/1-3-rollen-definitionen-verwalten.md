# Story 1.3: Rollen-Definitionen verwalten

Status: in-progress

## Story

As a **Admin (Maria)**,
I want **Führungsrollen mit Funkrufname und benötigten Qualifikationen definieren**,
so that **FüKw-Personal im Einsatz nur qualifizierte Personen Rollen zuweisen kann**.

## Acceptance Criteria

### AC1: Rollen auflisten
```gherkin
Given: Ich bin als Admin authentifiziert
When:  Ich GET /api/v-alpha/admin/kraefte/rollen aufrufe
Then:  Erhalte ich eine Liste aller RollenDefinitionen
And:   Jede Rolle enthält: id, name, funkrufname, beschreibung, istAktiv, sortOrder, erforderlicheQualifikationen[]
And:   erforderlicheQualifikationen enthält: qualifikationId, qualifikationName, qualifikationAbkuerzung, istPflicht
And:   Liste ist sortiert nach sortOrder ASC, dann name ASC
```

### AC2: Rolle erstellen
```gherkin
Given: Ich bin als Admin authentifiziert
When:  Ich POST /api/v-alpha/admin/kraefte/rollen mit gültigen Daten sende
       { name: "Einsatzleiter", funkrufname: "EL", beschreibung: "...", qualifikationIds: ["cuid1", "cuid2"] }
Then:  Wird die RollenDefinition erstellt mit id, createdAt, createdBy
And:   Werden RolleQualifikation Einträge für alle qualifikationIds erstellt
And:   Response enthält die vollständige Rolle mit erforderlicheQualifikationen[]
And:   HTTP Status ist 201 Created
```

### AC3: Qualifikationen verknüpfen (M:N Relation)
```gherkin
Given: Ich erstelle/bearbeite eine Rolle mit qualifikationIds
When:  Backend verarbeitet den Request
Then:  Werden M:N-Relationen in RolleQualifikation Junction Table erstellt/aktualisiert
And:   Bestehende Verknüpfungen werden ERSETZT (nicht gemergt) bei Update
And:   Alle Qualifikationen werden mit istPflicht: true verknüpft (Default)
```

### AC4: Rolle bearbeiten
```gherkin
Given: Eine RollenDefinition mit id existiert
When:  Ich PATCH /api/v-alpha/admin/kraefte/rollen/:id mit Änderungen sende
Then:  Werden nur übergebene Felder aktualisiert
And:   Bei qualifikationIds: bestehende Verknüpfungen werden komplett ersetzt
And:   updatedAt und updatedBy werden gesetzt
And:   Response enthält die aktualisierte Rolle
```

### AC5: Rolle deaktivieren
```gherkin
Given: Eine aktive RollenDefinition existiert
When:  Ich PATCH /api/v-alpha/admin/kraefte/rollen/:id/deactivate aufrufe
Then:  Wird istAktiv auf false gesetzt
And:   Rolle ist nicht mehr bei Rollen-Zuweisung im Einsatz verfügbar
And:   RolleQualifikation Verknüpfungen bleiben erhalten (Audit-Trail)
And:   Bei bereits deaktivierter Rolle: HTTP 400 mit ROLLE_ALREADY_DEACTIVATED
```

### AC6: Qualifikations-Validierung
```gherkin
Given: Admin sendet qualifikationIds mit ungültigen/nicht-existierenden IDs
When:  Backend verarbeitet den Request
Then:  HTTP 400 Bad Request mit Fehlermeldung "Qualifikation mit ID 'xyz' existiert nicht"
And:   Keine Daten werden gespeichert (Transaktion Rollback)
```

### AC7: Name Uniqueness
```gherkin
Given: Eine RollenDefinition mit name "Einsatzleiter" existiert
When:  Ich versuche eine neue Rolle mit gleichem Namen zu erstellen
Then:  HTTP 409 Conflict mit Fehlermeldung "Name 'Einsatzleiter' ist bereits vergeben"
```

### AC8: Backend-Architektur Compliance
```gherkin
Given: Implementierung folgt hexagonaler Architektur
Then:  Domain Layer enthält RollenDefinition Aggregate + RolleId Value Object
And:   Application Layer enthält Commands (Create, Update, Deactivate) + Queries (GetAll, GetById)
And:   Infrastructure Layer enthält PrismaRollenDefinitionRepository + Mapper
And:   Modules Layer enthält AdminRollenController mit OpenAPI Decorators
And:   Compliance mit AC1-AC6 Code Review Checklist (siehe Dev Notes)
```

## Tasks / Subtasks

### Domain Layer

- [ ] Task 1: Rolle-ID Value Object (AC: 8)
  - [ ] Kopieren von `qualifikation-id.ts` → `rolle-id.ts`
  - [ ] `packages/backend/src/domain/kraefte/value-objects/rolle-id.ts`
  - [ ] CUID2-Validierung identisch zu QualifikationId

- [ ] Task 2: RollenDefinition Aggregate (AC: 2, 3, 4, 5, 7, 8)
  - [ ] `packages/backend/src/domain/kraefte/aggregates/rollen-definition.aggregate.ts`
  - [ ] Props Interfaces: `CreateRollenDefinitionProps`, `ReconstituteRollenDefinitionProps`, `UpdateRollenDefinitionProps`
  - [ ] Factory Methods: `create()`, `reconstitute()`
  - [ ] Business Methods: `update()`, `deactivate()`, `reactivate()`
  - [ ] **Erforderliche Qualifikationen als embedded Value:**
    ```typescript
    interface ErforderlicheQualifikation {
      qualifikationId: string;
      istPflicht: boolean;
    }
    private _erforderlicheQualifikationen: ErforderlicheQualifikation[];
    ```
  - [ ] **Name Normalisierung:** `normalizeName(name: string): string` → `name.trim()`
  - [ ] **sortOrder Defense-in-Depth (aus Story 1-1/1-2):**
    ```typescript
    if (!Number.isFinite(props.sortOrder) || !Number.isInteger(props.sortOrder)) {
      return Result.fail('Ungültiger sortOrder');
    }
    if (props.sortOrder < 0) {
      return Result.fail('sortOrder muss >= 0 sein');
    }
    ```
  - [ ] Domain Events: `RollenDefinitionCreatedEvent`, `RollenDefinitionUpdatedEvent`

- [ ] Task 2.1: RollenDefinition Aggregate Unit Tests (AC: 8)
  - [ ] `packages/backend/src/domain/kraefte/aggregates/__tests__/rollen-definition.aggregate.spec.ts`
  - [ ] AAA Pattern mit Given-When-Then Kommentaren
  - [ ] Testfälle: create success, create validation fail, deactivate, update, update qualifikationen, Name-Normalisierung
  - [ ] `jest.clearAllMocks()` in beforeEach

- [ ] Task 3: Repository Interface (AC: 8)
  - [ ] `packages/backend/src/domain/kraefte/repositories/i-rollen-definition.repository.ts`
  - [ ] Methoden: `save()`, `findById()`, `findByName()`, `findAll()`, `exists()`
  - [ ] TransactionContext Support für Outbox Integration
  - [ ] Result Pattern für alle Methoden

- [ ] Task 4: Error Codes + Validation Constants (AC: 5, 6, 7, 8)
  - [ ] `packages/backend/src/domain/kraefte/common/rolle-error-codes.ts`
    ```typescript
    export const ROLLE_ERROR_CODES = {
      NAME_DUPLICATE: 'ROLLE_NAME_DUPLICATE',
      NOT_FOUND: 'ROLLE_NOT_FOUND',
      ALREADY_DEACTIVATED: 'ROLLE_ALREADY_DEACTIVATED',
      VALIDATION_ERROR: 'ROLLE_VALIDATION_ERROR',
      QUALIFIKATION_NOT_FOUND: 'ROLLE_QUALIFIKATION_NOT_FOUND',
    } as const;
    ```
  - [ ] `packages/backend/src/domain/kraefte/constants/rolle-validation.constants.ts`
    ```typescript
    export const ROLLE_VALIDATION = {
      NAME_MIN_LENGTH: 3,
      NAME_MAX_LENGTH: 100,
      FUNKRUFNAME_MAX_LENGTH: 50,
      BESCHREIBUNG_MAX_LENGTH: 500,
    } as const;
    ```

- [ ] Task 5: Domain Events (AC: 8)
  - [ ] `packages/backend/src/domain/kraefte/events/rollen-definition-created.event.ts`
  - [ ] `packages/backend/src/domain/kraefte/events/rollen-definition-updated.event.ts`

### Application Layer - Commands

- [ ] Task 6: CreateRollenDefinitionCommand + Handler (AC: 2, 3, 6, 8)
  - [ ] `packages/backend/src/application/kraefte/rollen/commands/create-rollen-definition/create-rollen-definition.command.ts`
  - [ ] `packages/backend/src/application/kraefte/rollen/commands/create-rollen-definition/create-rollen-definition.handler.ts`
  - [ ] **Extends TransactionalCommandHandler** für atomare Outbox-Integration
  - [ ] **Qualifikations-Validierung VOR Aggregate-Erstellung:**
    ```typescript
    // Prüfe ob alle qualifikationIds existieren
    for (const qId of command.qualifikationIds) {
      const exists = await this.qualifikationRepository.exists(QualifikationId.create(qId).value!, tx);
      if (!exists) {
        return Result.fail(`Qualifikation mit ID '${qId}' existiert nicht`);
      }
    }
    ```
  - [ ] **Name Uniqueness Check:**
    ```typescript
    const existing = await this.repository.findByName(command.name, tx);
    if (existing.isSuccess && existing.value) {
      return Result.fail(`Name '${command.name}' ist bereits vergeben`);
    }
    ```

- [ ] Task 7: UpdateRollenDefinitionCommand + Handler (AC: 3, 4, 6, 8)
  - [ ] `packages/backend/src/application/kraefte/rollen/commands/update-rollen-definition/update-rollen-definition.command.ts`
  - [ ] `packages/backend/src/application/kraefte/rollen/commands/update-rollen-definition/update-rollen-definition.handler.ts`
  - [ ] **Qualifikationen ERSETZEN nicht mergen:**
    ```typescript
    // Bei qualifikationIds: Alle bestehenden RolleQualifikation löschen, neue erstellen
    if (command.qualifikationIds !== undefined) {
      await this.deleteExistingQualifikationen(rolle.id, tx);
      await this.createQualifikationen(rolle.id, command.qualifikationIds, tx);
    }
    ```
  - [ ] Name Uniqueness nur prüfen wenn Name sich ändert

- [ ] Task 8: DeactivateRollenDefinitionCommand + Handler (AC: 5, 8)
  - [ ] `packages/backend/src/application/kraefte/rollen/commands/deactivate-rollen-definition/deactivate-rollen-definition.command.ts`
  - [ ] `packages/backend/src/application/kraefte/rollen/commands/deactivate-rollen-definition/deactivate-rollen-definition.handler.ts`
  - [ ] Prüft: Bereits deaktiviert → ROLLE_ALREADY_DEACTIVATED Error

### Application Layer - Queries

- [ ] Task 9: GetAllRollenDefinitionenQuery + Handler (AC: 1, 8)
  - [ ] `packages/backend/src/application/kraefte/rollen/queries/get-all-rollen-definitionen/get-all-rollen-definitionen.query.ts`
  - [ ] `packages/backend/src/application/kraefte/rollen/queries/get-all-rollen-definitionen/get-all-rollen-definitionen.handler.ts`
  - [ ] Filter: `istAktiv?: boolean` Query Parameter
  - [ ] **Include erforderlicheQualifikationen mit Qualifikation-Details:**
    ```typescript
    // Response enthält:
    erforderlicheQualifikationen: [
      { qualifikationId, qualifikationName, qualifikationAbkuerzung, istPflicht }
    ]
    ```

- [ ] Task 10: GetRollenDefinitionByIdQuery + Handler (AC: 1, 8)
  - [ ] `packages/backend/src/application/kraefte/rollen/queries/get-rollen-definition-by-id/get-rollen-definition-by-id.query.ts`
  - [ ] `packages/backend/src/application/kraefte/rollen/queries/get-rollen-definition-by-id/get-rollen-definition-by-id.handler.ts`

### Application Layer - DTOs

- [ ] Task 11: DTOs erstellen (AC: 1, 2, 4, 8)
  - [ ] `packages/backend/src/application/kraefte/rollen/dto/rollen-definition.dto.ts`
    ```typescript
    export class RollenDefinitionDto {
      @ApiProperty() id: string;
      @ApiProperty() name: string;
      @ApiPropertyOptional() funkrufname?: string;
      @ApiPropertyOptional() beschreibung?: string;
      @ApiProperty() istAktiv: boolean;
      @ApiProperty() sortOrder: number;
      @ApiProperty({ type: [ErforderlicheQualifikationDto] })
      erforderlicheQualifikationen: ErforderlicheQualifikationDto[];
      @ApiProperty() createdAt: Date;
      @ApiProperty() createdBy: string;
      @ApiProperty() updatedAt: Date;
      @ApiPropertyOptional() updatedBy?: string;
    }
    ```
  - [ ] `packages/backend/src/application/kraefte/rollen/dto/erforderliche-qualifikation.dto.ts`
    ```typescript
    export class ErforderlicheQualifikationDto {
      @ApiProperty() qualifikationId: string;
      @ApiProperty() qualifikationName: string;
      @ApiProperty() qualifikationAbkuerzung: string;
      @ApiProperty() istPflicht: boolean;
    }
    ```
  - [ ] `packages/backend/src/application/kraefte/rollen/dto/create-rollen-definition.dto.ts`
    ```typescript
    export class CreateRollenDefinitionDto {
      @ApiProperty() @IsString() @MinLength(3) @MaxLength(100) name: string;
      @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) funkrufname?: string;
      @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) beschreibung?: string;
      @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) qualifikationIds: string[];
    }
    ```
  - [ ] `packages/backend/src/application/kraefte/rollen/dto/update-rollen-definition.dto.ts`
    ```typescript
    export class UpdateRollenDefinitionDto {
      @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(3) @MaxLength(100) name?: string;
      @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) funkrufname?: string;
      @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) beschreibung?: string;
      @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) qualifikationIds?: string[];
    }
    ```

- [ ] Task 12: Application Module (AC: 8)
  - [ ] `packages/backend/src/application/kraefte/rollen/rollen-application.module.ts`
  - [ ] Imports: PrismaModule, OutboxModule, KraefteInfrastructureModule
  - [ ] Providers: Alle Handler Classes
  - [ ] Exports: Alle Handler Classes für Controller

### Infrastructure Layer

- [ ] Task 13: PrismaRollenDefinitionRepository (AC: 1, 2, 3, 4, 5, 8)
  - [ ] `packages/backend/src/infrastructure/kraefte/repositories/prisma-rollen-definition.repository.ts`
  - [ ] **Methoden:**
    - `save(aggregate, tx)` - Upsert RollenDefinition
    - `saveQualifikationen(rolleId, qualifikationIds, createdBy, tx)` - M:N Junction erstellen
    - `deleteQualifikationen(rolleId, tx)` - Alle Junction-Einträge löschen
    - `findById(id, tx)` - Include erforderlicheQualifikationen.qualifikation
    - `findByName(name, tx)` - Für Uniqueness Check
    - `findAll(filter, tx)` - Mit Qualifikation-Details
    - `exists(id, tx)` - Boolean check
  - [ ] **Prisma Include für Queries:**
    ```typescript
    include: {
      erforderlicheQualifikationen: {
        include: { qualifikation: true }
      }
    }
    ```
  - [ ] **Error Handling:**
    - P2002 (Unique): Name Duplikat → ROLLE_NAME_DUPLICATE
    - P2003 (FK): User/Qualifikation nicht gefunden
    - P2025 (Not Found): Bei Update/Delete

- [ ] Task 14: PrismaRollenDefinitionMapper (AC: 8)
  - [ ] `packages/backend/src/infrastructure/kraefte/mappers/prisma-rollen-definition.mapper.ts`
  - [ ] `toPersistence(aggregate)` - Domain → Prisma (ohne Junction)
  - [ ] `toDomain(entity)` - Prisma → Domain (mit erforderlicheQualifikationen)
  - [ ] `toDto(entity)` - Prisma → DTO (mit Qualifikation-Details)
  - [ ] **NULL-to-undefined Mapping (Bug-Fix aus Story 1-2):**
    ```typescript
    funkrufname: (entity.funkrufname as string | null) ?? undefined,
    beschreibung: (entity.beschreibung as string | null) ?? undefined,
    ```

### Modules Layer

- [ ] Task 15: AdminRollenController (AC: 1, 2, 4, 5, 6, 7, 8)
  - [ ] `packages/backend/src/modules/kraefte/controllers/admin-rollen.controller.ts`
  - [ ] **Endpoints:**
    | Method | Path | Handler | Success | Errors |
    |--------|------|---------|---------|--------|
    | GET | `/admin/kraefte/rollen` | GetAllRollenDefinitionenHandler | 200 | 401, 429 |
    | GET | `/admin/kraefte/rollen/:id` | GetRollenDefinitionByIdHandler | 200 | 401, 404, 429 |
    | POST | `/admin/kraefte/rollen` | CreateRollenDefinitionHandler | 201 | 400, 401, 409, 429 |
    | PATCH | `/admin/kraefte/rollen/:id` | UpdateRollenDefinitionHandler | 200 | 400, 401, 404, 409, 429 |
    | PATCH | `/admin/kraefte/rollen/:id/deactivate` | DeactivateRollenDefinitionHandler | 200 | 400, 401, 404, 429 |
  - [ ] **Class-Level Decorators:**
    ```typescript
    @Controller({ path: 'admin/kraefte/rollen', version: 'alpha' })
    @ApiTags('admin-kraefte-rollen')
    @UseGuards(AdminJwtAuthGuard)
    @Throttle({ default: { limit: 20, ttl: 60000 } })
    @ApiBearerAuth('admin-jwt')
    @ApiForbiddenResponse({ description: 'Keine Admin-Berechtigung' })
    @ApiUnauthorizedResponse({ description: 'Ungültiger/abgelaufener Token' })
    @ApiTooManyRequestsResponse({ description: 'Rate Limit überschritten' })
    @ApiInternalServerErrorResponse({ description: 'Interner Serverfehler' })
    ```
  - [ ] **Error Code Mapping:**
    ```typescript
    private mapErrorToResponse(errorCode: string, errorMessage: string) {
      switch (errorCode) {
        case ROLLE_ERROR_CODES.NAME_DUPLICATE: throw new ConflictException(errorMessage);
        case ROLLE_ERROR_CODES.NOT_FOUND: throw new NotFoundException(errorMessage);
        case ROLLE_ERROR_CODES.ALREADY_DEACTIVATED: throw new BadRequestException(errorMessage);
        case ROLLE_ERROR_CODES.QUALIFIKATION_NOT_FOUND: throw new BadRequestException(errorMessage);
        default: throw new BadRequestException(errorMessage);
      }
    }
    ```

### DI & Module Registration

- [ ] Task 16: DI Token hinzufügen (AC: 8)
  - [ ] `packages/backend/src/infrastructure/di-tokens.ts`
  - [ ] Erweitern von `KRAEFTE_REPOSITORIES`:
    ```typescript
    export const KRAEFTE_REPOSITORIES = {
      QUALIFIKATION: Symbol('IQualifikationRepository'),
      FAHRZEUGTYP: Symbol('IFahrzeugtypRepository'),
      ROLLEN_DEFINITION: Symbol('IRollenDefinitionRepository'), // NEU
    } as const;
    ```

- [ ] Task 17: Infrastructure Module erweitern (AC: 8)
  - [ ] `packages/backend/src/infrastructure/kraefte/kraefte-infrastructure.module.ts`
  - [ ] Provider hinzufügen:
    ```typescript
    {
      provide: KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION,
      useClass: PrismaRollenDefinitionRepository,
    }
    ```
  - [ ] Export: `KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION`

- [ ] Task 18: Kraefte Module erweitern (AC: 8)
  - [ ] `packages/backend/src/modules/kraefte/kraefte.module.ts`
  - [ ] Import: `RollenApplicationModule`
  - [ ] Controller: `AdminRollenController`

### Integration & Testing

- [ ] Task 19: API Client generieren
  - [ ] `pnpm run generate-api`

- [ ] Task 20: Linting & Type Check
  - [ ] `pnpm lint`
  - [ ] `pnpm --filter @bluelight-hub/backend exec tsc --noEmit`

- [ ] Task 21: Manuelle Smoke Tests (Chrome DevTools MCP)
  - [ ] GET /api/v-alpha/admin/kraefte/rollen → Liste (leer oder Seed-Daten)
  - [ ] POST mit gültigen Daten → 201 + vollständige Response
    ```json
    { "name": "Einsatzleiter", "funkrufname": "EL", "qualifikationIds": ["<valid-cuid>"] }
    ```
  - [ ] POST mit Duplikat-Name → 409 + Fehlermeldung "Name 'X' ist bereits vergeben"
  - [ ] POST mit ungültiger qualifikationId → 400 + "Qualifikation mit ID 'xyz' existiert nicht"
  - [ ] POST mit leerem Name → 400 Validierungsfehler
  - [ ] GET /api/v-alpha/admin/kraefte/rollen/:id → 200 mit erforderlicheQualifikationen[]
  - [ ] GET /api/v-alpha/admin/kraefte/rollen/invalid-id → 404 NOT_FOUND
  - [ ] PATCH /:id mit Name-Änderung → updatedAt/updatedBy gesetzt
  - [ ] PATCH /:id mit qualifikationIds → Qualifikationen werden ERSETZT
  - [ ] PATCH /:id/deactivate → istAktiv: false
  - [ ] PATCH /:id/deactivate erneut → 400 ALREADY_DEACTIVATED
  - [ ] GET /?istAktiv=true → nur aktive Rollen

## Review Follow-ups (AI)

> Code Review vom 2025-12-16 via 5 parallele Subagents. Issues die NICHT auf spätere Stories verschoben wurden.

### Kritisch (vor Story-Abschluss fixen)

- [x] [AI-Review][CRITICAL] UpdateHandler ruft `deleteQualifikationen()` + `saveQualifikationen()` nicht auf - Junction Table wird bei Update nicht synchronisiert (AC3 REPLACE-Semantik verletzt) [`update-rollen-definition.handler.ts:105-134`] **✅ Fixed 2025-12-16**
- [x] [AI-Review][HIGH] UpdateHandler validiert nicht ob neue `qualifikationIds` existieren - FK-Violation erst bei DB statt im Handler [`update-rollen-definition.handler.ts`] **✅ Fixed 2025-12-16**

### Enhancements (können in Folge-Stories oder Tech-Debt)

- [x] [AI-Review][MEDIUM] `qualifikationIds` DTO-Validierung: Nur `@IsString({ each: true })`, keine CUID-Format-Prüfung [`create-rollen-definition.dto.ts:54-56`, `update-rollen-definition.dto.ts:54-56`] **✅ Fixed 2025-12-16**
- [x] [AI-Review][MEDIUM] FindAll Controller: String-Matching `includes('Validierung')` statt `RolleError.hasCode()` - fragil bei Textänderungen [`admin-rollen.controller.ts:144-161`] **✅ Fixed 2025-12-16**

### Dokumentiert als geplant (kein Action Item)

- ℹ️ `erforderlicheQualifikationen` Response ist leer → TODO-Kommentar verweist auf Story 1-4 (M:N Join)
- ℹ️ Unit/Integration Tests übersprungen → CLAUDE.md dokumentiert temporäres Überspringen

## Dev Notes

### Kritische Architektur-Patterns (AC1-AC6 Code Review Checklist)

#### AC1: DI Import Check
```typescript
// ✅ RICHTIG: import für Injectable Classes
import { IRollenDefinitionRepository } from '@domain/kraefte/repositories/i-rollen-definition.repository';
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';

// ❌ FALSCH: import type bricht NestJS DI zur Laufzeit!
import type { IRollenDefinitionRepository } from '...';
```

#### AC2: DI Token Constants
```typescript
// ✅ RICHTIG: Symbols in di-tokens.ts
export const KRAEFTE_REPOSITORIES = {
  QUALIFIKATION: Symbol('IQualifikationRepository'),
  FAHRZEUGTYP: Symbol('IFahrzeugtypRepository'),
  ROLLEN_DEFINITION: Symbol('IRollenDefinitionRepository'), // NEU
} as const;

// Verwendung im Handler:
@Inject(KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION)
private readonly repository: IRollenDefinitionRepository

@Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
private readonly qualifikationRepository: IQualifikationRepository
```

#### AC3: Framework-Agnostizität
```typescript
// Application Layer: NUR @Injectable, @Inject, @Optional erlaubt
// VERBOTEN: @Controller, @Get, @Post, HttpException, Response, etc.

// Handler gibt Result<T> zurück, Controller mapped zu HTTP
async execute(command: CreateRollenDefinitionCommand): Promise<Result<RollenDefinitionDto>> {
  if (validation.isFailure) {
    return Result.fail(validation.error); // Kein throw!
  }
  return Result.ok(dto);
}
```

#### AC4: Result Pattern
```typescript
// Domain/Application Layer: Result<T> für alle Business-Fehler
// Exceptions nur für: DB-Fehler, Netzwerk-Fehler, Programming Errors

// Handler
protected async executeInTransaction(
  command: CreateRollenDefinitionCommand,
  tx: TransactionContext,
): Promise<Result<{ result: RollenDefinitionDto; events: DomainEvent[] }>> {
  // Qualifikation-Validierung
  for (const qId of command.qualifikationIds) {
    const exists = await this.qualifikationRepository.exists(QualifikationId.create(qId).value!, tx);
    if (!exists) {
      return Result.fail(`Qualifikation mit ID '${qId}' existiert nicht`);
    }
  }

  // Name Uniqueness
  const existing = await this.repository.findByName(command.name, tx);
  if (existing.isSuccess && existing.value) {
    return Result.fail(`Name '${command.name}' ist bereits vergeben`);
  }

  // Create Aggregate
  const rolleResult = RollenDefinition.create({ ... });
  if (rolleResult.isFailure) {
    return Result.fail(rolleResult.error);
  }

  return Result.ok({ result: dto, events });
}
```

#### AC5: TransactionalCommandHandler
```typescript
// Vollständige Imports für Handler:
import { Injectable, Inject } from '@nestjs/common';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import { DI_TOKENS } from '@infrastructure/di-tokens';
import { IRollenDefinitionRepository } from '@domain/kraefte/repositories/i-rollen-definition.repository';
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { TransactionContext } from '@infrastructure/database/transaction-context';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { Result } from '@domain/common/result';
import { DomainEvent } from '@domain/common/domain-event';

@Injectable()
export class CreateRollenDefinitionHandler extends TransactionalCommandHandler<
  CreateRollenDefinitionCommand,
  RollenDefinitionDto
> {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION)
    private readonly repository: IRollenDefinitionRepository,
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly qualifikationRepository: IQualifikationRepository,
    @Inject(DI_TOKENS.REPOSITORIES.OUTBOX)
    outboxRepository: IOutboxRepository,
    prisma: PrismaService,
  ) {
    super(outboxRepository, prisma);
  }

  protected async executeInTransaction(
    command: CreateRollenDefinitionCommand,
    tx: TransactionContext,
  ): Promise<Result<{ result: RollenDefinitionDto; events: DomainEvent[] }>> {
    // 1. Validiere alle Qualifikationen existieren
    // 2. Prüfe Name Uniqueness
    // 3. Erstelle RollenDefinition Aggregate
    // 4. Speichere Aggregate
    // 5. Speichere RolleQualifikation Einträge
    // 6. Extrahiere Events + Return
  }
}
```

#### AC6: Test Pattern (AAA mit Given-When-Then)
```typescript
describe('CreateRollenDefinitionHandler', () => {
  let handler: CreateRollenDefinitionHandler;
  let mockRepository: jest.Mocked<IRollenDefinitionRepository>;
  let mockQualifikationRepository: jest.Mocked<IQualifikationRepository>;

  beforeEach(() => {
    jest.clearAllMocks(); // WICHTIG!
    mockRepository = createMockRollenDefinitionRepository();
    mockQualifikationRepository = createMockQualifikationRepository();
    handler = new CreateRollenDefinitionHandler(
      mockRepository,
      mockQualifikationRepository,
      mockOutboxRepository,
      mockPrisma,
    );
  });

  it('should create rolle with qualifikationen successfully', async () => {
    // Given (Arrange)
    const command = CreateRollenDefinitionCommand.create({
      name: 'Einsatzleiter',
      funkrufname: 'EL',
      qualifikationIds: ['cuid1', 'cuid2'],
      createdBy: 'admin-user-id',
    }).value!;
    mockQualifikationRepository.exists.mockResolvedValue(true);
    mockRepository.findByName.mockResolvedValue(Result.ok(null));
    mockRepository.save.mockResolvedValue(Result.ok());

    // When (Act)
    const result = await handler.execute(command);

    // Then (Assert)
    expect(result.isSuccess).toBe(true);
    expect(mockQualifikationRepository.exists).toHaveBeenCalledTimes(2);
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should fail when qualifikation does not exist', async () => {
    // Given
    const command = CreateRollenDefinitionCommand.create({
      name: 'Einsatzleiter',
      qualifikationIds: ['invalid-cuid'],
      createdBy: 'admin-user-id',
    }).value!;
    mockQualifikationRepository.exists.mockResolvedValue(false);

    // When
    const result = await handler.execute(command);

    // Then
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain("Qualifikation mit ID 'invalid-cuid' existiert nicht");
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  // === TRANSACTION ROLLBACK TESTS (CRITICAL) ===

  it('should rollback transaction when second Qualifikation validation fails', async () => {
    // Given - First Qualifikation valid, second invalid
    const command = CreateRollenDefinitionCommand.create({
      name: 'Einsatzleiter',
      qualifikationIds: ['valid-cuid-1', 'invalid-cuid-2'],
      createdBy: 'admin-user-id',
    }).value!;
    mockQualifikationRepository.exists
      .mockResolvedValueOnce(true)   // First ID passes
      .mockResolvedValueOnce(false); // Second ID fails

    // When
    const result = await handler.execute(command);

    // Then - Transaction should rollback completely
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain("Qualifikation mit ID 'invalid-cuid-2' existiert nicht");
    expect(mockRepository.save).not.toHaveBeenCalled();
    expect(mockOutboxRepository.save).not.toHaveBeenCalled();
  });

  it('should rollback transaction when repository save fails', async () => {
    // Given - All validations pass but save fails
    const command = CreateRollenDefinitionCommand.create({
      name: 'Einsatzleiter',
      qualifikationIds: ['valid-cuid'],
      createdBy: 'admin-user-id',
    }).value!;
    mockQualifikationRepository.exists.mockResolvedValue(true);
    mockRepository.findByName.mockResolvedValue(Result.ok(null));
    mockRepository.save.mockResolvedValue(Result.fail('Database connection error'));

    // When
    const result = await handler.execute(command);

    // Then - Outbox should NOT be called after save failure
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Database connection error');
    expect(mockOutboxRepository.save).not.toHaveBeenCalled();
  });

  it('should rollback transaction when RolleQualifikation createMany fails', async () => {
    // Given - Aggregate saves but Junction creation fails
    const command = CreateRollenDefinitionCommand.create({
      name: 'Einsatzleiter',
      qualifikationIds: ['valid-cuid'],
      createdBy: 'admin-user-id',
    }).value!;
    mockQualifikationRepository.exists.mockResolvedValue(true);
    mockRepository.findByName.mockResolvedValue(Result.ok(null));
    mockRepository.save.mockResolvedValue(Result.ok());
    mockRepository.saveQualifikationen.mockResolvedValue(
      Result.fail('Foreign key constraint violation')
    );

    // When
    const result = await handler.execute(command);

    // Then - Should fail and Outbox should NOT be called
    expect(result.isFailure).toBe(true);
    expect(mockOutboxRepository.save).not.toHaveBeenCalled();
  });

  it('should rollback transaction when Outbox save fails', async () => {
    // Given - All operations pass but Outbox fails
    const command = CreateRollenDefinitionCommand.create({
      name: 'Einsatzleiter',
      qualifikationIds: ['valid-cuid'],
      createdBy: 'admin-user-id',
    }).value!;
    mockQualifikationRepository.exists.mockResolvedValue(true);
    mockRepository.findByName.mockResolvedValue(Result.ok(null));
    mockRepository.save.mockResolvedValue(Result.ok());
    mockRepository.saveQualifikationen.mockResolvedValue(Result.ok());
    mockOutboxRepository.save.mockRejectedValue(new Error('Outbox persistence failed'));

    // When
    const result = await handler.execute(command);

    // Then - Transaction should rollback (via TransactionalCommandHandler base class)
    expect(result.isFailure).toBe(true);
  });
});
```

### M:N Relation Handling

**Besonderheit dieser Story:** Die M:N-Relation zwischen `RollenDefinition` und `Qualifikation` via `RolleQualifikation` Junction Table erfordert besondere Behandlung:

#### Create Flow
```typescript
// 1. Validiere alle qualifikationIds existieren
// 2. Erstelle RollenDefinition
// 3. Für jede qualifikationId: Erstelle RolleQualifikation Eintrag
await prisma.rolleQualifikation.createMany({
  data: qualifikationIds.map(qId => ({
    rolleId: rolle.id,
    qualifikationId: qId,
    istPflicht: true, // Default
    createdBy: command.createdBy,
  })),
});
```

#### Update Flow (REPLACE Strategy)
```typescript
// Bei Update von qualifikationIds: ERSETZEN nicht MERGEN
// 1. Lösche alle bestehenden RolleQualifikation für diese Rolle
await prisma.rolleQualifikation.deleteMany({
  where: { rolleId: rolle.id },
});

// 2. Erstelle neue Einträge
if (command.qualifikationIds?.length) {
  await prisma.rolleQualifikation.createMany({
    data: command.qualifikationIds.map(qId => ({
      rolleId: rolle.id,
      qualifikationId: qId,
      istPflicht: true,
      createdBy: command.updatedBy,
    })),
  });
}
```

#### Query Flow (Include Qualifikation Details)
```typescript
// Prisma Query mit Include
const rolle = await prisma.rollenDefinition.findUnique({
  where: { id },
  include: {
    erforderlicheQualifikationen: {
      include: { qualifikation: true },
    },
  },
});

// Mapping zu DTO
const dto: RollenDefinitionDto = {
  ...rolle,
  erforderlicheQualifikationen: rolle.erforderlicheQualifikationen.map(rq => ({
    qualifikationId: rq.qualifikationId,
    qualifikationName: rq.qualifikation.name,
    qualifikationAbkuerzung: rq.qualifikation.abkuerzung,
    istPflicht: rq.istPflicht,
  })),
};
```

### API Response Codes

| Endpoint | Method | Success | Error Codes |
|----------|--------|---------|-------------|
| `/admin/kraefte/rollen` | GET | 200 | 401, 429 |
| `/admin/kraefte/rollen/:id` | GET | 200 | 401, 404, 429 |
| `/admin/kraefte/rollen` | POST | 201 | 400, 401, 409, 429 |
| `/admin/kraefte/rollen/:id` | PATCH | 200 | 400, 401, 404, 409, 429 |
| `/admin/kraefte/rollen/:id/deactivate` | PATCH | 200 | 400, 401, 404, 429 |

**Error Code Mapping:**
- `400 Bad Request`: Validierungsfehler (VALIDATION_ERROR), Qualifikation nicht gefunden (QUALIFIKATION_NOT_FOUND), bereits deaktiviert (ALREADY_DEACTIVATED)
- `401 Unauthorized`: Keine Admin-Authentifizierung
- `404 Not Found`: Rolle nicht gefunden (NOT_FOUND)
- `409 Conflict`: Name bereits vergeben (NAME_DUPLICATE)
- `429 Too Many Requests`: Rate Limit überschritten

### Project Structure - File Creation Checklist

**Domain Layer (8 Dateien):**
- [ ] `packages/backend/src/domain/kraefte/aggregates/rollen-definition.aggregate.ts`
- [ ] `packages/backend/src/domain/kraefte/aggregates/__tests__/rollen-definition.aggregate.spec.ts`
- [ ] `packages/backend/src/domain/kraefte/value-objects/rolle-id.ts`
- [ ] `packages/backend/src/domain/kraefte/repositories/i-rollen-definition.repository.ts`
- [ ] `packages/backend/src/domain/kraefte/constants/rolle-validation.constants.ts`
- [ ] `packages/backend/src/domain/kraefte/common/rolle-error-codes.ts`
- [ ] `packages/backend/src/domain/kraefte/events/rollen-definition-created.event.ts`
- [ ] `packages/backend/src/domain/kraefte/events/rollen-definition-updated.event.ts`

**Application Layer - Commands (6 Dateien):**
- [ ] `packages/backend/src/application/kraefte/rollen/commands/create-rollen-definition/create-rollen-definition.command.ts`
- [ ] `packages/backend/src/application/kraefte/rollen/commands/create-rollen-definition/create-rollen-definition.handler.ts`
- [ ] `packages/backend/src/application/kraefte/rollen/commands/update-rollen-definition/update-rollen-definition.command.ts`
- [ ] `packages/backend/src/application/kraefte/rollen/commands/update-rollen-definition/update-rollen-definition.handler.ts`
- [ ] `packages/backend/src/application/kraefte/rollen/commands/deactivate-rollen-definition/deactivate-rollen-definition.command.ts`
- [ ] `packages/backend/src/application/kraefte/rollen/commands/deactivate-rollen-definition/deactivate-rollen-definition.handler.ts`

**Application Layer - Queries (4 Dateien):**
- [ ] `packages/backend/src/application/kraefte/rollen/queries/get-all-rollen-definitionen/get-all-rollen-definitionen.query.ts`
- [ ] `packages/backend/src/application/kraefte/rollen/queries/get-all-rollen-definitionen/get-all-rollen-definitionen.handler.ts`
- [ ] `packages/backend/src/application/kraefte/rollen/queries/get-rollen-definition-by-id/get-rollen-definition-by-id.query.ts`
- [ ] `packages/backend/src/application/kraefte/rollen/queries/get-rollen-definition-by-id/get-rollen-definition-by-id.handler.ts`

**Application Layer - DTOs + Module (6 Dateien):**
- [ ] `packages/backend/src/application/kraefte/rollen/dto/rollen-definition.dto.ts`
- [ ] `packages/backend/src/application/kraefte/rollen/dto/erforderliche-qualifikation.dto.ts`
- [ ] `packages/backend/src/application/kraefte/rollen/dto/create-rollen-definition.dto.ts`
- [ ] `packages/backend/src/application/kraefte/rollen/dto/update-rollen-definition.dto.ts`
- [ ] `packages/backend/src/application/kraefte/rollen/dto/index.ts`
- [ ] `packages/backend/src/application/kraefte/rollen/rollen-application.module.ts`

**Infrastructure Layer (2 Dateien):**
- [ ] `packages/backend/src/infrastructure/kraefte/repositories/prisma-rollen-definition.repository.ts`
- [ ] `packages/backend/src/infrastructure/kraefte/mappers/prisma-rollen-definition.mapper.ts`

**Modules Layer (1 Datei):**
- [ ] `packages/backend/src/modules/kraefte/controllers/admin-rollen.controller.ts`

**Dateien modifizieren (3 Dateien):**
- [ ] `packages/backend/src/infrastructure/di-tokens.ts` → ROLLEN_DEFINITION Token hinzufügen
- [ ] `packages/backend/src/infrastructure/kraefte/kraefte-infrastructure.module.ts` → Repository registrieren
- [ ] `packages/backend/src/modules/kraefte/kraefte.module.ts` → Controller + Module registrieren

**Total: 27 neue Dateien + 3 Modifikationen**

### References

- [Source: docs/sprint-artifacts/1-1-qualifikationen-verwalten.md] - Primary Blueprint für CRUD Pattern
- [Source: docs/sprint-artifacts/1-2-fahrzeugtypen-verwalten.md] - Blueprint mit Code Review Learnings
- [Source: docs/sprint-artifacts/1-0-prisma-schema-admin-konfiguration.md] - Prisma Schema Definition
- [Source: docs/hexagonal-architecture.md] - Architektur-Patterns
- [Source: docs/project-context.md] - AC1-AC6 Code Review Checklist
- [Source: packages/backend/prisma/schema.prisma:595-656] - RollenDefinition + RolleQualifikation Models

### Unterschiede zu Story 1-1/1-2

| Aspekt | Story 1-1/1-2 | Story 1-3 |
|--------|---------------|-----------|
| **Unique Field** | abkuerzung / code | name |
| **M:N Relation** | Nein | Ja (RolleQualifikation Junction) |
| **Enum Kategorie** | Ja | Nein (keine Kategorien) |
| **JSON Field** | sollbesatzung (1-2) | Nein |
| **Zusatz-Validierung** | Code Normalisierung | Qualifikation-Existenz-Check |
| **Query Include** | Keine Relations | erforderlicheQualifikationen mit Details |

### Prisma Schema (aus Story 1-0)

```prisma
model RollenDefinition {
  id           String  @id @default(cuid())
  name         String  @unique @db.VarChar(100)
  funkrufname  String? @db.VarChar(50)
  beschreibung String? @db.Text
  istAktiv     Boolean @default(true)
  sortOrder    Int     @default(0)

  // Audit-Trail
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String   @db.VarChar(100)
  updatedBy String?  @db.VarChar(100)

  // Relations
  creator User  @relation("RollenDefinitionCreator", fields: [createdBy], references: [id], onDelete: Restrict)
  updater User? @relation("RollenDefinitionUpdater", fields: [updatedBy], references: [id], onDelete: SetNull)

  // M:N: Erforderliche Qualifikationen für diese Rolle
  erforderlicheQualifikationen RolleQualifikation[]

  @@index([istAktiv])
  @@index([istAktiv, sortOrder])
  @@index([createdBy])
  @@map("rollen_definitionen")
}

model RolleQualifikation {
  id              String  @id @default(cuid())
  rolleId         String
  qualifikationId String
  istPflicht      Boolean @default(true)

  // Audit-Trail
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  createdBy String   @db.VarChar(100)
  updatedBy String?  @db.VarChar(100)

  // Relations
  rolle         RollenDefinition @relation(fields: [rolleId], references: [id], onDelete: Cascade)
  qualifikation Qualifikation    @relation(fields: [qualifikationId], references: [id], onDelete: Restrict)

  // Unique Constraint
  @@unique([rolleId, qualifikationId])
  @@index([rolleId])
  @@index([qualifikationId])
  @@map("rolle_qualifikationen")
}
```

## Dev Agent Record

### Context Reference

- Story context generated via parallel subagent analysis (6 agents)
- Blueprint from Story 1-1 (Qualifikationen) + Story 1-2 (Fahrzeugtypen)
- Prisma Schema bereits vorhanden (Story 1-0)
- M:N Relation via Junction Table ist das Hauptunterscheidungsmerkmal

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101) via BMad Scrum Master Agent

### Debug Log References

### Completion Notes List

#### 2025-12-16 - Review Follow-up Fixes (4 Issues)

**[CRITICAL] UpdateHandler Junction Table Sync (AC3 REPLACE):**
- Problem: `deleteQualifikationen()` + `saveQualifikationen()` wurden nicht aufgerufen
- Lösung: Schritt 1: Alle bestehenden Verknüpfungen löschen, Schritt 2: Neue erstellen
- Datei: `update-rollen-definition.handler.ts:180-207`

**[HIGH] UpdateHandler Qualifikation Existence Validation:**
- Problem: FK-Violations erst in DB statt im Handler
- Lösung: VOR Update alle qualifikationIds validieren via `qualifikationRepository.exists()`
- Datei: `update-rollen-definition.handler.ts:115-147`

**[MEDIUM] DTO CUID2 Format Validation:**
- Problem: Nur `@IsString({ each: true })`, keine CUID-Format-Prüfung
- Lösung: `@IsCuid2({ each: true })` Decorator hinzugefügt
- Dateien: `create-rollen-definition.dto.ts`, `update-rollen-definition.dto.ts`

**[MEDIUM] Controller Fragile Error Matching:**
- Problem: `includes('Validierung')` String-Matching war fragil und Dead Code
- Lösung: Entfernt, nur InternalServerError für Repository-Fehler (Query Handler haben keine Business-Validierungen)
- Datei: `admin-rollen.controller.ts:144-152`

### File List

**Zu erstellen (27 Dateien):**
- Domain: 8 Dateien (Aggregate + Test, Value Object, Repository Interface, Constants, Error Codes, 2x Events)
- Application: 16 Dateien (6 Commands, 4 Queries, 5 DTOs + index, Module)
- Infrastructure: 2 Dateien (Repository, Mapper)
- Modules: 1 Datei (Controller)

**Zu modifizieren (3 Dateien):**
- di-tokens.ts
- kraefte-infrastructure.module.ts
- kraefte.module.ts

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2025-12-15 | Story Created | Comprehensive story context via 6 parallel subagents. M:N Relation Blueprint. Ready for development. |
| 2025-12-16 | Validation (AI) | 6-Subagent Analyse: 40/54 passed (74%), 1 CRITICAL, 7 ENHANCEMENTS, 3 OPTIMIZATIONS. Report: `validation-report-1-3-2025-12-15.md` |
| 2025-12-16 | C1 Fix Applied | Transaction Rollback Test-Spezifikationen hinzugefügt (4 neue Test Cases für Transactional Behavior) |
| 2025-12-16 | Code Review (AI) | 5-Subagent Review: 2 CRITICAL, 2 MEDIUM Action Items. Status → in-progress. Tests + erforderlicheQualifikationen-Response sind dokumentiert als geplant. |
| 2025-12-16 | Review Fixes Applied | 4 Issues behoben via 3 parallele Subagents: Junction Table Sync (CRITICAL), Qualifikation Validation (HIGH), CUID2 DTO Validation (MEDIUM), Controller Error Handling (MEDIUM). Alle AC1-AC6 Compliance Checks bestanden. |
