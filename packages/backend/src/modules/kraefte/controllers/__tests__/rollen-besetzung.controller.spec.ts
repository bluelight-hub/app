// @ts-nocheck
import { BadRequestException, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { RollenBesetzungController } from '../rollen-besetzung.controller';
import { Result } from '@domain/common/result';
import { ROLLEN_BESETZUNG_ERROR_CODES } from '@domain/kraefte/common/rollen-besetzung-error-codes';
import type { BesetzeRolleHandler } from '@application/kraefte/rollen-besetzung/commands/besetze-rolle/besetze-rolle.handler';
import type { GebeRolleFreiHandler } from '@application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/gebe-rolle-frei.handler';
import type { FindAllRollenBesetzungQueryHandler } from '@application/kraefte/rollen-besetzung/queries/find-all-rollen-besetzung/find-all-rollen-besetzung.handler';
import type { IRollenBesetzungRepository } from '@domain/kraefte/repositories/i-rollen-besetzung.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { ValidatedUser } from '@modules/auth/strategies/jwt.strategy';
import type { BesetzeRolleDto, RollenBesetzungListItemDto } from '@application/kraefte/rollen-besetzung/dto';
import type { RollenBesetzung } from '@domain/kraefte/aggregates/rollen-besetzung.aggregate';

// Mock cuid2 for deterministic test IDs
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'c';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
  isCuid: jest.fn((id: string) => {
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-z][a-z0-9]+$/.test(id);
  }),
}));

/**
 * Helper function: Generates valid CUID2-format test ID.
 * CUID2 format: 20-30 chars, lowercase a-z0-9, starts with lowercase letter.
 */
function createValidTestId(suffix = ''): string {
  const base = 'clw3h8x9y0000qwertyui';
  const safeSuffix = suffix
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .padEnd(5, '0')
    .slice(0, 5);
  return base + safeSuffix;
}

// ===== MOCK FACTORIES =====

const createMockBesetzeRolleHandler = (): jest.Mocked<BesetzeRolleHandler> =>
  ({
    execute: jest.fn().mockResolvedValue(Result.ok(createValidTestId('besetzung'))),
    // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
  }) as any;

const createMockGebeRolleFreiHandler = (): jest.Mocked<GebeRolleFreiHandler> =>
  ({
    execute: jest.fn().mockResolvedValue(Result.ok(undefined)),
    // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
  }) as any;

const createMockFindAllQueryHandler = (): jest.Mocked<FindAllRollenBesetzungQueryHandler> =>
  ({
    execute: jest.fn().mockResolvedValue(Result.ok([])),
    // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
  }) as any;

const createMockRepository = (): jest.Mocked<IRollenBesetzungRepository> =>
  ({
    findByEinsatzId: jest.fn().mockResolvedValue(Result.ok([])),
    findById: jest.fn().mockResolvedValue(Result.ok(null)),
    save: jest.fn().mockResolvedValue(Result.ok(undefined)),
    findByEinsatzIdAndRolleId: jest.fn().mockResolvedValue(Result.ok(null)),
    // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
  }) as any;

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

/**
 * Creates a mock RollenBesetzung aggregate for repository responses.
 */
const createMockRollenBesetzungAggregate = (overrides: Partial<{ id: string; einsatzId: string; einsatzPersonId: string; rolleId: string }> = {}): RollenBesetzung => {
  const id = overrides.id ?? createValidTestId('besetz');
  const einsatzId = overrides.einsatzId ?? createValidTestId('einsatz');
  const einsatzPersonId = overrides.einsatzPersonId ?? createValidTestId('person');
  const rolleId = overrides.rolleId ?? createValidTestId('rolle0');

  return {
    id: { value: id },
    einsatzId: { value: einsatzId },
    einsatzPersonId: { value: einsatzPersonId },
    rolleId: { value: rolleId },
    rollenName: 'Einsatzleiter',
    personVorname: 'Max',
    personNachname: 'Mustermann',
    createdAt: new Date('2024-01-15T10:30:00.000Z'),
    createdBy: createValidTestId('user00'),
    updatedAt: new Date('2024-01-15T10:30:00.000Z'),
    isActive: true,
    freigegebenAm: undefined,
    freigegebenVon: undefined,
    // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
  } as any;
};

