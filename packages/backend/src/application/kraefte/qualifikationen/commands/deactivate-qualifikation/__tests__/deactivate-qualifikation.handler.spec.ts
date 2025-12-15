import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { Qualifikation } from '@domain/kraefte/aggregates/qualifikation.aggregate';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { DeactivateQualifikationHandler } from '../deactivate-qualifikation.handler';
import { DeactivateQualifikationCommand } from '../deactivate-qualifikation.command';

describe('DeactivateQualifikationHandler', () => {
  let handler: DeactivateQualifikationHandler;
  let testId: string;
  let mockRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByAbkuerzung: jest.Mock;
    findAll: jest.Mock;
    exists: jest.Mock;
  };
  let mockOutboxRepository: {
    save: jest.Mock;
    findPendingEvents: jest.Mock;
    markAsPublished: jest.Mock;
    markAsFailed: jest.Mock;
    getRetryCount: jest.Mock;
  };
  let mockPrismaService: {
    $transaction: jest.Mock;
  };

  const createMockQualifikation = (
    overrides: Partial<{
      id: string;
      name: string;
      abkuerzung: string;
      kategorie: 'FUEHRUNG' | 'SANITAET' | 'BETREUUNG' | 'TECHNIK' | 'SONSTIGES';
      istAktiv: boolean;
    }> = {},
  ) => {
    return Qualifikation.reconstitute({
      id: overrides.id ?? testId,
      name: overrides.name ?? 'Zugführer',
      abkuerzung: overrides.abkuerzung ?? 'ZFÜ',
      kategorie: overrides.kategorie ?? 'FUEHRUNG',
      istAktiv: overrides.istAktiv ?? true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'cm1111111111abcdef11111',
    }).value!;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    testId = createId();

    mockRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByAbkuerzung: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
    };

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findPendingEvents: jest.fn(),
      markAsPublished: jest.fn(),
      markAsFailed: jest.fn(),
      getRetryCount: jest.fn(),
    };

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = {};
        return callback(txMock);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeactivateQualifikationHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.QUALIFIKATION, useValue: mockRepository },
      ],
    }).compile();

    handler = module.get<DeactivateQualifikationHandler>(DeactivateQualifikationHandler);
  });

  describe('execute', () => {
    it('sollte Qualifikation erfolgreich deaktivieren', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation({ istAktiv: true });
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = DeactivateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // Handler gibt jetzt QualifikationDto statt string zurück (N+1 Query Fix)
      expect(result.value).toBeDefined();
      expect(result.value!.id).toBe(testId);
      expect(result.value!.istAktiv).toBe(false);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
      expect(savedAggregate.istAktiv).toBe(false);
    });

    it('sollte fehlschlagen wenn Qualifikation nicht gefunden wird', async () => {
      // Given (Arrange)
      const nonExistentId = createId();
      mockRepository.findById.mockResolvedValue(Result.ok(null));

      const command = DeactivateQualifikationCommand.create({
        id: nonExistentId,
        updatedBy: 'cm9999999999abcdef99999',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('nicht gefunden');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Qualifikation bereits deaktiviert ist', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation({ istAktiv: false });
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = DeactivateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('bereits deaktiviert');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Repository-Fehler bei findById auftritt', async () => {
      // Given (Arrange)
      mockRepository.findById.mockResolvedValue(Result.fail('Datenbankfehler'));

      const command = DeactivateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Datenbankfehler');
    });

    it('sollte fehlschlagen wenn Repository.save fehlschlägt', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation({ istAktiv: true });
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));
      mockRepository.save.mockResolvedValue(Result.fail('Speicherfehler'));

      const command = DeactivateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Speicherfehler');
    });

    it('sollte updatedBy korrekt setzen', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation({ istAktiv: true });
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = DeactivateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm7777777777abcdef77777',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      const savedAggregate = mockRepository.save.mock.calls[0][0] as Qualifikation;
      expect(savedAggregate.updatedBy).toBe('cm7777777777abcdef77777');
    });
  });

  describe('Command Validation', () => {
    it('sollte fehlschlagen ohne ID', () => {
      // Given (Arrange)
      const commandResult = DeactivateQualifikationCommand.create({
        id: '',
        updatedBy: 'cm9999999999abcdef99999',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('ID ist erforderlich');
    });

    it('sollte fehlschlagen ohne updatedBy', () => {
      // Given (Arrange)
      const commandResult = DeactivateQualifikationCommand.create({
        id: testId,
        updatedBy: '',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('updatedBy ist erforderlich');
    });

    it('sollte Whitespace in ID trimmen', () => {
      // Given (Arrange)
      const commandResult = DeactivateQualifikationCommand.create({
        id: `  ${testId}  `,
        updatedBy: 'cm9999999999abcdef99999',
      });

      // Then (Assert)
      expect(commandResult.isSuccess).toBe(true);
      expect(commandResult.value!.id).toBe(testId);
    });

    it('sollte Whitespace in updatedBy trimmen', () => {
      // Given (Arrange)
      const commandResult = DeactivateQualifikationCommand.create({
        id: testId,
        updatedBy: '  cm9999999999abcdef99999  ',
      });

      // Then (Assert)
      expect(commandResult.isSuccess).toBe(true);
      expect(commandResult.value!.updatedBy).toBe('cm9999999999abcdef99999');
    });
  });

  describe('Transaction Behavior', () => {
    it('sollte $transaction auf PrismaService aufrufen', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation({ istAktiv: true });
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = DeactivateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte Rollback durchführen wenn Outbox-Speicherung fehlschlägt', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation({ istAktiv: true });
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        // Outbox-Fehler simulieren
        mockOutboxRepository.save.mockRejectedValue(new Error('Outbox-Speicherfehler'));
        return await callback({});
      });

      const command = DeactivateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      // TransactionalCommandHandler fängt Exception und gibt Result.fail() zurück
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Outbox-Speicherfehler');
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      // Repository.save sollte zwar aufgerufen worden sein, aber die Transaction sollte gerollt sein
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('Domain Event Emission', () => {
    it('sollte QualifikationUpdatedEvent mit istAktiv: false emittieren', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation({ istAktiv: true });
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = DeactivateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      // outboxRepository.save() wird mit DomainEvent[] aufgerufen
      const events = mockOutboxRepository.save.mock.calls[0][0];
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(1);

      const event = events[0];
      expect(event.constructor.name).toBe('QualifikationUpdatedEvent');
      expect(event.changes).toEqual({ istAktiv: false });
      expect(event.updatedBy).toBe('cm9999999999abcdef99999');
      expect(event.aggregateId).toBeDefined();
    });

    it('sollte Event mit korrekter aggregateId emittieren', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation({ istAktiv: true });
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      const command = DeactivateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm7777777777abcdef77777',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const events = mockOutboxRepository.save.mock.calls[0][0];
      expect(events.length).toBe(1);

      const event = events[0];
      expect(event.aggregateId).toBe(testId);
    });
  });

  describe('Concurrent Modification / Race Conditions', () => {
    it('sollte bei concurrent deactivations auf verschiedene Qualifikationen beide erfolgreich sein', async () => {
      // Given (Arrange)
      const id1 = createId();
      const id2 = createId();
      const qualifikation1 = createMockQualifikation({ id: id1, istAktiv: true });
      const qualifikation2 = createMockQualifikation({ id: id2, istAktiv: true });

      // Mock reset für sequentielle Calls
      mockRepository.findById.mockReset();
      mockRepository.findById
        .mockResolvedValueOnce(Result.ok(qualifikation1)) // First call for command1
        .mockResolvedValueOnce(Result.ok(qualifikation2)); // Second call for command2

      const command1 = DeactivateQualifikationCommand.create({
        id: id1,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      const command2 = DeactivateQualifikationCommand.create({
        id: id2,
        updatedBy: 'cm9999999999abcdef99999',
      }).value!;

      // When (Act)
      const result1 = await handler.execute(command1);
      const result2 = await handler.execute(command2);

      // Then (Assert)
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledTimes(2);
    });

    it('sollte Optimistic Locking Conflict erkennen wenn Qualifikation zwischen Load und Save geändert wurde', async () => {
      // Given (Arrange)
      const existingQualifikation = createMockQualifikation({ istAktiv: true });
      mockRepository.findById.mockResolvedValue(Result.ok(existingQualifikation));

      // Simuliere Optimistic Locking Conflict
      mockRepository.save.mockResolvedValue(Result.fail('OPTIMISTIC_LOCK_ERROR: Qualifikation wurde zwischenzeitlich geändert'));

      const command = DeactivateQualifikationCommand.create({
        id: testId,
        updatedBy: 'cm9999999999abcdef99999',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('OPTIMISTIC_LOCK_ERROR');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
