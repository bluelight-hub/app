import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
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
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly repository: IQualifikationRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Führt die Query aus.
   *
   * @returns Result<QualifikationDto | null> - null wenn nicht gefunden
   */
  async execute(query: GetQualifikationByIdQuery): Promise<Result<QualifikationDto | null>> {
    // Validiere qualifikationId via Value Object
    const qualifikationIdResult = QualifikationId.create(query.id);
    if (qualifikationIdResult.isFailure) {
      if (!qualifikationIdResult.error) {
        this.logger.error('QualifikationId.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('ID validation returned failure without error message');
      }
      return Result.fail<QualifikationDto | null>(qualifikationIdResult.error);
    }

    // Type Narrowing: value ist garantiert vorhanden nach isFailure Check
    const qualifikationId = qualifikationIdResult.value;
    if (!qualifikationId) {
      this.logger.error('QualifikationId.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('ID validation succeeded but value is null');
    }

    // Repository Call
    const repoResult = await this.repository.findById(qualifikationId);
    if (repoResult.isFailure) {
      if (!repoResult.error) {
        this.logger.error('Repository.findById returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail<QualifikationDto | null>(repoResult.error);
    }

    // Not found → Return null (not error)
    if (!repoResult.value) {
      return Result.ok<QualifikationDto | null>(null);
    }

    // Map to DTO
    const dto = QualifikationQueryMapper.toDto(repoResult.value);
    return Result.ok<QualifikationDto | null>(dto);
  }
}
