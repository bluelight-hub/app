/**
 * BatchSaveQualifikationMappingsCommand - Command für Batch-Save von Mappings.
 *
 * Ermöglicht das Speichern mehrerer Qualifikations-Mappings in einer Operation.
 * Wird beim Inline-Mapping im Import-Dialog verwendet.
 *
 * @module application/integrations/commands/batch-save-qualifikation-mappings
 */

import { Result } from '@domain/common/result';

/**
 * Einzelnes Mapping-Item für Batch-Save.
 */
export interface BatchMappingItem {
  /** Externer Qualifikations-Name (z.B. aus HiOrg) */
  externalName: string;
  /** Qualifikation-ID zum Mappen (null = ignorieren) */
  qualifikationId: string | null;
}

/**
 * Props für Command-Erstellung.
 */
interface BatchSaveQualifikationMappingsProps {
  /** Liste der zu speichernden Mappings */
  mappings: BatchMappingItem[];
  /** User der die Mappings speichert */
  savedBy: string;
}

/**
 * Command für Batch-Save von Qualifikations-Mappings.
 */
export class BatchSaveQualifikationMappingsCommand {
  private constructor(
    public readonly mappings: BatchMappingItem[],
    public readonly savedBy: string,
  ) {}

  /**
   * Erstellt ein validiertes Command.
   */
  static create(props: BatchSaveQualifikationMappingsProps): Result<BatchSaveQualifikationMappingsCommand> {
    if (!props.mappings || props.mappings.length === 0) {
      return Result.fail('Mindestens ein Mapping erforderlich');
    }

    if (props.mappings.length > 100) {
      return Result.fail('Maximal 100 Mappings pro Batch erlaubt');
    }

    if (!props.savedBy?.trim()) {
      return Result.fail('savedBy ist erforderlich');
    }

    // Validiere jedes Mapping
    for (const mapping of props.mappings) {
      if (!mapping.externalName?.trim()) {
        return Result.fail('externalName ist für alle Mappings erforderlich');
      }
    }

    return Result.ok(new BatchSaveQualifikationMappingsCommand(props.mappings, props.savedBy.trim()));
  }
}
