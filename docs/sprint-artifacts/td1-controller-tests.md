# Story TD1.2: Controller Unit Tests für RollenBesetzung

Status: review

## Story

As a **Developer**,
I want **comprehensive unit tests for RollenBesetzungController**,
so that **HTTP layer behavior, error mapping, and request validation are verified**.

## Hintergrund

Diese Story ist Teil des **Tech Debt Sprint 1**, entstanden aus der Epic 5 Retrospektive.
Der `RollenBesetzungController` hat aktuell **0% Test Coverage**.

**Referenz:** Story 5.1 und 5.2 haben AC-Tests für Command/Query Handler, aber Controller-Tests wurden ausgelassen.

**Wichtig:** Der Controller ist die HTTP-Schnittstelle mit drei Endpoints:
1. `GET /einsaetze/:einsatzId/rollen-besetzung` - Alle aktiven Besetzungen auflisten
2. `POST /einsaetze/:einsatzId/rollen-besetzung` - Rolle besetzen (mit Qualifikationsprüfung)
3. `DELETE /einsaetze/:einsatzId/rollen-besetzung/:rollenBesetzungId` - Rolle freigeben

## Acceptance Criteria

### AC1: GET Endpoint Tests (findAll)
- [x] Test: Happy Path - Handler gibt DTOs zurück, Controller gibt Array zurück
- [x] Test: Empty Array - Handler gibt `[]` zurück, Controller gibt `[]` zurück
- [x] Test: Query Creation Failure - Ungültige einsatzId → BadRequestException
- [x] Test: Handler Failure - Handler gibt Result.fail zurück → InternalServerErrorException

### AC2: POST Endpoint Tests (besetzeRolle)
- [x] Test: Happy Path - Handler erfolgreich, Repository Reload erfolgreich → 201 + RollenBesetzungDto
- [x] Test: Happy Path - Repository Reload + DTO Mapping korrekt (alle Felder verifiziert)
- [x] Test: Command Creation Failure - Ungültige einsatzId → BadRequestException (Handler nicht aufgerufen)
- [x] Test: PERSON_NOT_FOUND Error Code → NotFoundException (404)
- [x] Test: ROLLE_NOT_FOUND Error Code → NotFoundException (404)
- [x] Test: PERSON_NOT_QUALIFIED Error Code → BadRequestException (400)
- [x] Test: ROLLE_ALREADY_BESETZT Error Code → ConflictException (409)
- [x] Test: INVALID_EINSATZ_CONTEXT Error Code → BadRequestException (400)
- [x] Test: Repository Reload Failure nach Success → InternalServerErrorException
- [x] Test: Created Besetzung nicht gefunden nach Reload → InternalServerErrorException
- [x] Test: userId aus CurrentUser in Command übergeben

### AC3: DELETE Endpoint Tests (freigebenRolle)
- [x] Test: Happy Path - Handler erfolgreich → 200 + RolleFreigegebenResponseDto
- [x] Test: Command Creation Failure - Ungültige rollenBesetzungId → BadRequestException
- [x] Test: ROLLEN_BESETZUNG_NOT_FOUND Error Code → NotFoundException (404)
- [x] Test: BEREITS_FREIGEGEBEN Error Code → BadRequestException (400)
- [x] Test: Generic Handler Failure → InternalServerErrorException

### AC4: Test-Pattern Compliance (AC6 CLAUDE.md)
- [x] AAA Pattern mit Given-When-Then Kommentaren
- [x] `jest.clearAllMocks()` in beforeEach
- [x] Direct Instantiation Pattern (kein NestJS TestingModule)
- [x] CUID2-valide Test-IDs mit Helper-Funktion
- [x] Mindestens 20 Unit Tests gesamt (30 implementiert)

## Tasks / Subtasks

- [x] Task 1: Test-Setup erstellen (AC: 4)
  - [x] Erstelle `__tests__/rollen-besetzung.controller.spec.ts` neben Controller
  - [x] Mock-Factories für alle Handler, Repository und Logger
  - [x] ValidatedUser Mock-Factory
  - [x] CUID2 Test-ID Helper-Funktion

