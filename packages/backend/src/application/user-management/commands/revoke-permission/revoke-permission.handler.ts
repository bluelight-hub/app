import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { IUserRepository } from '@domain/repositories/i-user.repository';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common';
import { Result } from '@domain/common/result';
import { OUTBOX_REPOSITORY, USER_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { UserId } from '@domain/value-objects/user-id';
import { Permission } from '@domain/value-objects/permission';
import { RevokePermissionCommand } from './revoke-permission.command';

/**
 * Handler fuer RevokePermissionCommand mit Transactional Outbox Pattern.
 *
 * Entzieht einem User eine Custom Permission und persistiert
 * das PermissionRevokedEvent atomar in der gleichen Transaktion.
 */
@CommandHandler(RevokePermissionCommand)
@Injectable()
export class RevokePermissionHandler extends TransactionalCommandHandler<RevokePermissionCommand, void> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(LOGGER) protected readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: RevokePermissionCommand, tx: TransactionContext): Promise<Result<void> | { result: undefined; events: DomainEvent[] }> {
    // Step 1: Validate User ID format
    const userIdResult = UserId.create(command.userId);
    if (userIdResult.isFailure || !userIdResult.value) {
      const error = userIdResult.error ?? 'Invalid User ID';
      this.logger.warn('User ID validation failed', { error, userId: command.userId, operation: 'revokePermission', phase: 'validation' });
      return Result.fail(error);
    }
    const userId = userIdResult.value;

    // Step 2: Validate RevokedBy ID format
    const revokedByResult = UserId.create(command.revokedBy);
    if (revokedByResult.isFailure || !revokedByResult.value) {
      const error = revokedByResult.error ?? 'Invalid RevokedBy ID';
      this.logger.warn('RevokedBy ID validation failed', { error, revokedBy: command.revokedBy, operation: 'revokePermission', phase: 'validation' });
      return Result.fail(error);
    }
    const revokedBy = revokedByResult.value;

    // Step 3: Validate Permission format
    const permissionResult = Permission.create(command.permission);
    if (permissionResult.isFailure || !permissionResult.value) {
      const error = permissionResult.error ?? 'Invalid Permission format';
      this.logger.warn('Permission validation failed', { error, permission: command.permission, operation: 'revokePermission', phase: 'validation' });
      return Result.fail(error);
    }
    const permission = permissionResult.value;

    // Step 4: Load User Aggregate
    const userResult = await this.userRepository.findById(userId, tx);
    if (userResult.isFailure) {
      const error = userResult.error ?? 'Failed to load user';
      this.logger.error('Failed to load user', { error, userId: userId.value, operation: 'revokePermission', phase: 'repository' });
      return Result.fail(error);
    }

    const user = userResult.value;
    if (!user) {
      this.logger.warn('User not found', { userId: userId.value, operation: 'revokePermission', phase: 'validation' });
      return Result.fail('User not found');
    }

    // Step 5: Revoke Permission
    const revokeResult = user.revokePermission(permission, revokedBy);
    if (revokeResult.isFailure) {
      const error = revokeResult.error ?? 'Failed to revoke permission';
      this.logger.warn('Permission revoke failed', { error, userId: userId.value, permission: command.permission, operation: 'revokePermission', phase: 'domain' });
      return Result.fail(error);
    }

    // Step 6: Save User Aggregate
    const saveResult = await this.userRepository.save(user, tx);
    if (saveResult.isFailure) {
      const error = saveResult.error ?? 'Failed to save user';
      this.logger.error('Failed to save user after permission revoke', { error, userId: userId.value, operation: 'revokePermission', phase: 'persistence' });
      return Result.fail(error);
    }

    // Step 7: Extract Domain Events for Outbox
    const events = user.getDomainEvents();

    this.logger.log('Permission revoked successfully', {
      userId: userId.value,
      permission: command.permission,
      revokedBy: revokedBy.value,
      eventCount: events.length,
    });

    return { result: undefined, events };
  }
}
