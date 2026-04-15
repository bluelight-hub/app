import { DomainEvent } from '@domain/common/domain-event';
import type { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EVENT_NAMES } from './event-names';

/**
 * Event: Eine Alarmierung wurde abgeschlossen.
 */
export class AlarmierungAbgeschlossenEvent extends DomainEvent {
  public static eventName(): string {
    return EVENT_NAMES.ALARMIERUNG.ABGESCHLOSSEN;
  }

  constructor(
    public readonly alarmierungId: AlarmierungId,
    public readonly einsatzId: EinsatzId,
    public readonly abgeschlossenVon: string,
  ) {
    super(alarmierungId.value);
  }
}
