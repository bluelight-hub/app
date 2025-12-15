import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@domain/common/result';
// biome-ignore lint/style/useImportType: IQualifikationRepository needed for DI at runtime
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import type { QualifikationDto } from '../../dto/qualifikation.dto';
import { QualifikationQueryMapper } from '../qualifikation-query.mapper';
import type { GetAllQualifikationenQuery } from './get-all-qualifikationen.query';

/**
 * Handler für GetAllQualifikationenQuery.
 *
 * Lädt alle Qualifikationen mit optionalem istAktiv-Filter.
 */
@Injectable()
export class GetAllQualifikationenHandler {
  protected readonly logger = new Logger(GetAllQualifikationenHandler.name);

  constructor(
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly repository: IQualifikationRepository,
  ) {}

  /**
   * Führt die Query aus.
   */
  async execute(query: GetAllQualifikationenQuery): Promise<Result<QualifikationDto[]>> {
    const filter = query.istAktiv !== undefined ? { istAktiv: query.istAktiv } : undefined;
    const repoResult = await this.repository.findAll(filter);

    if (repoResult.isFailure) {
      if (!repoResult.error) {
        this.logger.error('Repository.findAll returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail<QualifikationDto[]>(repoResult.error);
    }

    const dtos = (repoResult.value ?? []).map(QualifikationQueryMapper.toDto);
    return Result.ok<QualifikationDto[]>(dtos);
  }
}
