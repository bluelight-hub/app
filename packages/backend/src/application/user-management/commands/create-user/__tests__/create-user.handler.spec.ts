// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { CreateUserHandler } from '../create-user.handler';
import { CreateUserCommand } from '../create-user.command';
import { Result } from '@domain/common/result';
import { UserRole } from '@domain/value-objects/user-role';
import { UserAggregate } from '@domain/aggregates/user.aggregate';
import { UserCreatedEvent } from '@domain/events/user-created.event';
import { OperativeRoleChangedEvent } from '@domain/events/operative-role-changed.event';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { USER_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import { UserId } from '@domain/value-objects/user-id';

/**
 * Unit Tests für CreateUserHandler.
 *
 * Fokus: Admin-Rollen-Upgrade auf operativeRole=FUEHRUNGSKRAFT bei Erstellung.
 */
describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let mockUserRepository: {
    findByUsername: jest.Mock;
    findAll: jest.Mock;
    save: jest.Mock;
    countSuperAdmins: jest.Mock;
    findById: jest.Mock;
    existsByUsername: jest.Mock;
  };
  let mockOutboxRepository: {
    save: jest.Mock;
    findPendingEvents: jest.Mock;
    markAsPublished: jest.Mock;
    markAsFailed: jest.Mock;
    getRetryCount: jest.Mock;
  };
  let mockUserModel: {
    update: jest.Mock;
  };
  let mockPrismaService: { $transaction: jest.Mock };
  let mockLogger: { log: jest.Mock; error: jest.Mock; warn: jest.Mock; debug: jest.Mock };
  const createdBy = UserId.create().value!.value;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockUserRepository = {
      findByUsername: jest.fn().mockResolvedValue(Result.ok(null)),
      findAll: jest.fn().mockResolvedValue(Result.ok([{ id: 'existing' }])), // nicht der erste User
      // Echter prisma-user.repository.save() ruft clearDomainEvents() auf — simulieren.
      save: jest.fn().mockImplementation(async (aggregate: UserAggregate) => {
        aggregate.clearDomainEvents();
        return Result.ok(undefined);
      }),
      countSuperAdmins: jest.fn().mockResolvedValue(Result.ok(2)),
      findById: jest.fn(),
      existsByUsername: jest.fn(),
    };

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findPendingEvents: jest.fn(),
      markAsPublished: jest.fn(),
      markAsFailed: jest.fn(),
      getRetryCount: jest.fn(),
    };

    mockUserModel = {
      update: jest.fn().mockResolvedValue({ id: 'updated' }),
    };

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = { user: mockUserModel };
        return callback(txMock);
      }),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<CreateUserHandler>(CreateUserHandler);
  });

  describe('Admin-Rolle → operativeRole FUEHRUNGSKRAFT', () => {
    it('setzt operativeRole=FUEHRUNGSKRAFT für ADMIN-User und emittiert UserCreatedEvent + OperativeRoleChangedEvent', async () => {
      // Given
      const command = CreateUserCommand.create('neuer_admin', createdBy, UserRole.ADMIN()).value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockUserModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { operativeRole: 'FUEHRUNGSKRAFT' },
        }),
      );

      const savedEvents = mockOutboxRepository.save.mock.calls[0]?.[0] ?? [];
      // Beide Events müssen persistiert werden — UserCreatedEvent darf durch
      // save()→clearDomainEvents() nicht verloren gehen.
      expect(savedEvents.some((e: unknown) => e instanceof UserCreatedEvent)).toBe(true);

      const opRoleEvent = savedEvents.find((e: unknown) => e instanceof OperativeRoleChangedEvent);
      expect(opRoleEvent).toBeDefined();
      expect(opRoleEvent.oldRole).toBe('EXTERNE');
      expect(opRoleEvent.newRole).toBe('FUEHRUNGSKRAFT');
      expect(opRoleEvent.changedBy).toBe(createdBy);
    });

    it('setzt operativeRole=FUEHRUNGSKRAFT auch für SUPER_ADMIN-User', async () => {
      // Given
      const command = CreateUserCommand.create('root_admin', createdBy, UserRole.SUPER_ADMIN()).value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockUserModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { operativeRole: 'FUEHRUNGSKRAFT' },
        }),
      );

      const savedEvents = mockOutboxRepository.save.mock.calls[0]?.[0] ?? [];
      expect(savedEvents.some((e: unknown) => e instanceof OperativeRoleChangedEvent)).toBe(true);
    });

    it('lässt operativeRole für USER-Rolle unberührt (Prisma-Default EXTERNE greift)', async () => {
      // Given
      const command = CreateUserCommand.create('normaler_user', createdBy, UserRole.USER()).value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockUserModel.update).not.toHaveBeenCalled();

      const savedEvents = mockOutboxRepository.save.mock.calls[0]?.[0] ?? [];
      expect(savedEvents.some((e: unknown) => e instanceof UserCreatedEvent)).toBe(true);
      expect(savedEvents.every((e: unknown) => !(e instanceof OperativeRoleChangedEvent))).toBe(true);
    });

    it('promoted den ersten User zu FUEHRUNGSKRAFT (wird automatisch SUPER_ADMIN)', async () => {
      // Given: keine existierenden User → erster User Bootstrap-Pfad
      mockUserRepository.findAll.mockResolvedValue(Result.ok([]));
      const command = CreateUserCommand.create('erster_user', createdBy).value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockUserModel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { operativeRole: 'FUEHRUNGSKRAFT' },
        }),
      );
    });
  });
});
