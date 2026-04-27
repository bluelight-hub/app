import { Result } from '@domain/common/result';

/**
 * Command zum Anlegen einer neuen Sicherheitsregel (Story 2.6 AC2).
 *
 * Kapselt die validierten Eingaben für den Create-Flow. `einsatzId` +
 * `createdBy` kommen aus dem Controller-Context (Route-Param + JWT), nicht
 * aus dem Request-Body.
 *
 * **`einheitIds`-Semantik (aligned mit Shared-Zod-Discriminator):**
 * - `null` → Regel gilt **einsatzweit** (eine Row mit `einheitId = null`).
 * - `string[]` (nicht leer) → **Fanout**: eine Row pro Einheit, gemeinsame
 *   `propagationGroupId` im Event-Payload (AC2).
 * - Leeres Array ist ein Validierungsfehler (würde semantisch „keine
 *   Zuordnung, aber auch nicht einsatzweit" heißen).
 */
export class CreateSicherheitsregelCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly createdBy: string,
    public readonly titel: string,
    public readonly inhalt: string,
    public readonly einheitIds: string[] | null,
  ) {}

  static create(args: { einsatzId: string; createdBy: string; titel: string; inhalt: string; einheitIds: string[] | null }): Result<CreateSicherheitsregelCommand> {
    const einsatzId = args.einsatzId?.trim() ?? '';
    if (einsatzId.length === 0) {
      return Result.fail<CreateSicherheitsregelCommand>('einsatzId ist erforderlich');
    }

    const createdBy = args.createdBy?.trim() ?? '';
    if (createdBy.length === 0) {
      return Result.fail<CreateSicherheitsregelCommand>('createdBy ist erforderlich');
    }

    if (typeof args.titel !== 'string' || args.titel.trim().length === 0) {
      return Result.fail<CreateSicherheitsregelCommand>('titel ist erforderlich');
    }
    if (typeof args.inhalt !== 'string' || args.inhalt.trim().length === 0) {
      return Result.fail<CreateSicherheitsregelCommand>('inhalt ist erforderlich');
    }

    let einheitIds: string[] | null;
    if (args.einheitIds === null) {
      einheitIds = null;
    } else if (Array.isArray(args.einheitIds)) {
      if (args.einheitIds.length === 0) {
        return Result.fail<CreateSicherheitsregelCommand>('einheitIds darf kein leeres Array sein — bei einsatzweiter Regel `null` übergeben');
      }
      const normalized: string[] = [];
      for (const id of args.einheitIds) {
        if (typeof id !== 'string' || id.trim().length === 0) {
          return Result.fail<CreateSicherheitsregelCommand>('einheitIds-Einträge müssen nicht-leere Strings sein');
        }
        normalized.push(id.trim());
      }
      einheitIds = normalized;
    } else {
      return Result.fail<CreateSicherheitsregelCommand>('einheitIds muss ein Array oder null sein');
    }

    return Result.ok(new CreateSicherheitsregelCommand(einsatzId, createdBy, args.titel, args.inhalt, einheitIds));
  }
}
