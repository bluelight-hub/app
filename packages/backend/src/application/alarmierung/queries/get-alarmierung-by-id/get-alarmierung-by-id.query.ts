import { Result } from '@domain/common/result';

export interface GetAlarmierungByIdQueryProps {
  readonly einsatzId: string;
  readonly alarmierungId: string;
}

/**
 * Query: Lädt eine einzelne Alarmierung inkl. Empfänger.
 *
 * `einsatzId` wird vom Handler genutzt, um sicherzustellen, dass die geladene
 * Alarmierung zum erwarteten Einsatz gehört — sonst wäre ein Cross-Einsatz-Lesen
 * möglich (Security: authentifizierte Nutzer von Einsatz-A könnten Alarmierungen
 * von Einsatz-B lesen).
 */
export class GetAlarmierungByIdQuery {
  private constructor(
    public readonly einsatzId: string,
    public readonly alarmierungId: string,
  ) {}

  static create(props: GetAlarmierungByIdQueryProps): Result<GetAlarmierungByIdQuery> {
    const einsatzId = props.einsatzId?.trim();
    if (!einsatzId) {
      return Result.fail<GetAlarmierungByIdQuery>('einsatzId ist erforderlich');
    }
    const alarmierungId = props.alarmierungId?.trim();
    if (!alarmierungId) {
      return Result.fail<GetAlarmierungByIdQuery>('alarmierungId ist erforderlich');
    }
    return Result.ok(new GetAlarmierungByIdQuery(einsatzId, alarmierungId));
  }
}
