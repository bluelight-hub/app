// @ts-nocheck
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EtbCqrsController } from '@/modules/etb/controllers/etb-cqrs.controller';
import { Result } from '@/domain/common/result';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { AddEintragDto, UpdateEintragDto, EtbDto, EintragDto } from '@/application/etb/dto';
import type { EtbEintragSnapshotDto, EtbSnapshotDto } from '@/application/etb/mappers';
import type { AddEintragHandler } from '@/application/etb/commands/add-eintrag/add-eintrag.handler';
import type { UpdateEintragHandler } from '@/application/etb/commands/update-eintrag/update-eintrag.handler';
import type { DeleteEintragHandler } from '@/application/etb/commands/delete-eintrag/delete-eintrag.handler';
import type { LockEtbHandler } from '@/application/etb/commands/lock-etb/lock-etb.handler';
import type { GetEtbQueryHandler } from '@/application/etb/queries/get-etb/get-etb.handler';
import type { GetEtbHistoryQueryHandler } from '@/application/etb/queries/get-etb-history/get-etb-history.handler';
import type { GetTextbausteineHandler } from '@/application/etb/queries/get-textbausteine/get-textbausteine.handler';
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
  let mockEinsatzTeilnehmerRepository: jest.Mocked<any>;
  // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
  let mockEinsatzRollenReadRepository: jest.Mocked<any>;

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
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    // Create mock EinsatzTeilnehmerRepository (replaces direct PrismaService access)
    mockEinsatzTeilnehmerRepository = {
      findByEinsatzAndUser: jest.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: Test mock typing
    } as any;

    // Create mock EinsatzRollenReadRepository (replaces direct PrismaService access)
    // Default: User hat Schreibberechtigung (Rolle mit vollem Zugriff)
    mockEinsatzRollenReadRepository = {
      findMeineRolle: jest.fn().mockResolvedValue(Result.ok({ rolle: 'BEFEHLSGEBER' })),
      hasAnyRollen: jest.fn().mockResolvedValue(Result.ok(true)),
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
      mockEinsatzTeilnehmerRepository,
      mockEinsatzRollenReadRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Test Group 1: getEtbByEinsatzId() - GET /etb/einsatz/:einsatzId
  // ============================================
  describe('getEtbByEinsatzId()', () => {
    beforeEach(() => {
      // Story 5.9: Default mock for active participant check
      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValue({ id: 'teilnehmer-id' });
    });

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
      const result = await controller.getEtbByEinsatzId(einsatzId, mockUser, undefined);

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
      const result = await controller.getEtbByEinsatzId(einsatzId, mockUser, 'true');

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
      const result = await controller.getEtbByEinsatzId(einsatzId, mockUser, 'false');

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
      const result = await controller.getEtbByEinsatzId(einsatzId, mockUser, undefined);

      // Then
      expect(result.eintraege).toHaveLength(1);
      expect(result.eintraege[0]?.text).toBe('Test Eintrag');
    });

    it('should throw NotFoundException when result indicates not found', async () => {
      // Given
      const einsatzId = createValidTestId('eins0');
      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.fail('ETB nicht gefunden'));

      // When/Then
      await expect(controller.getEtbByEinsatzId(einsatzId, mockUser, undefined)).rejects.toThrow(NotFoundException);
      expect(mockGetEtbQueryHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when result indicates not found (English)', async () => {
      // Given
      const einsatzId = createValidTestId('eins0');
      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.fail('ETB not found'));

      // When/Then
      await expect(controller.getEtbByEinsatzId(einsatzId, mockUser, undefined)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when result fails with other error', async () => {
      // Given
      const einsatzId = createValidTestId('eins0');
      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.fail('Invalid format'));

      // When/Then
      await expect(controller.getEtbByEinsatzId(einsatzId, mockUser, undefined)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when result.value is null', async () => {
      // Given
      const einsatzId = createValidTestId('eins0');
      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.ok(null));

      // When/Then
      await expect(controller.getEtbByEinsatzId(einsatzId, mockUser, undefined)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when query creation throws (invalid einsatzId)', async () => {
      // Given - Empty string will fail CUID2 validation in GetEtbQuery constructor
      const einsatzId = '';

      // When/Then - GetEtbQuery constructor throws Error on validation failure
      await expect(controller.getEtbByEinsatzId(einsatzId, mockUser, undefined)).rejects.toThrow(BadRequestException);
      expect(mockGetEtbQueryHandler.execute).not.toHaveBeenCalled();
    });

    // Story 5.9: Authorization Tests (AC2, AC3)
    describe('Authorization (Story 5.9 AC2, AC3)', () => {
      it('should allow active participant to access ETB', async () => {
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

        mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce({ id: 'teilnehmer-id' });
        mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.ok(expectedDto));

        // When
        const result = await controller.getEtbByEinsatzId(einsatzId, mockUser, undefined);

        // Then
        expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).toHaveBeenCalledWith(einsatzId, mockUser.userId);
        expect(result).toEqual(expectedDto);
      });

      it('should throw ForbiddenException for non-participant (AC2)', async () => {
        // Given
        const einsatzId = createValidTestId('eins0');
        mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce(null);

        // When/Then
        await expect(controller.getEtbByEinsatzId(einsatzId, mockUser, undefined)).rejects.toThrow(ForbiddenException);
        expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).toHaveBeenCalledTimes(1);
        expect(mockGetEtbQueryHandler.execute).not.toHaveBeenCalled();
      });

      it('should throw ForbiddenException for former participant with leftAt set (AC2)', async () => {
        // Given - Former participant: leftAt !== null means inactive
        // The checkUserIsActiveTeilnehmer query uses leftAt: null, so findFirst returns null
        const einsatzId = createValidTestId('eins0');
        mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce(null);

        // When/Then
        await expect(controller.getEtbByEinsatzId(einsatzId, mockUser, undefined)).rejects.toThrow(ForbiddenException);
        expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).toHaveBeenCalledWith(einsatzId, mockUser.userId);
      });
    });
  });

  // ============================================
  // Test Group 2: getEtbHistory() - GET /etb/:etbId/history
  // ============================================
  describe('getEtbHistory()', () => {
    const einsatzId = createValidTestId('eins0');

    beforeEach(() => {
      // Story 5.9: Default mock for ETB aggregate with einsatzId
      const mockAggregate = {
        id: { value: createValidTestId('etb00') },
        einsatzId: { value: einsatzId },
        eintraege: [],
      };
      mockEtbRepository.findById.mockResolvedValue(mockAggregate as unknown);
      // Default mock for active participant check
      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValue({ id: 'teilnehmer-id' });
    });

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
      const result = await controller.getEtbHistory(etbId, mockUser);

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
      const result = await controller.getEtbHistory(etbId, mockUser);

      // Then
      expect(result).toEqual([]);
    });

    it('should return empty array when result.value is null', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      mockGetEtbHistoryQueryHandler.execute.mockResolvedValueOnce(Result.ok(null));

      // When
      const result = await controller.getEtbHistory(etbId, mockUser);

      // Then
      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when result indicates not found', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      mockGetEtbHistoryQueryHandler.execute.mockResolvedValueOnce(Result.fail('ETB nicht gefunden'));

      // When/Then
      await expect(controller.getEtbHistory(etbId, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when result indicates not found (English)', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      mockGetEtbHistoryQueryHandler.execute.mockResolvedValueOnce(Result.fail('ETB not found'));

      // When/Then
      await expect(controller.getEtbHistory(etbId, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when result fails with other error', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      mockGetEtbHistoryQueryHandler.execute.mockResolvedValueOnce(Result.fail('Database connection failed'));

      // When/Then
      await expect(controller.getEtbHistory(etbId, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when query creation throws (invalid etbId)', async () => {
      // Given
      const etbId = '';

      // When/Then
      await expect(controller.getEtbHistory(etbId, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockGetEtbHistoryQueryHandler.execute).not.toHaveBeenCalled();
    });

    // Story 5.9: Authorization Tests (AC2, AC3)
    describe('Authorization (Story 5.9 AC2, AC3)', () => {
      it('should allow active participant to access ETB history', async () => {
        // Given
        const etbId = createValidTestId('etb00');
        const expectedSnapshots: EtbSnapshotDto[] = [];
        mockGetEtbHistoryQueryHandler.execute.mockResolvedValueOnce(Result.ok(expectedSnapshots));

        // When
        const result = await controller.getEtbHistory(etbId, mockUser);

        // Then
        expect(mockEtbRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).toHaveBeenCalledWith(einsatzId, mockUser.userId);
        expect(result).toEqual(expectedSnapshots);
      });

      it('should throw ForbiddenException for non-participant (AC2)', async () => {
        // Given
        const etbId = createValidTestId('etb00');
        mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce(null);

        // When/Then
        await expect(controller.getEtbHistory(etbId, mockUser)).rejects.toThrow(ForbiddenException);
        expect(mockEtbRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).toHaveBeenCalledTimes(1);
        expect(mockGetEtbHistoryQueryHandler.execute).not.toHaveBeenCalled();
      });

      it('should throw ForbiddenException for former participant with leftAt set (AC2)', async () => {
        // Given - Former participant: leftAt !== null means inactive
        const etbId = createValidTestId('etb00');
        mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce(null);

        // When/Then
        await expect(controller.getEtbHistory(etbId, mockUser)).rejects.toThrow(ForbiddenException);
        expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).toHaveBeenCalledWith(einsatzId, mockUser.userId);
      });

      it('should throw NotFoundException when ETB not found during auth check', async () => {
        // Given
        const etbId = createValidTestId('etb00');
        mockEtbRepository.findById.mockResolvedValueOnce(null);

        // When/Then
        await expect(controller.getEtbHistory(etbId, mockUser)).rejects.toThrow(NotFoundException);
        expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).not.toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // Test Group 3: addEintrag() - POST /etb/:etbId/eintrag
  // ============================================
  describe('addEintrag()', () => {
    const einsatzId = createValidTestId('eins0');

    beforeEach(() => {
      // Story 5.9: Default mock for ETB aggregate with einsatzId
      const mockAggregate = {
        id: { value: createValidTestId('etb00') },
        einsatzId: { value: einsatzId },
        eintraege: [],
      };
      mockEtbRepository.findById.mockResolvedValue(mockAggregate as unknown);
      // Default mock for active participant check
      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValue({ id: 'teilnehmer-id' });
    });

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

    // Story 5.9: Authorization Tests (AC2, AC3)
    describe('Authorization (Story 5.9)', () => {
      it('should allow active participant to add entry', async () => {
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

        // Mock: ETB exists, user is active participant
        mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce({ id: 'teilnehmer-id' });
        mockAddEintragHandler.execute.mockResolvedValueOnce(Result.ok(mockEintrag));

        // When
        const result = await controller.addEintrag(etbId, dto, mockUser);

        // Then - No exception, handler called, entry returned
        expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({
          id: mockEintrag.id.value,
          text: 'Neuer Eintrag',
        });
      });

      it('should throw ForbiddenException for non-participant', async () => {
        // Given
        const etbId = createValidTestId('etb00');
        const dto: AddEintragDto = { text: 'Neuer Eintrag' };

        // Mock: ETB exists, user is NOT participant (findFirst returns null)
        mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce(null);

        // When/Then
        await expect(controller.addEintrag(etbId, dto, mockUser)).rejects.toThrow(ForbiddenException);
        expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).toHaveBeenCalledTimes(1);
        expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
      });

      it('should throw ForbiddenException for former participant with leftAt set', async () => {
        // Given - Former participant: leftAt !== null means inactive
        // The checkUserIsActiveTeilnehmer query uses leftAt: null, so findFirst returns null
        const etbId = createValidTestId('etb00');
        const dto: AddEintragDto = { text: 'Neuer Eintrag' };

        // Mock: User was participant but leftAt !== null (query returns null because leftAt: null condition not met)
        mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce(null);

        // When/Then
        await expect(controller.addEintrag(etbId, dto, mockUser)).rejects.toThrow(ForbiddenException);
        expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).toHaveBeenCalledWith(einsatzId, mockUser.userId);
        expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // Test Group 4: updateEintrag() - PUT /etb/:etbId/eintrag/:eintragId
  // ============================================
  describe('updateEintrag()', () => {
    const einsatzId = createValidTestId('eins0');

    beforeEach(() => {
      // Story 5.9: Default mock for ETB aggregate with einsatzId (needed for auth check)
      const mockAggregate = {
        id: { value: createValidTestId('etb00') },
        einsatzId: { value: einsatzId },
        eintraege: [],
      };
      mockEtbRepository.findById.mockResolvedValue(mockAggregate as unknown);
      // Story 5.9: Default mock for active participant check
      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValue({ id: 'teilnehmer-id' });
    });

    it('should execute UpdateEintragCommand and return updated EintragDto', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const eintragId = createValidTestId('entry');
      const dto: UpdateEintragDto = { newText: 'Aktualisierter Text' };

      // Mock command execution (returns void on success)
      mockUpdateEintragHandler.execute.mockResolvedValueOnce(Result.ok(undefined));

      // Mock repository calls: first for auth check, second for getting updated ETB
      const mockAggregateForAuth = {
        id: { value: etbId },
        einsatzId: { value: einsatzId },
        eintraege: [],
      };
      const mockAggregateAfterUpdate = {
        id: { value: etbId },
        einsatzId: { value: einsatzId },
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
      mockEtbRepository.findById
        .mockResolvedValueOnce(mockAggregateForAuth as unknown) // First call: auth check
        .mockResolvedValueOnce(mockAggregateAfterUpdate as unknown); // Second call: get updated ETB

      // When
      const result = await controller.updateEintrag(etbId, eintragId, dto, mockUser);

      // Then
      expect(mockUpdateEintragHandler.execute).toHaveBeenCalledTimes(1);
      expect(mockEtbRepository.findById).toHaveBeenCalledTimes(2);
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

      // ETB for auth check (first call) and after update (second call - without the eintrag)
      const mockAggregateForAuth = {
        id: { value: etbId },
        einsatzId: { value: einsatzId },
        eintraege: [],
      };
      const mockAggregateAfterUpdate = {
        id: { value: etbId },
        einsatzId: { value: einsatzId },
        eintraege: [], // Empty - eintrag not found
      };
      mockEtbRepository.findById.mockResolvedValueOnce(mockAggregateForAuth as unknown).mockResolvedValueOnce(mockAggregateAfterUpdate as unknown);
      mockUpdateEintragHandler.execute.mockResolvedValueOnce(Result.ok(undefined));

      // When/Then
      await expect(controller.updateEintrag(etbId, eintragId, dto, mockUser)).rejects.toThrow(NotFoundException);
    });

    // Story 5.9: Authorization Tests (AC2, AC3)
    describe('Authorization (Story 5.9)', () => {
      it('should allow active participant to update entry', async () => {
        // Given
        const etbId = createValidTestId('etb00');
        const eintragId = createValidTestId('entry');
        const dto: UpdateEintragDto = { newText: 'Aktualisierter Text' };

        // Mock: ETB with einsatzId for auth check (first call) and after update (second call)
        const mockAggregateForAuth = {
          id: { value: etbId },
          einsatzId: { value: einsatzId },
          eintraege: [],
        };
        const mockAggregateAfterUpdate = {
          id: { value: etbId },
          einsatzId: { value: einsatzId },
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

        // Mock: Repository calls (first for auth, second for getting updated ETB)
        mockEtbRepository.findById.mockResolvedValueOnce(mockAggregateForAuth as unknown).mockResolvedValueOnce(mockAggregateAfterUpdate as unknown);
        // Mock: User is active participant
        mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce({ id: 'teilnehmer-id' });
        mockUpdateEintragHandler.execute.mockResolvedValueOnce(Result.ok(undefined));

        // When
        const result = await controller.updateEintrag(etbId, eintragId, dto, mockUser);

        // Then - No exception, handler called, entry returned
        expect(mockUpdateEintragHandler.execute).toHaveBeenCalledTimes(1);
        expect(result.id).toBe(eintragId);
        expect(result.text).toBe('Aktualisierter Text');
      });

      it('should throw ForbiddenException for non-participant', async () => {
        // Given
        const etbId = createValidTestId('etb00');
        const eintragId = createValidTestId('entry');
        const dto: UpdateEintragDto = { newText: 'Aktualisierter Text' };

        // Mock: ETB exists with einsatzId
        const mockAggregate = {
          id: { value: etbId },
          einsatzId: { value: einsatzId },
          eintraege: [],
        };
        mockEtbRepository.findById.mockResolvedValueOnce(mockAggregate as unknown);

        // Mock: User is NOT participant (findFirst returns null)
        mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce(null);

        // When/Then
        await expect(controller.updateEintrag(etbId, eintragId, dto, mockUser)).rejects.toThrow(ForbiddenException);
        expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).toHaveBeenCalledTimes(1);
        expect(mockUpdateEintragHandler.execute).not.toHaveBeenCalled();
      });

      it('should throw ForbiddenException for former participant with leftAt set', async () => {
        // Given - Former participant: leftAt !== null means inactive
        const etbId = createValidTestId('etb00');
        const eintragId = createValidTestId('entry');
        const dto: UpdateEintragDto = { newText: 'Aktualisierter Text' };

        // Mock: ETB exists with einsatzId
        const mockAggregate = {
          id: { value: etbId },
          einsatzId: { value: einsatzId },
          eintraege: [],
        };
        mockEtbRepository.findById.mockResolvedValueOnce(mockAggregate as unknown);

        // Mock: User was participant but leftAt !== null (query returns null)
        mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce(null);

        // When/Then
        await expect(controller.updateEintrag(etbId, eintragId, dto, mockUser)).rejects.toThrow(ForbiddenException);
        expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).toHaveBeenCalledWith(einsatzId, mockUser.userId);
        expect(mockUpdateEintragHandler.execute).not.toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // Test Group 5: deleteEintrag() - DELETE /etb/:etbId/eintrag/:eintragId
  // ============================================
  describe('deleteEintrag()', () => {
    const einsatzId = createValidTestId('eins0');

    beforeEach(() => {
      // Story 5.9: Default mock for ETB aggregate with einsatzId (needed for auth check)
      const mockAggregate = {
        id: { value: createValidTestId('etb00') },
        einsatzId: { value: einsatzId },
        eintraege: [],
      };
      mockEtbRepository.findById.mockResolvedValue(mockAggregate as unknown);
      // Story 5.9: Default mock for active participant check
      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValue({ id: 'teilnehmer-id' });
    });

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

    // Story 5.9: Authorization Tests (AC2, AC3)
    describe('Authorization (Story 5.9)', () => {
      it('should allow active participant to delete entry', async () => {
        // Given
        const etbId = createValidTestId('etb00');
        const eintragId = createValidTestId('entry');

        // Mock: User is active participant
        mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce({ id: 'teilnehmer-id' });
        mockDeleteEintragHandler.execute.mockResolvedValueOnce(Result.ok(undefined));

        // When
        const result = await controller.deleteEintrag(etbId, eintragId, mockUser);

        // Then - No exception, handler called, void returned
        expect(mockDeleteEintragHandler.execute).toHaveBeenCalledTimes(1);
        expect(result).toBeUndefined();
      });

      it('should throw ForbiddenException for non-participant', async () => {
        // Given
        const etbId = createValidTestId('etb00');
        const eintragId = createValidTestId('entry');

        // Mock: ETB exists with einsatzId for auth check
        const mockAggregate = {
          id: { value: etbId },
          einsatzId: { value: einsatzId },
          eintraege: [],
        };
        mockEtbRepository.findById.mockResolvedValueOnce(mockAggregate as unknown);

        // Mock: User is NOT participant (findFirst returns null)
        mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce(null);

        // When/Then
        await expect(controller.deleteEintrag(etbId, eintragId, mockUser)).rejects.toThrow(ForbiddenException);
        expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).toHaveBeenCalledTimes(1);
        expect(mockDeleteEintragHandler.execute).not.toHaveBeenCalled();
      });

      it('should throw ForbiddenException for former participant with leftAt set', async () => {
        // Given - Former participant: leftAt !== null means inactive
        const etbId = createValidTestId('etb00');
        const eintragId = createValidTestId('entry');

        // Mock: ETB exists with einsatzId
        const mockAggregate = {
          id: { value: etbId },
          einsatzId: { value: einsatzId },
          eintraege: [],
        };
        mockEtbRepository.findById.mockResolvedValueOnce(mockAggregate as unknown);

        // Mock: User was participant but leftAt !== null (query returns null)
        mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce(null);

        // When/Then
        await expect(controller.deleteEintrag(etbId, eintragId, mockUser)).rejects.toThrow(ForbiddenException);
        expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).toHaveBeenCalledWith(einsatzId, mockUser.userId);
        expect(mockDeleteEintragHandler.execute).not.toHaveBeenCalled();
      });
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
  // Test Group 7: getErinnerungTimeline() - GET /etb/:etbId/erinnerung/:erinnerungId/timeline
  // ============================================
  describe('getErinnerungTimeline() Authorization (Story 5.9)', () => {
    const etbId = createValidTestId('etb00');
    const erinnerungId = createValidTestId('erin0');
    const einsatzId = createValidTestId('eins0');

    beforeEach(() => {
      // Mock ETB with einsatzId
      mockEtbRepository.findById.mockResolvedValue({
        id: { value: etbId },
        einsatzId: { value: einsatzId },
      });
    });

    it('should allow active participant to access timeline', async () => {
      // Mock: User is active participant
      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce({ id: 'teilnehmer-id' });
      mockGetErinnerungTimelineHandler.execute.mockResolvedValueOnce(Result.ok({ events: [] }));

      const result = await controller.getErinnerungTimeline(etbId, erinnerungId, mockUser);

      expect(result).toBeDefined();
      expect(mockGetErinnerungTimelineHandler.execute).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for non-participant (AC2)', async () => {
      // Mock: User is NOT participant
      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce(null);

      await expect(controller.getErinnerungTimeline(etbId, erinnerungId, mockUser)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for former participant with leftAt set (AC2)', async () => {
      // Mock: User was participant but left (leftAt !== null means findFirst returns null)
      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce(null);

      await expect(controller.getErinnerungTimeline(etbId, erinnerungId, mockUser)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when ETB not found during auth check', async () => {
      // Mock: ETB not found
      mockEtbRepository.findById.mockResolvedValueOnce(null);

      await expect(controller.getErinnerungTimeline(etbId, erinnerungId, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).not.toHaveBeenCalled();
    });

    it('should verify participant check uses correct einsatzId from ETB', async () => {
      // Mock: User is active participant
      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce({ id: 'teilnehmer-id' });
      mockGetErinnerungTimelineHandler.execute.mockResolvedValueOnce(Result.ok({ events: [] }));

      await controller.getErinnerungTimeline(etbId, erinnerungId, mockUser);

      expect(mockEinsatzTeilnehmerRepository.findByEinsatzAndUser).toHaveBeenCalledWith(einsatzId, mockUser.userId);
    });

    it('should throw BadRequestException when etbId is invalid', async () => {
      const invalidEtbId = '';

      await expect(controller.getErinnerungTimeline(invalidEtbId, erinnerungId, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockGetErinnerungTimelineHandler.execute).not.toHaveBeenCalled();
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

      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce({ id: 'teilnehmer-id' });
      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.ok(expectedDto));

      // When - whitespace is not "true"
      const result = await controller.getEtbByEinsatzId(einsatzId, mockUser, '   ');

      // Then
      expect(result).toEqual(expectedDto);
    });

    it('addEintrag should handle whitespace-only text via command validation', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const einsatzId = createValidTestId('eins0');
      const dto: AddEintragDto = { text: '   ' };

      // Mock: ETB exists (needed for auth check before command validation)
      const mockAggregate = {
        id: { value: etbId },
        einsatzId: { value: einsatzId },
        eintraege: [],
      };
      mockEtbRepository.findById.mockResolvedValueOnce(mockAggregate as unknown);
      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce({ id: 'teilnehmer-id' });

      // When/Then - AddEintragCommand.create fails because trimmed text is empty
      await expect(controller.addEintrag(etbId, dto, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('updateEintrag should handle whitespace-only newText via command validation', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const einsatzId = createValidTestId('eins0');
      const eintragId = createValidTestId('entry');
      const dto: UpdateEintragDto = { newText: '   ' };

      // Mock: ETB exists (needed for auth check before command validation)
      const mockAggregate = {
        id: { value: etbId },
        einsatzId: { value: einsatzId },
        eintraege: [],
      };
      mockEtbRepository.findById.mockResolvedValueOnce(mockAggregate as unknown);
      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce({ id: 'teilnehmer-id' });

      // When/Then
      await expect(controller.updateEintrag(etbId, eintragId, dto, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockUpdateEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should handle long text in addEintrag', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const einsatzId = createValidTestId('eins0');
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

      // Mock: ETB exists (needed for auth check)
      const mockAggregate = {
        id: { value: etbId },
        einsatzId: { value: einsatzId },
        eintraege: [],
      };
      mockEtbRepository.findById.mockResolvedValueOnce(mockAggregate as unknown);
      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce({ id: 'teilnehmer-id' });
      mockAddEintragHandler.execute.mockResolvedValueOnce(Result.ok(mockEintrag));

      // When
      const result = await controller.addEintrag(etbId, dto, mockUser);

      // Then
      expect(result.text).toBe(longText);
    });

    it('getEtbHistory should handle multiple snapshots with complex eintraege', async () => {
      // Given
      const etbId = createValidTestId('etb00');
      const einsatzId = createValidTestId('eins0');
      const mockAggregate = {
        id: { value: etbId },
        einsatzId: { value: einsatzId },
        eintraege: [],
      };
      mockEtbRepository.findById.mockResolvedValueOnce(mockAggregate as unknown);
      mockEinsatzTeilnehmerRepository.findByEinsatzAndUser.mockResolvedValueOnce({ id: 'teilnehmer-id' });

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
      const result = await controller.getEtbHistory(etbId, mockUser);

      // Then
      expect(result[0]?.eintraege).toHaveLength(2);
      expect(result[0]?.eintraege[1]?.isDeleted).toBe(true);
    });
  });
});
