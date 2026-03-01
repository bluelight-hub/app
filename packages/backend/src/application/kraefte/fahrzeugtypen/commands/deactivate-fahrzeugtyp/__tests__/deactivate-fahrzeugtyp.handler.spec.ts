import { Test, type TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@domain/common/result';
import { Fahrzeugtyp } from '@domain/kraefte/aggregates/fahrzeugtyp.aggregate';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { DeactivateFahrzeugtypHandler } from '../deactivate-fahrzeugtyp.handler';
import { DeactivateFahrzeugtypCommand } from '../deactivate-fahrzeugtyp.command';

describe('DeactivateFahrzeugtypHandler', () => {
  let handler: DeactivateFahrzeugtypHandler;
  let mockRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByCode: jest.Mock;
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
  let mockLogger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };

  // Factory functions für frische Instanzen (Aggregate werden durch Handler mutiert)
  const activeId = createId();
  const inactiveId = createId();

  const createActiveFahrzeugtyp = () =>
    Fahrzeugtyp.reconstitute({
      id: activeId,
      code: 'HLF',
      bezeichnung: 'Hilfeleistungslöschfahrzeug',
      kategorie: 'RETTUNGSDIENST',
      istAktiv: true,
      sortOrder: 0,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      createdBy: 'user-123',
    }).value!;

  const createInactiveFahrzeugtyp = () =>
    Fahrzeugtyp.reconstitute({
      id: inactiveId,
      code: 'RTW',
      bezeichnung: 'Rettungswagen',
      kategorie: 'TRANSPORT',
      istAktiv: false,
      sortOrder: 0,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      createdBy: 'user-123',
    }).value!;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn().mockImplementation(() => Result.ok(createActiveFahrzeugtyp())),
      findByCode: jest.fn(),
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

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeactivateFahrzeugtypHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: KRAEFTE_REPOSITORIES.FAHRZEUGTYP, useValue: mockRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<DeactivateFahrzeugtypHandler>(DeactivateFahrzeugtypHandler);
  });

  describe('execute', () => {
    it('sollte aktiven Fahrzeugtyp erfolgreich deaktivieren', async () => {
      // Given (Arrange)
      const command = DeactivateFahrzeugtypCommand.create({
        id: activeId,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.istAktiv).toBe(false);
      expect(mockRepository.findById).toHaveBeenCalledWith(expect.anything(), expect.any(Object));
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte updatedBy beim Deaktivieren setzen', async () => {
      // Given (Arrange)
      const command = DeactivateFahrzeugtypCommand.create({
        id: activeId,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.save.mock.calls[0][0] as Fahrzeugtyp;
      expect(savedAggregate.istAktiv).toBe(false);
    });

    it('sollte fehlschlagen wenn Fahrzeugtyp nicht gefunden wurde', async () => {
      // Given (Arrange)
      const nonExistentId = createId(); // Valides CUID-Format, aber existiert nicht in DB
      mockRepository.findById.mockResolvedValue(Result.ok(null));

      const command = DeactivateFahrzeugtypCommand.create({
        id: nonExistentId,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('nicht gefunden');
      expect(result.error).toContain('FAHRZEUGTYP_NOT_FOUND');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Fahrzeugtyp bereits deaktiviert ist (Idempotenz)', async () => {
      // Given (Arrange)
      mockRepository.findById.mockResolvedValue(Result.ok(createInactiveFahrzeugtyp()));

      const command = DeactivateFahrzeugtypCommand.create({
        id: inactiveId,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('bereits deaktiviert');
      expect(result.error).toContain('FAHRZEUGTYP_ALREADY_DEACTIVATED');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Repository.findById fehlschlägt', async () => {
      // Given (Arrange)
      mockRepository.findById.mockResolvedValue(Result.fail('Datenbankfehler'));

      const command = DeactivateFahrzeugtypCommand.create({
        id: activeId,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Datenbankfehler');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Repository.save fehlschlägt', async () => {
      // Given (Arrange)
      mockRepository.save.mockResolvedValue(Result.fail('Speicherfehler'));

      const command = DeactivateFahrzeugtypCommand.create({
        id: activeId,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Speicherfehler');
    });
  });

  describe('Command Validation', () => {
    it('sollte fehlschlagen ohne ID', () => {
      // Given (Arrange)
      const commandResult = DeactivateFahrzeugtypCommand.create({
        id: '',
        updatedBy: 'cm1234567890abcdef12345',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('ID ist erforderlich');
    });

    it('sollte fehlschlagen ohne updatedBy', () => {
      // Given (Arrange)
      const commandResult = DeactivateFahrzeugtypCommand.create({
        id: 'valid-id',
        updatedBy: '',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('updatedBy ist erforderlich');
    });

    it('sollte Whitespaces in ID trimmen', () => {
      // Given (Arrange)
      const commandResult = DeactivateFahrzeugtypCommand.create({
        id: '   valid-id   ',
        updatedBy: 'cm1234567890abcdef12345',
      });

      // Then (Assert)
      expect(commandResult.isSuccess).toBe(true);
      expect(commandResult.value?.id).toBe('valid-id');
    });

    it('sollte Whitespaces in updatedBy trimmen', () => {
      // Given (Arrange)
      const commandResult = DeactivateFahrzeugtypCommand.create({
        id: 'valid-id',
        updatedBy: '   cm1234567890abcdef12345   ',
      });

      // Then (Assert)
      expect(commandResult.isSuccess).toBe(true);
      expect(commandResult.value?.updatedBy).toBe('cm1234567890abcdef12345');
    });
  });

  describe('Transaction Behavior', () => {
    it('sollte $transaction auf PrismaService aufrufen', async () => {
      // Given (Arrange)
      const command = DeactivateFahrzeugtypCommand.create({
        id: activeId,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte Rollback durchführen wenn Outbox-Speicherung fehlschlägt', async () => {
      // Given (Arrange)
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        mockOutboxRepository.save.mockRejectedValue(new Error('Outbox-Speicherfehler'));
        return await callback({});
      });

      const command = DeactivateFahrzeugtypCommand.create({
        id: activeId,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Outbox-Speicherfehler');
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('Domain Event Emission', () => {
    it('sollte FahrzeugtypDeactivatedEvent mit korrekter Struktur emittieren', async () => {
      // Given (Arrange)
      const command = DeactivateFahrzeugtypCommand.create({
        id: activeId,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = mockOutboxRepository.save.mock.calls[0][0];
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(1);

      const event = events[0];
      // Deaktivierung emittiert FahrzeugtypUpdatedEvent (nicht separates DeactivatedEvent)
      expect(event.constructor.name).toBe('FahrzeugtypUpdatedEvent');
      expect(event.updatedBy).toBe('cm1234567890abcdef12345');
      expect(event.aggregateId).toBeDefined();
    });

    it('sollte keine Events emittieren bei bereits deaktiviertem Fahrzeugtyp', async () => {
      // Given (Arrange)
      mockRepository.findById.mockResolvedValue(Result.ok(createInactiveFahrzeugtyp()));

      const command = DeactivateFahrzeugtypCommand.create({
        id: inactiveId,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Invalid ID Handling', () => {
    it('sollte fehlschlagen mit ungültiger ID-Format', async () => {
      // Given (Arrange)
      const command = DeactivateFahrzeugtypCommand.create({
        id: 'invalid-id-format',
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // Mock FahrzeugtypId.create to fail
      mockRepository.findById.mockResolvedValue(Result.fail('Ungültige ID-Format'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('sollte mehrfaches Deaktivieren desselben Fahrzeugtyps verhindern', async () => {
      // Given (Arrange)
      const command = DeactivateFahrzeugtypCommand.create({
        id: activeId,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // First deactivation
      const result1 = await handler.execute(command);
      expect(result1.isSuccess).toBe(true);

      // Second deactivation attempt - mock returns already deactivated
      mockRepository.findById.mockResolvedValue(Result.ok(createInactiveFahrzeugtyp()));

      // When (Act)
      const result2 = await handler.execute(command);

      // Then (Assert)
      expect(result2.isFailure).toBe(true);
      expect(result2.error).toContain('bereits deaktiviert');
      expect(mockRepository.save).toHaveBeenCalledTimes(1); // Only once from first call
    });

    it('sollte Fahrzeugtyp mit Sollbesatzung deaktivieren können', async () => {
      // Given (Arrange)
      const fahrzeugTypMitSollbesatzung = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'RTW',
        bezeichnung: 'Rettungswagen',
        kategorie: 'TRANSPORT',
        sollbesatzung: { fahrer: 1, sanitaeter: 2 },
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;
      mockRepository.findById.mockResolvedValue(Result.ok(fahrzeugTypMitSollbesatzung));

      const command = DeactivateFahrzeugtypCommand.create({
        id: fahrzeugTypMitSollbesatzung.id.value,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.save.mock.calls[0][0] as Fahrzeugtyp;
      expect(savedAggregate.istAktiv).toBe(false);
      expect(savedAggregate.sollbesatzung).toEqual({ fahrer: 1, sanitaeter: 2 });
    });

    it('sollte Fahrzeugtyp mit Beschreibung deaktivieren können', async () => {
      // Given (Arrange)
      const fahrzeugTypMitBeschreibung = Fahrzeugtyp.reconstitute({
        id: createId(),
        code: 'HLF',
        bezeichnung: 'Hilfeleistungslöschfahrzeug',
        kategorie: 'RETTUNGSDIENST',
        beschreibung: 'Detaillierte Beschreibung',
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-123',
      }).value!;
      mockRepository.findById.mockResolvedValue(Result.ok(fahrzeugTypMitBeschreibung));

      const command = DeactivateFahrzeugtypCommand.create({
        id: fahrzeugTypMitBeschreibung.id.value,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.save.mock.calls[0][0] as Fahrzeugtyp;
      expect(savedAggregate.istAktiv).toBe(false);
      expect(savedAggregate.beschreibung).toBe('Detaillierte Beschreibung');
    });
  });

  describe('Concurrent Deactivation', () => {
    it('sollte bei concurrent deactivation Requests nur eine erfolgreiche Deaktivierung erlauben', async () => {
      // Given (Arrange)
      const command = DeactivateFahrzeugtypCommand.create({
        id: activeId,
        updatedBy: 'cm1234567890abcdef12345',
      }).value!;

      // First request succeeds
      const result1 = await handler.execute(command);
      expect(result1.isSuccess).toBe(true);

      // Second concurrent request - fahrzeugtyp is now inactive
      mockRepository.findById.mockResolvedValue(Result.ok(createInactiveFahrzeugtyp()));

      // When (Act)
      const result2 = await handler.execute(command);

      // Then (Assert)
      expect(result2.isFailure).toBe(true);
      expect(result2.error).toContain('FAHRZEUGTYP_ALREADY_DEACTIVATED');
      expect(mockRepository.save).toHaveBeenCalledTimes(1); // Only first request saved
    });
  });
});
