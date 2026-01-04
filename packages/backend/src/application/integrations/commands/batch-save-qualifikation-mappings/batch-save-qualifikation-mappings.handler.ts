/**
 * BatchSaveQualifikationMappingsHandler - Handler für Batch-Save von Mappings.
 *
 * Speichert mehrere Qualifikations-Mappings in einer Operation.
 * Nutzt Upsert-Semantik: Existierende Mappings werden aktualisiert.
 *
 * @module application/integrations/commands/batch-save-qualifikation-mappings
 */

import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IQualifikationMappingRepository } from '@domain/integrations/repositories/i-qualifikation-mapping.repository';
import { QualifikationMapping } from '@domain/integrations/entities/qualifikation-mapping.entity';
import { INTEGRATION_TYPES } from '@domain/integrations';
import { INTEGRATIONS } from '@infrastructure/di-tokens';
import type { BatchSaveQualifikationMappingsCommand } from './batch-save-qualifikation-mappings.command';

/**
 * Ergebnis des Batch-Save.
 */
export interface BatchSaveResult {
  /** Anzahl gespeicherter Mappings (mit Qualifikation) */
  saved: number;
  /** Anzahl ignorierter Mappings (qualifikationId=null) */
  ignored: number;
}

/**
 * Handler für BatchSaveQualifikationMappingsCommand.
 */
@Injectable()
export class BatchSaveQualifikationMappingsHandler {
  constructor(
    @Inject(INTEGRATIONS.QUALIFIKATION_MAPPING_REPOSITORY)
    private readonly mappingRepo: IQualifikationMappingRepository,
  ) {}

  /**
   * Führt den Command aus.
   */
  async execute(command: BatchSaveQualifikationMappingsCommand): Promise<Result<BatchSaveResult>> {
    const mappingsToSave: QualifikationMapping[] = [];
    let saved = 0;
    let ignored = 0;

    for (const item of command.mappings) {
      // Prüfe ob Mapping bereits existiert
      const existingResult = await this.mappingRepo.findByExternalName(item.externalName, INTEGRATION_TYPES.HIORG_SERVER);

      if (existingResult.isSuccess && existingResult.value) {
        // Update existierendes Mapping
        const existing = existingResult.value;
        if (item.qualifikationId === null) {
          // Ignorieren = Mapping löschen oder null setzen
          existing.clearMapping(command.savedBy);
          ignored++;
        } else {
          existing.updateMapping({
            qualifikationId: item.qualifikationId,
            updatedBy: command.savedBy,
          });
          saved++;
        }
        mappingsToSave.push(existing);
      } else {
        // Neues Mapping erstellen
        const createResult = QualifikationMapping.create({
          externalName: item.externalName,
          externalSource: INTEGRATION_TYPES.HIORG_SERVER,
          qualifikationId: item.qualifikationId,
          isAutoMatched: false,
          createdBy: command.savedBy,
        });

        if (createResult.isFailure) {
          return Result.fail(createResult.error ?? 'Fehler beim Erstellen des Mappings');
        }

        if (item.qualifikationId === null) {
          ignored++;
        } else {
          saved++;
        }
        // Nach isFailure-Check ist value garantiert definiert
        mappingsToSave.push(createResult.value!);
      }
    }

    // Alle Mappings speichern
    const saveResult = await this.mappingRepo.saveMany(mappingsToSave);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Fehler beim Speichern der Mappings');
    }

    return Result.ok({ saved, ignored });
  }
}
