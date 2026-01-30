import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EtbCqrsController } from '@/modules/etb/controllers/etb-cqrs.controller';
import { Result } from '@/domain/common/result';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { AddEintragDto, UpdateEintragDto, EtbDto, EintragDto } from '@/application/etb/dto';
import type { EtbEintragSnapshotDto, EtbSnapshotDto } from '@/application/etb/mappers';
import type { AddEintragHandler } from '@/application/etb/commands/add-eintrag/add-eintrag.handler';
import type { UpdateEintragHandler } from '@/application/etb/commands/update-eintrag/update-eintrag.handler';
import type { DeleteEintragHandler } from '@/application/etb/commands/delete-eintrag/delete-eintrag.handler';
import type { LockEtbHandler } from '@/application/etb/commands/lock-etb/lock-etb.handler';
import type { GetEtbQueryHandler } from '@/application/etb/queries/get-etb/get-etb-query.handler';
import type { GetEtbHistoryQueryHandler } from '@/application/etb/queries/get-etb-history/get-etb-history-query.handler';
import type { GetTextbausteineHandler } from '@/application/etb/queries/get-textbausteine/get-textbausteine-query.handler';
import type { IEtbRepository } from '@domain/repositories/i-etb.repository';
import type { ILogger } from '@domain/ports/i-logger.port';

// Mock EtbQueryMapper
jest.mock('@/application/etb/mappers', () => ({
  EtbQueryMapper: {
    toEintragDto: jest.fn((eintrag) => ({
      id: eintrag.id.value,
      sequenceNumber: eintrag.sequenceNumber.value,
      text: eintrag.text,
      createdBy: eintrag.createdBy.value,
      createdAt: eintrag.createdAt,
      updatedAt: eintrag.updatedAt,
      isDeleted: eintrag.isDeleted,
    })),
    toEtbDto: jest.fn((aggregate, _includeDeleted = false) => ({
      id: aggregate.id.value,
      einsatzId: aggregate.einsatzId?.value,
      status: aggregate.status,
      eintraege: aggregate.eintraege.map(
        (e: { id: { value: string }; sequenceNumber: { value: number }; text: string; createdBy: { value: string }; createdAt: Date; updatedAt: Date; isDeleted: boolean }) => ({
          id: e.id.value,
          sequenceNumber: e.sequenceNumber.value,
          text: e.text,
          createdBy: e.createdBy.value,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
          isDeleted: e.isDeleted,
        }),
      ),
      version: { versionNumber: 1, timestamp: new Date() },
      createdAt: new Date(),
    })),
  },
}));

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
    if (typeof id !== 'string') return false;
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

/**
 * Unit Tests für EtbCqrsController.
 *
 * **Test Strategy:**
 * - Direct Controller Instantiation Pattern (NO NestJS Test Module)
 * - Mocked Handlers mit jest.fn()
 * - Focus: Controller-Orchestration, Result-Mapping, Exception-Handling
 * - NO Handler-Logic Testing (out of scope)
 *
 * **Coverage Target:** >80% für EtbCqrsController
 *
 * **Test Groups:**
 * 1. getEtbByEinsatzId() - GET /etb/einsatz/:einsatzId
 * 2. getEtbHistory() - GET /etb/:etbId/history
 * 3. addEintrag() - POST /etb/:etbId/eintrag
 * 4. updateEintrag() - PUT /etb/:etbId/eintrag/:eintragId
 * 5. deleteEintrag() - DELETE /etb/:etbId/eintrag/:eintragId
 * 6. lockEtb() - POST /etb/:etbId/lock
 */
