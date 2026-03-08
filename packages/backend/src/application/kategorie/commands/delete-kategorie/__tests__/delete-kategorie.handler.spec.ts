// @ts-nocheck
import { DeleteKategorieHandler } from '../delete-kategorie.handler';
import { DeleteKategorieCommand } from '../delete-kategorie.command';
import { Kategorie } from '@domain/kategorie/entities/kategorie.entity';
import { KategorieId } from '@domain/kategorie/value-objects/kategorie-id';
import { KategorieName } from '@domain/kategorie/value-objects/kategorie-name';
import { KategorieFarbe } from '@domain/kategorie/value-objects/kategorie-farbe';
import { UserId } from '@domain/value-objects/user-id';
import { KATEGORIE_ERROR_CODES } from '../../../errors/kategorie-error.codes';
import type { IKategorieRepository } from '@domain/kategorie/repositories/i-kategorie.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { PrismaService } from '@/infrastructure/database/prisma.service';

describe('DeleteKategorieHandler', () => {
  let handler: DeleteKategorieHandler;
  let mockKategorieRepository: jest.Mocked<IKategorieRepository>;
  let mockOutboxRepository: jest.Mocked<IOutboxRepository>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockKategorieRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      existsByNameAndEinsatzId: jest.fn(),
    } as unknown as jest.Mocked<IKategorieRepository>;

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IOutboxRepository>;

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        return callback({});
      }),
    } as unknown as jest.Mocked<PrismaService>;

    handler = new DeleteKategorieHandler(mockPrismaService, mockOutboxRepository, mockKategorieRepository, mockLogger);
  });

  const createValidKategorie = (): Kategorie => {
    const id = KategorieId.create().value! as KategorieId;
    const name = KategorieName.create('Zu loeschende Kategorie').value!;
    const farbe = KategorieFarbe.create('#FF5733').value!;
    const erstelltVon = UserId.create().value!;
    return Kategorie.reconstruct({
      id,
      einsatzId: 'einsatz-123',
      name,
      farbe,
      erstelltVon,
      createdAt: new Date('2026-02-03T10:00:00.000Z'),
      updatedAt: new Date('2026-02-03T10:00:00.000Z'),
      geloeschtAm: null,
    });
  };

  const createDeletedKategorie = (): Kategorie => {
    const id = KategorieId.create().value! as KategorieId;
    const name = KategorieName.create('Bereits Geloeschte Kategorie').value!;
    const farbe = KategorieFarbe.create('#FF5733').value!;
    const erstelltVon = UserId.create().value!;
    return Kategorie.reconstruct({
      id,
      einsatzId: 'einsatz-123',
      name,
      farbe,
      erstelltVon,
      createdAt: new Date('2026-02-03T10:00:00.000Z'),
      updatedAt: new Date('2026-02-03T12:00:00.000Z'),
      geloeschtAm: new Date('2026-02-03T12:00:00.000Z'),
    });
  };

  it('should soft-delete Kategorie successfully', async () => {
    // Given (Arrange)
    const kategorie = createValidKategorie();
    mockKategorieRepository.findById.mockResolvedValue(kategorie);

    const commandResult = DeleteKategorieCommand.create({
      kategorieId: kategorie.id.toString(),
      geloeschtVon: UserId.create().value?.toString(),
    });
    expect(commandResult.isSuccess).toBe(true);

    // When (Act)
    const result = await handler.execute(commandResult.value!);

    // Then (Assert)
    expect(result.isSuccess).toBe(true);
    expect(mockKategorieRepository.findById).toHaveBeenCalled();
    expect(mockKategorieRepository.save).toHaveBeenCalled();
    expect(mockOutboxRepository.save).toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Kategorie geloescht'), 'DeleteKategorieHandler');
  });

  it('should fail when Kategorie not found', async () => {
    // Given (Arrange)
    mockKategorieRepository.findById.mockResolvedValue(null);

    const commandResult = DeleteKategorieCommand.create({
      kategorieId: 'nonexistent-id',
      geloeschtVon: UserId.create().value?.toString(),
    });
    expect(commandResult.isSuccess).toBe(true);

    // When (Act)
    const result = await handler.execute(commandResult.value!);

    // Then (Assert)
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(KATEGORIE_ERROR_CODES.NOT_FOUND);
    expect(mockKategorieRepository.save).not.toHaveBeenCalled();
  });

  it('should fail when Kategorie already deleted', async () => {
    // Given (Arrange)
    const deletedKategorie = createDeletedKategorie();
    mockKategorieRepository.findById.mockResolvedValue(deletedKategorie);

    const commandResult = DeleteKategorieCommand.create({
      kategorieId: deletedKategorie.id.toString(),
      geloeschtVon: UserId.create().value?.toString(),
    });
    expect(commandResult.isSuccess).toBe(true);

    // When (Act)
    const result = await handler.execute(commandResult.value!);

    // Then (Assert)
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('KATEGORIE_ALREADY_DELETED');
    expect(mockKategorieRepository.save).not.toHaveBeenCalled();
  });

  it('should persist events via outbox repository', async () => {
    // Given (Arrange)
    const kategorie = createValidKategorie();
    mockKategorieRepository.findById.mockResolvedValue(kategorie);

    const commandResult = DeleteKategorieCommand.create({
      kategorieId: kategorie.id.toString(),
      geloeschtVon: UserId.create().value?.toString(),
    });

    // When (Act)
    await handler.execute(commandResult.value!);

    // Then (Assert)
    expect(mockOutboxRepository.save).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ einsatzId: 'einsatz-123' })]), expect.anything());
  });

  describe('DeleteKategorieCommand.create()', () => {
    it('should fail when kategorieId is empty', () => {
      const result = DeleteKategorieCommand.create({
        kategorieId: '',
        geloeschtVon: 'user-123',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(KATEGORIE_ERROR_CODES.NOT_FOUND);
    });

    it('should fail when kategorieId is whitespace', () => {
      const result = DeleteKategorieCommand.create({
        kategorieId: '   ',
        geloeschtVon: 'user-123',
      });
      expect(result.isFailure).toBe(true);
    });

    it('should fail when geloeschtVon is empty', () => {
      const result = DeleteKategorieCommand.create({
        kategorieId: 'kategorie-id',
        geloeschtVon: '',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(KATEGORIE_ERROR_CODES.GELOESCHT_VON_REQUIRED);
    });

    it('should fail when geloeschtVon is whitespace', () => {
      const result = DeleteKategorieCommand.create({
        kategorieId: 'kategorie-id',
        geloeschtVon: '   ',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(KATEGORIE_ERROR_CODES.GELOESCHT_VON_REQUIRED);
    });

    it('should create command successfully with valid props', () => {
      const result = DeleteKategorieCommand.create({
        kategorieId: 'kategorie-id',
        geloeschtVon: 'user-123',
      });
      expect(result.isSuccess).toBe(true);
      expect(result.value?.kategorieId).toBe('kategorie-id');
      expect(result.value?.geloeschtVon).toBe('user-123');
    });

    it('should trim kategorieId and geloeschtVon', () => {
      const result = DeleteKategorieCommand.create({
        kategorieId: '  kategorie-id  ',
        geloeschtVon: '  user-123  ',
      });
      expect(result.isSuccess).toBe(true);
      expect(result.value?.kategorieId).toBe('kategorie-id');
      expect(result.value?.geloeschtVon).toBe('user-123');
    });
  });
});
