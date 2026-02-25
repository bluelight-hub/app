import { Result } from '@domain/common/result';
import { ArchiveEinsatzHandler } from '../archive-einsatz.handler';
import { ArchiveEinsatzCommand } from '../archive-einsatz.command';
import type { IEinsatzRepository } from '@domain/repositories';
import { Einsatz } from '@domain/aggregates/einsatz.aggregate';
import { EinsatzStatus } from '@domain/value-objects/einsatz-status';
import { UserId } from '@domain/value-objects/user-id';
import { EinsatzArchivedEvent } from '@domain/events/einsatz-archived.event';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Test, type TestingModule } from '@nestjs/testing';
import { EINSATZ_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';

/**
 * Helper: Erstellt Mock-Einsatz mit spezifischem Status und abgeschlossenAt Date.
 *
 * @param options - Konfiguration für Status und Abschluss-Datum
 * @returns Einsatz Aggregate mit konfiguriertem Zustand
 */
const createMockEinsatz = (options: { status?: EinsatzStatus; abgeschlossenYearsAgo?: number } = {}) => {
  const userId = UserId.create().value!;
  const einsatz = Einsatz.create({
    alarmstichwort: 'Testbrand',
    createdBy: userId,
    nummer: 'E2026-001',
  }).value!;

  // Transition zu IN_BEARBEITUNG dann ABGESCHLOSSEN wenn nötig
  if (options.status?.equals(EinsatzStatus.ABGESCHLOSSEN()) || options.status?.equals(EinsatzStatus.ARCHIVIERT())) {
    einsatz.updateStatus(EinsatzStatus.IN_BEARBEITUNG());
    einsatz.complete(userId);

    // Mock abgeschlossenAt date falls spezifiziert
    if (options.abgeschlossenYearsAgo !== undefined) {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - options.abgeschlossenYearsAgo);
      // biome-ignore lint/suspicious/noExplicitAny: Test benötigt Zugriff auf private Property
      (einsatz as any)._abgeschlossenAt = pastDate;
    }
  } else if (options.status) {
    if (!options.status.equals(EinsatzStatus.ANGELEGT())) {
      einsatz.updateStatus(options.status);
    }
  }

  einsatz.clearDomainEvents();
  return einsatz;
};

