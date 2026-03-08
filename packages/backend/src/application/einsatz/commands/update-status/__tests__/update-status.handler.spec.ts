// @ts-nocheck
import { Result } from '@domain/common/result';
import { UpdateEinsatzStatusHandler } from '../update-status.handler';
import { UpdateEinsatzStatusCommand } from '../update-status.command';
import type { IEinsatzRepository } from '@domain/repositories';
import { Einsatz } from '@domain/aggregates/einsatz.aggregate';
import { EinsatzStatus } from '@domain/value-objects/einsatz-status';
import { UserId } from '@domain/value-objects/user-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Test, type TestingModule } from '@nestjs/testing';
import { EINSATZ_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';
import { createMockEinsatzRepository } from '@/test-utils/mock-factories';

/**
 * Helper: Erstellt Mock-Einsatz mit spezifischem Status.
 * Führt korrekte State Machine Transitions durch um gewünschten Status zu erreichen.
 */
const createMockEinsatz = (status: EinsatzStatus = EinsatzStatus.ANGELEGT()): Einsatz => {
  const userId = UserId.create().value!;
  const einsatz = Einsatz.create({
    alarmstichwort: 'Testbrand',
    createdBy: userId,
    nummer: 'E2026-001',
  }).value!;

  // Set status through valid transitions
  if (status.equals(EinsatzStatus.IN_BEARBEITUNG())) {
    einsatz.updateStatus(EinsatzStatus.IN_BEARBEITUNG());
  } else if (status.equals(EinsatzStatus.ABGESCHLOSSEN())) {
    einsatz.updateStatus(EinsatzStatus.IN_BEARBEITUNG());
    einsatz.complete(userId);
  } else if (status.equals(EinsatzStatus.ARCHIVIERT())) {
    einsatz.updateStatus(EinsatzStatus.IN_BEARBEITUNG());
    einsatz.complete(userId);
    einsatz.archive(userId);
  }

  einsatz.clearDomainEvents();
  return einsatz;
};

describe('UpdateEinsatzStatusHandler', () => {
  let handler: UpdateEinsatzStatusHandler;
  let mockRepository: jest.Mocked<IEinsatzRepository>;
  let mockPrismaService: {
    $transaction: jest.Mock;
  };
  let mockOutboxRepository: {
    save: jest.Mock;
  };
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(async () => {
    mockRepository = createMockEinsatzRepository();

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
        UpdateEinsatzStatusHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: EINSATZ_REPOSITORY, useValue: mockRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<UpdateEinsatzStatusHandler>(UpdateEinsatzStatusHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute - gültige Transitions', () => {
    it('sollte ANGELEGT → IN_BEARBEITUNG erfolgreich durchführen', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz(EinsatzStatus.ANGELEGT());
      const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'IN_BEARBEITUNG').value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeUndefined();
      expect(einsatz.status.value).toBe('IN_BEARBEITUNG');
      expect(mockRepository.save).toHaveBeenCalledWith(einsatz, {});
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte IN_BEARBEITUNG → ABGESCHLOSSEN erfolgreich durchführen', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz(EinsatzStatus.IN_BEARBEITUNG());
      const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'ABGESCHLOSSEN').value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeUndefined();
      expect(einsatz.status.value).toBe('ABGESCHLOSSEN');
      expect(mockRepository.save).toHaveBeenCalledWith(einsatz, {});
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte ABGESCHLOSSEN → ARCHIVIERT erfolgreich durchführen', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz(EinsatzStatus.ABGESCHLOSSEN());
      const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'ARCHIVIERT').value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeUndefined();
      expect(einsatz.status.value).toBe('ARCHIVIERT');
      expect(mockRepository.save).toHaveBeenCalledWith(einsatz, {});
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte ANGELEGT → ABGESCHLOSSEN direkt durchführen (Skip-Transition)', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz(EinsatzStatus.ANGELEGT());
      const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'ABGESCHLOSSEN').value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeUndefined();
      expect(einsatz.status.value).toBe('ABGESCHLOSSEN');
      expect(mockRepository.save).toHaveBeenCalledWith(einsatz, {});
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('execute - ungültige Transitions', () => {
    it('sollte ABGESCHLOSSEN → ANGELEGT ablehnen (Rückwärts-Transition)', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz(EinsatzStatus.ABGESCHLOSSEN());
      const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'ANGELEGT').value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Ungültige Status-Transition');
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte ABGESCHLOSSEN → IN_BEARBEITUNG ablehnen (Rückwärts-Transition)', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz(EinsatzStatus.ABGESCHLOSSEN());
      const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'IN_BEARBEITUNG').value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Ungültige Status-Transition');
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte ARCHIVIERT → IN_BEARBEITUNG ablehnen (immutable)', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz(EinsatzStatus.ARCHIVIERT());
      const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'IN_BEARBEITUNG').value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Archivierte Einsätze');
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte ARCHIVIERT → ABGESCHLOSSEN ablehnen (immutable)', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz(EinsatzStatus.ARCHIVIERT());
      const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'ABGESCHLOSSEN').value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Archivierte Einsätze');
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte ungültigen Status-String ablehnen', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz();
      const einsatzId = einsatz.id.value;
      const command = UpdateEinsatzStatusCommand.create(einsatzId, 'INVALID_STATUS').value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Ungültiger Status');
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('execute - Fehlerbehandlung', () => {
    it('sollte Result.fail zurückgeben wenn Einsatz nicht gefunden', async () => {
      // Given (Arrange)
      const validEinsatzId = EinsatzId.create().value?.value;
      const command = UpdateEinsatzStatusCommand.create(validEinsatzId, 'IN_BEARBEITUNG').value!;
      mockRepository.findById.mockResolvedValue(Result.ok(null));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail zurückgeben bei ungültiger EinsatzId', async () => {
      // Given (Arrange)
      const command = UpdateEinsatzStatusCommand.create('invalid-id-format', 'IN_BEARBEITUNG').value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(false);
      expect(result.error).toMatch(/Invalid CUID format|Ungültige Einsatz-ID/);
      expect(mockRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail zurückgeben bei Repository.save() Fehler', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz(EinsatzStatus.ANGELEGT());
      const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'IN_BEARBEITUNG').value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.fail('Database connection error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(false);
      expect(result.error).toBe('Database connection error');
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail zurückgeben bei Repository.findById() Fehler', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz();
      const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'IN_BEARBEITUNG').value!;

      mockRepository.findById.mockResolvedValue(Result.fail('Database connection error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(false);
      expect(result.error).toBe('Database connection error');
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('execute - Event Publishing', () => {
    it('sollte EinsatzStatusChangedEvent in Outbox persistieren', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz(EinsatzStatus.ANGELEGT());
      const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'IN_BEARBEITUNG').value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      const savedEvents = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(savedEvents).toHaveLength(1);
      expect(savedEvents[0]?.constructor.name).toBe('EinsatzStatusChangedEvent');
    });

    it('sollte Events in Outbox speichern nach save(), nicht vorher', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz(EinsatzStatus.ANGELEGT());
      const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'IN_BEARBEITUNG').value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Reihenfolge wichtig: save() vor Outbox save()
      const outboxCalls = mockOutboxRepository.save.mock.invocationCallOrder;
      const saveCalls = mockRepository.save.mock.invocationCallOrder;
      expect(saveCalls[0]).toBeLessThan(outboxCalls[0]);
    });

    it('sollte keine Events in Outbox speichern bei save() Fehler', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz(EinsatzStatus.ANGELEGT());
      const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'IN_BEARBEITUNG').value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.fail('Database error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(false);
      expect(result.error).toBe('Database error');
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Domain Events nach Outbox Persistierung leeren', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz(EinsatzStatus.ANGELEGT());
      const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'IN_BEARBEITUNG').value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      // Repository.save() simuliert das Clearen der Events (wie in der echten Implementierung)
      mockRepository.save.mockImplementation(async (aggregate) => {
        aggregate.clearDomainEvents(); // Repository ist für Event-Clearing zuständig
        return Result.ok(undefined);
      });

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Nach Repository.save() sollten Events gecleared sein (vom Repository)
      expect(einsatz.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('execute - No-Op Szenarien', () => {
    it('sollte No-Op durchführen bei gleichem Status (keine Events)', async () => {
      // Given (Arrange)
      const einsatz = createMockEinsatz(EinsatzStatus.IN_BEARBEITUNG());
      const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'IN_BEARBEITUNG').value!;

      mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
      mockRepository.save.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeUndefined();
      expect(mockRepository.save).toHaveBeenCalledWith(einsatz, {});
      // No-Op: Aggregate erzeugt kein Event bei gleichem Status
      expect(einsatz.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    describe('Validation Errors', () => {
      it('sollte Result.fail zurückgeben bei ungültiger EinsatzId', async () => {
        // Given (Arrange)
        const command = UpdateEinsatzStatusCommand.create('invalid-id-format', 'IN_BEARBEITUNG').value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(false);
        expect(result.error).toMatch(/Invalid CUID format|Ungültige Einsatz-ID/);
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
      });

      it('sollte Result.fail zurückgeben bei ungültigem Status-String', async () => {
        // Given (Arrange)
        const einsatz = createMockEinsatz();
        const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'INVALID_STATUS').value!;

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(false);
        expect(result.error).toContain('Ungültiger Status');
        expect(mockRepository.findById).not.toHaveBeenCalled();
        expect(mockRepository.save).not.toHaveBeenCalled();
      });

      it('sollte Command-Erstellung fehlschlagen bei leerem Status-String', async () => {
        // Given (Arrange)
        const einsatz = createMockEinsatz();
        const commandResult = UpdateEinsatzStatusCommand.create(einsatz.id.value, '');

        // When & Then (Act & Assert)
        expect(commandResult.isFailure).toBe(true);
        expect(commandResult.error).toContain('newStatus');
      });
    });

    describe('Entity Not Found', () => {
      it('sollte Result.fail zurückgeben wenn Einsatz nicht existiert', async () => {
        // Given (Arrange)
        const validEinsatzId = EinsatzId.create().value?.value;
        const command = UpdateEinsatzStatusCommand.create(validEinsatzId, 'IN_BEARBEITUNG').value!;
        mockRepository.findById.mockResolvedValue(Result.ok(null));

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(false);
        expect(result.error).toBeDefined();
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('Business Rule Violations - Status Transitions', () => {
      it('sollte Result.fail zurückgeben bei ungültiger Rückwärts-Transition (ABGESCHLOSSEN → ANGELEGT)', async () => {
        // Given (Arrange)
        const einsatz = createMockEinsatz(EinsatzStatus.ABGESCHLOSSEN());
        const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'ANGELEGT').value!;

        mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(false);
        expect(result.error).toContain('Ungültige Status-Transition');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      });

      it('sollte Result.fail zurückgeben bei ungültiger Rückwärts-Transition (ABGESCHLOSSEN → IN_BEARBEITUNG)', async () => {
        // Given (Arrange)
        const einsatz = createMockEinsatz(EinsatzStatus.ABGESCHLOSSEN());
        const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'IN_BEARBEITUNG').value!;

        mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(false);
        expect(result.error).toContain('Ungültige Status-Transition');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      });

      it('sollte Result.fail zurückgeben bei Änderung von ARCHIVIERT (immutable)', async () => {
        // Given (Arrange)
        const einsatz = createMockEinsatz(EinsatzStatus.ARCHIVIERT());
        const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'IN_BEARBEITUNG').value!;

        mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(false);
        expect(result.error).toContain('Archivierte Einsätze');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      });

      it('sollte Result.fail zurückgeben bei ungültiger Transition (IN_BEARBEITUNG → ANGELEGT)', async () => {
        // Given (Arrange)
        const einsatz = createMockEinsatz(EinsatzStatus.IN_BEARBEITUNG());
        const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'ANGELEGT').value!;

        mockRepository.findById.mockResolvedValue(Result.ok(einsatz));

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(false);
        expect(result.error).toContain('Ungültige Status-Transition');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('Repository/DB Errors', () => {
      it('sollte Result.fail zurückgeben bei Repository.save() Fehler', async () => {
        // Given (Arrange)
        const einsatz = createMockEinsatz(EinsatzStatus.ANGELEGT());
        const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'IN_BEARBEITUNG').value!;

        mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
        mockRepository.save.mockResolvedValue(Result.fail('Database connection error'));

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(false);
        expect(result.error).toBe('Database connection error');
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      });

      it('sollte Result.fail zurückgeben bei Repository.findById() Fehler', async () => {
        // Given (Arrange)
        const einsatz = createMockEinsatz();
        const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'IN_BEARBEITUNG').value!;

        mockRepository.findById.mockResolvedValue(Result.fail('Database connection error'));

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(false);
        expect(result.error).toBe('Database connection error');
        expect(mockRepository.save).not.toHaveBeenCalled();
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      });

      it('sollte Result.fail zurückgeben bei Datenbank-Timeout', async () => {
        // Given (Arrange)
        const einsatz = createMockEinsatz(EinsatzStatus.ANGELEGT());
        const command = UpdateEinsatzStatusCommand.create(einsatz.id.value, 'IN_BEARBEITUNG').value!;

        mockRepository.findById.mockResolvedValue(Result.ok(einsatz));
        mockRepository.save.mockResolvedValue(Result.fail('Query timeout'));

        // When (Act)
        const result = await handler.execute(command);

        // Then (Assert)
        expect(result.isSuccess).toBe(false);
        expect(result.error).toBe('Query timeout');
        expect(mockOutboxRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});
