import { Result } from '@domain/common/result';

export interface GetAlarmierungTimelineQueryProps {
  readonly einsatzId: string;
  readonly alarmierungId?: string;
}

/**
 * Query: Liefert die chronologische Timeline (Alarmierungs-Trigger,
 * Empfänger-Zeitpunkte, ETB-Alarmierungs-Einträge) eines Einsatzes.
 *
 * Optionaler Filter `alarmierungId` schränkt die Timeline auf eine einzelne
 * Alarmierung ein.
 */
export class GetAlarmierungTimelineQuery {
  private constructor(
    public readonly einsatzId: string,
    public readonly alarmierungId: string | undefined,
  ) {}

  static create(props: GetAlarmierungTimelineQueryProps): Result<GetAlarmierungTimelineQuery> {
    const einsatzId = props.einsatzId?.trim();
    if (!einsatzId) {
      return Result.fail<GetAlarmierungTimelineQuery>('einsatzId ist erforderlich');
    }
    const alarmierungId = props.alarmierungId?.trim() || undefined;
    return Result.ok(new GetAlarmierungTimelineQuery(einsatzId, alarmierungId));
  }
}
