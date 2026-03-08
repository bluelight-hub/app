// @ts-nocheck
import { CreateKategorieHandler } from '../create-kategorie.handler';
import { CreateKategorieCommand } from '../create-kategorie.command';
import { UserId } from '@domain/value-objects/user-id';
import { KATEGORIE_ERROR_CODES } from '../../../errors/kategorie-error.codes';
import type { IKategorieRepository } from '@domain/kategorie/repositories/i-kategorie.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { PrismaService } from '@/infrastructure/database/prisma.service';
import { KategorieResponseFactory } from '../../../dto/kategorie-response.factory';

describe('CreateKategorieHandler', () => {
  let handler: CreateKategorieHandler;
  let mockKategorieRepository: jest.Mocked<IKategorieRepository>;
  let mockOutboxRepository: jest.Mocked<IOutboxRepository>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockResponseFactory: jest.Mocked<KategorieResponseFactory>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockKategorieRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByEinsatzId: jest.fn(),
      existsByNameAndEinsatzId: jest.fn().mockResolvedValue(false),
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

    mockResponseFactory = {
      create: jest.fn().mockResolvedValue({
        id: 'kategorie-123',
        name: 'Lage',
        farbe: '#FF5733',
        einsatzId: 'einsatz-123',
        erstelltVon: 'user-123',
        erstelltVonName: 'Test User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    } as unknown as jest.Mocked<KategorieResponseFactory>;

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        return callback({});
      }),
    } as unknown as jest.Mocked<PrismaService>;

    handler = new CreateKategorieHandler(mockPrismaService, mockOutboxRepository, mockKategorieRepository, mockLogger, mockResponseFactory);
  });

  describe('execute', () => {
    it('should create Kategorie successfully and return response DTO', async () => {
      // Given (Arrange)
      const userId = UserId.create().value!;
      const commandResult = CreateKategorieCommand.create({
        name: 'Lage',
        farbe: '#FF5733',
        einsatzId: 'einsatz-123',
        erstelltVon: userId.toString(),
      });
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.name).toBe('Lage');
      expect(result.value?.farbe).toBe('#FF5733');
      expect(mockKategorieRepository.existsByNameAndEinsatzId).toHaveBeenCalledWith('Lage', 'einsatz-123');
      expect(mockKategorieRepository.save).toHaveBeenCalledTimes(1);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Kategorie erstellt'), 'CreateKategorieHandler');
    });

    it('should fail when name is duplicate (existsByNameAndEinsatzId returns true)', async () => {
      // Given (Arrange)
      mockKategorieRepository.existsByNameAndEinsatzId.mockResolvedValue(true);

      const userId = UserId.create().value!;
      const commandResult = CreateKategorieCommand.create({
        name: 'Duplicate Name',
        farbe: '#FF5733',
        einsatzId: 'einsatz-123',
        erstelltVon: userId.toString(),
      });
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(KATEGORIE_ERROR_CODES.NAME_DUPLICATE);
      expect(mockKategorieRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('should fail with invalid erstelltVon', async () => {
      // Given (Arrange)
      const commandResult = CreateKategorieCommand.create({
        name: 'Lage',
        farbe: '#FF5733',
        einsatzId: 'einsatz-123',
        erstelltVon: 'invalid-user-id',
      });
      expect(commandResult.isSuccess).toBe(true);
      const command = commandResult.value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBeDefined();
      expect(mockKategorieRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('CreateKategorieCommand.create()', () => {
    it('should fail when name is empty', () => {
      const result = CreateKategorieCommand.create({
        name: '',
        farbe: '#FF5733',
        einsatzId: 'einsatz-123',
        erstelltVon: 'user-123',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(KATEGORIE_ERROR_CODES.NAME_REQUIRED);
    });

    it('should fail when name is whitespace', () => {
      const result = CreateKategorieCommand.create({
        name: '   ',
        farbe: '#FF5733',
        einsatzId: 'einsatz-123',
        erstelltVon: 'user-123',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(KATEGORIE_ERROR_CODES.NAME_REQUIRED);
    });

    it('should fail when name exceeds 100 characters', () => {
      const tooLongName = 'A'.repeat(101);
      const result = CreateKategorieCommand.create({
        name: tooLongName,
        farbe: '#FF5733',
        einsatzId: 'einsatz-123',
        erstelltVon: 'user-123',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(KATEGORIE_ERROR_CODES.NAME_TOO_LONG);
    });

    it('should fail when farbe is empty', () => {
      const result = CreateKategorieCommand.create({
        name: 'Lage',
        farbe: '',
        einsatzId: 'einsatz-123',
        erstelltVon: 'user-123',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(KATEGORIE_ERROR_CODES.FARBE_REQUIRED);
    });

    it('should fail when farbe has invalid format', () => {
      const result = CreateKategorieCommand.create({
        name: 'Lage',
        farbe: 'red',
        einsatzId: 'einsatz-123',
        erstelltVon: 'user-123',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(KATEGORIE_ERROR_CODES.FARBE_INVALID);
    });

    it('should fail when einsatzId is empty', () => {
      const result = CreateKategorieCommand.create({
        name: 'Lage',
        farbe: '#FF5733',
        einsatzId: '',
        erstelltVon: 'user-123',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(KATEGORIE_ERROR_CODES.EINSATZ_ID_REQUIRED);
    });

    it('should fail when erstelltVon is empty', () => {
      const result = CreateKategorieCommand.create({
        name: 'Lage',
        farbe: '#FF5733',
        einsatzId: 'einsatz-123',
        erstelltVon: '',
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain(KATEGORIE_ERROR_CODES.ERSTELLT_VON_REQUIRED);
    });

    it('should create command successfully with valid props', () => {
      const result = CreateKategorieCommand.create({
        name: 'Lage',
        farbe: '#FF5733',
        einsatzId: 'einsatz-123',
        erstelltVon: 'user-123',
      });
      expect(result.isSuccess).toBe(true);
      expect(result.value?.name).toBe('Lage');
      expect(result.value?.farbe).toBe('#FF5733');
      expect(result.value?.einsatzId).toBe('einsatz-123');
      expect(result.value?.erstelltVon).toBe('user-123');
    });

    it('should trim name and farbe', () => {
      const result = CreateKategorieCommand.create({
        name: '  Lage  ',
        farbe: '  #FF5733  ',
        einsatzId: 'einsatz-123',
        erstelltVon: 'user-123',
      });
      expect(result.isSuccess).toBe(true);
      expect(result.value?.name).toBe('Lage');
      expect(result.value?.farbe).toBe('#FF5733');
    });
  });
});
