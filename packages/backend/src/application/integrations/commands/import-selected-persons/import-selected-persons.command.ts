/**
 * ImportSelectedPersonsCommand - Command für den Import ausgewählter Personen aus HiOrg-Server.
 *
 * Story 7.2: HiOrg-Server Import - Import-Auswahl
 *
 * Ermöglicht den selektiven Import von Personen aus HiOrg-Server in das
 * Stammpersonen-Verzeichnis mit automatischem Qualifikations-Mapping.
 *
 * **Validierung:**
 * - usernames: Mindestens eine Person muss ausgewählt sein
 * - usernames: Maximal 100 Personen pro Import (Performance-Limit)
 * - importedBy: CUID2 Format für Audit-Trail
 *
 * @module application/integrations/commands/import-selected-persons
 */

import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';

/**
 * Props für ImportSelectedPersonsCommand Erstellung.
 */
export interface CreateImportSelectedPersonsCommandProps {
  /** Usernames der zu importierenden Personen (primärer Identifier in HiOrg) */
  usernames: string[];
  /** User ID der den Import durchführt */
  importedBy: string;
  /** Strategie bei existierenden Personen: 'skip' oder 'update' */
  duplicateStrategy?: 'skip' | 'update';
}

/** Maximale Anzahl Personen pro Import-Request */
const MAX_IMPORT_COUNT = 100;

/**
 * ImportSelectedPersonsCommand.
 *
 * **Use Case:**
 * Admin wählt Personen aus der HiOrg-Vorschau aus und startet Import.
 * Handler importiert Personen mit automatischem Qualifikations-Mapping.
 *
 * **Duplicate Strategies:**
 * - `skip`: Überspringt bereits existierende Personen (basierend auf externalId)
 * - `update`: Aktualisiert existierende Personen mit neuen Daten
 *
 * @example
 * ```typescript
 * const command = ImportSelectedPersonsCommand.create({
 *   usernames: ['max.mustermann', 'erika.musterfrau'],
 *   importedBy: userId,
 *   duplicateStrategy: 'update',
 * });
 * ```
 */
export class ImportSelectedPersonsCommand {
  private constructor(
    public readonly usernames: readonly string[],
    public readonly importedBy: string,
    public readonly duplicateStrategy: 'skip' | 'update',
  ) {}

  /**
   * Factory Method mit Validierung.
   *
   * @param props - Command Properties
   * @returns Result<ImportSelectedPersonsCommand>
   */
  static create(props: CreateImportSelectedPersonsCommandProps): Result<ImportSelectedPersonsCommand> {
    // Validation: usernames
    if (!props.usernames || props.usernames.length === 0) {
      return Result.fail('Mindestens eine Person muss für den Import ausgewählt werden');
    }

    if (props.usernames.length > MAX_IMPORT_COUNT) {
      return Result.fail(`Maximal ${MAX_IMPORT_COUNT} Personen können gleichzeitig importiert werden`);
    }

    // Trim und filtern
    const trimmedUsernames = props.usernames.map((u) => u.trim()).filter((u) => u.length > 0);

    if (trimmedUsernames.length === 0) {
      return Result.fail('Alle angegebenen Usernames sind leer');
    }

    // Prüfe auf Duplikate
    const uniqueUsernames = new Set(trimmedUsernames);
    if (uniqueUsernames.size !== trimmedUsernames.length) {
      return Result.fail('Die Liste enthält doppelte Usernames');
    }

    // Validation: importedBy (CUID2)
    const trimmedImportedBy = props.importedBy?.trim() ?? '';
    if (!isCuid(trimmedImportedBy)) {
      return Result.fail('importedBy muss ein gültiger CUID2-Identifier sein');
    }

    // Default strategy
    const strategy = props.duplicateStrategy ?? 'skip';

    return Result.ok(new ImportSelectedPersonsCommand(Object.freeze([...trimmedUsernames]), trimmedImportedBy, strategy));
  }
}
