import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Result } from '@domain/common/result';
import { IFunkStatusConfigRepository } from '@domain/kraefte/repositories/i-funk-status-config.repository';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import type { FunkStatusConfigDto } from '../dto/funk-status-config.dto';
import type { FunkStatusConfig } from '@domain/kraefte/aggregates/funk-status-config.aggregate';
import { FUNKSTATUS_VALIDATION, FUNKSTATUS_VALIDATION_ERRORS } from '@domain/kraefte/constants/funkstatus-validation.constants';

/**
 * Handler für GetFunkStatusConfigByCode Query.
 *
 * Lädt eine einzelne FunkStatusConfig nach Status-Code (0-9).
 *
 * **WARUM Lookup via code statt ID?**
 * - code ist der Business Key (Admin kennt "Status 0", nicht CUID2)
 * - API-Endpunkt: GET /api/admin/kraefte/funkstatus/:code
 * - code ist eindeutig und immutable (kann als Identifier dienen)
 */
@Injectable()
export class GetFunkStatusConfigByCodeHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.FUNK_STATUS_CONFIG)
    private readonly repository: IFunkStatusConfigRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  /**
   * Führt die Query aus.
   *
   * **Validation:**
   * - Validiert code Range (0-9) vor Repository Call
   * - Repository wirft NICHT bei "not found" (gibt null zurück)
   * - Handler gibt null zurück wenn nicht gefunden (Controller entscheidet über 404)
   *
   * @param code - Der Status-Code (0-9)
   * @returns Result<FunkStatusConfigDto | null> - null wenn nicht gefunden
   */
  async execute(code: number): Promise<Result<FunkStatusConfigDto | null>> {
    // Validation: code Range (0-9)
    if (!Number.isInteger(code)) {
      return Result.fail<FunkStatusConfigDto | null>('Code muss eine ganze Zahl sein');
    }
    if (code < FUNKSTATUS_VALIDATION.CODE_MIN || code > FUNKSTATUS_VALIDATION.CODE_MAX) {
      return Result.fail<FunkStatusConfigDto | null>(FUNKSTATUS_VALIDATION_ERRORS.CODE_OUT_OF_RANGE);
    }

    // Repository Call
    const repoResult = await this.repository.findByCode(code);
    if (repoResult.isFailure) {
      if (!repoResult.error) {
        this.logger.error('Repository.findByCode returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail<FunkStatusConfigDto | null>(repoResult.error);
    }

    // Not found → Return null (not error)
    if (!repoResult.value) {
      return Result.ok<FunkStatusConfigDto | null>(null);
    }

    // Map to DTO
    const dto = this.mapToDto(repoResult.value);
    return Result.ok<FunkStatusConfigDto | null>(dto);
  }

  /**
   * Mappt FunkStatusConfig Aggregate zu FunkStatusConfigDto.
   *
   * **WARUM kein separater Mapper?**
   * - FunkStatusConfig hat einfache 1:1 Mappings (keine komplexen Transformationen)
   * - Bei Bedarf (z.B. mehrere Query Handler) kann Mapper extrahiert werden
   */
  private mapToDto(entity: FunkStatusConfig): FunkStatusConfigDto {
    return {
      id: entity.id.value,
      code: entity.code,
      standardLabel: entity.standardLabel,
      customLabel: entity.customLabel,
      displayLabel: entity.displayLabel,
      farbe: entity.farbe,
      istAlarmierbar: entity.istAlarmierbar,
      beschreibung: entity.beschreibung,
      isEditable: entity.isEditable,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy,
    };
  }
}
