// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { UpdateUserHandler } from '../update-user.handler';
import { UpdateUserCommand } from '../update-user.command';
import { Result } from '@domain/common/result';
import { UserRole } from '@domain/value-objects/user-role';
import { UserAggregate } from '@domain/aggregates/user.aggregate';
import { Username } from '@domain/value-objects/username';
import { UserId } from '@domain/value-objects/user-id';
import { OperativeRoleChangedEvent } from '@domain/events/operative-role-changed.event';
import { UserRoleChangedEvent } from '@domain/events/user-role-changed.event';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { OUTBOX_REPOSITORY, USER_REPOSITORY } from '@/infrastructure/di-tokens';

/**
 * Unit Tests für UpdateUserHandler.
 *
 * Fokus: Admin-Rollen-Upgrade auf operativeRole=FUEHRUNGSKRAFT beim Role-Wechsel,
 * mit Schutz bestehender EINSATZKRAFT-Zuweisungen.
 */
describe('UpdateUserHandler', () => {
  let handler: UpdateUserHandler;
  let mockUserRepository: {
    findById: jest.Mock;
    save: jest.Mock;
    countSuperAdmins: jest.Mock;
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
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  let mockPrismaService: { $transaction: jest.Mock };

  const updatedBy = UserId.create().value!.value;

  function buildUserAggregate(role = UserRole.USER()): UserAggregate {
    const username = Username.create('existing_user').value!;
    const agg = UserAggregate.create(username, role).value!;
    agg.clearDomainEvents();
    return agg;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    mockUserRepository = {
      findById: jest.fn(),
      // Echter prisma-user.repository.save() ruft clearDomainEvents() auf — simulieren.
      save: jest.fn().mockImplementation(async (aggregate: UserAggregate) => {
        aggregate.clearDomainEvents();
        return Result.ok(undefined);
      }),
      countSuperAdmins: jest.fn().mockResolvedValue(Result.ok(2)),
      existsByUsername: jest.fn().mockResolvedValue(Result.ok(false)),
    };

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findPendingEvents: jest.fn(),
      markAsPublished: jest.fn(),
      markAsFailed: jest.fn(),
      getRetryCount: jest.fn(),
    };

    mockUserModel = {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'updated' }),
    };

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txMock = { user: mockUserModel };
        return callback(txMock);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
      ],
    }).compile();

    handler = module.get<UpdateUserHandler>(UpdateUserHandler);
  });

  describe('Role-Upgrade auf Admin-Rolle', () => {
    it('setzt operativeRole von EXTERNE auf FUEHRUNGSKRAFT bei Upgrade zu ADMIN', async () => {
      // Given
      const user = buildUserAggregate(UserRole.USER());
      mockUserRepository.findById.mockResolvedValue(Result.ok(user));
      mockUserModel.findUnique.mockResolvedValue({ operativeRole: 'EXTERNE' });

      const command = UpdateUserCommand.create(user.id.value, updatedBy, undefined, 'ADMIN').value!;

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
      // UserRoleChangedEvent vom Aggregate darf durch save()→clearDomainEvents() nicht verloren gehen.
      expect(savedEvents.some((e: unknown) => e instanceof UserRoleChangedEvent)).toBe(true);

      const opRoleEvent = savedEvents.find((e: unknown) => e instanceof OperativeRoleChangedEvent);
      expect(opRoleEvent).toBeDefined();
      expect(opRoleEvent.oldRole).toBe('EXTERNE');
      expect(opRoleEvent.newRole).toBe('FUEHRUNGSKRAFT');
      expect(opRoleEvent.changedBy).toBe(updatedBy);
    });

    it('überschreibt bestehende EINSATZKRAFT-Zuweisung NICHT (Advisor-Warnung)', async () => {
      // Given: User ist bereits EINSATZKRAFT und wird zu ADMIN hochgestuft
      const user = buildUserAggregate(UserRole.USER());
      mockUserRepository.findById.mockResolvedValue(Result.ok(user));
      mockUserModel.findUnique.mockResolvedValue({ operativeRole: 'EINSATZKRAFT' });

      const command = UpdateUserCommand.create(user.id.value, updatedBy, undefined, 'ADMIN').value!;

      // When
      const result = await handler.execute(command);

      // Then: kein operativeRole-Update, kein OperativeRoleChangedEvent
      expect(result.isSuccess).toBe(true);
      expect(mockUserModel.update).not.toHaveBeenCalled();

      const savedEvents = mockOutboxRepository.save.mock.calls[0]?.[0] ?? [];
      expect(savedEvents.every((e: unknown) => !(e instanceof OperativeRoleChangedEvent))).toBe(true);
    });

    it('setzt operativeRole auf FUEHRUNGSKRAFT auch bei Upgrade zu SUPER_ADMIN', async () => {
      // Given
      const user = buildUserAggregate(UserRole.ADMIN());
      mockUserRepository.findById.mockResolvedValue(Result.ok(user));
      mockUserModel.findUnique.mockResolvedValue({ operativeRole: 'EXTERNE' });

      const command = UpdateUserCommand.create(user.id.value, updatedBy, undefined, 'SUPER_ADMIN').value!;

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

    it('setzt operativeRole NICHT bei Downgrade zu USER', async () => {
      // Given
      const user = buildUserAggregate(UserRole.ADMIN());
      mockUserRepository.findById.mockResolvedValue(Result.ok(user));

      const command = UpdateUserCommand.create(user.id.value, updatedBy, undefined, 'USER').value!;

      // When
      const result = await handler.execute(command);

      // Then: keine operativeRole-Änderung
      expect(result.isSuccess).toBe(true);
      expect(mockUserModel.update).not.toHaveBeenCalled();
    });

    it('lässt bestehende FUEHRUNGSKRAFT-Zuweisung unberührt (idempotent, kein Event-Rauschen)', async () => {
      // Given: User ist bereits FUEHRUNGSKRAFT (z.B. bei erneutem Admin-Patch)
      const user = buildUserAggregate(UserRole.USER());
      mockUserRepository.findById.mockResolvedValue(Result.ok(user));
      mockUserModel.findUnique.mockResolvedValue({ operativeRole: 'FUEHRUNGSKRAFT' });

      const command = UpdateUserCommand.create(user.id.value, updatedBy, undefined, 'ADMIN').value!;

      // When
      const result = await handler.execute(command);

      // Then: kein Update nötig, kein zusätzliches OperativeRoleChangedEvent
      expect(result.isSuccess).toBe(true);
      expect(mockUserModel.update).not.toHaveBeenCalled();

      const savedEvents = mockOutboxRepository.save.mock.calls[0]?.[0] ?? [];
      expect(savedEvents.every((e: unknown) => !(e instanceof OperativeRoleChangedEvent))).toBe(true);
    });

    it('setzt operativeRole NICHT, wenn nur Username geändert wird', async () => {
      // Given
      const user = buildUserAggregate(UserRole.ADMIN());
      mockUserRepository.findById.mockResolvedValue(Result.ok(user));

      const command = UpdateUserCommand.create(user.id.value, updatedBy, 'neuer_name', undefined).value!;

      // When
      const result = await handler.execute(command);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(mockUserModel.update).not.toHaveBeenCalled();
    });
  });
});
