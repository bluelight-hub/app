import { Result } from '@domain/common/result';
import type { GefaehrdungItemProps } from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';

/**
 * Command zum Aktualisieren der Items einer Gefährdungsbeurteilung (Story 2.2).
 *
 * Felder:
 *  - `einsatzId` / `userId` kommen aus Route-Param + JWT.
 *  - `gefaehrdungsbeurteilungId` kommt aus Route-Param (`:id`).
 *  - `expectedVersion` ist das Optimistic-Concurrency-Token aus dem Request-Body.
 *  - `items` ist die neue Liste (kann leer sein — „alles entfernen" ist erlaubt).
 */
export class UpdateGefaehrdungsbeurteilungItemsCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly gefaehrdungsbeurteilungId: string,
    public readonly userId: string,
    public readonly expectedVersion: number,
    public readonly items: GefaehrdungItemProps[],
  ) {}

  static create(args: {
    einsatzId: string;
    gefaehrdungsbeurteilungId: string;
    userId: string;
    expectedVersion: number;
    items: GefaehrdungItemProps[];
  }): Result<UpdateGefaehrdungsbeurteilungItemsCommand> {
    const einsatzId = args.einsatzId?.trim() ?? '';
    if (einsatzId.length === 0) {
      return Result.fail<UpdateGefaehrdungsbeurteilungItemsCommand>('einsatzId ist erforderlich');
    }

    const gefaehrdungsbeurteilungId = args.gefaehrdungsbeurteilungId?.trim() ?? '';
    if (gefaehrdungsbeurteilungId.length === 0) {
      return Result.fail<UpdateGefaehrdungsbeurteilungItemsCommand>('gefaehrdungsbeurteilungId ist erforderlich');
    }

    const userId = args.userId?.trim() ?? '';
    if (userId.length === 0) {
      return Result.fail<UpdateGefaehrdungsbeurteilungItemsCommand>('userId ist erforderlich');
    }

    if (!Number.isInteger(args.expectedVersion) || args.expectedVersion < 1) {
      return Result.fail<UpdateGefaehrdungsbeurteilungItemsCommand>('expectedVersion muss eine positive Ganzzahl sein');
    }

    if (!Array.isArray(args.items)) {
      return Result.fail<UpdateGefaehrdungsbeurteilungItemsCommand>('items muss ein Array sein');
    }

    return Result.ok(new UpdateGefaehrdungsbeurteilungItemsCommand(einsatzId, gefaehrdungsbeurteilungId, userId, args.expectedVersion, args.items));
  }
}
