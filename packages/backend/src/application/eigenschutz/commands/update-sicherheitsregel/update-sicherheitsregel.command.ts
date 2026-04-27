import { Result } from '@domain/common/result';

/**
 * Command zum Aktualisieren einer Sicherheitsregel (Story 2.6 AC3/AC4).
 *
 * Felder:
 *  - `einsatzId` / `userId` kommen aus Route-Param + JWT.
 *  - `regelId` ist die ID der konkreten Row (Route-Param `:id`). Die Fanout-
 *    Gruppe wird anhand der persistierten `propagationGroupId` rehydriert.
 *  - `expectedVersion` ist das OCC-Token aus dem Request-Body.
 *  - `einheitIds` trägt das **neue** Ziel-Set:
 *    - `null` → einsatzweit
 *    - `string[]` (nicht leer) → konkrete Einheiten
 *
 * **Re-Wire-Semantik:** Der Handler vergleicht das neue Ziel-Set mit dem
 * aktuellen Stand. Bleibt das Ziel identisch, ist es ein reiner
 * Titel-/Inhalt-Update (Version N → N+1). Ändert sich das Ziel, wird die
 * alte Row abgekündigt und für jede neue Einheit eine frische Row mit der
 * **ursprünglichen** `propagationGroupId` angelegt (AC4).
 */
export class UpdateSicherheitsregelCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly regelId: string,
    public readonly userId: string,
    public readonly expectedVersion: number,
    public readonly titel: string,
    public readonly inhalt: string,
    public readonly einheitIds: string[] | null,
  ) {}

  static create(args: {
    einsatzId: string;
    regelId: string;
    userId: string;
    expectedVersion: number;
    titel: string;
    inhalt: string;
    einheitIds: string[] | null;
  }): Result<UpdateSicherheitsregelCommand> {
    const einsatzId = args.einsatzId?.trim() ?? '';
    if (einsatzId.length === 0) {
      return Result.fail<UpdateSicherheitsregelCommand>('einsatzId ist erforderlich');
    }

    const regelId = args.regelId?.trim() ?? '';
    if (regelId.length === 0) {
      return Result.fail<UpdateSicherheitsregelCommand>('regelId ist erforderlich');
    }

    const userId = args.userId?.trim() ?? '';
    if (userId.length === 0) {
      return Result.fail<UpdateSicherheitsregelCommand>('userId ist erforderlich');
    }

    if (!Number.isInteger(args.expectedVersion) || args.expectedVersion < 1) {
      return Result.fail<UpdateSicherheitsregelCommand>('expectedVersion muss eine positive Ganzzahl sein');
    }

    if (typeof args.titel !== 'string' || args.titel.trim().length === 0) {
      return Result.fail<UpdateSicherheitsregelCommand>('titel ist erforderlich');
    }
    if (typeof args.inhalt !== 'string' || args.inhalt.trim().length === 0) {
      return Result.fail<UpdateSicherheitsregelCommand>('inhalt ist erforderlich');
    }

    let einheitIds: string[] | null;
    if (args.einheitIds === null) {
      einheitIds = null;
    } else if (Array.isArray(args.einheitIds)) {
      if (args.einheitIds.length === 0) {
        return Result.fail<UpdateSicherheitsregelCommand>('einheitIds darf kein leeres Array sein — bei einsatzweiter Regel `null` übergeben');
      }
      const normalized: string[] = [];
      for (const id of args.einheitIds) {
        if (typeof id !== 'string' || id.trim().length === 0) {
          return Result.fail<UpdateSicherheitsregelCommand>('einheitIds-Einträge müssen nicht-leere Strings sein');
        }
        normalized.push(id.trim());
      }
      einheitIds = normalized;
    } else {
      return Result.fail<UpdateSicherheitsregelCommand>('einheitIds muss ein Array oder null sein');
    }

    return Result.ok(new UpdateSicherheitsregelCommand(einsatzId, regelId, userId, args.expectedVersion, args.titel, args.inhalt, einheitIds));
  }
}
