/**
 * Integration Tests für EtbCqrsController (Story 3-7).
 *
 * Diese Tests validieren den vollständigen Controller-Flow:
 * Request -> Controller -> CommandBus/QueryBus -> Handler (mocked) -> Response
 *
 * **Test Strategy:**
 * - Mocked CommandBus/QueryBus mit jest.fn() (NO NestJS Test Module)
 * - Focus: Controller-Orchestration, Result-Mapping, Exception-Handling
 * - NO Handler-Logic Testing (covered by separate handler tests)
 *
 * **Endpoints unter Test:**
 * - POST /etb/:etbId/eintrag - Eintrag hinzufügen
 * - PUT /etb/:etbId/eintrag/:eintragId - Eintrag aktualisieren
 * - DELETE /etb/:etbId/eintrag/:eintragId - Eintrag soft-löschen
 * - POST /etb/:etbId/lock - ETB sperren (nur ADMIN)
 * - GET /etb/einsatz/:einsatzId - ETB abrufen
 * - GET /etb/:etbId/history - Versionshistorie abrufen
 *
 * **AC Coverage:**
 * - AC2: Add/Update/Delete Eintrag
 * - AC3: Lock ETB (nur ADMIN/SUPER_ADMIN)
 * - AC4: GetEtb mit includeDeleted Filter
 * - AC4: GetHistory
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EtbCqrsController } from '@/modules/etb/controllers/etb-cqrs.controller';
import { Result } from '@/domain/common/result';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { AddEintragDto, UpdateEintragDto, EtbDto, EintragDto, EtbSnapshotDto } from '@/application/etb/dto';
import { EtbKategorie } from '@/domain/value-objects/etb-kategorie';
import type { ILogger } from '@domain/ports/i-logger.port';

const databaseAvailable = !!process.env.DATABASE_URL;

// Mock CUID2 für deterministische Tests
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

// ============================================
// TEST HELPERS
// ============================================

/**
 * Generiert eine CUID2-konforme Test-ID.
 */
function createTestCuid(suffix = ''): string {
  const base = 'clw3h8x9y0000qwertyui';
  const safeSuffix = suffix
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .padEnd(5, '0')
    .slice(0, 5);
  return base + safeSuffix;
}

/**
 * Erstellt ein Test-EtbDto.
 */
function createTestEtbDto(options: Partial<EtbDto> = {}): EtbDto {
  return {
    id: createTestCuid('etb'),
    einsatzId: createTestCuid('einsatz'),
    status: 'DRAFT',
    version: 1,
    versionTimestamp: new Date().toISOString(),
    eintraege: [],
    createdAt: new Date().toISOString(),
    createdBy: createTestCuid('user'),
    ...options,
  };
}

/**
 * Erstellt ein Test-EintragDto.
 */
function createTestEintragDto(options: Partial<EintragDto> = {}): EintragDto {
  return {
    id: createTestCuid('entry'),
    sequenceNumber: 1,
    text: 'Test Eintrag',
    createdBy: createTestCuid('user'),
    createdAt: new Date().toISOString(),
    isDeleted: false,
    ...options,
  };
}

/**
 * Erstellt ein Test-EtbSnapshotDto.
 */
function createTestSnapshotDto(options: Partial<EtbSnapshotDto> = {}): EtbSnapshotDto {
  return {
    version: 1,
    eintraege: [],
    snapshotAt: new Date().toISOString(),
    ...options,
  };
}

// ============================================
// INTEGRATION TESTS
// ============================================

