// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { AddBefehlKommentarHandler } from '../add-befehl-kommentar.handler';
import { AddBefehlKommentarCommand } from '../add-befehl-kommentar.command';
import { Result } from '@domain/common/result';
import { Befehl } from '@domain/aggregates/befehl.aggregate';
import { BefehlEmpfaenger } from '@domain/entities/befehl-empfaenger.entity';
import { BefehlKommentar } from '@domain/entities/befehl-kommentar.entity';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { BefehlStatus } from '@domain/value-objects/befehl-status';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { BEFEHL_REPOSITORY, OUTBOX_REPOSITORY } from '@/infrastructure/di-tokens';

describe('AddBefehlKommentarHandler', () => {
  let handler: AddBefehlKommentarHandler;
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

  /** Erzeugt ein erteiltes Befehl Aggregate für Tests. */
  const createErteiltBefehl = (): Befehl => {
    const befehlId = BefehlId.create().value as BefehlId;
    const einsatzId = EinsatzId.create().value as EinsatzId;
    const erstellerId = UserId.create().value as UserId;
    const empfaengerId = UserId.create().value as UserId;

    const empfaenger = BefehlEmpfaenger.reconstitute('emp-1', 'ZF Nord', empfaengerId, new Date(), undefined, undefined);

    return Befehl.reconstitute({
      id: befehlId,
      nummer: 'B-001',
      einsatzId,
      auftrag: 'Patientenablage einrichten',
      befehlsgeberName: 'EL Müller',
      befehlsgeberId: undefined,
      erstellerId,
      status: BefehlStatus.ERTEILT(),
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
        AddBefehlKommentarHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: BEFEHL_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    handler = module.get<AddBefehlKommentarHandler>(AddBefehlKommentarHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute (Success)', () => {
    it('sollte Kommentar erfolgreich hinzufügen und Befehl-ID zurückgeben', async () => {
      const authorId = UserId.create().value as UserId;
      const befehl = createErteiltBefehl();
      mockRepository.findById.mockResolvedValue(Result.ok(befehl));

      const command = new AddBefehlKommentarCommand(befehl.id.value, authorId.value, 'Wasser wird benötigt', false);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(befehl.id.value);
      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
    });

    it('sollte Rückfrage-Kommentar erfolgreich hinzufügen (isRueckfrage=true)', async () => {
      const authorId = UserId.create().value as UserId;
      const befehl = createErteiltBefehl();
      mockRepository.findById.mockResolvedValue(Result.ok(befehl));

      const command = new AddBefehlKommentarCommand(befehl.id.value, authorId.value, 'Welches Material?', true);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(befehl.id.value);
    });

    it('sollte Thread-Antwort mit parentId erfolgreich hinzufügen', async () => {
      const authorId = UserId.create().value as UserId;
      const parentKommentar = BefehlKommentar.reconstitute('parent-kommentar-id', authorId, 'Frage', true);
      const befehlId = BefehlId.create().value as BefehlId;
      const einsatzId = EinsatzId.create().value as EinsatzId;
      const erstellerId = UserId.create().value as UserId;
      const empfaengerId = UserId.create().value as UserId;
      const empfaenger = BefehlEmpfaenger.reconstitute('emp-1', 'ZF Nord', empfaengerId, new Date(), undefined, undefined);
      const befehl = Befehl.reconstitute({
        id: befehlId,
        nummer: 'B-001',
        einsatzId,
        auftrag: 'Patientenablage einrichten',
        befehlsgeberName: 'EL Müller',
        befehlsgeberId: undefined,
        erstellerId,
        status: BefehlStatus.ERTEILT(),
        erteiltAm: new Date(),
        empfaenger: [empfaenger],
        kommentare: [parentKommentar],
      });
      mockRepository.findById.mockResolvedValue(Result.ok(befehl));

      const command = new AddBefehlKommentarCommand(befehl.id.value, authorId.value, 'Antwort auf Rückfrage', false, 'parent-kommentar-id');

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(befehl.id.value);
    });

    it('sollte BefehlKommentarHinzugefuegtEvent im Outbox speichern', async () => {
      const authorId = UserId.create().value as UserId;
      const befehl = createErteiltBefehl();
      mockRepository.findById.mockResolvedValue(Result.ok(befehl));

      const command = new AddBefehlKommentarCommand(befehl.id.value, authorId.value, 'Test-Kommentar', false);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const savedEvents = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(savedEvents.length).toBe(1);
      const event = savedEvents[0];
      expect(event.constructor.name).toBe('BefehlKommentarHinzugefuegtEvent');
      expect(event.befehlId.value).toBe(befehl.id.value);
      expect(event.text).toBe('Test-Kommentar');
      expect(event.isRueckfrage).toBe(false);
      expect(event.parentId).toBeUndefined();
    });

    it('sollte Repository.save mit tx-Context aufrufen', async () => {
      const txMarker = { txMarker: 'test-tx' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));
      const authorId = UserId.create().value as UserId;
      const befehl = createErteiltBefehl();
      mockRepository.findById.mockResolvedValue(Result.ok(befehl));

      const command = new AddBefehlKommentarCommand(befehl.id.value, authorId.value, 'Test', false);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      const txContext = mockRepository.save.mock.calls[0]?.[1]!;
      expect(txContext).toBe(txMarker);
    });
  });

  describe('execute (Befehl nicht gefunden)', () => {
    it('sollte Result.fail wenn Befehl nicht gefunden', async () => {
      const befehlId = BefehlId.create().value as BefehlId;
      const authorId = UserId.create().value as UserId;
      mockRepository.findById.mockResolvedValue(Result.ok(null));

      const command = new AddBefehlKommentarCommand(befehlId.value, authorId.value, 'Kommentar', false);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('nicht gefunden');
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail wenn Repository.findById fehlschlägt', async () => {
      const befehlId = BefehlId.create().value as BefehlId;
      const authorId = UserId.create().value as UserId;
      mockRepository.findById.mockResolvedValue(Result.fail('Database error'));

      const command = new AddBefehlKommentarCommand(befehlId.value, authorId.value, 'Kommentar', false);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Database error');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('execute (Validation Errors)', () => {
    it('sollte Result.fail bei ungültiger BefehlId', async () => {
      const authorId = UserId.create().value as UserId;
      const command = new AddBefehlKommentarCommand('invalid-id', authorId.value, 'Kommentar', false);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail bei ungültiger AuthorId', async () => {
      const befehlId = BefehlId.create().value as BefehlId;
      const command = new AddBefehlKommentarCommand(befehlId.value, 'INVALID_UPPERCASE', 'Kommentar', false);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail bei leerem Text (Domain validiert)', async () => {
      const authorId = UserId.create().value as UserId;
      const befehl = createErteiltBefehl();
      mockRepository.findById.mockResolvedValue(Result.ok(befehl));

      const command = new AddBefehlKommentarCommand(befehl.id.value, authorId.value, '', false);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('erforderlich');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('execute (Repository Save Error)', () => {
    it('sollte Result.fail bei Repository.save Fehler', async () => {
      const authorId = UserId.create().value as UserId;
      const befehl = createErteiltBefehl();
      mockRepository.findById.mockResolvedValue(Result.ok(befehl));
      mockRepository.save.mockResolvedValue(Result.fail('Database write error'));

      const command = new AddBefehlKommentarCommand(befehl.id.value, authorId.value, 'Kommentar', false);

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Database write error');
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });
});
