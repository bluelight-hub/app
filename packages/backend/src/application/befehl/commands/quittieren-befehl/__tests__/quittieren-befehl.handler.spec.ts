import { Test, type TestingModule } from '@nestjs/testing';
import { QuittierenBefehlHandler } from '../quittieren-befehl.handler';
import { QuittierenBefehlCommand } from '../quittieren-befehl.command';
import { Result } from '@domain/common/result';
import { Befehl } from '@domain/aggregates/befehl.aggregate';
import { BefehlEmpfaenger } from '@domain/entities/befehl-empfaenger.entity';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { BefehlStatus } from '@domain/value-objects/befehl-status';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { BEFEHL_REPOSITORY, OUTBOX_REPOSITORY } from '@/infrastructure/di-tokens';

describe('QuittierenBefehlHandler', () => {
  let handler: QuittierenBefehlHandler;
  let mockRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByEinsatzId: jest.Mock;
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

  /** Erzeugt ein zugestelltes Befehl Aggregate für Tests. */
  const createZugestellterBefehl = (empfaengerId: UserId): Befehl => {
    const befehlId = BefehlId.create().value as BefehlId;
    const einsatzId = EinsatzId.create().value as EinsatzId;
    const erstellerId = UserId.create().value as UserId;

    const empfaenger = BefehlEmpfaenger.reconstitute(
      'emp-1',
      'ZF Nord',
      empfaengerId,
      new Date(), // zugestelltAm gesetzt
      undefined, // nicht quittiert
      undefined,
    );

    return Befehl.reconstitute({
      id: befehlId,
      nummer: 'B-001',
      einsatzId,
      auftrag: 'Patientenablage einrichten',
      befehlsgeberName: 'EL Müller',
      erstellerId,
      status: BefehlStatus.ZUGESTELLT(),
      erteiltAm: new Date(),
      empfaenger: [empfaenger],
      kommentare: [],
    });
  };

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
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
        QuittierenBefehlHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: BEFEHL_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    handler = module.get<QuittierenBefehlHandler>(QuittierenBefehlHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute (Success)', () => {
    it('sollte Befehl erfolgreich quittieren und Befehl-ID zurückgeben', async () => {
      const empfaengerId = UserId.create().value as UserId;
      const befehl = createZugestellterBefehl(empfaengerId);
      mockRepository.findById.mockResolvedValue(Result.ok(befehl));

      const command = new QuittierenBefehlCommand(befehl.id.value, empfaengerId.value, 'VERSTANDEN');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(befehl.id.value);
      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte Repository.save mit tx-Context aufrufen', async () => {
      const txMarker = { txMarker: 'test-tx' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));
      const empfaengerId = UserId.create().value as UserId;
      const befehl = createZugestellterBefehl(empfaengerId);
      mockRepository.findById.mockResolvedValue(Result.ok(befehl));

      const command = new QuittierenBefehlCommand(befehl.id.value, empfaengerId.value, 'VERSTANDEN');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const txContext = mockRepository.save.mock.calls[0][1];
      expect(txContext).toBe(txMarker);
    });

    it('sollte BefehlQuittiertEvent im Outbox speichern', async () => {
      const empfaengerId = UserId.create().value as UserId;
      const befehl = createZugestellterBefehl(empfaengerId);
      mockRepository.findById.mockResolvedValue(Result.ok(befehl));

      const command = new QuittierenBefehlCommand(befehl.id.value, empfaengerId.value, 'RUECKFRAGE');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      expect(savedEvents.length).toBe(2);
      const event = savedEvents[0];
      expect(event.constructor.name).toBe('BefehlQuittiertEvent');
      const statusEvent = savedEvents[1];
      expect(statusEvent.constructor.name).toBe('BefehlStatusGeaendertEvent');
    });
  });

  describe('execute (Befehl nicht gefunden)', () => {
    it('sollte Result.fail wenn Befehl nicht gefunden', async () => {
      const befehlId = BefehlId.create().value as BefehlId;
      const empfaengerId = UserId.create().value as UserId;
      mockRepository.findById.mockResolvedValue(Result.ok(null));

      const command = new QuittierenBefehlCommand(befehlId.value, empfaengerId.value, 'VERSTANDEN');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('nicht gefunden');
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail wenn Repository.findById fehlschlägt', async () => {
      const befehlId = BefehlId.create().value as BefehlId;
      const empfaengerId = UserId.create().value as UserId;
      mockRepository.findById.mockResolvedValue(Result.fail('Database error'));

      const command = new QuittierenBefehlCommand(befehlId.value, empfaengerId.value, 'VERSTANDEN');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Database error');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('execute (Domain-Fehler)', () => {
    it('sollte Result.fail wenn Empfänger nicht zugestellt', async () => {
      const befehlId = BefehlId.create().value as BefehlId;
      const einsatzId = EinsatzId.create().value as EinsatzId;
      const empfaengerId = UserId.create().value as UserId;

      // Empfänger NICHT zugestellt (zugestelltAm = undefined)
      const empfaenger = BefehlEmpfaenger.reconstitute('emp-1', 'ZF Nord', empfaengerId);

      const befehl = Befehl.reconstitute({
        id: befehlId,
        nummer: 'B-001',
        einsatzId,
        auftrag: 'Test',
        befehlsgeberName: 'EL Müller',
        erstellerId: UserId.create().value as UserId,
        status: BefehlStatus.ERTEILT(),
        erteiltAm: new Date(),
        empfaenger: [empfaenger],
        kommentare: [],
      });

      mockRepository.findById.mockResolvedValue(Result.ok(befehl));

      const command = new QuittierenBefehlCommand(befehlId.value, empfaengerId.value, 'VERSTANDEN');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('nicht zugestellt');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail wenn Empfänger bereits quittiert', async () => {
      const befehlId = BefehlId.create().value as BefehlId;
      const einsatzId = EinsatzId.create().value as EinsatzId;
      const empfaengerId = UserId.create().value as UserId;

      // Empfänger bereits quittiert
      const empfaenger = BefehlEmpfaenger.reconstitute(
        'emp-1',
        'ZF Nord',
        empfaengerId,
        new Date(), // zugestellt
        new Date(), // bereits quittiert
        'VERSTANDEN',
      );

      const befehl = Befehl.reconstitute({
        id: befehlId,
        nummer: 'B-001',
        einsatzId,
        auftrag: 'Test',
        befehlsgeberName: 'EL Müller',
        erstellerId: UserId.create().value as UserId,
        status: BefehlStatus.ZUGESTELLT(),
        erteiltAm: new Date(),
        empfaenger: [empfaenger],
        kommentare: [],
      });

      mockRepository.findById.mockResolvedValue(Result.ok(befehl));

      const command = new QuittierenBefehlCommand(befehlId.value, empfaengerId.value, 'VERSTANDEN');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('bereits quittiert');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail wenn Empfänger nicht am Befehl', async () => {
      const empfaengerId = UserId.create().value as UserId;
      const andererEmpfaenger = UserId.create().value as UserId;
      const befehl = createZugestellterBefehl(andererEmpfaenger);
      mockRepository.findById.mockResolvedValue(Result.ok(befehl));

      const command = new QuittierenBefehlCommand(befehl.id.value, empfaengerId.value, 'VERSTANDEN');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('nicht gefunden');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('execute (Validation Errors)', () => {
    it('sollte Result.fail bei ungültiger BefehlId', async () => {
      const empfaengerId = UserId.create().value as UserId;
      const command = new QuittierenBefehlCommand('invalid-id', empfaengerId.value, 'VERSTANDEN');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail bei ungültiger EmpfängerId', async () => {
      const befehlId = BefehlId.create().value as BefehlId;
      const empfaengerId = UserId.create().value as UserId;
      const befehl = createZugestellterBefehl(empfaengerId);
      mockRepository.findById.mockResolvedValue(Result.ok(befehl));

      const command = new QuittierenBefehlCommand(befehlId.value, 'INVALID_UPPERCASE', 'VERSTANDEN');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('execute (Repository Save Error)', () => {
    it('sollte Result.fail bei Repository.save Fehler', async () => {
      const empfaengerId = UserId.create().value as UserId;
      const befehl = createZugestellterBefehl(empfaengerId);
      mockRepository.findById.mockResolvedValue(Result.ok(befehl));
      mockRepository.save.mockResolvedValue(Result.fail('Database write error'));

      const command = new QuittierenBefehlCommand(befehl.id.value, empfaengerId.value, 'VERSTANDEN');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Database write error');
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });
});
