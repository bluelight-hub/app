import { Result } from '@domain/common/result';

export interface GetAlarmierungByIdQueryProps {
  readonly alarmierungId: string;
}

/**
 * Query: Lädt eine einzelne Alarmierung inkl. Empfänger.
 */
export class GetAlarmierungByIdQuery {
  private constructor(public readonly alarmierungId: string) {}

  static create(props: GetAlarmierungByIdQueryProps): Result<GetAlarmierungByIdQuery> {
    const alarmierungId = props.alarmierungId?.trim();
    if (!alarmierungId) {
      return Result.fail<GetAlarmierungByIdQuery>('alarmierungId ist erforderlich');
    }
    return Result.ok(new GetAlarmierungByIdQuery(alarmierungId));
  }
}
