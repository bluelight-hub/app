import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Result } from '@domain/common/result';
import type { IUserRepository } from '@domain/repositories/i-user.repository';
import { UserId } from '@domain/value-objects/user-id';
import { USER_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { GetUserPermissionsQuery } from './get-user-permissions.query';

/**
 * Query Handler fuer GetUserPermissionsQuery.
 *
 * Laedt die Custom Permissions eines Users und gibt sie als String-Array zurueck.
 */
@QueryHandler(GetUserPermissionsQuery)
@Injectable()
export class GetUserPermissionsQueryHandler implements IQueryHandler<GetUserPermissionsQuery, Result<string[]>> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: IUserRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async execute(query: GetUserPermissionsQuery): Promise<Result<string[]>> {
    try {
      const userIdResult = UserId.create(query.userId);
      if (userIdResult.isFailure || !userIdResult.value) {
        return Result.fail(userIdResult.error ?? 'Ungueltige userId');
      }
      const userId = userIdResult.value;

      const repoResult = await this.repository.findById(userId);
      if (repoResult.isFailure) {
        return Result.fail(repoResult.error ?? 'Repository-Fehler');
      }

      if (!repoResult.value) {
        return Result.fail('User not found');
      }

      const user = repoResult.value;
      const permissions = user.permissions.map((p) => p.value);

      return Result.ok<string[]>(permissions);
    } catch (error) {
      this.logger.error(`Unexpected error loading permissions for user ${query.userId}`, error instanceof Error ? error.stack : String(error));
      return Result.fail(`Unerwarteter Fehler: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