- [x] Task 2: GET Endpoint Tests (AC: 1)
  - [x] Test: `should return mapped DTOs when handler succeeds`
  - [x] Test: `should return empty array when handler returns empty list`
  - [x] Test: `should throw BadRequestException when query creation fails`
  - [x] Test: `should throw InternalServerErrorException when handler returns failure`

- [x] Task 3: POST Endpoint Tests - Success Cases (AC: 2)
  - [x] Test: `should return 201 with RollenBesetzungDto when role assignment succeeds`
  - [x] Test: `should reload and map RollenBesetzung with all DTO fields after creation`
  - [x] Test: `should pass userId from CurrentUser to command`
  - [x] Test: `should log successful operation`

- [x] Task 4: POST Endpoint Tests - Error Cases (AC: 2)
  - [x] Test: `should throw BadRequestException when command creation fails`
  - [x] Test: `should throw NotFoundException for PERSON_NOT_FOUND error code`
  - [x] Test: `should throw NotFoundException for ROLLE_NOT_FOUND error code`
  - [x] Test: `should throw BadRequestException for PERSON_NOT_QUALIFIED error code`
  - [x] Test: `should throw ConflictException for ROLLE_ALREADY_BESETZT error code`
  - [x] Test: `should throw BadRequestException for INVALID_EINSATZ_CONTEXT error code`
  - [x] Test: `should throw InternalServerErrorException when repository reload fails`
  - [x] Test: `should throw InternalServerErrorException when created besetzung not found after reload`

- [x] Task 5: DELETE Endpoint Tests (AC: 3)
  - [x] Test: `should return 200 with RolleFreigegebenResponseDto when release succeeds`
  - [x] Test: `should throw BadRequestException when command creation fails`
  - [x] Test: `should throw NotFoundException for ROLLEN_BESETZUNG_NOT_FOUND error code`
  - [x] Test: `should throw BadRequestException for BEREITS_FREIGEGEBEN error code`
  - [x] Test: `should throw InternalServerErrorException for generic handler failure`

- [x] Task 6: Verifizierung
  - [x] Alle Tests grün: `pnpm --filter @bluelight-hub/backend exec jest rollen-besetzung.controller.spec.ts`
  - [x] Coverage-Check für Controller >80% (97.53% Stmts, 89.58% Branches)

## Dev Notes

### Controller-Signatur

```typescript
@Controller('einsaetze/:einsatzId/rollen-besetzung')
@UseGuards(JwtAuthGuard, RolesGuard)
@Throttle({ default: ADMIN_RATE_LIMIT })
@ApiTags('kraefte')
export class RollenBesetzungController {
  constructor(
    private readonly besetzeRolleHandler: BesetzeRolleHandler,
    private readonly gebeRolleFreiHandler: GebeRolleFreiHandler,
    private readonly findAllQueryHandler: FindAllRollenBesetzungQueryHandler,
    @Inject(KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG)
    private readonly rollenBesetzungRepository: IRollenBesetzungRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}
}
```

**Pfad:** `packages/backend/src/modules/kraefte/controllers/rollen-besetzung.controller.ts`

### Endpoint Flows

#### GET /einsaetze/:einsatzId/rollen-besetzung
```typescript
async findAll(@Param('einsatzId', ParseCuidPipe) einsatzId: string): Promise<RollenBesetzungListItemDto[]> {
  // 1. Query erstellen + validieren
  const queryResult = FindAllRollenBesetzungQuery.create(einsatzId);
  if (queryResult.isFailure) {
    throw new BadRequestException(queryResult.error);
  }

  // 2. Handler ausführen
  const result = await this.findAllQueryHandler.execute(queryResult.value);
  if (result.isFailure) {
    this.logger.error(result.error, 'RollenBesetzungController');
    throw new InternalServerErrorException('Fehler beim Laden der Rollenbesetzungen');
  }

  return result.value ?? [];
}
```