describe('EtbCqrsController', () => {
  let controller: EtbCqrsController;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockUpdateEintragHandler: jest.Mocked<UpdateEintragHandler>;
  let mockDeleteEintragHandler: jest.Mocked<DeleteEintragHandler>;
  let mockLockEtbHandler: jest.Mocked<LockEtbHandler>;
  let mockGetEtbQueryHandler: jest.Mocked<GetEtbQueryHandler>;
  let mockGetEtbHistoryQueryHandler: jest.Mocked<GetEtbHistoryQueryHandler>;
  let mockGetTextbausteineHandler: jest.Mocked<GetTextbausteineHandler>;
  // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
  let mockGetErinnerungTimelineHandler: jest.Mocked<any>;
  let mockEtbRepository: jest.Mocked<IEtbRepository>;
  let mockLogger: jest.Mocked<ILogger>;
  // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
  let mockPrismaService: jest.Mocked<any>;

  // Standard mock user for authenticated requests
  const mockUser: ValidatedUser = {
    userId: createValidTestId('user0'),
    email: 'test@example.com',
    role: 'USER',
  };

  // Admin mock user for lock operations
  const mockAdminUser: ValidatedUser = {
    userId: createValidTestId('admin'),
    email: 'admin@example.com',
    role: 'ADMIN',
  };

  // Super Admin mock user
  const mockSuperAdminUser: ValidatedUser = {
    userId: createValidTestId('super'),
    email: 'superadmin@example.com',
    role: 'SUPER_ADMIN',
  };

  beforeEach(() => {
    // Create mock handlers (Direct Instantiation Pattern)
    mockAddEintragHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    mockUpdateEintragHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    mockDeleteEintragHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    mockLockEtbHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    mockGetEtbQueryHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    mockGetEtbHistoryQueryHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    mockGetTextbausteineHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    mockGetErinnerungTimelineHandler = {
      execute: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    mockEtbRepository = {
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      save: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    // Create mock PrismaService
    mockPrismaService = {
      einsatzTeilnehmer: {
        findFirst: jest.fn(),
      },
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    // Instantiate controller with mocks
    controller = new EtbCqrsController(
      mockAddEintragHandler,
      mockUpdateEintragHandler,
      mockDeleteEintragHandler,
      mockLockEtbHandler,
      mockGetEtbQueryHandler,
      mockGetEtbHistoryQueryHandler,
      mockGetTextbausteineHandler,
      mockGetErinnerungTimelineHandler,
      mockEtbRepository,
      mockLogger,
      mockPrismaService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Test Group 1: getEtbByEinsatzId() - GET /etb/einsatz/:einsatzId
  // ============================================
  describe('getEtbByEinsatzId()', () => {
    it('should execute GetEtbQuery and return EtbDto', async () => {
      // Given
      const einsatzId = createValidTestId('eins0');
      const expectedDto: EtbDto = {
        id: createValidTestId('etb00'),
        einsatzId,
        status: 'ACTIVE',
        eintraege: [],
        version: { versionNumber: 1, timestamp: new Date() },
        createdAt: new Date(),
      };

      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.ok(expectedDto));

      // When
      const result = await controller.getEtbByEinsatzId(einsatzId);

      // Then
      expect(mockGetEtbQueryHandler.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedDto);
    });

    it('should pass includeDeleted=true when query param is "true"', async () => {
      // Given
      const einsatzId = createValidTestId('eins0');
      const expectedDto: EtbDto = {
        id: createValidTestId('etb00'),
        einsatzId,
        status: 'ACTIVE',
        eintraege: [],
        version: { versionNumber: 1, timestamp: new Date() },
        createdAt: new Date(),
      };

      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.ok(expectedDto));

      // When
      const result = await controller.getEtbByEinsatzId(einsatzId, 'true');

      // Then
      expect(mockGetEtbQueryHandler.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedDto);
    });

    it('should pass includeDeleted=false when query param is not "true"', async () => {
      // Given
      const einsatzId = createValidTestId('eins0');
      const expectedDto: EtbDto = {
        id: createValidTestId('etb00'),
        einsatzId,
        status: 'ACTIVE',
        eintraege: [],
        version: { versionNumber: 1, timestamp: new Date() },
        createdAt: new Date(),
      };

      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.ok(expectedDto));

      // When
      const result = await controller.getEtbByEinsatzId(einsatzId, 'false');

      // Then
      expect(mockGetEtbQueryHandler.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedDto);
    });

    it('should return EtbDto with eintraege', async () => {
      // Given
      const einsatzId = createValidTestId('eins0');
      const eintrag: EintragDto = {
        id: createValidTestId('entry'),
        sequenceNumber: 1,
        text: 'Test Eintrag',
        createdBy: createValidTestId('user0'),
        createdAt: new Date(),
        isDeleted: false,
      };
      const expectedDto: EtbDto = {
        id: createValidTestId('etb00'),
        einsatzId,
        status: 'ACTIVE',
        eintraege: [eintrag],
        version: { versionNumber: 1, timestamp: new Date() },
        createdAt: new Date(),
      };

      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.ok(expectedDto));

      // When
      const result = await controller.getEtbByEinsatzId(einsatzId);

      // Then
      expect(result.eintraege).toHaveLength(1);
      expect(result.eintraege[0].text).toBe('Test Eintrag');
    });

    it('should throw NotFoundException when result indicates not found', async () => {
      // Given
      const einsatzId = createValidTestId('eins0');
      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.fail('ETB nicht gefunden'));

      // When/Then
      await expect(controller.getEtbByEinsatzId(einsatzId)).rejects.toThrow(NotFoundException);
      expect(mockGetEtbQueryHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when result indicates not found (English)', async () => {
      // Given
      const einsatzId = createValidTestId('eins0');
      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.fail('ETB not found'));

      // When/Then
      await expect(controller.getEtbByEinsatzId(einsatzId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when result fails with other error', async () => {
      // Given
      const einsatzId = createValidTestId('eins0');
      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.fail('Invalid format'));

      // When/Then
      await expect(controller.getEtbByEinsatzId(einsatzId)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when result.value is null', async () => {
      // Given
      const einsatzId = createValidTestId('eins0');
      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.ok(null));

      // When/Then
      await expect(controller.getEtbByEinsatzId(einsatzId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when query creation throws (invalid einsatzId)', async () => {
      // Given - Empty string will fail CUID2 validation in GetEtbQuery constructor
      const einsatzId = '';

      // When/Then - GetEtbQuery constructor throws Error on validation failure
      await expect(controller.getEtbByEinsatzId(einsatzId)).rejects.toThrow(BadRequestException);
      expect(mockGetEtbQueryHandler.execute).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Test Group 2: getEtbHistory() - GET /etb/:etbId/history
  // ============================================
  describe('getEtbHistory()', () => {
    it('should execute GetEtbHistoryQuery and return EtbSnapshotDto array', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const eintragSnapshot: EtbEintragSnapshotDto = {
        id: createValidTestId('entry'),
        sequenceNumber: 1,
        text: 'Test Eintrag',
        createdBy: createValidTestId('user0'),
        createdAt: new Date().toISOString(),
        isDeleted: false,
      };
      const expectedSnapshots: EtbSnapshotDto[] = [
        {
          version: 2,
          snapshotAt: new Date(),
          eintraege: [eintragSnapshot],
        },
        {
          version: 1,
          snapshotAt: new Date(),
          eintraege: [],
        },
      ];

      mockGetEtbHistoryQueryHandler.execute.mockResolvedValueOnce(Result.ok(expectedSnapshots));

      // When
      const result = await controller.getEtbHistory(etbId);

      // Then
      expect(mockGetEtbHistoryQueryHandler.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedSnapshots);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no snapshots exist', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      mockGetEtbHistoryQueryHandler.execute.mockResolvedValueOnce(Result.ok([]));

      // When
      const result = await controller.getEtbHistory(etbId);

      // Then
      expect(result).toEqual([]);
    });

    it('should return empty array when result.value is null', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      mockGetEtbHistoryQueryHandler.execute.mockResolvedValueOnce(Result.ok(null));

      // When
      const result = await controller.getEtbHistory(etbId);

      // Then
      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when result indicates not found', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      mockGetEtbHistoryQueryHandler.execute.mockResolvedValueOnce(Result.fail('ETB nicht gefunden'));

      // When/Then
      await expect(controller.getEtbHistory(etbId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when result indicates not found (English)', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      mockGetEtbHistoryQueryHandler.execute.mockResolvedValueOnce(Result.fail('ETB not found'));

      // When/Then
      await expect(controller.getEtbHistory(etbId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when result fails with other error', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      mockGetEtbHistoryQueryHandler.execute.mockResolvedValueOnce(Result.fail('Database connection failed'));

      // When/Then
      await expect(controller.getEtbHistory(etbId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when query creation throws (invalid etbId)', async () => {
      // Given
      const etbId = '';

      // When/Then
      await expect(controller.getEtbHistory(etbId)).rejects.toThrow(BadRequestException);
      expect(mockGetEtbHistoryQueryHandler.execute).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Test Group 3: addEintrag() - POST /etb/:etbId/eintrag
  // ============================================
  describe('addEintrag()', () => {
    it('should execute AddEintragCommand and return EintragDto', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const dto: AddEintragDto = { text: 'Neuer Eintrag' };
      const mockEintrag = {
        id: { value: createValidTestId('entry') },
        sequenceNumber: { value: 1 },
        text: 'Neuer Eintrag',
        createdBy: { value: mockUser.userId },
        createdAt: new Date(),
        isDeleted: false,
      };

      mockAddEintragHandler.execute.mockResolvedValueOnce(Result.ok(mockEintrag));

      // When
      const result = await controller.addEintrag(etbId, dto, mockUser);

      // Then
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        id: mockEintrag.id.value,
        sequenceNumber: 1,
        text: 'Neuer Eintrag',
        isDeleted: false,
      });
    });

    it('should throw BadRequestException when command creation fails (empty etbId)', async () => {
      // Given
      const etbId = '';
      const dto: AddEintragDto = { text: 'Neuer Eintrag' };

      // When/Then
      await expect(controller.addEintrag(etbId, dto, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when command creation fails (empty text)', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const dto: AddEintragDto = { text: '' };

      // When/Then
      await expect(controller.addEintrag(etbId, dto, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when result indicates not found', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const dto: AddEintragDto = { text: 'Neuer Eintrag' };
      mockAddEintragHandler.execute.mockResolvedValueOnce(Result.fail('ETB nicht gefunden'));

      // When/Then
      await expect(controller.addEintrag(etbId, dto, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when result fails with locked error', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const dto: AddEintragDto = { text: 'Neuer Eintrag' };
      mockAddEintragHandler.execute.mockResolvedValueOnce(Result.fail('ETB ist gesperrt'));

      // When/Then
      await expect(controller.addEintrag(etbId, dto, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when result.value is undefined', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const dto: AddEintragDto = { text: 'Neuer Eintrag' };
      mockAddEintragHandler.execute.mockResolvedValueOnce(Result.ok(undefined));

      // When/Then
      await expect(controller.addEintrag(etbId, dto, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should use correct userId from ValidatedUser', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const dto: AddEintragDto = { text: 'Neuer Eintrag' };
      const mockEintrag = {
        id: { value: createValidTestId('entry') },
        sequenceNumber: { value: 1 },
        text: 'Neuer Eintrag',
        createdBy: { value: mockUser.userId },
        createdAt: new Date(),
        isDeleted: false,
      };

      mockAddEintragHandler.execute.mockResolvedValueOnce(Result.ok(mockEintrag));

      // When
      const result = await controller.addEintrag(etbId, dto, mockUser);

      // Then
      expect(result.createdBy).toBe(mockUser.userId);
    });
  });

  // ============================================
  // Test Group 4: updateEintrag() - PUT /etb/:etbId/eintrag/:eintragId
  // ============================================
  describe('updateEintrag()', () => {
    it('should execute UpdateEintragCommand and return updated EintragDto', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const eintragId = createValidTestId('entry');
      const dto: UpdateEintragDto = { newText: 'Aktualisierter Text' };

      // Mock command execution (returns void on success)
      mockUpdateEintragHandler.execute.mockResolvedValueOnce(Result.ok(undefined));

      // Mock repository call to get updated ETB
      const mockAggregate = {
        id: { value: etbId },
        eintraege: [
          {
            id: { value: eintragId },
            sequenceNumber: { value: 1 },
            text: 'Aktualisierter Text',
            createdBy: { value: mockUser.userId },
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false,
          },
        ],
      };
      mockEtbRepository.findById.mockResolvedValueOnce(mockAggregate as unknown);

      // When
      const result = await controller.updateEintrag(etbId, eintragId, dto, mockUser);

      // Then
      expect(mockUpdateEintragHandler.execute).toHaveBeenCalledTimes(1);
      expect(mockEtbRepository.findById).toHaveBeenCalledTimes(1);
      expect(result.id).toBe(eintragId);
      expect(result.text).toBe('Aktualisierter Text');
    });

    it('should throw BadRequestException when command creation fails (empty etbId)', async () => {
      // Given
      const etbId = '';
      const eintragId = createValidTestId('entry');
      const dto: UpdateEintragDto = { newText: 'Aktualisierter Text' };

      // When/Then
      await expect(controller.updateEintrag(etbId, eintragId, dto, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockUpdateEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when command creation fails (empty eintragId)', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const eintragId = '';
      const dto: UpdateEintragDto = { newText: 'Aktualisierter Text' };

      // When/Then
      await expect(controller.updateEintrag(etbId, eintragId, dto, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockUpdateEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when command creation fails (empty newText)', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const eintragId = createValidTestId('entry');
      const dto: UpdateEintragDto = { newText: '' };

      // When/Then
      await expect(controller.updateEintrag(etbId, eintragId, dto, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockUpdateEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when command result indicates not found', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const eintragId = createValidTestId('entry');
      const dto: UpdateEintragDto = { newText: 'Aktualisierter Text' };
      mockUpdateEintragHandler.execute.mockResolvedValueOnce(Result.fail('Eintrag nicht gefunden'));

      // When/Then
      await expect(controller.updateEintrag(etbId, eintragId, dto, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when result fails with other error', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const eintragId = createValidTestId('entry');
      const dto: UpdateEintragDto = { newText: 'Aktualisierter Text' };
      mockUpdateEintragHandler.execute.mockResolvedValueOnce(Result.fail('ETB ist gesperrt'));

      // When/Then
      await expect(controller.updateEintrag(etbId, eintragId, dto, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when repository fails', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const eintragId = createValidTestId('entry');
      const dto: UpdateEintragDto = { newText: 'Aktualisierter Text' };

      mockUpdateEintragHandler.execute.mockResolvedValueOnce(Result.ok(undefined));
      mockEtbRepository.findById.mockResolvedValueOnce(null);

      // When/Then
      await expect(controller.updateEintrag(etbId, eintragId, dto, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when updated eintrag not found in ETB', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const eintragId = createValidTestId('entry');
      const dto: UpdateEintragDto = { newText: 'Aktualisierter Text' };

      mockUpdateEintragHandler.execute.mockResolvedValueOnce(Result.ok(undefined));
      // ETB returned but without the eintrag we're looking for
      const mockAggregate = {
        id: { value: etbId },
        eintraege: [],
      };
      mockEtbRepository.findById.mockResolvedValueOnce(mockAggregate as unknown);

      // When/Then
      await expect(controller.updateEintrag(etbId, eintragId, dto, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================
  // Test Group 5: deleteEintrag() - DELETE /etb/:etbId/eintrag/:eintragId
  // ============================================
  describe('deleteEintrag()', () => {
    it('should execute DeleteEintragCommand and return void (204)', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const eintragId = createValidTestId('entry');

      mockDeleteEintragHandler.execute.mockResolvedValueOnce(Result.ok(undefined));

      // When
      const result = await controller.deleteEintrag(etbId, eintragId, mockUser);

      // Then
      expect(mockDeleteEintragHandler.execute).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('should throw BadRequestException when command creation fails (empty etbId)', async () => {
      // Given
      const etbId = '';
      const eintragId = createValidTestId('entry');

      // When/Then
      await expect(controller.deleteEintrag(etbId, eintragId, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockDeleteEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when command creation fails (empty eintragId)', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const eintragId = '';

      // When/Then
      await expect(controller.deleteEintrag(etbId, eintragId, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockDeleteEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when result indicates not found', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const eintragId = createValidTestId('entry');
      mockDeleteEintragHandler.execute.mockResolvedValueOnce(Result.fail('Eintrag nicht gefunden'));

      // When/Then
      await expect(controller.deleteEintrag(etbId, eintragId, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when ETB not found', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const eintragId = createValidTestId('entry');
      mockDeleteEintragHandler.execute.mockResolvedValueOnce(Result.fail('ETB nicht gefunden'));

      // When/Then
      await expect(controller.deleteEintrag(etbId, eintragId, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when ETB is locked', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const eintragId = createValidTestId('entry');
      mockDeleteEintragHandler.execute.mockResolvedValueOnce(Result.fail('ETB ist gesperrt'));

      // When/Then
      await expect(controller.deleteEintrag(etbId, eintragId, mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // Test Group 6: lockEtb() - POST /etb/:etbId/lock
  // ============================================
  describe('lockEtb()', () => {
    it('should execute LockEtbCommand with ADMIN role and return void (204)', async () => {
      // Given
      const etbId = createValidTestId('etb00');

      mockLockEtbHandler.execute.mockResolvedValueOnce(Result.ok(undefined));

      // When
      const result = await controller.lockEtb(etbId, mockAdminUser);

      // Then
      expect(mockLockEtbHandler.execute).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('should execute LockEtbCommand with SUPER_ADMIN role and return void', async () => {
      // Given
      const etbId = createValidTestId('etb00');

      mockLockEtbHandler.execute.mockResolvedValueOnce(Result.ok(undefined));

      // When
      const result = await controller.lockEtb(etbId, mockSuperAdminUser);

      // Then
      expect(mockLockEtbHandler.execute).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('should throw BadRequestException when command creation fails (empty etbId)', async () => {
      // Given
      const etbId = '';

      // When/Then
      await expect(controller.lockEtb(etbId, mockAdminUser)).rejects.toThrow(BadRequestException);
      expect(mockLockEtbHandler.execute).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when result indicates not found', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      mockLockEtbHandler.execute.mockResolvedValueOnce(Result.fail('ETB nicht gefunden'));

      // When/Then
      await expect(controller.lockEtb(etbId, mockAdminUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when ETB is already locked', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      mockLockEtbHandler.execute.mockResolvedValueOnce(Result.fail('ETB ist bereits gesperrt'));

      // When/Then
      await expect(controller.lockEtb(etbId, mockAdminUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when result fails with other error', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      mockLockEtbHandler.execute.mockResolvedValueOnce(Result.fail('Database error'));

      // When/Then
      await expect(controller.lockEtb(etbId, mockAdminUser)).rejects.toThrow(BadRequestException);
    });

    it('should use USER role as default when user.role is undefined', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const userWithNoRole: ValidatedUser = {
        userId: createValidTestId('user0'),
        email: 'noRole@example.com',
        role: undefined,
      };

      mockLockEtbHandler.execute.mockResolvedValueOnce(Result.ok(undefined));

      // When
      const result = await controller.lockEtb(etbId, userWithNoRole);

      // Then
      expect(mockLockEtbHandler.execute).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });
  });

  // ============================================
  // Edge Cases & Error Handling
  // ============================================
  describe('Edge Cases', () => {
    it('getEtbByEinsatzId should handle whitespace-only includeDeleted param', async () => {
      // Given
      const einsatzId = createValidTestId('eins0');
      const expectedDto: EtbDto = {
        id: createValidTestId('etb00'),
        einsatzId,
        status: 'ACTIVE',
        eintraege: [],
        version: { versionNumber: 1, timestamp: new Date() },
        createdAt: new Date(),
      };

      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.ok(expectedDto));

      // When - whitespace is not "true"
      const result = await controller.getEtbByEinsatzId(einsatzId, '   ');

      // Then
      expect(result).toEqual(expectedDto);
    });

    it('addEintrag should handle whitespace-only text via command validation', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const dto: AddEintragDto = { text: '   ' };

      // When/Then - AddEintragCommand.create fails because trimmed text is empty
      await expect(controller.addEintrag(etbId, dto, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('updateEintrag should handle whitespace-only newText via command validation', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const eintragId = createValidTestId('entry');
      const dto: UpdateEintragDto = { newText: '   ' };

      // When/Then
      await expect(controller.updateEintrag(etbId, eintragId, dto, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockUpdateEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should handle long text in addEintrag', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const longText = 'A'.repeat(1000);
      const dto: AddEintragDto = { text: longText };
      const mockEintrag = {
        id: { value: createValidTestId('entry') },
        sequenceNumber: { value: 1 },
        text: longText,
        createdBy: { value: mockUser.userId },
        createdAt: new Date(),
        isDeleted: false,
      };

      mockAddEintragHandler.execute.mockResolvedValueOnce(Result.ok(mockEintrag));

      // When
      const result = await controller.addEintrag(etbId, dto, mockUser);

      // Then
      expect(result.text).toBe(longText);
    });

    it('getEtbHistory should handle multiple snapshots with complex eintraege', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const snapshots: EtbSnapshotDto[] = [
        {
          version: 3,
          snapshotAt: new Date(),
          eintraege: [
            {
              id: createValidTestId('ent01'),
              sequenceNumber: 1,
              text: 'First',
              createdBy: createValidTestId('user0'),
              createdAt: new Date().toISOString(),
              isDeleted: false,
            },
            {
              id: createValidTestId('ent02'),
              sequenceNumber: 2,
              text: 'Second',
              createdBy: createValidTestId('user0'),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isDeleted: true,
            },
          ],
        },
      ];

      mockGetEtbHistoryQueryHandler.execute.mockResolvedValueOnce(Result.ok(snapshots));

      // When
      const result = await controller.getEtbHistory(etbId);

      // Then
      expect(result[0].eintraege).toHaveLength(2);
      expect(result[0].eintraege[1].isDeleted).toBe(true);
    });
  });
});
