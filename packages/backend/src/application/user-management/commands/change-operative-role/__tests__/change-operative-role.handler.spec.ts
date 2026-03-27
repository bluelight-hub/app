// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { ChangeOperativeRoleHandler } from '../change-operative-role.handler';
import { ChangeOperativeRoleCommand } from '../change-operative-role.command';
import { Result } from '@domain/common/result';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { OUTBOX_REPOSITORY } from '@/infrastructure/di-tokens';
import { OperativeRoleChangedEvent } from '@domain/events/operative-role-changed.event';

/**
 * Unit Tests für ChangeOperativeRoleHandler.
 *
 * **Test-Strategie:**
 * - NestJS TestingModule mit gemocktem PrismaService und OutboxRepository
 * - $transaction wird so gemockt, dass der Callback mit einem TX-Mock ausgeführt wird
 * - Fokus: Handler-Orchestrierung, Validierung, Event-Erstellung
 */
describe('ChangeOperativeRoleHandler', () => {
  let handler: ChangeOperativeRoleHandler;
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
    update: jest.Mock;
  };

  beforeEach(async () => {
    mockUserModel = {
      findUnique: jest.fn(),
      update: jest.fn(),
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
        const txMock = { user: mockUserModel };
        return callback(txMock);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ChangeOperativeRoleHandler, { provide: PrismaService, useValue: mockPrismaService }, { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository }],
    }).compile();

    handler = module.get<ChangeOperativeRoleHandler>(ChangeOperativeRoleHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('sollte die operative Rolle erfolgreich ändern', async () => {
      // Arrange
      mockUserModel.findUnique.mockResolvedValue({
        id: 'user-123',
        operativeRole: 'EXTERNE',
      });
      mockUserModel.update.mockResolvedValue({
        id: 'user-123',
        operativeRole: 'FUEHRUNGSKRAFT',
      });

      const command = ChangeOperativeRoleCommand.create({
        userId: 'user-123',
        newRole: 'FUEHRUNGSKRAFT',
        changedBy: 'admin-456',
      }).value!;

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe('user-123');
      expect(mockUserModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { id: true, operativeRole: true },
      });
      expect(mockUserModel.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { operativeRole: 'FUEHRUNGSKRAFT' },
      });
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      // Prüfe Event
      const savedEvents = mockOutboxRepository.save.mock.calls[0]?.[0]!;
      expect(savedEvents.length).toBe(1);
      expect(savedEvents[0]).toBeInstanceOf(OperativeRoleChangedEvent);
      expect(savedEvents[0].userId).toBe('user-123');
      expect(savedEvents[0].oldRole).toBe('EXTERNE');
      expect(savedEvents[0].newRole).toBe('FUEHRUNGSKRAFT');
      expect(savedEvents[0].changedBy).toBe('admin-456');
    });

    it('sollte Result.fail zurückgeben wenn User nicht gefunden wird', async () => {
      // Arrange
      mockUserModel.findUnique.mockResolvedValue(null);

      const command = ChangeOperativeRoleCommand.create({
        userId: 'non-existent',
        newRole: 'FUEHRUNGSKRAFT',
        changedBy: 'admin-456',
      }).value!;

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('nicht gefunden');
      expect(mockUserModel.update).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Result.fail zurückgeben wenn gleiche Rolle zugewiesen wird', async () => {
      // Arrange
      mockUserModel.findUnique.mockResolvedValue({
        id: 'user-123',
        operativeRole: 'FUEHRUNGSKRAFT',
      });

      const command = ChangeOperativeRoleCommand.create({
        userId: 'user-123',
        newRole: 'FUEHRUNGSKRAFT',
        changedBy: 'admin-456',
      }).value!;

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(false);
      expect(result.error).toContain('bereits die Rolle');
      expect(mockUserModel.update).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Command Validation', () => {
    it('sollte Result.fail bei ungültigem Rollenwert zurückgeben', () => {
      // Act
      const result = ChangeOperativeRoleCommand.create({
        userId: 'user-123',
        newRole: 'UNGUELTIG',
        changedBy: 'admin-456',
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungültige operative Rolle');
    });

    it('sollte Result.fail bei leerem userId zurückgeben', () => {
      // Act
      const result = ChangeOperativeRoleCommand.create({
        userId: '',
        newRole: 'FUEHRUNGSKRAFT',
        changedBy: 'admin-456',
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('userId ist erforderlich');
    });

    it('sollte Result.fail bei leerem changedBy zurückgeben', () => {
      // Act
      const result = ChangeOperativeRoleCommand.create({
        userId: 'user-123',
        newRole: 'FUEHRUNGSKRAFT',
        changedBy: '',
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('changedBy ist erforderlich');
    });

    it('sollte Command erfolgreich erstellen mit gültigen Daten', () => {
      // Act
      const result = ChangeOperativeRoleCommand.create({
        userId: 'user-123',
        newRole: 'EINSATZKRAFT',
        changedBy: 'admin-456',
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value!.userId).toBe('user-123');
      expect(result.value!.newRole).toBe('EINSATZKRAFT');
      expect(result.value!.changedBy).toBe('admin-456');
    });
  });

  describe('Transaction Behavior', () => {
    it('sollte prisma.$transaction() einmal aufrufen', async () => {
      // Arrange
      mockUserModel.findUnique.mockResolvedValue({
        id: 'user-123',
        operativeRole: 'EXTERNE',
      });
      mockUserModel.update.mockResolvedValue({
        id: 'user-123',
        operativeRole: 'EINSATZKRAFT',
      });

      const command = ChangeOperativeRoleCommand.create({
        userId: 'user-123',
        newRole: 'EINSATZKRAFT',
        changedBy: 'admin-456',
      }).value!;

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte Event innerhalb der gleichen Transaction speichern', async () => {
      // Arrange
      const txMarker = { user: mockUserModel, txId: 'same-tx' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => callback(txMarker));
      mockUserModel.findUnique.mockResolvedValue({
        id: 'user-123',
        operativeRole: 'EXTERNE',
      });
      mockUserModel.update.mockResolvedValue({
        id: 'user-123',
        operativeRole: 'FUEHRUNGSKRAFT',
      });

      const command = ChangeOperativeRoleCommand.create({
        userId: 'user-123',
        newRole: 'FUEHRUNGSKRAFT',
        changedBy: 'admin-456',
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