#### POST /einsaetze/:einsatzId/rollen-besetzung
```typescript
async besetzeRolle(
  @Param('einsatzId', ParseCuidPipe) einsatzId: string,
  @CurrentUser() user: ValidatedUser,
  @Body() dto: BesetzeRolleDto
): Promise<RollenBesetzungDto> {
  // 1. Command erstellen + validieren
  const commandResult = BesetzeRolleCommand.create({
    einsatzId,
    einsatzPersonId: dto.einsatzPersonId,
    rollenDefinitionId: dto.rollenDefinitionId,
    besetztVon: user.userId,
  });
  if (commandResult.isFailure) {
    throw new BadRequestException(commandResult.error);
  }

  // 2. Handler ausführen
  const result = await this.besetzeRolleHandler.execute(commandResult.value);
  if (result.isFailure) {
    // Error Code Mapping!
    const error = result.error ?? '';
    if (error === ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_FOUND)
      throw new NotFoundException('EinsatzPerson nicht gefunden');
    if (error === ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_NOT_FOUND)
      throw new NotFoundException('RollenDefinition nicht gefunden');
    if (error === ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_QUALIFIED)
      throw new BadRequestException('Person besitzt nicht alle erforderlichen Qualifikationen');
    if (error === ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_ALREADY_BESETZT)
      throw new ConflictException('Rolle bereits besetzt');

    this.logger.error(`Unexpected error: ${error}`, 'RollenBesetzungController');
    throw new InternalServerErrorException('Fehler beim Besetzen der Rolle');
  }

  // 3. Reload für Response DTO (N+1 Pattern)
  const rollenBesetzungId = result.value;
  const einsatzIdResult = EinsatzId.create(einsatzId);
  const besetzungenResult = await this.rollenBesetzungRepository.findByEinsatzId(einsatzIdResult.value!);

  if (besetzungenResult.isFailure) {
    this.logger.error(besetzungenResult.error, 'RollenBesetzungController');
    throw new InternalServerErrorException('Fehler beim Laden der erstellten Rollenbesetzung');
  }

  const createdBesetzung = besetzungenResult.value?.find((b) => b.id.value === rollenBesetzungId);
  if (!createdBesetzung) {
    throw new InternalServerErrorException('Erstellte Rollenbesetzung nicht gefunden');
  }

  this.logger.log(`Rolle besetzt: ${rollenBesetzungId}`, 'RollenBesetzungController');
  return PrismaRollenBesetzungMapper.toDto(createdBesetzung);
}
```

#### DELETE /einsaetze/:einsatzId/rollen-besetzung/:rollenBesetzungId
```typescript
async freigebenRolle(
  @Param('einsatzId', ParseCuidPipe) _einsatzId: string,  // Nicht verwendet, nur URL-Hierarchie
  @Param('rollenBesetzungId', ParseCuidPipe) rollenBesetzungId: string,
  @CurrentUser() user: ValidatedUser
): Promise<RolleFreigegebenResponseDto> {
  // 1. Command erstellen + validieren
  const commandResult = GebeRolleFreiCommand.create({
    rollenBesetzungId,
    freigegebenVon: user.userId,
  });
  if (commandResult.isFailure) {
    throw new BadRequestException(commandResult.error);
  }

  // 2. Handler ausführen
  const result = await this.gebeRolleFreiHandler.execute(commandResult.value);
  if (result.isFailure) {
    const error = result.error ?? '';
    if (error === ROLLEN_BESETZUNG_ERROR_CODES.ROLLEN_BESETZUNG_NOT_FOUND)
      throw new NotFoundException('Rollenbesetzung nicht gefunden');
    if (error === ROLLEN_BESETZUNG_ERROR_CODES.BEREITS_FREIGEGEBEN)
      throw new BadRequestException('Rolle wurde bereits freigegeben');

    this.logger.error(`Unexpected error: ${error}`, 'RollenBesetzungController');
    throw new InternalServerErrorException('Fehler beim Freigeben der Rolle');
  }

  return { id: rollenBesetzungId, message: 'Rolle erfolgreich freigegeben' };
}
```

### Mock-Setup Pattern (Direct Instantiation)

