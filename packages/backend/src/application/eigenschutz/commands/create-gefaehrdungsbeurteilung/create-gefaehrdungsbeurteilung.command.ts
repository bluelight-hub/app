import { Result } from '@domain/common/result';

/**
 * Command zum Anlegen einer neuen Gefährdungsbeurteilung (Story 2.1).
 *
 * Kapselt die validierten Eingaben für den Create-Flow. `einsatzId` + `userId`
 * kommen aus dem Controller-Context (Route-Param + JWT), nicht aus dem Body.
 */
export class CreateGefaehrdungsbeurteilungCommand {
  private constructor(
    public readonly einsatzId: string,
    public readonly einheitId: string,
    public readonly createdBy: string,
    public readonly vorlageId: string | null,
    public readonly gefahrenzoneId: string | null,
  ) {}

  static create(args: { einsatzId: string; einheitId: string; createdBy: string; vorlageId?: string | null; gefahrenzoneId?: string | null }): Result<CreateGefaehrdungsbeurteilungCommand> {
    const einsatzId = args.einsatzId?.trim() ?? '';
    if (einsatzId.length === 0) {
      return Result.fail<CreateGefaehrdungsbeurteilungCommand>('einsatzId ist erforderlich');
    }

    const einheitId = args.einheitId?.trim() ?? '';
    if (einheitId.length === 0) {
      return Result.fail<CreateGefaehrdungsbeurteilungCommand>('einheitId ist erforderlich');
    }

    const createdBy = args.createdBy?.trim() ?? '';
    if (createdBy.length === 0) {
      return Result.fail<CreateGefaehrdungsbeurteilungCommand>('createdBy ist erforderlich');
    }

    const vorlageId = args.vorlageId === undefined || args.vorlageId === null ? null : args.vorlageId.trim();
    if (vorlageId !== null && vorlageId.length === 0) {
      return Result.fail<CreateGefaehrdungsbeurteilungCommand>('vorlageId darf nicht leer sein, wenn gesetzt');
    }

    const gefahrenzoneId = args.gefahrenzoneId === undefined || args.gefahrenzoneId === null ? null : args.gefahrenzoneId.trim();
    if (gefahrenzoneId !== null && gefahrenzoneId.length === 0) {
      return Result.fail<CreateGefaehrdungsbeurteilungCommand>('gefahrenzoneId darf nicht leer sein, wenn gesetzt');
    }

    return Result.ok(new CreateGefaehrdungsbeurteilungCommand(einsatzId, einheitId, createdBy, vorlageId, gefahrenzoneId));
  }
}
