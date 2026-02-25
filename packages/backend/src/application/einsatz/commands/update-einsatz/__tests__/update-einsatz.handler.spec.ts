import { Test, type TestingModule } from '@nestjs/testing';
import { UpdateEinsatzHandler } from '../update-einsatz.handler';
import { UpdateEinsatzCommand } from '../update-einsatz.command';
import { Result } from '@domain/common/result';
import { Einsatz } from '@domain/aggregates/einsatz.aggregate';
import { UserId } from '@domain/value-objects/user-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EINSATZ_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';

describe('UpdateEinsatzHandler', () => {
  let handler: UpdateEinsatzHandler;
  let mockRepository: {
    save: jest.Mock;
    findById: jest.Mock;
  };
  let mockPrismaService: {
    $transaction: jest.Mock;
  };
  let mockOutboxRepository: {
    save: jest.Mock;
  };
  let mockLogger: jest.Mocked<ILogger>;

  // Helper to create a valid Einsatz for tests
  const createTestEinsatz = () => {
    const userId = UserId.create().value!;
    return Einsatz.create({
      alarmstichwort: 'Testbrand',
      createdBy: userId,
      nummer: 'E2026-001',
    }).value!;
  };

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
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
        UpdateEinsatzHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: EINSATZ_REPOSITORY, useValue: mockRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<UpdateEinsatzHandler>(UpdateEinsatzHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('sollte nur alarmstichwort aktualisieren (Partial Update)', async () => {
      // Given (Arrange)
      const einsatz = createTestEinsatz();
      const originalEinsatzort = einsatz.einsatzort;
      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

      const command = UpdateEinsatzCommand.create(
        einsatz.id.value,
        'Neues Alarmstichwort',
        undefined, // einsatzort bleibt unverändert
        undefined, // bemerkung bleibt unverändert
      ).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(einsatz.alarmstichwort).toBe('Neues Alarmstichwort');
      expect(einsatz.einsatzort).toBe(originalEinsatzort); // unchanged
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte Result.fail zurückgeben wenn Einsatz nicht gefunden', async () => {
      // Given (Arrange)
      const einsatzId = EinsatzId.create().value!;
      mockRepository.findById.mockResolvedValue(Result.ok(null));

      const command = UpdateEinsatzCommand.create(einsatzId.value, 'Neues Alarmstichwort').value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Einsatz nicht gefunden');
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte EinsatzUpdatedEvent in Outbox persistieren', async () => {
      // Given (Arrange)
      const einsatz = createTestEinsatz();
      einsatz.clearDomainEvents(); // Clear creation event
      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

      const command = UpdateEinsatzCommand.create(einsatz.id.value, 'Großbrand').value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      expect(savedEvents.length).toBe(1);
      const updateEvent = savedEvents[0];
      expect(updateEvent.updates.alarmstichwort).toBe('Großbrand');
    });

    it('sollte Result.fail zurückgeben bei ungültiger Einsatz-ID', async () => {
      // Given (Arrange)
      const command = UpdateEinsatzCommand.create('invalid-id', 'Neues Alarmstichwort').value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Invalid CUID format');
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      // findById wird nicht aufgerufen weil ID-Validierung vorher fehlschlägt
      expect(mockRepository.findById).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail zurückgeben bei Repository-Fehler', async () => {
      // Given (Arrange)
      const einsatz = createTestEinsatz();
      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.fail('Database error'));

      const command = UpdateEinsatzCommand.create(einsatz.id.value, 'Großbrand').value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Database error');
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Command Validation', () => {
    it('sollte Result.fail bei fehlender einsatzId zurückgeben', () => {
      const result = UpdateEinsatzCommand.create('', 'Alarmstichwort');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('einsatzId ist erforderlich');
    });

    it('sollte Result.fail wenn keine Felder aktualisiert werden', () => {
      const einsatzId = EinsatzId.create().value!;
      const result = UpdateEinsatzCommand.create(einsatzId.value);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Mindestens ein Feld muss aktualisiert werden');
    });

    it('sollte Result.fail bei leerem alarmstichwort zurückgeben', () => {
      const einsatzId = EinsatzId.create().value!;
      const result = UpdateEinsatzCommand.create(einsatzId.value, '');
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Alarmstichwort darf nicht leer sein');
    });
  });

  describe('Error Handling', () => {
    describe('Validation Errors', () => {
      it('sollte Result.fail bei ungültiger EinsatzId zurückgeben', async () => {
        // Given (Arrange)
        const command = UpdateEinsatzCommand.create('invalid-einsatz-id', 'Neues Alarmstichwort').value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Invalid CUID format');
        expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
        // findById wird nicht aufgerufen weil ID-Validierung vorher fehlschlägt
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      });

      it('sollte Result.fail mit aussagekräftiger Fehlermeldung zurückgeben', async () => {
        // Given (Arrange)
        const invalidId = 'too-short';
        const command = UpdateEinsatzCommand.create(invalidId, 'Alarmstichwort').value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Invalid CUID format');
        expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      });
    });

    describe('Entity Not Found', () => {
      it('sollte Result.fail zurückgeben wenn Einsatz nicht existiert', async () => {
        // Given (Arrange)
        const einsatzId = EinsatzId.create().value!;
        mockRepository.findById.mockResolvedValue(Result.ok(null));
        const command = UpdateEinsatzCommand.create(einsatzId.value, 'Neues Alarmstichwort').value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Einsatz nicht gefunden');
        expect(mockRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      });

      it('sollte Result.fail mit aussagekräftiger Fehlermeldung zurückgeben', async () => {
        // Given (Arrange)
        const einsatzId = EinsatzId.create().value!;
        mockRepository.findById.mockResolvedValue(Result.ok(null));
        const command = UpdateEinsatzCommand.create(einsatzId.value, 'Alarmstichwort').value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Einsatz nicht gefunden');
      });
    });

    describe('Business Rule Violations', () => {
      it('sollte Result.fail bei Update eines archivierten Einsatzes zurückgeben', async () => {
        // Given (Arrange)
        const einsatz = createTestEinsatz();
        // Simulate archiving: complete then archive
        einsatz.updateStatus(require('@domain/value-objects/einsatz-status').EinsatzStatus.ABGESCHLOSSEN());
        const userId = UserId.create().value!;
        einsatz.archive(userId);
        einsatz.clearDomainEvents();

        mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
        const command = UpdateEinsatzCommand.create(einsatz.id.value, 'Neues Alarmstichwort').value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error?.toLowerCase()).toContain('archiviert');
        expect(mockRepository.save).not.toHaveBeenCalled();
      });

      it('sollte Result.fail mit aussagekräftiger Fehlermeldung zurückgeben', async () => {
        // Given (Arrange)
        const einsatz = createTestEinsatz();
        einsatz.updateStatus(require('@domain/value-objects/einsatz-status').EinsatzStatus.ABGESCHLOSSEN());
        const userId = UserId.create().value!;
        einsatz.archive(userId);
        einsatz.clearDomainEvents();

        mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
        const command = UpdateEinsatzCommand.create(einsatz.id.value, 'Neues Alarmstichwort').value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error?.toLowerCase()).toContain('archiviert');
      });
    });

    describe('Repository/DB Errors', () => {
      it('sollte Result.fail bei Repository.findById Fehler zurückgeben', async () => {
        // Given (Arrange)
        const einsatzId = EinsatzId.create().value!;
        mockRepository.findById.mockResolvedValue(Result.fail('DB connection timeout'));
        const command = UpdateEinsatzCommand.create(einsatzId.value, 'Neues Alarmstichwort').value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('DB connection timeout');
        expect(mockRepository.save).not.toHaveBeenCalled();
      });

      it('sollte Result.fail bei Repository.save Fehler zurückgeben', async () => {
        // Given (Arrange)
        const einsatz = createTestEinsatz();
        mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
        mockRepository.save.mockResolvedValue(Result.fail('Database write error'));
        const command = UpdateEinsatzCommand.create(einsatz.id.value, 'Großbrand').value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Database write error');
        expect(mockRepository.save).toHaveBeenCalled();
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      });

      it('sollte Result.fail mit aussagekräftiger Fehlermeldung zurückgeben', async () => {
        // Given (Arrange)
        const einsatz = createTestEinsatz();
        mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
        mockRepository.save.mockResolvedValue(Result.fail('Constraint violation'));
        const command = UpdateEinsatzCommand.create(einsatz.id.value, 'Alarmstichwort').value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isFailure).toBe(true);
        expect(result.error).toBe('Constraint violation');
      });
    });
  });
});
