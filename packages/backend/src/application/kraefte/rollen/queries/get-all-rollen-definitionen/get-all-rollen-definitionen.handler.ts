import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Result } from '@domain/common/result';
// biome-ignore lint/style/useImportType: IRollenDefinitionRepository needed for DI at runtime
import { IRollenDefinitionRepository } from '@domain/kraefte/repositories/i-rollen-definition.repository';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import type { RollenDefinitionDto } from '../../dto/rollen-definition.dto';
import { RollenDefinitionQueryMapper } from '../rollen-definition-query.mapper';
import type { GetAllRollenDefinitionenQuery } from './get-all-rollen-definitionen.query';

/**
 * Handler für GetAllRollenDefinitionenQuery.
 *
 * Lädt alle RollenDefinitionen mit optionalem istAktiv-Filter und mappt sie zu DTOs.
 *
 * **Pattern:** Folgt dem Qualifikation Query Handler Blueprint.
 * - Repository gibt Aggregates zurück
 * - Handler mappt Aggregates zu DTOs via RollenDefinitionQueryMapper
 * - Controller bekommt fertige DTOs
 */
@Injectable()
export class GetAllRollenDefinitionenQueryHandler {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION)
    private readonly repository: IRollenDefinitionRepository,
  ) {}

  /**
   * Führt die Query aus und lädt alle RollenDefinitionen.
   *
   * @param query - Die Query mit optionalem Filter
   * @returns Array von RollenDefinitionDto (leer wenn keine gefunden), oder Fehler
   */
  async execute(query: GetAllRollenDefinitionenQuery): Promise<Result<RollenDefinitionDto[]>> {
    const repoResult = await this.repository.findAll(query.filter);

    if (repoResult.isFailure) {
      if (!repoResult.error) {
        this.logger.error('Repository.findAll returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail<RollenDefinitionDto[]>(repoResult.error);
    }

    const dtos = (repoResult.value ?? []).map(RollenDefinitionQueryMapper.toDto);
    return Result.ok<RollenDefinitionDto[]>(dtos);
  }
}
