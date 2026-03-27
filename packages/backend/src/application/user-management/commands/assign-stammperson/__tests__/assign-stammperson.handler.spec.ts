// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { AssignStammpersonHandler } from '../assign-stammperson.handler';
import { AssignStammpersonCommand } from '../assign-stammperson.command';
import { Result } from '@domain/common/result';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { OUTBOX_REPOSITORY } from '@/infrastructure/di-tokens';
import { StammpersonAssignedEvent } from '@domain/events/stammperson-assigned.event';

/**
 * Unit Tests für AssignStammpersonHandler.
 *
 * **Test-Strategie:**
 * - NestJS TestingModule mit gemocktem PrismaService und OutboxRepository
 * - $transaction wird so gemockt, dass der Callback mit einem TX-Mock ausgeführt wird
 * - Fokus: Handler-Orchestrierung, Validierung, Event-Erstellung
 */
describe('AssignStammpersonHandler', () => {
  let handler: AssignStammpersonHandler;
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
  let mockUserModel: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  let mockStammPersonModel: {
    findUnique: jest.Mock;
  };

  beforeEach(async () => {
    mockUserModel = {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    };

    mockStammPersonModel = {
      findUnique: jest.fn(),
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
        const txMock = {
          user: mockUserModel,
          stammPerson: mockStammPersonModel,
        };
        return callback(txMock);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AssignStammpersonHandler, { provide: PrismaService, useValue: mockPrismaService }, { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository }],
    }).compile();

    handler = module.get<AssignStammpersonHandler>(AssignStammpersonHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('sollte Stammperson erfolgreich zuweisen', async () => {
      // Arrange
      mockUserModel.findUnique.mockResolvedValue({
        id: 'user-123',
        stammpersonId: null,
      });
      mockStammPersonModel.findUnique.mockResolvedValue({
        id: 'stammperson-456',
      });
      mockUserModel.findFirst.mockResolvedValue(null);
      mockUserModel.update.mockResolvedValue({
        id: 'user-123',
        stammpersonId: 'stammperson-456',
      });

      const command = AssignStammpersonCommand.create({
        userId: 'user-123',
        stammpersonId: 'stammperson-456',
        assignedBy: 'admin-789',
      }).value!;

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe('user-123');
      expect(mockUserModel.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { stammpersonId: 'stammperson-456' },
      });

      // Prüfe Event
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);
      const savedEvents = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(savedEvents.length).toBe(1);
      expect(savedEvents[0]).toBeInstanceOf(StammpersonAssignedEvent);
      expect(savedEvents[0].userId).toBe('user-123');
      expect(savedEvents[0].stammpersonId).toBe('stammperson-456');
      expect(savedEvents[0].assignedBy).toBe('admin-789');
    });

    it('sollte Stammperson-Zuweisung entfernen ohne Event', async () => {
      // Arrange
      mockUserModel.findUnique.mockResolvedValue({
        id: 'user-123',
        stammpersonId: 'stammperson-456',
      });
      mockUserModel.update.mockResolvedValue({
        id: 'user-123',
        stammpersonId: null,
      });

      const command = AssignStammpersonCommand.create({
        userId: 'user-123',
        stammpersonId: null,
        assignedBy: 'admin-789',
      }).value!;

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe('user-123');
      expect(mockUserModel.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { stammpersonId: null },
      });
      // Kein Event bei Entfernung — Outbox wird mit leerem Array aufgerufen
      // TransactionalCommandHandler ruft save nur bei events.length > 0 auf
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail zurückgeben wenn User nicht gefunden wird', async () => {
      // Arrange
      mockUserModel.findUnique.mockResolvedValue(null);

      const command = AssignStammpersonCommand.create({
        userId: 'non-existent',
        stammpersonId: 'stammperson-456',
        assignedBy: 'admin-789',
      }).value!;

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('User mit ID non-existent nicht gefunden');
      expect(mockUserModel.update).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail zurückgeben wenn Stammperson nicht existiert', async () => {
      // Arrange
      mockUserModel.findUnique.mockResolvedValue({
        id: 'user-123',
        stammpersonId: null,
      });
      mockStammPersonModel.findUnique.mockResolvedValue(null);

      const command = AssignStammpersonCommand.create({
        userId: 'user-123',
        stammpersonId: 'non-existent-stammperson',
        assignedBy: 'admin-789',
      }).value!;

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('Stammperson mit ID non-existent-stammperson nicht gefunden');
      expect(mockUserModel.update).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail zurückgeben wenn Stammperson bereits einem anderen User zugewiesen ist', async () => {
      // Arrange
      mockUserModel.findUnique.mockResolvedValue({
        id: 'user-123',
        stammpersonId: null,
      });
      mockStammPersonModel.findUnique.mockResolvedValue({
        id: 'stammperson-456',
      });
      mockUserModel.findFirst.mockResolvedValue({
        id: 'other-user-999',
      });

      const command = AssignStammpersonCommand.create({
        userId: 'user-123',
        stammpersonId: 'stammperson-456',
        assignedBy: 'admin-789',
      }).value!;

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('bereits einem anderen User zugewiesen');
      expect(mockUserModel.update).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Command Validation', () => {
    it('sollte Result.fail bei leerem userId zurückgeben', () => {
      // Act
      const result = AssignStammpersonCommand.create({
        userId: '',
        stammpersonId: 'stammperson-456',
        assignedBy: 'admin-789',
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('userId ist erforderlich');
    });

    it('sollte Result.fail bei leerem assignedBy zurückgeben', () => {
      // Act
      const result = AssignStammpersonCommand.create({
        userId: 'user-123',
        stammpersonId: 'stammperson-456',
        assignedBy: '',
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('assignedBy ist erforderlich');
    });

    it('sollte Command mit null stammpersonId erstellen', () => {
      // Act
      const result = AssignStammpersonCommand.create({
        userId: 'user-123',
        stammpersonId: null,
        assignedBy: 'admin-789',
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value!.stammpersonId).toBeNull();
    });

    it('sollte Command erfolgreich erstellen mit gültigen Daten', () => {
      // Act
      const result = AssignStammpersonCommand.create({
        userId: 'user-123',
        stammpersonId: 'stammperson-456',
        assignedBy: 'admin-789',
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value!.userId).toBe('user-123');
      expect(result.value!.stammpersonId).toBe('stammperson-456');
      expect(result.value!.assignedBy).toBe('admin-789');
    });
  });

  describe('Transaction Behavior', () => {
    it('sollte prisma.$transaction() einmal aufrufen', async () => {
      // Arrange
      mockUserModel.findUnique.mockResolvedValue({
        id: 'user-123',
        stammpersonId: null,
      });
      mockStammPersonModel.findUnique.mockResolvedValue({
        id: 'stammperson-456',
      });
      mockUserModel.findFirst.mockResolvedValue(null);
      mockUserModel.update.mockResolvedValue({
        id: 'user-123',
        stammpersonId: 'stammperson-456',
      });

      const command = AssignStammpersonCommand.create({
        userId: 'user-123',
        stammpersonId: 'stammperson-456',
        assignedBy: 'admin-789',
      }).value!;

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte Event innerhalb der gleichen Transaction speichern', async () => {
      // Arrange
      const txMarker = { user: mockUserModel, stammPerson: mockStammPersonModel, txId: 'same-tx' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));
      mockUserModel.findUnique.mockResolvedValue({
        id: 'user-123',
        stammpersonId: null,
      });
      mockStammPersonModel.findUnique.mockResolvedValue({
        id: 'stammperson-456',
      });
      mockUserModel.findFirst.mockResolvedValue(null);
      mockUserModel.update.mockResolvedValue({
        id: 'user-123',
        stammpersonId: 'stammperson-456',
      });

      const command = AssignStammpersonCommand.create({
        userId: 'user-123',
        stammpersonId: 'stammperson-456',
        assignedBy: 'admin-789',
      }).value!;

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      const outboxTxContext = mockOutboxRepository.save.mock.calls[0]?.[1]!;
      expect(outboxTxContext).toBe(txMarker);
    });
  });
});
