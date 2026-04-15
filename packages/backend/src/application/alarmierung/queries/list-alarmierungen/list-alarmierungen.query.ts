import { Result } from '@domain/common/result';
import { ALARMIERUNG_STATUS_VALUES, type AlarmierungStatus } from '@domain/aggregates/alarmierung/alarmierung.entity';

export interface ListAlarmierungenQueryProps {
  readonly einsatzId: string;
  readonly status?: AlarmierungStatus;
  readonly skip?: number;
  readonly take?: number;
}

/**
 * Query: Listet Alarmierungen eines Einsatzes (chronologisch DESC).
 */
export class ListAlarmierungenQuery {
  static readonly DEFAULT_TAKE = 50;
  static readonly MAX_TAKE = 200;

  private constructor(
    public readonly einsatzId: string,
    public readonly status: AlarmierungStatus | undefined,
    public readonly skip: number,
    public readonly take: number,
  ) {}

  static create(props: ListAlarmierungenQueryProps): Result<ListAlarmierungenQuery> {
    const einsatzId = props.einsatzId?.trim();
    if (!einsatzId) {
      return Result.fail<ListAlarmierungenQuery>('einsatzId ist erforderlich');
    }
    if (props.status !== undefined && !ALARMIERUNG_STATUS_VALUES.includes(props.status)) {
      return Result.fail<ListAlarmierungenQuery>(`status muss eines von ${ALARMIERUNG_STATUS_VALUES.join(', ')} sein`);
    }
    const skip = props.skip ?? 0;
    if (!Number.isInteger(skip) || skip < 0) {
      return Result.fail<ListAlarmierungenQuery>('skip muss ein nicht-negativer Integer sein');
    }
    const take = props.take ?? ListAlarmierungenQuery.DEFAULT_TAKE;
    if (!Number.isInteger(take) || take < 1 || take > ListAlarmierungenQuery.MAX_TAKE) {
      return Result.fail<ListAlarmierungenQuery>(`take muss zwischen 1 und ${ListAlarmierungenQuery.MAX_TAKE} liegen`);
    }
    return Result.ok(new ListAlarmierungenQuery(einsatzId, props.status, skip, take));
  }
}
