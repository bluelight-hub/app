import type { IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { JoinEinsatzHandler } from '../join-einsatz.handler';
import { JoinEinsatzCommand } from '../join-einsatz.command';

describe('JoinEinsatzHandler', () => {
  let handler: JoinEinsatzHandler;
  let mockRepository: jest.Mocked<IEinsatzTeilnehmerRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Repository
    mockRepository = {
      findByEinsatzAndUser: jest.fn(),
      create: jest.fn(),
      updateFunkrufname: jest.fn(),
      findAllByEinsatz: jest.fn(),
      remove: jest.fn(),
    };

    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    handler = new JoinEinsatzHandler(mockRepository, mockLogger);
  });

  describe('execute - Insert Case', () => {
    it('should create new teilnehmer when user not exists', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const funkrufname = 'HLM 10/1';
      const command = JoinEinsatzCommand.create(einsatzId, userId, funkrufname).value!;

      const expectedTeilnehmer = {
        id: 'teilnehmer-789',
        einsatzId,
        userId,
        funkrufname,
        joinedAt: new Date(),
      };

      mockRepository.findByEinsatzAndUser.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(expectedTeilnehmer);

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(expectedTeilnehmer);
      expect(mockRepository.findByEinsatzAndUser).toHaveBeenCalledWith(einsatzId, userId);
      expect(mockRepository.create).toHaveBeenCalledWith({
        einsatzId,
        userId,
        funkrufname,
      });
      expect(mockLogger.log).toHaveBeenCalledWith(`User ${userId} joining Einsatz ${einsatzId} with Funkrufname "${funkrufname}"`);
      expect(mockLogger.log).toHaveBeenCalledWith(`User ${userId} successfully joined Einsatz ${einsatzId}`);
    });

    it('should call repository.create with correct parameters', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-abc';
      const userId = 'user-xyz';
      const funkrufname = 'MTW 12/1';
      const command = JoinEinsatzCommand.create(einsatzId, userId, funkrufname).value!;

      mockRepository.findByEinsatzAndUser.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        id: 'teilnehmer-id',
        einsatzId,
        userId,
        funkrufname,
        joinedAt: new Date(),
      });

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockRepository.create).toHaveBeenCalledWith({
        einsatzId: 'einsatz-abc',
        userId: 'user-xyz',
        funkrufname: 'MTW 12/1',
      });
      expect(mockRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should return failure when repository.create throws error', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const funkrufname = 'HLM 10/1';
      const command = JoinEinsatzCommand.create(einsatzId, userId, funkrufname).value!;

      mockRepository.findByEinsatzAndUser.mockResolvedValue(null);
      mockRepository.create.mockRejectedValue(new Error('Database connection error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Einsatz-Beitritt fehlgeschlagen');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to join Einsatz: Database connection error');
    });
  });

  describe('execute - Update Case', () => {
    it('should update funkrufname when user already exists', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const oldFunkrufname = 'HLM 10/1';
      const newFunkrufname = 'MTW 12/1';
      const command = JoinEinsatzCommand.create(einsatzId, userId, newFunkrufname).value!;

      const existingTeilnehmer = {
        id: 'teilnehmer-789',
        einsatzId,
        userId,
        funkrufname: oldFunkrufname,
        joinedAt: new Date(),
      };

      const updatedTeilnehmer = {
        ...existingTeilnehmer,
        funkrufname: newFunkrufname,
      };

      mockRepository.findByEinsatzAndUser.mockResolvedValue(existingTeilnehmer);
      mockRepository.updateFunkrufname.mockResolvedValue(updatedTeilnehmer);

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(updatedTeilnehmer);
      expect(mockRepository.findByEinsatzAndUser).toHaveBeenCalledWith(einsatzId, userId);
      expect(mockRepository.updateFunkrufname).toHaveBeenCalledWith(einsatzId, userId, newFunkrufname);
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(`User ${userId} already joined Einsatz ${einsatzId}, updating Funkrufname`);
    });

    it('should call repository.updateFunkrufname with correct parameters', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-abc';
      const userId = 'user-xyz';
      const newFunkrufname = 'NEF 13/1';
      const command = JoinEinsatzCommand.create(einsatzId, userId, newFunkrufname).value!;

      const existingTeilnehmer = {
        id: 'teilnehmer-id',
        einsatzId,
        userId,
        funkrufname: 'old-name',
        joinedAt: new Date(),
      };

      mockRepository.findByEinsatzAndUser.mockResolvedValue(existingTeilnehmer);
      mockRepository.updateFunkrufname.mockResolvedValue({
        ...existingTeilnehmer,
        funkrufname: newFunkrufname,
      });

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockRepository.updateFunkrufname).toHaveBeenCalledWith('einsatz-abc', 'user-xyz', 'NEF 13/1');
      expect(mockRepository.updateFunkrufname).toHaveBeenCalledTimes(1);
    });

    it('should return failure when repository.updateFunkrufname returns null', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const funkrufname = 'HLM 10/1';
      const command = JoinEinsatzCommand.create(einsatzId, userId, funkrufname).value!;

      const existingTeilnehmer = {
        id: 'teilnehmer-789',
        einsatzId,
        userId,
        funkrufname: 'old-name',
        joinedAt: new Date(),
      };

      mockRepository.findByEinsatzAndUser.mockResolvedValue(existingTeilnehmer);
      mockRepository.updateFunkrufname.mockResolvedValue(null);

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Funkrufname konnte nicht aktualisiert werden');
      expect(mockLogger.error).toHaveBeenCalledWith(`Failed to update Funkrufname for User ${userId} in Einsatz ${einsatzId}`);
    });
  });

  describe('execute - Logger Integration', () => {
    it('should log initial action message', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const funkrufname = 'HLM 10/1';
      const command = JoinEinsatzCommand.create(einsatzId, userId, funkrufname).value!;

      mockRepository.findByEinsatzAndUser.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        id: 'teilnehmer-id',
        einsatzId,
        userId,
        funkrufname,
        joinedAt: new Date(),
      });

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(`User ${userId} joining Einsatz ${einsatzId} with Funkrufname "${funkrufname}"`);
    });

    it('should log success message on create', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const funkrufname = 'HLM 10/1';
      const command = JoinEinsatzCommand.create(einsatzId, userId, funkrufname).value!;

      mockRepository.findByEinsatzAndUser.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        id: 'teilnehmer-id',
        einsatzId,
        userId,
        funkrufname,
        joinedAt: new Date(),
      });

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(`User ${userId} successfully joined Einsatz ${einsatzId}`);
    });

    it('should log update message when user already exists', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const funkrufname = 'HLM 10/1';
      const command = JoinEinsatzCommand.create(einsatzId, userId, funkrufname).value!;

      const existingTeilnehmer = {
        id: 'teilnehmer-id',
        einsatzId,
        userId,
        funkrufname: 'old-name',
        joinedAt: new Date(),
      };

      mockRepository.findByEinsatzAndUser.mockResolvedValue(existingTeilnehmer);
      mockRepository.updateFunkrufname.mockResolvedValue({
        ...existingTeilnehmer,
        funkrufname,
      });

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(`User ${userId} already joined Einsatz ${einsatzId}, updating Funkrufname`);
    });

    it('should log error on create failure', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const funkrufname = 'HLM 10/1';
      const command = JoinEinsatzCommand.create(einsatzId, userId, funkrufname).value!;

      mockRepository.findByEinsatzAndUser.mockResolvedValue(null);
      mockRepository.create.mockRejectedValue(new Error('Constraint violation'));

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to join Einsatz: Constraint violation');
    });
  });
});
