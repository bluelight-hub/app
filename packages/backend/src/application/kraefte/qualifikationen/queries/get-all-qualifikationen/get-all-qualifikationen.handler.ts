import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
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
  private readonly logger = new Logger(GetAllQualifikationenHandler.name);

  constructor(
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly repository: IQualifikationRepository,
  ) {}

  /**
   * Führt die Query aus.
   */
  async execute(query: GetAllQualifikationenQuery): Promise<Result<QualifikationDto[]>> {
    try {
      const filter = query.istAktiv !== undefined ? { istAktiv: query.istAktiv } : undefined;
      const result = await this.repository.findAll(filter);

      if (result.isFailure) {
        return Result.fail<QualifikationDto[]>(result.error ?? 'Fehler beim Laden der Qualifikationen');
      }

      const dtos = (result.value ?? []).map(QualifikationQueryMapper.toDto);
      return Result.ok<QualifikationDto[]>(dtos);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get all Qualifikationen: ${errorMessage}`, error);
      return Result.fail<QualifikationDto[]>(`Fehler beim Laden der Qualifikationen: ${errorMessage}`);
    }
  }
}
