import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Result } from '@domain/common/result';
import { IFunkStatusConfigRepository } from '@domain/kraefte/repositories/i-funk-status-config.repository';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import type { FunkStatusConfigDto } from '../dto/funk-status-config.dto';
import type { FunkStatusConfig } from '@domain/kraefte/aggregates/funk-status-config.aggregate';

/**
 * Handler für GetAllFunkStatusConfigs Query.
 *
 * Lädt alle FunkStatusConfig Einträge (Status 0-9).
 *
 * **Config-Only Pattern:**
 * - Gibt immer alle 10 Status zurück (0-9)
 * - KEIN Filter (im Gegensatz zu Qualifikationen)
 * - Sortiert nach code (ascending)
 */
@Injectable()
export class GetAllFunkStatusConfigsHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.FUNK_STATUS_CONFIG)
    private readonly repository: IFunkStatusConfigRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  /**
   * Führt die Query aus.
   *
   * @returns Result<FunkStatusConfigDto[]> - Liste aller FunkStatusConfig Einträge
   */
  async execute(): Promise<Result<FunkStatusConfigDto[]>> {
    const repoResult = await this.repository.findAll();

    if (repoResult.isFailure) {
      if (!repoResult.error) {
        this.logger.error('Repository.findAll returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail<FunkStatusConfigDto[]>(repoResult.error);
    }

    const dtos = (repoResult.value ?? []).map((entity) => this.mapToDto(entity));
    return Result.ok<FunkStatusConfigDto[]>(dtos);
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
