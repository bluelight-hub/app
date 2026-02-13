import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Result } from '@domain/common/result';
import { IRollenDefinitionRepository } from '@domain/kraefte/repositories/i-rollen-definition.repository';
import { RolleId } from '@domain/kraefte/value-objects/rolle-id';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import type { RollenDefinitionDto } from '../../dto/rollen-definition.dto';
import { RollenDefinitionQueryMapper } from '../rollen-definition-query.mapper';
import type { GetRollenDefinitionByIdQuery } from './get-rollen-definition-by-id.query';

/**
 * Handler für GetRollenDefinitionByIdQuery.
 *
 * Lädt eine RollenDefinition nach ID und mappt sie zu einem DTO.
 *
 * **Pattern:** Folgt dem Qualifikation Query Handler Blueprint.
 * - Repository gibt Aggregate zurück
 * - Handler mappt Aggregate zu DTO via RollenDefinitionQueryMapper
 * - Controller bekommt fertiges DTO
 *
 * **Null-Handling:** null ist valide Response (nicht gefunden) - KEIN Fehler!
 * Controller kann dann 404 NOT FOUND zurückgeben.
 */
@Injectable()
export class GetRollenDefinitionByIdQueryHandler {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION)
    private readonly repository: IRollenDefinitionRepository,
  ) {}

  /**
   * Führt die Query aus und lädt die RollenDefinition für eine ID.
   *
   * @param query - Die Query mit der RollenDefinition-ID
   * @returns RollenDefinitionDto oder null (wenn nicht gefunden), oder Fehler
   */
  async execute(query: GetRollenDefinitionByIdQuery): Promise<Result<RollenDefinitionDto | null>> {
    // Step 1: Validate ID via Value Object
    const idResult = RolleId.create(query.id);
    if (idResult.isFailure) {
      return Result.fail(idResult.error ?? 'Invalid RollenDefinition ID');
    }

    const id = idResult.value;
    if (!id) {
      return Result.fail('Invalid RollenDefinition ID result');
    }

    // Step 2: Load Aggregate from Repository
    const repoResult = await this.repository.findById(id);

    if (repoResult.isFailure) {
      if (!repoResult.error) {
        this.logger.error('Repository.findById returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail<RollenDefinitionDto | null>(repoResult.error);
    }

    // Step 3: Map to DTO (null is valid - means not found)
    const aggregate = repoResult.value;
    if (!aggregate) {
      return Result.ok<RollenDefinitionDto | null>(null);
    }

    const dto = RollenDefinitionQueryMapper.toDto(aggregate);
    return Result.ok<RollenDefinitionDto | null>(dto);
  }
}
