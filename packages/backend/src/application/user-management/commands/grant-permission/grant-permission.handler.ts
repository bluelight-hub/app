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
import { GrantPermissionCommand } from './grant-permission.command';

/**
 * Handler fuer GrantPermissionCommand mit Transactional Outbox Pattern.
 *
 * Gewaehrt einem User eine Custom Permission und persistiert
 * das PermissionGrantedEvent atomar in der gleichen Transaktion.
 */
@CommandHandler(GrantPermissionCommand)
@Injectable()
export class GrantPermissionHandler extends TransactionalCommandHandler<GrantPermissionCommand, void> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(LOGGER) protected readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: GrantPermissionCommand, tx: TransactionContext): Promise<Result<void> | { result: undefined; events: DomainEvent[] }> {
    // Step 1: Validate User ID format
    const userIdResult = UserId.create(command.userId);
    if (userIdResult.isFailure || !userIdResult.value) {
      const error = userIdResult.error ?? 'Invalid User ID';
      this.logger.warn('User ID validation failed', { error, userId: command.userId, operation: 'grantPermission', phase: 'validation' });
      return Result.fail(error);
    }
    const userId = userIdResult.value;

    // Step 2: Validate GrantedBy ID format
    const grantedByResult = UserId.create(command.grantedBy);
    if (grantedByResult.isFailure || !grantedByResult.value) {
      const error = grantedByResult.error ?? 'Invalid GrantedBy ID';
      this.logger.warn('GrantedBy ID validation failed', { error, grantedBy: command.grantedBy, operation: 'grantPermission', phase: 'validation' });
      return Result.fail(error);
    }
    const grantedBy = grantedByResult.value;

    // Step 3: Validate Permission format
    const permissionResult = Permission.create(command.permission);
    if (permissionResult.isFailure || !permissionResult.value) {
      const error = permissionResult.error ?? 'Invalid Permission format';
      this.logger.warn('Permission validation failed', { error, permission: command.permission, operation: 'grantPermission', phase: 'validation' });
      return Result.fail(error);
    }
    const permission = permissionResult.value;

    // Step 4: Load User Aggregate
    const userResult = await this.userRepository.findById(userId, tx);
    if (userResult.isFailure) {
      const error = userResult.error ?? 'Failed to load user';
      this.logger.error('Failed to load user', { error, userId: userId.value, operation: 'grantPermission', phase: 'repository' });
      return Result.fail(error);
    }

    const user = userResult.value;
    if (!user) {
      this.logger.warn('User not found', { userId: userId.value, operation: 'grantPermission', phase: 'validation' });
      return Result.fail('User not found');
    }

    // Step 5: Grant Permission (Aggregate enforces idempotency)
    const grantResult = user.grantPermission(permission, grantedBy);
    if (grantResult.isFailure) {
      const error = grantResult.error ?? 'Failed to grant permission';
      this.logger.warn('Permission grant failed', { error, userId: userId.value, permission: command.permission, operation: 'grantPermission', phase: 'domain' });
      return Result.fail(error);
    }

    // Step 6: Save User Aggregate
    const saveResult = await this.userRepository.save(user, tx);
    if (saveResult.isFailure) {
      const error = saveResult.error ?? 'Failed to save user';
      this.logger.error('Failed to save user after permission grant', { error, userId: userId.value, operation: 'grantPermission', phase: 'persistence' });
      return Result.fail(error);
    }

    // Step 7: Extract Domain Events for Outbox
    const events = user.getDomainEvents();

    this.logger.log('Permission granted successfully', {
      userId: userId.value,
      permission: command.permission,
      grantedBy: grantedBy.value,
      eventCount: events.length,
    });

    return { result: undefined, events };
  }
}
