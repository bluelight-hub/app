import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import type { QualifikationDto } from '../../dto/qualifikation.dto';
import { QualifikationQueryMapper } from '../qualifikation-query.mapper';
import type { GetQualifikationByIdQuery } from './get-qualifikation-by-id.query';

/**
 * Handler für GetQualifikationByIdQuery.
 *
 * Lädt eine einzelne Qualifikation nach ID.
 *
 * WARUM keine ID-Validierung im Handler:
 * - Controller verwendet bereits ParseCuidPipe, das IDs validiert
 * - Redundante Validierung würde nur Code duplizieren
 * - Application Layer verlässt sich auf Infrastructure Layer (Pipe)
 * - ID ist bereits geprüft, bevor der Handler aufgerufen wird
 */
@Injectable()
export class GetQualifikationByIdHandler {
  private readonly logger = new Logger(GetQualifikationByIdHandler.name);

  constructor(
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly repository: IQualifikationRepository,
  ) {}

  /**
   * Führt die Query aus.
   *
   * @returns Result<QualifikationDto | null> - null wenn nicht gefunden
   */
  async execute(query: GetQualifikationByIdQuery): Promise<Result<QualifikationDto | null>> {
    try {
      // Create QualifikationId value object (already validated by ParseCuidPipe)
      const qualifikationId = QualifikationId.create(query.id).value;
      if (!qualifikationId) {
        return Result.fail<QualifikationDto | null>('Ungültige ID');
      }

      // Load from repository
      const result = await this.repository.findById(qualifikationId);
      if (result.isFailure) {
        return Result.fail<QualifikationDto | null>(result.error ?? 'Fehler beim Laden der Qualifikation');
      }

      // Not found → Return null (not error)
      if (!result.value) {
        return Result.ok<QualifikationDto | null>(null);
      }

      // Map to DTO
      const dto = QualifikationQueryMapper.toDto(result.value);
      return Result.ok<QualifikationDto | null>(dto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get Qualifikation by id: ${errorMessage}`, error);
      return Result.fail<QualifikationDto | null>(`Fehler beim Laden der Qualifikation: ${errorMessage}`);
    }
  }
}