```typescript
import { Result } from '@domain/common/result';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import { ROLLEN_BESETZUNG_ERROR_CODES } from '@domain/kraefte/common/rollen-besetzung-error-codes';
import type { IRollenBesetzungRepository } from '@domain/kraefte/repositories/i-rollen-besetzung.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { BesetzeRolleHandler } from '@application/kraefte/rollen-besetzung/commands/besetze-rolle/besetze-rolle.handler';
import type { GebeRolleFreiHandler } from '@application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/gebe-rolle-frei.handler';
import type { FindAllRollenBesetzungQueryHandler } from '@application/kraefte/rollen-besetzung/queries/find-all-rollen-besetzung/find-all-rollen-besetzung.handler';
import type { ValidatedUser } from '@modules/auth/decorators/current-user.decorator';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

// CUID2-valide Test-ID Generator
function createValidTestId(suffix = ''): string {
  const base = 'clw3h8x9y0000qwertyui';
  const safeSuffix = suffix
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .padEnd(5, '0')
    .slice(0, 5);
  return base + safeSuffix;
}

// Mock Factories
const createMockBesetzeRolleHandler = (): jest.Mocked<BesetzeRolleHandler> => ({
  execute: jest.fn().mockResolvedValue(Result.ok(createValidTestId('besetzung'))),
  // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
} as any);

const createMockGebeRolleFreiHandler = (): jest.Mocked<GebeRolleFreiHandler> => ({
  execute: jest.fn().mockResolvedValue(Result.ok(undefined)),
  // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
} as any);

const createMockFindAllQueryHandler = (): jest.Mocked<FindAllRollenBesetzungQueryHandler> => ({
  execute: jest.fn().mockResolvedValue(Result.ok([])),
  // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
} as any);

const createMockRepository = (): jest.Mocked<IRollenBesetzungRepository> => ({
  findByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])),
  findById: jest.fn().mockResolvedValue(Result.ok(null)),
  save: jest.fn().mockResolvedValue(Result.ok(undefined)),
  findByEinsatzIdAndRolleId: jest.fn().mockResolvedValue(Result.ok(null)),
  delete: jest.fn().mockResolvedValue(Result.ok(undefined)),  // Expliziter Rückgabewert für Konsistenz
});

const createMockLogger = (): jest.Mocked<ILogger> => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const createMockUser = (overrides: Partial<ValidatedUser> = {}): ValidatedUser => ({
  userId: createValidTestId('user00'),
  email: 'test@example.com',
  role: 'ADMIN',
  ...overrides,
});
```

### Test-Struktur Vorlage

