// @ts-nocheck
import { DeleteNotizHandler } from '../delete-notiz.handler';
import { DeleteNotizCommand } from '../delete-notiz.command';
import { Notiz } from '@domain/notiz/entities/notiz.entity';
import { NotizId } from '@domain/notiz/value-objects/notiz-id';
import { NotizTitel } from '@domain/notiz/value-objects/notiz-titel';
import { UserId } from '@domain/value-objects/user-id';
import { NOTIZ_ERROR_CODES } from '../../../errors/notiz-error.codes';

describe('DeleteNotizHandler', () => {
  let handler: DeleteNotizHandler;
  let mockNotizRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByEinsatzId: jest.Mock;
  };
  let mockOutboxRepository: { save: jest.Mock };
  let mockLogger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock; debug: jest.Mock };
  let mockPrismaService: {
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    mockNotizRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
    };

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({});
      }),
    };

    handler = new DeleteNotizHandler(mockPrismaService as any, mockOutboxRepository as any, mockNotizRepository as any, mockLogger as any);
  });

  const createValidNotiz = (): Notiz => {
    const id = NotizId.create().value! as NotizId;
    const titel = NotizTitel.create('Zu loeschende Notiz').value!;
    const erstelltVon = UserId.create().value!;
    return Notiz.reconstruct({
      id,
      einsatzId: 'einsatz-123',
      titel,
      inhalt: 'Inhalt der Notiz',
      kategorie: 'Lage',
      erstelltVon,
      createdAt: new Date('2026-02-03T10:00:00.000Z'),
      updatedAt: new Date('2026-02-03T10:00:00.000Z'),
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    });
  };

  const createDeletedNotiz = (): Notiz => {
    const id = NotizId.create().value! as NotizId;
    const titel = NotizTitel.create('Bereits Geloeschte Notiz').value!;
    const erstelltVon = UserId.create().value!;
    const deletedBy = UserId.create().value!;
    return Notiz.reconstruct({
      id,
      einsatzId: 'einsatz-123',
      titel,
      inhalt: null,
      kategorie: null,
      erstelltVon,
      createdAt: new Date('2026-02-03T10:00:00.000Z'),
      updatedAt: new Date('2026-02-03T12:00:00.000Z'),
      isDeleted: true,
      deletedAt: new Date('2026-02-03T12:00:00.000Z'),
      deletedBy,
    });
  };

  it('should delete notiz successfully', async () => {
    // Given (Arrange)
    const notiz = createValidNotiz();
    mockNotizRepository.findById.mockResolvedValue(notiz);

    const commandResult = DeleteNotizCommand.create({
      notizId: notiz.id.toString(),
      geloeschtVon: UserId.create().value?.toString(),
    });
    expect(commandResult.isSuccess).toBe(true);

    // When (Act)
    const result = await handler.execute(commandResult.value!);

    // Then (Assert)
    expect(result.isSuccess).toBe(true);
    expect(mockNotizRepository.findById).toHaveBeenCalled();
    expect(mockNotizRepository.save).toHaveBeenCalled();
    expect(mockOutboxRepository.save).toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Notiz geloescht'), 'DeleteNotizHandler');
  });

  it('should fail when notiz not found', async () => {
    // Given (Arrange)
    mockNotizRepository.findById.mockResolvedValue(null);

    const commandResult = DeleteNotizCommand.create({
      notizId: 'nonexistent-id',
      geloeschtVon: UserId.create().value?.toString(),
    });
    expect(commandResult.isSuccess).toBe(true);

    // When (Act)
    const result = await handler.execute(commandResult.value!);

    // Then (Assert)
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(NOTIZ_ERROR_CODES.NOT_FOUND);
    expect(mockNotizRepository.save).not.toHaveBeenCalled();
  });

  it('should fail when notiz is already deleted (AC5: 409 Conflict)', async () => {
    // Given (Arrange)
    const deletedNotiz = createDeletedNotiz();
    mockNotizRepository.findById.mockResolvedValue(deletedNotiz);

    const commandResult = DeleteNotizCommand.create({
      notizId: deletedNotiz.id.toString(),
      geloeschtVon: UserId.create().value?.toString(),
    });
    expect(commandResult.isSuccess).toBe(true);

    // When (Act)
    const result = await handler.execute(commandResult.value!);

    // Then (Assert)
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('NOTIZ_ALREADY_DELETED');
    expect(mockNotizRepository.save).not.toHaveBeenCalled();
  });

  it('should persist events via outbox repository', async () => {
    // Given (Arrange)
    const notiz = createValidNotiz();
    mockNotizRepository.findById.mockResolvedValue(notiz);

    const commandResult = DeleteNotizCommand.create({
      notizId: notiz.id.toString(),
      geloeschtVon: UserId.create().value?.toString(),
    });

    // When (Act)
    await handler.execute(commandResult.value!);

    // Then (Assert)
    expect(mockOutboxRepository.save).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ einsatzId: 'einsatz-123' })]), expect.anything());
  });

  describe('DeleteNotizCommand.create()', () => {
    it('should fail when notizId is empty', () => {
      const result = DeleteNotizCommand.create({
        notizId: '',
        geloeschtVon: 'user-123',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(NOTIZ_ERROR_CODES.NOT_FOUND);
    });

    it('should fail when notizId is whitespace', () => {
      const result = DeleteNotizCommand.create({
        notizId: '   ',
        geloeschtVon: 'user-123',
      });
      expect(result.isFailure).toBe(true);
    });

    it('should fail when geloeschtVon is empty', () => {
      const result = DeleteNotizCommand.create({
        notizId: 'notiz-id',
        geloeschtVon: '',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(NOTIZ_ERROR_CODES.GELOESCHT_VON_REQUIRED);
    });

    it('should fail when geloeschtVon is whitespace', () => {
      const result = DeleteNotizCommand.create({
        notizId: 'notiz-id',
        geloeschtVon: '   ',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(NOTIZ_ERROR_CODES.GELOESCHT_VON_REQUIRED);
    });

    it('should create command successfully with valid props', () => {
      const result = DeleteNotizCommand.create({
        notizId: 'notiz-id',
        geloeschtVon: 'user-123',
      });
      expect(result.isSuccess).toBe(true);
      expect(result.value?.notizId).toBe('notiz-id');
      expect(result.value?.geloeschtVon).toBe('user-123');
    });

    it('should trim notizId and geloeschtVon', () => {
      const result = DeleteNotizCommand.create({
        notizId: '  notiz-id  ',
        geloeschtVon: '  user-123  ',
      });
      expect(result.isSuccess).toBe(true);
      expect(result.value?.notizId).toBe('notiz-id');
      expect(result.value?.geloeschtVon).toBe('user-123');
    });
  });
});