/**
 * Unit Tests für RollenBesetzungController.
 *
 * **Test Strategy:**
 * - Direct Controller Instantiation Pattern (NO NestJS Test Module)
 * - Mocked Handlers mit jest.fn()
 * - Focus: Controller-Orchestration, Result-Mapping, Exception-Handling
 * - NO Handler-Logic Testing (out of scope)
 *
 * **Coverage Target:** >80% für RollenBesetzungController
 *
 * **Test Groups:**
 * 1. findAll() - GET /einsaetze/:einsatzId/rollen-besetzung
 * 2. besetzeRolle() - POST /einsaetze/:einsatzId/rollen-besetzung
 * 3. freigebenRolle() - DELETE /einsaetze/:einsatzId/rollen-besetzung/:rollenBesetzungId
 */
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
    controller = new RollenBesetzungController(mockBesetzeRolleHandler, mockGebeRolleFreiHandler, mockFindAllQueryHandler, mockRepository, mockLogger);
  });

  // ============================================
  // Test Group 1: findAll() - GET Endpoint Tests (AC1)
  // ============================================
  describe('findAll()', () => {
    const validEinsatzId = createValidTestId('einsatz');

    it('should return mapped DTOs when handler succeeds', async () => {
      // Given (Arrange)
      const mockDtos: RollenBesetzungListItemDto[] = [
        {
          id: createValidTestId('besetz1'),
          rollenName: 'Einsatzleiter',
          personName: 'Max Mustermann',
          rollenDefinitionId: createValidTestId('rolle1'),
          einsatzPersonId: createValidTestId('person1'),
        },
        {
          id: createValidTestId('besetz2'),
          rollenName: 'OrgL',
          personName: 'Anna Schmidt',
          rollenDefinitionId: createValidTestId('rolle2'),
          einsatzPersonId: createValidTestId('person2'),
        },
      ];
      mockFindAllQueryHandler.execute.mockResolvedValueOnce(Result.ok(mockDtos));

      // When (Act)
      const result = await controller.findAll(validEinsatzId);

      // Then (Assert)
      expect(result).toEqual(mockDtos);
      expect(result).toHaveLength(2);
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
      expect(result).toHaveLength(0);
      expect(mockFindAllQueryHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when query creation fails (invalid einsatzId)', async () => {
      // Given (Arrange)
      const invalidEinsatzId = 'invalid-id-format';

      // When/Then (Act/Assert)
      await expect(controller.findAll(invalidEinsatzId)).rejects.toThrow(BadRequestException);
      expect(mockFindAllQueryHandler.execute).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when handler returns failure', async () => {
      // Given (Arrange)
      mockFindAllQueryHandler.execute.mockResolvedValueOnce(Result.fail('Database connection error'));

      // When/Then (Act/Assert)
      await expect(controller.findAll(validEinsatzId)).rejects.toThrow(InternalServerErrorException);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Database connection error'), 'RollenBesetzungController');
    });
  });

  // ============================================
  // Test Group 2: besetzeRolle() - POST Endpoint Success Tests (AC2)
  // ============================================
  describe('besetzeRolle() - Success Cases', () => {
    const validEinsatzId = createValidTestId('einsatz');
    const validDto: BesetzeRolleDto = {
      einsatzPersonId: createValidTestId('person1'),
      rollenDefinitionId: createValidTestId('rolle1'),
    };

    it('should return 201 with RollenBesetzungDto when role assignment succeeds', async () => {
      // Given (Arrange)
      const createdBesetzungId = createValidTestId('besetzung');
      const mockAggregate = createMockRollenBesetzungAggregate({
        id: createdBesetzungId,
        einsatzId: validEinsatzId,
        einsatzPersonId: validDto.einsatzPersonId,
        rolleId: validDto.rollenDefinitionId,
      });

      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(Result.ok(createdBesetzungId));
      mockRepository.findByEinsatzId.mockResolvedValueOnce(Result.ok([mockAggregate]));

      // When (Act)
      const result = await controller.besetzeRolle(validEinsatzId, mockUser, validDto);

      // Then (Assert)
      expect(result.id).toBe(createdBesetzungId);
      expect(result.einsatzId).toBe(validEinsatzId);
      expect(mockBesetzeRolleHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should reload and map RollenBesetzung with all DTO fields after creation', async () => {
      // Given (Arrange)
      const createdBesetzungId = createValidTestId('besetzung');
      const mockAggregate = createMockRollenBesetzungAggregate({
        id: createdBesetzungId,
        einsatzId: validEinsatzId,
        einsatzPersonId: validDto.einsatzPersonId,
        rolleId: validDto.rollenDefinitionId,
      });

      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(Result.ok(createdBesetzungId));
      mockRepository.findByEinsatzId.mockResolvedValueOnce(Result.ok([mockAggregate]));

      // When (Act)
      const result = await controller.besetzeRolle(validEinsatzId, mockUser, validDto);

      // Then (Assert) - Verify all DTO fields are mapped
      expect(result).toMatchObject({
        id: createdBesetzungId,
        einsatzId: validEinsatzId,
        einsatzPersonId: validDto.einsatzPersonId,
        rollenDefinitionId: validDto.rollenDefinitionId,
        rollenName: 'Einsatzleiter',
        personVorname: 'Max',
        personNachname: 'Mustermann',
        createdBy: createValidTestId('user00'),
      });
      expect(result.createdAt).toBeDefined();
      expect(mockRepository.findByEinsatzId).toHaveBeenCalledTimes(1);
    });

    it('should pass userId from CurrentUser to command', async () => {
      // Given (Arrange)
      const customUserId = createValidTestId('admin0');
      const customUser = createMockUser({ userId: customUserId });
      const createdBesetzungId = createValidTestId('besetzung');
      const mockAggregate = createMockRollenBesetzungAggregate({
        id: createdBesetzungId,
        einsatzId: validEinsatzId,
      });

      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(Result.ok(createdBesetzungId));
      mockRepository.findByEinsatzId.mockResolvedValueOnce(Result.ok([mockAggregate]));

      // When (Act)
      await controller.besetzeRolle(validEinsatzId, customUser, validDto);

      // Then (Assert)
      expect(mockBesetzeRolleHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          besetztVon: customUserId,
        }),
      );
    });

    it('should log successful operation', async () => {
      // Given (Arrange)
      const createdBesetzungId = createValidTestId('besetzung');
      const mockAggregate = createMockRollenBesetzungAggregate({
        id: createdBesetzungId,
        einsatzId: validEinsatzId,
      });

      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(Result.ok(createdBesetzungId));
      mockRepository.findByEinsatzId.mockResolvedValueOnce(Result.ok([mockAggregate]));

      // When (Act)
      await controller.besetzeRolle(validEinsatzId, mockUser, validDto);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Rolle besetzt'), 'RollenBesetzungController');
    });
  });

  // ============================================
  // Test Group 3: besetzeRolle() - POST Endpoint Error Tests (AC2)
  // ============================================
  describe('besetzeRolle() - Error Cases', () => {
    const validEinsatzId = createValidTestId('einsatz');
    const validDto: BesetzeRolleDto = {
      einsatzPersonId: createValidTestId('person1'),
      rollenDefinitionId: createValidTestId('rolle1'),
    };

    it('should throw BadRequestException when command creation fails (invalid einsatzId)', async () => {
      // Given (Arrange)
      const invalidEinsatzId = 'invalid-id';

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(invalidEinsatzId, mockUser, validDto)).rejects.toThrow(BadRequestException);
      expect(mockBesetzeRolleHandler.execute).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for PERSON_NOT_FOUND error code', async () => {
      // Given (Arrange)
      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_FOUND));

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, mockUser, validDto)).rejects.toThrow(NotFoundException);
      expect(mockRepository.findByEinsatzId).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for ROLLE_NOT_FOUND error code', async () => {
      // Given (Arrange)
      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_NOT_FOUND));

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, mockUser, validDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for PERSON_NOT_QUALIFIED error code', async () => {
      // Given (Arrange)
      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_QUALIFIED));

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, mockUser, validDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for ROLLE_ALREADY_BESETZT error code', async () => {
      // Given (Arrange)
      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_ALREADY_BESETZT));

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, mockUser, validDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for INVALID_EINSATZ_CONTEXT error code', async () => {
      // Given (Arrange)
      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.INVALID_EINSATZ_CONTEXT));

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, mockUser, validDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException when repository reload fails', async () => {
      // Given (Arrange)
      const createdBesetzungId = createValidTestId('besetzung');
      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(Result.ok(createdBesetzungId));
      mockRepository.findByEinsatzId.mockResolvedValueOnce(Result.fail('Database error'));

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, mockUser, validDto)).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when created besetzung not found after reload', async () => {
      // Given (Arrange)
      const createdBesetzungId = createValidTestId('besetzung');
      const differentAggregate = createMockRollenBesetzungAggregate({
        id: createValidTestId('other0'), // Different ID - won't match
      });

      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(Result.ok(createdBesetzungId));
      mockRepository.findByEinsatzId.mockResolvedValueOnce(Result.ok([differentAggregate]));

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, mockUser, validDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ============================================
  // Test Group 4: freigebenRolle() - DELETE Endpoint Tests (AC3)
  // ============================================
  describe('freigebenRolle()', () => {
    const validEinsatzId = createValidTestId('einsatz');
    const validRollenBesetzungId = createValidTestId('besetzung');

    it('should return 200 with RolleFreigegebenResponseDto when release succeeds', async () => {
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
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Rolle freigegeben'), 'RollenBesetzungController');
    });

    it('should throw BadRequestException when command creation fails (invalid rollenBesetzungId)', async () => {
      // Given (Arrange)
      const invalidRollenBesetzungId = 'invalid-id';

      // When/Then (Act/Assert)
      await expect(controller.freigebenRolle(validEinsatzId, invalidRollenBesetzungId, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockGebeRolleFreiHandler.execute).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for ROLLEN_BESETZUNG_NOT_FOUND error code', async () => {
      // Given (Arrange)
      mockGebeRolleFreiHandler.execute.mockResolvedValueOnce(Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLEN_BESETZUNG_NOT_FOUND));

      // When/Then (Act/Assert)
      await expect(controller.freigebenRolle(validEinsatzId, validRollenBesetzungId, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for BEREITS_FREIGEGEBEN error code', async () => {
      // Given (Arrange)
      mockGebeRolleFreiHandler.execute.mockResolvedValueOnce(Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.BEREITS_FREIGEGEBEN));

      // When/Then (Act/Assert)
      await expect(controller.freigebenRolle(validEinsatzId, validRollenBesetzungId, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException for generic handler failure', async () => {
      // Given (Arrange)
      mockGebeRolleFreiHandler.execute.mockResolvedValueOnce(Result.fail('Unexpected database error'));

      // When/Then (Act/Assert)
      await expect(controller.freigebenRolle(validEinsatzId, validRollenBesetzungId, mockUser)).rejects.toThrow(InternalServerErrorException);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Unexpected error'), 'RollenBesetzungController');
    });
  });

  // ============================================
  // Test Group 5: Edge Cases & Defensive Branches
  // ============================================
  describe('Edge Cases', () => {
    const validEinsatzId = createValidTestId('einsatz');
    const validRollenBesetzungId = createValidTestId('besetzung');
    const validDto: BesetzeRolleDto = {
      einsatzPersonId: createValidTestId('person1'),
      rollenDefinitionId: createValidTestId('rolle1'),
    };

    it('should return empty array when result.value is null in findAll', async () => {
      // Given (Arrange) - Defensive branch: result.value ?? []
      mockFindAllQueryHandler.execute.mockResolvedValueOnce(Result.ok(null as unknown as RollenBesetzungListItemDto[]));

      // When (Act)
      const result = await controller.findAll(validEinsatzId);

      // Then (Assert)
      expect(result).toEqual([]);
    });

    it('should throw InternalServerErrorException when handler returns success with null value in besetzeRolle', async () => {
      // Given (Arrange) - Defensive branch: if (!rollenBesetzungId)
      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(Result.ok(null as unknown as string));

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, mockUser, validDto)).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException with generic error path in besetzeRolle', async () => {
      // Given (Arrange) - Tests the generic error path (lines 207-211)
      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(Result.fail('UNKNOWN_ERROR_CODE'));

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, mockUser, validDto)).rejects.toThrow(InternalServerErrorException);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('UNKNOWN_ERROR_CODE'), 'RollenBesetzungController');
    });

    it('should throw InternalServerErrorException when result.error is null/empty in besetzeRolle', async () => {
      // Given (Arrange) - Tests error ?? '' fallback
      mockBesetzeRolleHandler.execute.mockResolvedValueOnce(Result.fail(null as unknown as string));

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, mockUser, validDto)).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when result.error is null/empty in freigebenRolle', async () => {
      // Given (Arrange) - Tests error ?? '' fallback
      mockGebeRolleFreiHandler.execute.mockResolvedValueOnce(Result.fail(null as unknown as string));

      // When/Then (Act/Assert)
      await expect(controller.freigebenRolle(validEinsatzId, validRollenBesetzungId, mockUser)).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle empty einsatzId in findAll', async () => {
      // Given (Arrange)
      const emptyEinsatzId = '';

      // When/Then (Act/Assert)
      await expect(controller.findAll(emptyEinsatzId)).rejects.toThrow(BadRequestException);
    });

    it('should handle empty einsatzPersonId in besetzeRolle', async () => {
      // Given (Arrange)
      const invalidDto: BesetzeRolleDto = {
        einsatzPersonId: '',
        rollenDefinitionId: createValidTestId('rolle1'),
      };

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, mockUser, invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle empty rollenDefinitionId in besetzeRolle', async () => {
      // Given (Arrange)
      const invalidDto: BesetzeRolleDto = {
        einsatzPersonId: createValidTestId('person1'),
        rollenDefinitionId: '',
      };

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, mockUser, invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should handle empty user.userId in besetzeRolle', async () => {
      // Given (Arrange)
      const invalidUser = createMockUser({ userId: '' });

      // When/Then (Act/Assert)
      await expect(controller.besetzeRolle(validEinsatzId, invalidUser, validDto)).rejects.toThrow(BadRequestException);
    });
  });
});