```typescript
describe('RollenBesetzungController', () => {
  let controller: RollenBesetzungController;
  let mockBesetzeRolleHandler: jest.Mocked<BesetzeRolleHandler>;
  let mockGebeRolleFreiHandler: jest.Mocked<GebeRolleFreiHandler>;
  let mockFindAllQueryHandler: jest.Mocked<FindAllRollenBesetzungQueryHandler>;
  let mockRepository: jest.Mocked<IRollenBesetzungRepository>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockUser: ValidatedUser;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBesetzeRolleHandler = createMockBesetzeRolleHandler();
    mockGebeRolleFreiHandler = createMockGebeRolleFreiHandler();
    mockFindAllQueryHandler = createMockFindAllQueryHandler();
    mockRepository = createMockRepository();
    mockLogger = createMockLogger();
    mockUser = createMockUser();

    // Direct Instantiation - KEIN NestJS TestingModule!
    controller = new RollenBesetzungController(
      mockBesetzeRolleHandler,
      mockGebeRolleFreiHandler,
      mockFindAllQueryHandler,
      mockRepository,
      mockLogger,
    );
  });

  describe('findAll()', () => {
    const validEinsatzId = createValidTestId('einsatz');

    it('should return mapped DTOs when handler succeeds', async () => {
      // Given (Arrange)
      const mockDtos = [
        {
          id: createValidTestId('besetz1'),
          rollenName: 'Einsatzleiter',
          personName: 'Max Mustermann',
          rollenDefinitionId: createValidTestId('rolle1'),
          einsatzPersonId: createValidTestId('person1'),
        },
      ];
      mockFindAllQueryHandler.execute.mockResolvedValueOnce(Result.ok(mockDtos));

      // When (Act)
      const result = await controller.findAll(validEinsatzId);

      // Then (Assert)
      expect(result).toEqual(mockDtos);
      expect(mockFindAllQueryHandler.execute).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return empty array when handler returns empty list', async () => {
      // Given (Arrange)
      mockFindAllQueryHandler.execute.mockResolvedValueOnce(Result.ok([]));

      // When (Act)
      const result = await controller.findAll(validEinsatzId);

      // Then (Assert)
      expect(result).toEqual([]);
    });

    it('should throw InternalServerErrorException when handler returns failure', async () => {
      // Given (Arrange)
      mockFindAllQueryHandler.execute.mockResolvedValueOnce(
        Result.fail('Database connection error')
      );

      // When/Then (Act/Assert)
      await expect(controller.findAll(validEinsatzId))
        .rejects.toThrow(InternalServerErrorException);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database connection error',
        'RollenBesetzungController'
      );
    });
  });

  describe('besetzeRolle()', () => {
    const validEinsatzId = createValidTestId('einsatz');
    const validDto = {
      einsatzPersonId: createValidTestId('person1'),
      rollenDefinitionId: createValidTestId('rolle1'),
    };

    it('should throw NotFoundException for PERSON_NOT_FOUND error code', async () => {
      // Given (Arrange)
      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(
        Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_FOUND)
      );

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, mockUser, validDto))
        .rejects.toThrow(NotFoundException);
      expect(mockRepository.findByEinsatzId).not.toHaveBeenCalled();
    });

    it('should throw ConflictException for ROLLE_ALREADY_BESETZT error code', async () => {
      // Given (Arrange)
      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(
        Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_ALREADY_BESETZT)
      );

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, mockUser, validDto))
        .rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for INVALID_EINSATZ_CONTEXT error code', async () => {
      // Given (Arrange)
      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(
        Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.INVALID_EINSATZ_CONTEXT)
      );

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, mockUser, validDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('freigebenRolle()', () => {
    const validEinsatzId = createValidTestId('einsatz');
    const validRollenBesetzungId = createValidTestId('besetzung');

    it('should return RolleFreigegebenResponseDto when release succeeds', async () => {
      // Given (Arrange)
      mockGebeRolleFreiHandler.execute.mockResolvedValueOnce(Result.ok(undefined));

      // When (Act)
      const result = await controller.freigebenRolle(validEinsatzId, validRollenBesetzungId, mockUser);

      // Then (Assert)
      expect(result).toEqual({
        id: validRollenBesetzungId,
        message: 'Rolle erfolgreich freigegeben',
      });
      expect(mockGebeRolleFreiHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for BEREITS_FREIGEGEBEN error code', async () => {
      // Given (Arrange)
      mockGebeRolleFreiHandler.execute.mockResolvedValueOnce(
        Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.BEREITS_FREIGEGEBEN)
      );

      // When/Then (Act/Assert)
      await expect(controller.freigebenRolle(validEinsatzId, validRollenBesetzungId, mockUser))
        .rejects.toThrow(BadRequestException);
    });
  });
});
```

### Error Codes und HTTP-Mapping

| Error Code | HTTP Status | Exception | Endpoint |
|------------|-------------|-----------|----------|
| `PERSON_NOT_FOUND` | 404 | NotFoundException | POST |
| `ROLLE_NOT_FOUND` | 404 | NotFoundException | POST |
| `PERSON_NOT_QUALIFIED` | 400 | BadRequestException | POST |
| `ROLLE_ALREADY_BESETZT` | 409 | ConflictException | POST |
| `INVALID_EINSATZ_CONTEXT` | 400 | BadRequestException | POST |
| `ROLLEN_BESETZUNG_NOT_FOUND` | 404 | NotFoundException | DELETE |
| `BEREITS_FREIGEGEBEN` | 400 | BadRequestException | DELETE |
| Generic/Unexpected | 500 | InternalServerErrorException | Alle |
| Command/Query Validation | 400 | BadRequestException | Alle |

### Wichtige Architektur-Details

| Aspekt | Detail |
|--------|--------|
| **Guards** | JwtAuthGuard + RolesGuard auf Controller-Ebene (NICHT in Unit Tests gemockt) |
| **Rate Limiting** | @Throttle Decorator (NICHT in Unit Tests relevant) |
| **ParseCuidPipe** | Validiert CUID2-Format, wirft BadRequestException bei Fehler |
| **Repository Reload** | POST lädt Besetzung nach Create neu für vollständige Response |
| **Direct Instantiation** | Kein NestJS TestingModule, direkte Constructor-Injektion |
| **Error Code Mapping** | Controller mappt Domain Error Codes zu HTTP Exceptions |

