import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Result } from '@domain/common/result';
// biome-ignore lint/style/useImportType: IFahrzeugtypRepository needed for DI at runtime
import { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import type { FahrzeugtypDto } from '../../dto/fahrzeugtyp.dto';
import { FahrzeugtypQueryMapper } from '../fahrzeugtyp-query.mapper';
import type { GetAllFahrzeugtypenQuery } from './get-all-fahrzeugtypen.query';

/**
 * Handler für GetAllFahrzeugtypenQuery.
 *
 * Lädt alle Fahrzeugtypen mit optionalem istAktiv-Filter.
 *
 * **Sortierung (Task 9):**
 * Repository sortiert nach: sortOrder ASC, code ASC
 */
@Injectable()
export class GetAllFahrzeugtypenHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.FAHRZEUGTYP)
    private readonly repository: IFahrzeugtypRepository,
    @Inject(LOGGER)
    protected readonly logger: ILogger,
  ) {}

  /**
   * Führt die Query aus.
   */
  async execute(query: GetAllFahrzeugtypenQuery): Promise<Result<FahrzeugtypDto[]>> {
    const filter = query.istAktiv !== undefined ? { istAktiv: query.istAktiv } : undefined;
    const repoResult = await this.repository.findAll(filter);

    if (repoResult.isFailure) {
      if (!repoResult.error) {
        this.logger.error('Repository.findAll returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail<FahrzeugtypDto[]>(repoResult.error);
    }

    const dtos = (repoResult.value ?? []).map(FahrzeugtypQueryMapper.toDto);
    return Result.ok<FahrzeugtypDto[]>(dtos);
  }
}
