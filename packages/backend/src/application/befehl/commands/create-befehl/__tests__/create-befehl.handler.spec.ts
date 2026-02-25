import { Test, type TestingModule } from '@nestjs/testing';
import { CreateBefehlHandler } from '../create-befehl.handler';
import { CreateBefehlCommand } from '../create-befehl.command';
import { Result } from '@domain/common/result';
import { UserId } from '@domain/value-objects/user-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { BefehlErstelltEvent } from '@domain/events/befehl-erstellt.event';
import { BEFEHL_REPOSITORY, OUTBOX_REPOSITORY } from '@/infrastructure/di-tokens';

describe('CreateBefehlHandler', () => {
  let handler: CreateBefehlHandler;
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

  /** Erzeugt einen gültigen CreateBefehlCommand mit Defaults. */
  const createValidCommand = (overrides: Partial<CreateBefehlCommand> = {}) => {
    const ersteller = UserId.create().value!;
    const einsatzId = EinsatzId.create().value!;
    return new CreateBefehlCommand(
      overrides.einsatzId ?? einsatzId.value,
      overrides.empfaenger ?? [{ name: 'ZF Meier' }, { name: 'GF Schmidt' }],
      overrides.befehlsgeber ?? 'EL Mueller',
      overrides.erstellerId ?? ersteller.value,
      overrides.auftrag ?? 'Patientenablage einrichten',
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
        CreateBefehlHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: BEFEHL_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    handler = module.get<CreateBefehlHandler>(CreateBefehlHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute (Success)', () => {
    it('sollte Befehl erfolgreich erstellen mit gültigen Daten', async () => {
      const command = createValidCommand();

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(typeof result.value).toBe('string');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte Befehlsnummer im Format B-{SEQ} generieren', async () => {
      const command = createValidCommand();

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.save.mock.calls[0][0];
      expect(savedAggregate.nummer).toBe('B-001');
    });

    it('sollte Status ERTEILT sein nach Erstellung', async () => {
      const command = createValidCommand();

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.save.mock.calls[0][0];
      expect(savedAggregate.status.value).toBe('ERTEILT');
    });

    it('sollte Empfänger korrekt am Aggregate setzen', async () => {
      const command = createValidCommand({
        empfaenger: [{ name: 'ZF Meier' }, { name: 'GF Schmidt' }],
      });

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.save.mock.calls[0][0];
      expect(savedAggregate.empfaenger).toHaveLength(2);
    });

    it('sollte optionale EAMZW-Felder korrekt setzen', async () => {
      const command = createValidCommand({
        ereignis: 'Gebäudebrand',
        mittel: '2 LF 20',
        ziel: 'Brand löschen',
        weg: 'Über Haupteingang',
      });

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.save.mock.calls[0][0];
      expect(savedAggregate.ereignis).toBe('Gebäudebrand');
      expect(savedAggregate.mittel).toBe('2 LF 20');
      expect(savedAggregate.ziel).toBe('Brand löschen');
      expect(savedAggregate.weg).toBe('Über Haupteingang');
      expect(savedAggregate.befehlstyp).toBe('EAMZW');
    });

    it('sollte befehlstyp KURZBEFEHL sein ohne EAMZW-Felder', async () => {
      const command = createValidCommand();

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.save.mock.calls[0][0];
      expect(savedAggregate.befehlstyp).toBe('KURZBEFEHL');
    });

    it('sollte zeitvorgabe optional setzen', async () => {
      const command = createValidCommand({ zeitvorgabe: '15 min' });

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedAggregate = mockRepository.save.mock.calls[0][0];
      expect(savedAggregate.zeitvorgabe).toBe('15 min');
    });
  });

  describe('execute (Validation Errors)', () => {
    it('sollte Result.fail bei ungültiger EinsatzId zurückgeben', async () => {
      const command = createValidCommand({ einsatzId: 'invalid-einsatz-id' });

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Empfaenger als Display-Namen akzeptieren (keine UserId-Validierung)', async () => {
      const command = createValidCommand({ empfaenger: [{ name: 'Beliebiger Name' }] });

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('sollte Befehlsgeber als Display-Name akzeptieren (keine UserId-Validierung)', async () => {
      const command = createValidCommand({ befehlsgeber: 'Beliebiger Befehlsgeber' });

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('sollte Result.fail bei ungültiger ErstellerId zurückgeben', async () => {
      const command = createValidCommand({ erstellerId: 'INVALID_UPPERCASE' });

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail bei leerem Auftrag zurückgeben', async () => {
      const command = createValidCommand({ auftrag: '' });

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Auftrag');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail bei leerer empfaenger-Liste zurückgeben', async () => {
      const command = createValidCommand({ empfaenger: [] });

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Empfänger');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('execute (Repository Errors)', () => {
    it('sollte Result.fail bei Repository.save Fehler zurückgeben', async () => {
      mockRepository.save.mockResolvedValue(Result.fail('Database error'));
      const command = createValidCommand();

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Database error');
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Transaction Behavior', () => {
    it('sollte prisma.$transaction() einmal aufrufen', async () => {
      const command = createValidCommand();

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte Repository.save() mit tx-Context aufrufen', async () => {
      const txMarker = { txMarker: 'test-tx' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));
      const command = createValidCommand();

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const txContext = mockRepository.save.mock.calls[0][1];
      expect(txContext).toBe(txMarker);
    });

    it('sollte OutboxRepository.save() mit tx-Context aufrufen', async () => {
      const txMarker = { txMarker: 'outbox-tx' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));
      const command = createValidCommand();

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const txContext = mockOutboxRepository.save.mock.calls[0][1];
      expect(txContext).toBe(txMarker);
    });
  });

  describe('Outbox Integration', () => {
    it('sollte genau ein BefehlErstelltEvent im Event-Array haben', async () => {
      const command = createValidCommand();

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      expect(savedEvents.length).toBe(1);
      expect(savedEvents[0]).toBeInstanceOf(BefehlErstelltEvent);
    });

    it('sollte Event mit korrektem aggregateId speichern', async () => {
      const command = createValidCommand();

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const befehlId = result.value!;
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      const createdEvent = savedEvents[0] as BefehlErstelltEvent;
      expect(createdEvent.befehlId.value).toBe(befehlId);
    });

    it('sollte Event mit korrektem Auftrag und EinsatzId speichern', async () => {
      const einsatzId = EinsatzId.create().value!;
      const command = createValidCommand({
        einsatzId: einsatzId.value,
        auftrag: 'Patientenablage einrichten',
      });

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      const createdEvent = savedEvents[0] as BefehlErstelltEvent;
      expect(createdEvent.auftrag).toBe('Patientenablage einrichten');
      expect(createdEvent.einsatzId.value).toBe(einsatzId.value);
    });

    it('sollte Event mit Empfaenger-Namen speichern', async () => {
      const command = createValidCommand({
        empfaenger: [{ name: 'ZF Meier' }, { name: 'GF Schmidt' }],
      });

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0][0];
      const createdEvent = savedEvents[0] as BefehlErstelltEvent;
      expect(createdEvent.empfaenger).toContain('ZF Meier');
      expect(createdEvent.empfaenger).toContain('GF Schmidt');
    });

    it('sollte Event innerhalb der gleichen Transaction speichern', async () => {
      const txMarker = { txId: 'same-tx' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));
      const command = createValidCommand();

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const repoTxContext = mockRepository.save.mock.calls[0][1];
      const outboxTxContext = mockOutboxRepository.save.mock.calls[0][1];
      expect(repoTxContext).toBe(txMarker);
      expect(outboxTxContext).toBe(txMarker);
    });
  });
});