### Imports für Test-Datei

```typescript
import { RollenBesetzungController } from '../rollen-besetzung.controller';
import { Result } from '@domain/common/result';
import { ROLLEN_BESETZUNG_ERROR_CODES } from '@domain/kraefte/common/rollen-besetzung-error-codes';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { BesetzeRolleHandler } from '@application/kraefte/rollen-besetzung/commands/besetze-rolle/besetze-rolle.handler';
import type { GebeRolleFreiHandler } from '@application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/gebe-rolle-frei.handler';
import type { FindAllRollenBesetzungQueryHandler } from '@application/kraefte/rollen-besetzung/queries/find-all-rollen-besetzung/find-all-rollen-besetzung.handler';
import type { IRollenBesetzungRepository } from '@domain/kraefte/repositories/i-rollen-besetzung.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { ValidatedUser } from '@modules/auth/decorators/current-user.decorator';
import type { BesetzeRolleDto } from '@application/kraefte/rollen-besetzung/dto/besetze-rolle.dto';
```

### References

- [Controller: rollen-besetzung.controller.ts](packages/backend/src/modules/kraefte/controllers/rollen-besetzung.controller.ts)
- [Error Codes: rollen-besetzung-error-codes.ts](packages/backend/src/domain/kraefte/common/rollen-besetzung-error-codes.ts)
- [BesetzeRolleHandler](packages/backend/src/application/kraefte/rollen-besetzung/commands/besetze-rolle/besetze-rolle.handler.ts)
- [GebeRolleFreiHandler](packages/backend/src/application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/gebe-rolle-frei.handler.ts)
- [FindAllRollenBesetzungQueryHandler](packages/backend/src/application/kraefte/rollen-besetzung/queries/find-all-rollen-besetzung/find-all-rollen-besetzung.handler.ts)
- [Test Pattern Reference: etb-cqrs.controller.spec.ts](packages/backend/src/modules/etb/controllers/__tests__/etb-cqrs.controller.spec.ts)
- [CLAUDE.md#AC6 - Test Pattern Requirements](CLAUDE.md)

## Dev Agent Record

### Context Reference

Story erstellt basierend auf:
- Epic 5 Retrospektive Action Items
- **3-fache Subagent-Analyse:**
  1. Controller-Analyse: Alle Endpoints, DTOs, Handler-Aufrufe, Error Mapping
  2. Test-Pattern-Analyse: Best Practices aus existierenden Controller-Tests
  3. Handler-Referenz: Signaturen, Error Codes, DI-Tokens
- **Validiert:** 2025-12-28

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Validation Notes

- Controller-Code vollständig analysiert (3 Endpoints)
- Error Code Mapping verifiziert (7 Error Codes inkl. INVALID_EINSATZ_CONTEXT)
- Test-Pattern aus etb-cqrs.controller.spec.ts extrahiert
- Direct Instantiation Pattern identifiziert (kein NestJS TestingModule)
- Mock-Factories für alle Dependencies erstellt
- **Validiert:** 2025-12-28 via 4-fach Subagent-Analyse (Controller, Test-Pattern, Error Codes, Imports)

### Completion Notes List

- **2025-12-28:** Story TD1.2 vollständig implementiert
  - 30 Unit Tests für RollenBesetzungController erstellt
  - Coverage: 97.53% Lines, 89.58% Branches (über 80% Threshold)
  - Test Groups: GET (4), POST Success (4), POST Error (8), DELETE (5), Edge Cases (9)
  - Alle 26 ACs und 21+ geforderte Tests erfüllt
  - Direct Instantiation Pattern, AAA Pattern mit Given-When-Then Kommentaren
  - CUID2 Test-ID Helper, Mock-Factories für alle Dependencies

### File List

**Neue Dateien:**
- `packages/backend/src/modules/kraefte/controllers/__tests__/rollen-besetzung.controller.spec.ts`

**Modifizierte Dateien:**
- `docs/sprint-artifacts/td1-controller-tests.md` (diese Story-Datei)
- `docs/sprint-artifacts/sprint-status.yaml` (Status-Update)
