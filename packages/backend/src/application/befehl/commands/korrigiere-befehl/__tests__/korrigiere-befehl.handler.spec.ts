// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { KorrigiereBefehlHandler } from '../korrigiere-befehl.handler';
import { KorrigiereBefehlCommand } from '../korrigiere-befehl.command';
import { Result } from '@domain/common/result';
import { Befehl } from '@domain/aggregates/befehl.aggregate';
import { UserId } from '@domain/value-objects/user-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { BefehlStatus } from '@domain/value-objects/befehl-status';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { BefehlEmpfaenger } from '@domain/entities/befehl-empfaenger.entity';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { BEFEHL_ERROR_CODES } from '@/application/befehl/errors/befehl-error.codes';
import { BEFEHL_REPOSITORY, OUTBOX_REPOSITORY } from '@/infrastructure/di-tokens';

describe('KorrigiereBefehlHandler', () => {
  let handler: KorrigiereBefehlHandler;
  let mockRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByEinsatzId: jest.Mock;
    getNextSequenceNumber: jest.Mock;
  };
  let mockPrismaService: {
    $transaction: jest.Mock;
  };
  let mockOutboxRepository: {
    save: jest.Mock;
    findPendingEvents: jest.Mock;
    markAsPublished: jest.Mock;
    markAsFailed: jest.Mock;
    getRetryCount: jest.Mock;
  };

  /** Erzeugt ein gültiges Befehl Aggregate als Original-Befehl. */
  const createOriginalBefehl = (statusValue = 'ERTEILT'): Befehl => {
    const einsatzId = EinsatzId.create().value as EinsatzId;
    const erstellerId = UserId.create().value as UserId;
    const befehlId = BefehlId.create().value as BefehlId;

    return Befehl.reconstitute({
      id: befehlId,
      nummer: 'B-001',
      einsatzId,
      auftrag: 'Original-Auftrag',
      befehlsgeberName: 'EL Mueller',
      befehlsgeberId: undefined,
      erstellerId,
      status: BefehlStatus.create(statusValue).value!,
      erteiltAm: new Date(),
      empfaenger: [BefehlEmpfaenger.create('ZF Meier')],
      kommentare: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  /** Erzeugt einen gültigen KorrigiereBefehlCommand mit Defaults. */
  const createValidCommand = (originalBefehlId: string, overrides: Partial<Omit<KorrigiereBefehlCommand, 'originalBefehlId'>> = {}) => {
    const ersteller = UserId.create().value!;
    return new KorrigiereBefehlCommand(
      originalBefehlId,
      overrides.empfaenger ?? [{ name: 'ZF Nord' }, { name: 'GF Sued' }],
      overrides.befehlsgeber ?? 'EL Mueller',
      overrides.erstellerId ?? ersteller.value,
      overrides.auftrag ?? 'Korrigierter Auftrag',
      overrides.zeitvorgabe,
      overrides.ereignis,
      overrides.mittel,
      overrides.ziel,
      overrides.weg,
    );
  };

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      getNextSequenceNumber: jest.fn().mockResolvedValue(Result.ok(1)),
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
        KorrigiereBefehlHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: BEFEHL_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    handler = module.get<KorrigiereBefehlHandler>(KorrigiereBefehlHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute (Success)', () => {
    it('sollte Korrekturbefehl erfolgreich erstellen und Original als KORRIGIERT markieren', async () => {
      const original = createOriginalBefehl('ERTEILT');
      mockRepository.findById.mockResolvedValue(Result.ok(original));

      const command = createValidCommand(original.id.value);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(typeof result.value).toBe('string');

      // Repository should be called twice: once for original, once for new
      expect(mockRepository.save).toHaveBeenCalledTimes(2);

      // First save: original with KORRIGIERT status
      const savedOriginal = mockRepository.save.mock.calls[0]?.[0]!;
      expect(savedOriginal.status.value).toBe('KORRIGIERT');

      // Second save: new Korrekturbefehl
      const savedNew = mockRepository.save.mock.calls[1]?.[0]!;
      expect(savedNew.status.value).toBe('ERTEILT');
      expect(savedNew.originalBefehlId?.value).toBe(original.id.value);

      // Outbox should have events from both aggregates
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte Korrekturbefehl mit ZUGESTELLT-Original erstellen', async () => {
      const original = createOriginalBefehl('ZUGESTELLT');
      mockRepository.findById.mockResolvedValue(Result.ok(original));

      const command = createValidCommand(original.id.value);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedOriginal = mockRepository.save.mock.calls[0]?.[0]!;
      expect(savedOriginal.status.value).toBe('KORRIGIERT');
    });

    it('sollte einsatzId vom Original-Befehl uebernehmen', async () => {
      const original = createOriginalBefehl('ERTEILT');
      mockRepository.findById.mockResolvedValue(Result.ok(original));

      const command = createValidCommand(original.id.value);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedNew = mockRepository.save.mock.calls[1]?.[0]!;
      expect(savedNew.einsatzId.value).toBe(original.einsatzId.value);
    });

    it('sollte originalBefehlId im neuen Befehl setzen', async () => {
      const original = createOriginalBefehl('ERTEILT');
      mockRepository.findById.mockResolvedValue(Result.ok(original));

      const command = createValidCommand(original.id.value);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedNew = mockRepository.save.mock.calls[1]?.[0]!;
      expect(savedNew.originalBefehlId).toBeDefined();
      expect(savedNew.originalBefehlId.value).toBe(original.id.value);
    });

    it('sollte Events beider Aggregates extrahieren', async () => {
      const original = createOriginalBefehl('ERTEILT');
      mockRepository.findById.mockResolvedValue(Result.ok(original));

      const command = createValidCommand(original.id.value);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      // Exakt 2 Events: Original BefehlStatusGeaendert + Neuer BefehlErstellt
      expect(savedEvents).toHaveLength(2);
      // Events stammen von verschiedenen Aggregates (Original + Korrektur)
      const aggregateIds = savedEvents.map((e: { aggregateId: string }) => e.aggregateId);
      expect(new Set(aggregateIds).size).toBe(2);
    });
  });

  describe('execute (Error Cases)', () => {
    it('sollte NOT_FOUND zurueckgeben wenn Original nicht existiert', async () => {
      mockRepository.findById.mockResolvedValue(Result.ok(null));
      const befehlId = BefehlId.create().value as BefehlId;

      const command = createValidCommand(befehlId.value);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toBe(BEFEHL_ERROR_CODES.NOT_FOUND);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn Original bereits KORRIGIERT ist', async () => {
      const original = createOriginalBefehl('KORRIGIERT');
      mockRepository.findById.mockResolvedValue(Result.ok(original));

      const command = createValidCommand(original.id.value);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('KORRIGIERT');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte bei QUITTIERT funktionieren (Korrektur nach Quittierung erlaubt)', async () => {
      const original = createOriginalBefehl('QUITTIERT');
      mockRepository.findById.mockResolvedValue(Result.ok(original));
      mockRepository.save.mockResolvedValue(Result.ok(undefined as never));

      const command = createValidCommand(original.id.value);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });

    it('sollte fehlschlagen bei ungültiger ErstellerId', async () => {
      const original = createOriginalBefehl('ERTEILT');
      mockRepository.findById.mockResolvedValue(Result.ok(original));

      const command = createValidCommand(original.id.value, { erstellerId: 'INVALID_UPPERCASE' });

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen bei leerem Auftrag im Korrekturbefehl', async () => {
      const original = createOriginalBefehl('ERTEILT');
      mockRepository.findById.mockResolvedValue(Result.ok(original));

      const command = createValidCommand(original.id.value, { auftrag: '' });

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Auftrag');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen bei leerer Empfaenger-Liste im Korrekturbefehl', async () => {
      const original = createOriginalBefehl('ERTEILT');
      mockRepository.findById.mockResolvedValue(Result.ok(original));

      const command = createValidCommand(original.id.value, { empfaenger: [] });

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Empfänger');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen bei leerem originalBefehlId', async () => {
      const command = createValidCommand('');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen bei Repository.save Fehler fuer Original', async () => {
      const original = createOriginalBefehl('ERTEILT');
      mockRepository.findById.mockResolvedValue(Result.ok(original));
      mockRepository.save.mockResolvedValueOnce(Result.fail('Database error'));

      const command = createValidCommand(original.id.value);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Database error');
    });

    it('sollte fehlschlagen bei Repository.save Fehler fuer neuen Befehl', async () => {
      const original = createOriginalBefehl('ERTEILT');
      mockRepository.findById.mockResolvedValue(Result.ok(original));
      mockRepository.save
        .mockResolvedValueOnce(Result.ok(undefined)) // Original save succeeds
        .mockResolvedValueOnce(Result.fail('Database error')); // New befehl save fails

      const command = createValidCommand(original.id.value);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('Transaction Behavior', () => {
    it('sollte prisma.$transaction() einmal aufrufen', async () => {
      const original = createOriginalBefehl('ERTEILT');
      mockRepository.findById.mockResolvedValue(Result.ok(original));

      const command = createValidCommand(original.id.value);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte Repository.save() mit tx-Context aufrufen fuer beide Aggregates', async () => {
      const txMarker = { txMarker: 'test-tx' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));
      const original = createOriginalBefehl('ERTEILT');
      mockRepository.findById.mockResolvedValue(Result.ok(original));

      const command = createValidCommand(original.id.value);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      // Both saves should use same tx context
      expect(mockRepository.save.mock.calls[0]?.[1]!).toBe(txMarker);
      expect(mockRepository.save.mock.calls[1]?.[1]!).toBe(txMarker);
    });
  });
});