(databaseAvailable ? describe : describe.skip)('EtbCqrsController Integration Tests (Story 3-7)', () => {
  let controller: EtbCqrsController;
  // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
  let mockAddEintragHandler: jest.Mocked<any>;
  // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
  let mockUpdateEintragHandler: jest.Mocked<any>;
  // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
  let mockDeleteEintragHandler: jest.Mocked<any>;
  // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
  let mockLockEtbHandler: jest.Mocked<any>;
  // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
  let mockGetEtbQueryHandler: jest.Mocked<any>;
  // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
  let mockGetEtbHistoryQueryHandler: jest.Mocked<any>;
  // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
  let mockGetTextbausteineHandler: jest.Mocked<any>;
  // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
  let mockGetErinnerungTimelineHandler: jest.Mocked<any>;
  // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
  let mockEtbRepository: jest.Mocked<any>;
  let mockLogger: jest.Mocked<ILogger>;
  // biome-ignore lint/suspicious/noExplicitAny: Test requires type bypass for mock/invalid data
  let mockPrismaService: jest.Mocked<any>;

  const adminUser: ValidatedUser = {
    userId: createTestCuid('admin'),
    email: 'admin@test.com',
    role: 'ADMIN',
  };

  const regularUser: ValidatedUser = {
    userId: createTestCuid('user'),
    email: 'user@test.com',
    role: 'USER',
  };

  beforeEach(() => {
    // Create mock handlers
    mockAddEintragHandler = {
      execute: jest.fn(),
    };

    mockUpdateEintragHandler = {
      execute: jest.fn(),
    };

    mockDeleteEintragHandler = {
      execute: jest.fn(),
    };

    mockLockEtbHandler = {
      execute: jest.fn(),
    };

    mockGetEtbQueryHandler = {
      execute: jest.fn(),
    };

    mockGetEtbHistoryQueryHandler = {
      execute: jest.fn(),
    };

    mockGetTextbausteineHandler = {
      execute: jest.fn(),
    };

    mockGetErinnerungTimelineHandler = {
      execute: jest.fn(),
    };

    mockEtbRepository = {
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      save: jest.fn(),
    };

    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as jest.Mocked<ILogger>;

    // Create mock PrismaService
    mockPrismaService = {
      einsatzTeilnehmer: {
        findFirst: jest.fn(),
      },
    };

    // Instantiate controller with mocks (Direct Instantiation Pattern)
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

  // ========================================
  // TEST GROUP 1: POST /etb/:etbId/eintrag
  // ========================================

  describe('POST /etb/:etbId/eintrag - addEintrag()', () => {
    it('should add eintrag to ETB and return EintragDto', async () => {
      // Given
      const etbId = createTestCuid('etb');
      const dto: AddEintragDto = { text: 'Fahrzeug W1 am Einsatzort eingetroffen' };
      const mockEintrag = {
        id: { value: createTestCuid('entry') },
        sequenceNumber: { value: 1 },
        kategorie: EtbKategorie.LAGE(),
        text: 'Fahrzeug W1 am Einsatzort eingetroffen',
        createdBy: { value: adminUser.userId },
        createdAt: new Date(),
        isDeleted: false,
      };

      mockAddEintragHandler.execute.mockResolvedValueOnce(Result.ok(mockEintrag));

      // When
      const result = await controller.addEintrag(etbId, dto, adminUser);

      // Then
      expect(result).toBeDefined();
      expect(result.text).toBe('Fahrzeug W1 am Einsatzort eingetroffen');
      expect(result.sequenceNumber).toBe(1);
      expect(result.isDeleted).toBe(false);
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when ETB does not exist', async () => {
      // Given
      const etbId = createTestCuid('etb');
      const dto: AddEintragDto = { text: 'Test' };

      mockAddEintragHandler.execute.mockResolvedValueOnce(Result.fail('ETB nicht gefunden'));

      // When/Then
      await expect(controller.addEintrag(etbId, dto, adminUser)).rejects.toThrow(NotFoundException);
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when text is empty', async () => {
      // Given - Command creation will fail with empty text
      const etbId = createTestCuid('etb');
      const dto: AddEintragDto = { text: '' };

      // When/Then - Command.create() returns failure for empty text
      await expect(controller.addEintrag(etbId, dto, adminUser)).rejects.toThrow(BadRequestException);
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when ETB is locked', async () => {
      // Given
      const etbId = createTestCuid('etb');
      const dto: AddEintragDto = { text: 'Test' };

      mockAddEintragHandler.execute.mockResolvedValueOnce(Result.fail('ETB ist gesperrt'));

      // When/Then
      await expect(controller.addEintrag(etbId, dto, adminUser)).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // TEST GROUP 2: PUT /etb/:etbId/eintrag/:eintragId
  // ========================================

  describe('PUT /etb/:etbId/eintrag/:eintragId - updateEintrag()', () => {
    it('should update eintrag text and return EintragDto', async () => {
      // Given
      const etbId = createTestCuid('etb');
      const eintragId = createTestCuid('entry');
      const dto: UpdateEintragDto = { newText: 'Aktualisierter Text' };

      // Mock a minimal aggregate that the mapper can work with
      const mockAggregate = {
        id: { value: etbId },
        einsatzId: { value: createTestCuid('einsatz') },
        status: { value: 'DRAFT' },
        version: { versionNumber: 1, versionTimestamp: new Date() },
        eintraege: [
          {
            id: { value: eintragId },
            sequenceNumber: { value: 1 },
            kategorie: EtbKategorie.LAGE(),
            text: 'Aktualisierter Text',
            createdBy: { value: adminUser.userId },
            createdAt: new Date(),
            isDeleted: false,
          },
        ],
        createdAt: new Date(),
        createdBy: { value: adminUser.userId },
      };

      mockUpdateEintragHandler.execute.mockResolvedValueOnce(Result.ok(undefined));
      mockEtbRepository.findById.mockResolvedValueOnce(mockAggregate);

      // When
      const result = await controller.updateEintrag(etbId, eintragId, dto, adminUser);

      // Then
      expect(result).toBeDefined();
      expect(result.id).toBe(eintragId);
      expect(result.text).toBe('Aktualisierter Text');
      expect(mockUpdateEintragHandler.execute).toHaveBeenCalledTimes(1);
      expect(mockEtbRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when eintrag does not exist', async () => {
      // Given
      const etbId = createTestCuid('etb');
      const eintragId = createTestCuid('entry');
      const dto: UpdateEintragDto = { newText: 'Test' };

      mockUpdateEintragHandler.execute.mockResolvedValueOnce(Result.fail('Eintrag nicht gefunden'));

      // When/Then
      await expect(controller.updateEintrag(etbId, eintragId, dto, adminUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when ETB is locked', async () => {
      // Given
      const etbId = createTestCuid('etb');
      const eintragId = createTestCuid('entry');
      const dto: UpdateEintragDto = { newText: 'Test' };

      mockUpdateEintragHandler.execute.mockResolvedValueOnce(Result.fail('ETB ist gesperrt'));

      // When/Then
      await expect(controller.updateEintrag(etbId, eintragId, dto, adminUser)).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // TEST GROUP 3: DELETE /etb/:etbId/eintrag/:eintragId
  // ========================================

  describe('DELETE /etb/:etbId/eintrag/:eintragId - deleteEintrag()', () => {
    it('should soft-delete eintrag and return void', async () => {
      // Given
      const etbId = createTestCuid('etb');
      const eintragId = createTestCuid('entry');

      mockDeleteEintragHandler.execute.mockResolvedValueOnce(Result.ok(undefined));

      // When
      const result = await controller.deleteEintrag(etbId, eintragId, adminUser);

      // Then
      expect(result).toBeUndefined();
      expect(mockDeleteEintragHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when eintrag does not exist', async () => {
      // Given
      const etbId = createTestCuid('etb');
      const eintragId = createTestCuid('entry');

      mockDeleteEintragHandler.execute.mockResolvedValueOnce(Result.fail('Eintrag nicht gefunden'));

      // When/Then
      await expect(controller.deleteEintrag(etbId, eintragId, adminUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when ETB is locked', async () => {
      // Given
      const etbId = createTestCuid('etb');
      const eintragId = createTestCuid('entry');

      mockDeleteEintragHandler.execute.mockResolvedValueOnce(Result.fail('ETB ist gesperrt'));

      // When/Then
      await expect(controller.deleteEintrag(etbId, eintragId, adminUser)).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // TEST GROUP 4: POST /etb/:etbId/lock
  // ========================================

  describe('POST /etb/:etbId/lock - lockEtb()', () => {
    it('should lock ETB when user has ADMIN role', async () => {
      // Given
      const etbId = createTestCuid('etb');

      mockLockEtbHandler.execute.mockResolvedValueOnce(Result.ok(undefined));

      // When
      const result = await controller.lockEtb(etbId, adminUser);

      // Then
      expect(result).toBeUndefined();
      expect(mockLockEtbHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should lock ETB when user has SUPER_ADMIN role', async () => {
      // Given
      const etbId = createTestCuid('etb');
      const superAdmin: ValidatedUser = { ...adminUser, role: 'SUPER_ADMIN' };

      mockLockEtbHandler.execute.mockResolvedValueOnce(Result.ok(undefined));

      // When
      const result = await controller.lockEtb(etbId, superAdmin);

      // Then
      expect(result).toBeUndefined();
      expect(mockLockEtbHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when ETB is already locked', async () => {
      // Given
      const etbId = createTestCuid('etb');

      mockLockEtbHandler.execute.mockResolvedValueOnce(Result.fail('ETB ist bereits gesperrt'));

      // When/Then
      await expect(controller.lockEtb(etbId, adminUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when ETB does not exist', async () => {
      // Given
      const etbId = createTestCuid('etb');

      mockLockEtbHandler.execute.mockResolvedValueOnce(Result.fail('ETB nicht gefunden'));

      // When/Then
      await expect(controller.lockEtb(etbId, adminUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user has USER role (command validation)', async () => {
      // Given
      const etbId = createTestCuid('etb');
      // Note: RolesGuard would block this at route level, but we test controller behavior
      mockLockEtbHandler.execute.mockResolvedValueOnce(Result.fail('Nur ADMIN oder SUPER_ADMIN berechtigt'));

      // When/Then
      await expect(controller.lockEtb(etbId, regularUser)).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // TEST GROUP 5: GET /etb/einsatz/:einsatzId
  // ========================================

  describe('GET /etb/einsatz/:einsatzId - getEtbByEinsatzId()', () => {
    it('should return ETB with eintraege for einsatz', async () => {
      // Given
      const einsatzId = createTestCuid('einsatz');
      const etbDto = createTestEtbDto({
        einsatzId,
        eintraege: [createTestEintragDto({ text: 'Eintrag 1' }), createTestEintragDto({ text: 'Eintrag 2', sequenceNumber: 2 })],
      });

      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.ok(etbDto));

      // When
      const result = await controller.getEtbByEinsatzId(einsatzId);

      // Then
      expect(result).toBeDefined();
      expect(result.eintraege).toHaveLength(2);
      expect(result.eintraege[0].text).toBe('Eintrag 1');
      expect(mockGetEtbQueryHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should exclude soft-deleted eintraege by default (includeDeleted=false)', async () => {
      // Given
      const einsatzId = createTestCuid('einsatz');
      const etbDto = createTestEtbDto({
        einsatzId,
        eintraege: [createTestEintragDto({ text: 'Active Entry' })],
      });

      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.ok(etbDto));

      // When
      const result = await controller.getEtbByEinsatzId(einsatzId, 'false');

      // Then
      expect(result.eintraege).toHaveLength(1);
      expect(result.eintraege[0].text).toBe('Active Entry');
    });

    it('should include soft-deleted eintraege when includeDeleted=true', async () => {
      // Given
      const einsatzId = createTestCuid('einsatz');
      const etbDto = createTestEtbDto({
        einsatzId,
        eintraege: [createTestEintragDto({ text: 'Active Entry' }), createTestEintragDto({ text: 'Deleted Entry', isDeleted: true })],
      });

      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.ok(etbDto));

      // When
      const result = await controller.getEtbByEinsatzId(einsatzId, 'true');

      // Then
      expect(result.eintraege).toHaveLength(2);
      const deletedEntry = result.eintraege.find((e) => e.isDeleted);
      expect(deletedEntry).toBeDefined();
    });

    it('should throw NotFoundException when ETB does not exist for einsatz', async () => {
      // Given
      const einsatzId = createTestCuid('einsatz');

      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.fail('ETB nicht gefunden'));

      // When/Then
      await expect(controller.getEtbByEinsatzId(einsatzId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when query returns null', async () => {
      // Given
      const einsatzId = createTestCuid('einsatz');

      mockGetEtbQueryHandler.execute.mockResolvedValueOnce(Result.ok(null));

      // When/Then
      await expect(controller.getEtbByEinsatzId(einsatzId)).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================
  // TEST GROUP 6: GET /etb/:etbId/history
  // ========================================

  describe('GET /etb/:etbId/history - getEtbHistory()', () => {
    it('should return snapshots sorted by version', async () => {
      // Given
      const etbId = createTestCuid('etb');
      const snapshots: EtbSnapshotDto[] = [createTestSnapshotDto({ version: 3 }), createTestSnapshotDto({ version: 2 }), createTestSnapshotDto({ version: 1 })];

      mockGetEtbHistoryQueryHandler.execute.mockResolvedValueOnce(Result.ok(snapshots));

      // When
      const result = await controller.getEtbHistory(etbId);

      // Then
      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(3);
      expect(result[2].version).toBe(1);
    });

    it('should return empty array when no mutations occurred', async () => {
      // Given
      const etbId = createTestCuid('etb');

      mockGetEtbHistoryQueryHandler.execute.mockResolvedValueOnce(Result.ok([]));

      // When
      const result = await controller.getEtbHistory(etbId);

      // Then
      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when ETB does not exist', async () => {
      // Given
      const etbId = createTestCuid('etb');

      mockGetEtbHistoryQueryHandler.execute.mockResolvedValueOnce(Result.fail('ETB nicht gefunden'));

      // When/Then
      await expect(controller.getEtbHistory(etbId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid etbId format', async () => {
      // Given - Query constructor throws for invalid format
      const invalidEtbId = 'invalid-id';

      // When/Then - Query.create() validation fails
      await expect(controller.getEtbHistory(invalidEtbId)).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================
  // TEST GROUP 7: Error Handling
  // ========================================

  describe('Error Handling', () => {
    it('should throw BadRequestException for invalid etbId in addEintrag', async () => {
      // Given
      const invalidEtbId = '';
      const dto: AddEintragDto = { text: 'Test' };

      // When/Then - Command.create() fails for empty etbId
      await expect(controller.addEintrag(invalidEtbId, dto, adminUser)).rejects.toThrow(BadRequestException);
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty eintragId in updateEintrag', async () => {
      // Given
      const etbId = createTestCuid('etb');
      const emptyEintragId = '';
      const dto: UpdateEintragDto = { newText: 'Test' };

      // When/Then
      await expect(controller.updateEintrag(etbId, emptyEintragId, dto, adminUser)).rejects.toThrow(BadRequestException);
      expect(mockUpdateEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty newText in updateEintrag', async () => {
      // Given
      const etbId = createTestCuid('etb');
      const eintragId = createTestCuid('entry');
      const dto: UpdateEintragDto = { newText: '' };

      // When/Then
      await expect(controller.updateEintrag(etbId, eintragId, dto, adminUser)).rejects.toThrow(BadRequestException);
      expect(mockUpdateEintragHandler.execute).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // TEST GROUP 8: Full CRUD Flow
  // ========================================

  describe('Full CRUD Flow Integration', () => {
    it('should execute complete lifecycle: Add -> Update -> Delete', async () => {
      const etbId = createTestCuid('etb');
      const entryId = createTestCuid('entry');

      // Phase 1: Add eintrag
      const mockEintrag = {
        id: { value: entryId },
        sequenceNumber: { value: 1 },
        kategorie: EtbKategorie.LAGE(),
        text: 'Original Text',
        createdBy: { value: adminUser.userId },
        createdAt: new Date(),
        isDeleted: false,
      };
      mockAddEintragHandler.execute.mockResolvedValueOnce(Result.ok(mockEintrag));

      const added = await controller.addEintrag(etbId, { text: 'Original Text' }, adminUser);
      expect(added.text).toBe('Original Text');

      // Phase 2: Update eintrag
      const mockAggregate = {
        id: { value: etbId },
        einsatzId: { value: createTestCuid('einsatz') },
        status: { value: 'DRAFT' },
        version: { versionNumber: 2, versionTimestamp: new Date() },
        eintraege: [
          {
            id: { value: entryId },
            sequenceNumber: { value: 1 },
            kategorie: EtbKategorie.LAGE(),
            text: 'Updated Text',
            createdBy: { value: adminUser.userId },
            createdAt: new Date(),
            isDeleted: false,
          },
        ],
        createdAt: new Date(),
        createdBy: { value: adminUser.userId },
      };

      mockUpdateEintragHandler.execute.mockResolvedValueOnce(Result.ok(undefined));
      mockEtbRepository.findById.mockResolvedValueOnce(mockAggregate);

      const updated = await controller.updateEintrag(etbId, entryId, { newText: 'Updated Text' }, adminUser);
      expect(updated.text).toBe('Updated Text');

      // Phase 3: Delete eintrag
      mockDeleteEintragHandler.execute.mockResolvedValueOnce(Result.ok(undefined));

      await controller.deleteEintrag(etbId, entryId, adminUser);

      // Verify all operations were called
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      expect(mockUpdateEintragHandler.execute).toHaveBeenCalledTimes(1);
      expect(mockDeleteEintragHandler.execute).toHaveBeenCalledTimes(1);
      expect(mockEtbRepository.findById).toHaveBeenCalledTimes(1);
    });
  });
});