describe('ArchiveEinsatzHandler', () => {
  let handler: ArchiveEinsatzHandler;
  let mockRepository: jest.Mocked<IEinsatzRepository>;
  let mockPrismaService: {
    $transaction: jest.Mock;
  };
  let mockOutboxRepository: {
    save: jest.Mock;
  };
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findActive: jest.fn(),
      findByNummer: jest.fn(),
      exists: jest.fn(),
    };

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = {};
        return callback(txMock);
      }),
    };

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchiveEinsatzHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: EINSATZ_REPOSITORY, useValue: mockRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<ArchiveEinsatzHandler>(ArchiveEinsatzHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('sollte Einsatz erfolgreich archivieren wenn Status ABGESCHLOSSEN', async () => {
      // Arrange
      const einsatz = createMockEinsatz({
        status: EinsatzStatus.ABGESCHLOSSEN(),
      });
      const userId = UserId.create().value!;
      const command = ArchiveEinsatzCommand.create(einsatz.id.value, userId.value).value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockOutboxRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledWith(einsatz, {});
      expect(einsatz.status.value).toBe('ARCHIVIERT');
      expect(einsatz.archivedAt).toBeDefined();
    });

    it('sollte Result.fail zurückgeben wenn Einsatz nicht gefunden', async () => {
      // Arrange
      const userId = UserId.create().value!;
      const command = ArchiveEinsatzCommand.create('clxxxxxxxxxxxxxxxxxx01', userId.value).value!;
      mockRepository.findById.mockResolvedValue(Result.ok(null));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('clxxxxxxxxxxxxxxxxxx01');
    });

    it('sollte Result.fail zurückgeben wenn Status != ABGESCHLOSSEN', async () => {
      // Arrange
      const einsatz = createMockEinsatz({ status: EinsatzStatus.IN_BEARBEITUNG() });
      const userId = UserId.create().value!;
      const command = ArchiveEinsatzCommand.create(einsatz.id.value, userId.value).value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('ABGESCHLOSSEN');
    });

    it('sollte Einsatz erfolgreich archivieren auch wenn noch nicht 10 Jahre alt (10-Jahres-Frist gilt für Aufbewahrung IM Archiv)', async () => {
      // Arrange
      const einsatz = createMockEinsatz({
        status: EinsatzStatus.ABGESCHLOSSEN(),
        abgeschlossenYearsAgo: 1, // Erst 1 Jahr alt
      });
      const userId = UserId.create().value!;
      const command = ArchiveEinsatzCommand.create(einsatz.id.value, userId.value).value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockOutboxRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(einsatz.status.value).toBe('ARCHIVIERT');
    });

    it('sollte Result.fail zurückgeben wenn Einsatz bereits ARCHIVIERT', async () => {
      // Arrange
      const einsatz = createMockEinsatz({
        status: EinsatzStatus.ABGESCHLOSSEN(),
      });
      const userId = UserId.create().value!;
      const command = ArchiveEinsatzCommand.create(einsatz.id.value, userId.value).value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockOutboxRepository.save.mockResolvedValue(undefined);

      // Einsatz archivieren (erster Aufruf)
      const firstResult = await handler.execute(command);
      expect(firstResult.isSuccess).toBe(true);
      einsatz.clearDomainEvents();

      // Act: Versuche erneut zu archivieren
      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      const result = await handler.execute(command);

      // Assert: Fehlermeldung prüft Status (ARCHIVIERT ist nicht ABGESCHLOSSEN)
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('ABGESCHLOSSEN');
    });

    it('sollte EinsatzArchivedEvent nach save() publizieren', async () => {
      // Arrange
      const einsatz = createMockEinsatz({
        status: EinsatzStatus.ABGESCHLOSSEN(),
      });
      const userId = UserId.create().value!;
      const command = ArchiveEinsatzCommand.create(einsatz.id.value, userId.value).value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockOutboxRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      const events = mockOutboxRepository.save.mock.calls[0][0];
      expect(events.some((e) => e instanceof EinsatzArchivedEvent)).toBe(true);
    });

    it('sollte Repository.save() mit archiviertem Einsatz aufrufen', async () => {
      // Arrange
      const einsatz = createMockEinsatz({
        status: EinsatzStatus.ABGESCHLOSSEN(),
      });
      const userId = UserId.create().value!;
      const command = ArchiveEinsatzCommand.create(einsatz.id.value, userId.value).value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockOutboxRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledWith(einsatz, {});
    });

    it('sollte archivedAt Timestamp setzen bei erfolgreicher Archivierung', async () => {
      // Arrange
      const einsatz = createMockEinsatz({
        status: EinsatzStatus.ABGESCHLOSSEN(),
      });
      const userId = UserId.create().value!;
      const command = ArchiveEinsatzCommand.create(einsatz.id.value, userId.value).value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));
      mockOutboxRepository.save.mockResolvedValue(undefined);

      // Act
      const beforeArchive = new Date();
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(einsatz.archivedAt).toBeDefined();
      expect(einsatz.archivedAt!.getTime()).toBeGreaterThanOrEqual(beforeArchive.getTime());
    });

    it('sollte Result.fail zurückgeben bei Repository save Fehler', async () => {
      // Arrange
      const einsatz = createMockEinsatz({
        status: EinsatzStatus.ABGESCHLOSSEN(),
      });
      const userId = UserId.create().value!;
      const command = ArchiveEinsatzCommand.create(einsatz.id.value, userId.value).value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.fail('Database error'));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Database error');
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail zurückgeben bei ungültiger EinsatzId', async () => {
      // Arrange
      const userId = UserId.create().value!;
      const command = ArchiveEinsatzCommand.create('invalid-id', userId.value).value!;

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('sollte Result.fail zurückgeben bei ungültiger UserId', async () => {
      // Arrange
      const einsatz = createMockEinsatz({
        status: EinsatzStatus.ABGESCHLOSSEN(),
        abgeschlossenYearsAgo: 11,
      });
      const command = ArchiveEinsatzCommand.create(einsatz.id.value, 'invalid-user-id').value!;

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    describe('Validation Errors', () => {
      it('sollte Result.fail zurückgeben bei ungültiger EinsatzId', async () => {
        // Arrange
        const userId = UserId.create().value!;
        const command = ArchiveEinsatzCommand.create('invalid-id-format', userId.value).value!;

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.isSuccess).toBe(false);
        expect(result.error).toBeDefined();
        expect(mockRepository.findById).not.toHaveBeenCalled();
      });

      it('sollte Result.fail zurückgeben bei ungültiger UserId', async () => {
        // Arrange
        const einsatz = createMockEinsatz({
          status: EinsatzStatus.ABGESCHLOSSEN(),
        });
        const command = ArchiveEinsatzCommand.create(einsatz.id.value, 'invalid-user-id').value!;

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.isSuccess).toBe(false);
        expect(result.error).toBeDefined();
        expect(mockRepository.findById).not.toHaveBeenCalled();
      });
    });

    describe('Entity Not Found', () => {
      it('sollte Result.fail zurückgeben wenn Einsatz nicht existiert', async () => {
        // Arrange
        const userId = UserId.create().value!;
        const command = ArchiveEinsatzCommand.create('clxxxxxxxxxxxxxxxxxx01', userId.value).value!;
        mockRepository.findById.mockResolvedValue(Result.ok(null));

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.isSuccess).toBe(false);
        expect(result.error).toBeDefined();
        expect(mockRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('Business Rule Violations', () => {
      it('sollte Result.fail zurückgeben wenn Status nicht ABGESCHLOSSEN', async () => {
        // Arrange
        const einsatz = createMockEinsatz({ status: EinsatzStatus.IN_BEARBEITUNG() });
        const userId = UserId.create().value!;
        const command = ArchiveEinsatzCommand.create(einsatz.id.value, userId.value).value!;

        mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.isSuccess).toBe(false);
        expect(result.error).toContain('ABGESCHLOSSEN');
        expect(mockRepository.save).not.toHaveBeenCalled();
      });

      it('sollte Einsatz erfolgreich archivieren auch wenn 10-Jahres-Frist nicht erreicht (gilt für Aufbewahrung)', async () => {
        // Arrange
        const einsatz = createMockEinsatz({
          status: EinsatzStatus.ABGESCHLOSSEN(),
          abgeschlossenYearsAgo: 1, // Nur 1 Jahr alt
        });
        const userId = UserId.create().value!;
        const command = ArchiveEinsatzCommand.create(einsatz.id.value, userId.value).value!;

        mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));
        mockOutboxRepository.save.mockResolvedValue(undefined);

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.isSuccess).toBe(true);
        expect(einsatz.status.value).toBe('ARCHIVIERT');
      });

      it('sollte Result.fail zurückgeben bei bereits archiviertem Einsatz', async () => {
        // Arrange
        const einsatz = createMockEinsatz({
          status: EinsatzStatus.ABGESCHLOSSEN(),
        });
        const userId = UserId.create().value!;
        const command = ArchiveEinsatzCommand.create(einsatz.id.value, userId.value).value!;

        mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
        mockRepository.save.mockResolvedValue(Result.ok(undefined));
        mockOutboxRepository.save.mockResolvedValue(undefined);

        // Einsatz archivieren (erster Aufruf)
        const firstResult = await handler.execute(command);
        expect(firstResult.isSuccess).toBe(true);
        einsatz.clearDomainEvents();

        // Act: Versuche erneut zu archivieren
        mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
        const result = await handler.execute(command);

        // Assert
        expect(result.isSuccess).toBe(false);
        expect(result.error).toContain('ABGESCHLOSSEN');
      });
    });

    describe('Repository/DB Errors', () => {
      it('sollte Result.fail zurückgeben bei Repository.save() Fehler', async () => {
        // Arrange
        const einsatz = createMockEinsatz({
          status: EinsatzStatus.ABGESCHLOSSEN(),
        });
        const userId = UserId.create().value!;
        const command = ArchiveEinsatzCommand.create(einsatz.id.value, userId.value).value!;

        mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
        mockRepository.save.mockResolvedValue(Result.fail('Database error'));

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.isSuccess).toBe(false);
        expect(result.error).toContain('Database error');
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      });

      it('sollte Result.fail zurückgeben bei Repository.findById() Fehler', async () => {
        // Arrange
        const userId = UserId.create().value!;
        const command = ArchiveEinsatzCommand.create('clxxxxxxxxxxxxxxxxxx01', userId.value).value!;
        mockRepository.findById.mockResolvedValue(Result.fail('Database connection error'));

        // Act
        const result = await handler.execute(command);

        // Assert
        expect(result.isSuccess).toBe(false);
        expect(result.error).toContain('Database connection error');
        expect(mockRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});
