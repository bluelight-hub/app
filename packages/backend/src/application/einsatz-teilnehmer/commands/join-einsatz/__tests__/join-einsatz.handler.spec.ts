import type { IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { JoinEinsatzHandler } from '../join-einsatz.handler';
import { JoinEinsatzCommand } from '../join-einsatz.command';

describe('JoinEinsatzHandler', () => {
  let handler: JoinEinsatzHandler;
  let mockRepository: jest.Mocked<IEinsatzTeilnehmerRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  const mockTeilnehmerDto = (overrides = {}) => ({
    id: 'teilnehmer-789',
    einsatzId: 'einsatz-123',
    userId: 'user-456',
    einsatzPersonId: 'person-abc',
    personVorname: 'Max',
    personNachname: 'Mustermann',
    personFunkrufname: 'Rotkreuz 83/1',
    personFunktion: 'Helfer',
    joinedAt: new Date(),
    leftAt: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      existsEinsatzPerson: jest.fn(),
      findByEinsatzAndUser: jest.fn(),
      findActiveByEinsatz: jest.fn(),
      isPersonAlreadyLinked: jest.fn(),
      create: jest.fn(),
      updateEinsatzPerson: jest.fn(),
      leave: jest.fn(),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    handler = new JoinEinsatzHandler(mockRepository, mockLogger);
  });

  describe('execute - Insert Case', () => {
    it('should create new teilnehmer when user does not exist', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const einsatzPersonId = 'person-abc';
      const command = JoinEinsatzCommand.create(einsatzId, userId, einsatzPersonId).value!;

      const expectedTeilnehmer = mockTeilnehmerDto();

      mockRepository.existsEinsatzPerson.mockResolvedValue(true);
      mockRepository.findByEinsatzAndUser.mockResolvedValue(null);
      mockRepository.isPersonAlreadyLinked.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue(expectedTeilnehmer);

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(expectedTeilnehmer);
      expect(mockRepository.existsEinsatzPerson).toHaveBeenCalledWith(einsatzId, einsatzPersonId);
      expect(mockRepository.findByEinsatzAndUser).toHaveBeenCalledWith(einsatzId, userId);
      expect(mockRepository.isPersonAlreadyLinked).toHaveBeenCalledWith(einsatzId, einsatzPersonId);
      expect(mockRepository.create).toHaveBeenCalledWith({
        einsatzId,
        userId,
        einsatzPersonId,
      });
      expect(mockLogger.log).toHaveBeenCalledWith(`User ${userId} joining Einsatz ${einsatzId} with EinsatzPerson "${einsatzPersonId}"`);
      expect(mockLogger.log).toHaveBeenCalledWith(`User ${userId} successfully joined Einsatz ${einsatzId}`);
    });

    it('should validate that EinsatzPerson exists in einsatz', async () => {
      // Given (Arrange)
      const command = JoinEinsatzCommand.create('einsatz-123', 'user-456', 'person-abc').value!;

      mockRepository.existsEinsatzPerson.mockResolvedValue(true);
      mockRepository.findByEinsatzAndUser.mockResolvedValue(null);
      mockRepository.isPersonAlreadyLinked.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue(mockTeilnehmerDto());

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockRepository.existsEinsatzPerson).toHaveBeenCalledWith('einsatz-123', 'person-abc');
    });

    it('should reject when EinsatzPerson not found', async () => {
      // Given (Arrange)
      const command = JoinEinsatzCommand.create('einsatz-123', 'user-456', 'nonexistent-person').value!;

      mockRepository.existsEinsatzPerson.mockResolvedValue(false);

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('EinsatzPerson existiert nicht oder gehört nicht zu diesem Einsatz');
      expect(mockRepository.findByEinsatzAndUser).not.toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject when person is already linked to another user', async () => {
      // Given (Arrange)
      const command = JoinEinsatzCommand.create('einsatz-123', 'user-456', 'person-abc').value!;

      mockRepository.existsEinsatzPerson.mockResolvedValue(true);
      mockRepository.findByEinsatzAndUser.mockResolvedValue(null);
      mockRepository.isPersonAlreadyLinked.mockResolvedValue(true);

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Diese Person ist bereits einem anderen Bearbeiter zugeordnet');
      expect(mockRepository.isPersonAlreadyLinked).toHaveBeenCalledWith('einsatz-123', 'person-abc');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('execute - Update Case', () => {
    it('should update einsatzPerson when user already exists', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const newPersonId = 'person-def';
      const command = JoinEinsatzCommand.create(einsatzId, userId, newPersonId).value!;

      const existingTeilnehmer = mockTeilnehmerDto({ einsatzPersonId: 'person-abc' });
      const updatedTeilnehmer = mockTeilnehmerDto({ einsatzPersonId: newPersonId });

      mockRepository.existsEinsatzPerson.mockResolvedValue(true);
      mockRepository.findByEinsatzAndUser.mockResolvedValue(existingTeilnehmer);
      mockRepository.isPersonAlreadyLinked.mockResolvedValue(false);
      mockRepository.updateEinsatzPerson.mockResolvedValue(updatedTeilnehmer);

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(updatedTeilnehmer);
      expect(mockRepository.findByEinsatzAndUser).toHaveBeenCalledWith(einsatzId, userId);
      expect(mockRepository.isPersonAlreadyLinked).toHaveBeenCalledWith(einsatzId, newPersonId, userId);
      expect(mockRepository.updateEinsatzPerson).toHaveBeenCalledWith(einsatzId, userId, newPersonId);
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(`User ${userId} already joined Einsatz ${einsatzId}, updating EinsatzPerson`);
    });

    it('should validate that EinsatzPerson exists before updating', async () => {
      // Given (Arrange)
      const command = JoinEinsatzCommand.create('einsatz-123', 'user-456', 'nonexistent-person').value!;

      mockRepository.existsEinsatzPerson.mockResolvedValue(false);

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('EinsatzPerson existiert nicht oder gehört nicht zu diesem Einsatz');
      expect(mockRepository.findByEinsatzAndUser).not.toHaveBeenCalled();
      expect(mockRepository.updateEinsatzPerson).not.toHaveBeenCalled();
    });

    it('should reject when person is already linked by another user', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const newPersonId = 'person-def';
      const command = JoinEinsatzCommand.create(einsatzId, userId, newPersonId).value!;

      const existingTeilnehmer = mockTeilnehmerDto({ einsatzPersonId: 'person-abc' });

      mockRepository.existsEinsatzPerson.mockResolvedValue(true);
      mockRepository.findByEinsatzAndUser.mockResolvedValue(existingTeilnehmer);
      mockRepository.isPersonAlreadyLinked.mockResolvedValue(true);

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Diese Person ist bereits einem anderen Bearbeiter zugeordnet');
      expect(mockRepository.isPersonAlreadyLinked).toHaveBeenCalledWith(einsatzId, newPersonId, userId);
      expect(mockRepository.updateEinsatzPerson).not.toHaveBeenCalled();
    });

    it('should return failure when updateEinsatzPerson returns null', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const newPersonId = 'person-def';
      const command = JoinEinsatzCommand.create(einsatzId, userId, newPersonId).value!;

      const existingTeilnehmer = mockTeilnehmerDto({ einsatzPersonId: 'person-abc' });

      mockRepository.existsEinsatzPerson.mockResolvedValue(true);
      mockRepository.findByEinsatzAndUser.mockResolvedValue(existingTeilnehmer);
      mockRepository.isPersonAlreadyLinked.mockResolvedValue(false);
      mockRepository.updateEinsatzPerson.mockResolvedValue(null);

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('EinsatzPerson konnte nicht aktualisiert werden');
      expect(mockLogger.error).toHaveBeenCalledWith(`Failed to update EinsatzPerson for User ${userId} in Einsatz ${einsatzId}`);
    });
  });

  describe('execute - Error Handling', () => {
    it('should return failure when repository.create throws error', async () => {
      // Given (Arrange)
      const einsatzId = 'einsatz-123';
      const userId = 'user-456';
      const einsatzPersonId = 'person-abc';
      const command = JoinEinsatzCommand.create(einsatzId, userId, einsatzPersonId).value!;

      mockRepository.existsEinsatzPerson.mockResolvedValue(true);
      mockRepository.findByEinsatzAndUser.mockResolvedValue(null);
      mockRepository.isPersonAlreadyLinked.mockResolvedValue(false);
      mockRepository.create.mockRejectedValue(new Error('Database connection error'));

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Einsatz-Beitritt fehlgeschlagen');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to join Einsatz: Database connection error');
    });
  });
});
