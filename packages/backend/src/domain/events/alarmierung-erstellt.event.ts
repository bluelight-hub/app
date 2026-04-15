import { DomainEvent } from '@domain/common/domain-event';
import type { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EVENT_NAMES } from './event-names';

export interface AlarmierungErstelltPayload {
  readonly bezeichnung: string;
  readonly beschreibung?: string;
  readonly alarmierungszeit: Date;
  readonly ursprungAlarmierungId?: string;
  readonly empfaengerCount: number;
}

/**
 * Event: Eine Alarmierung wurde neu ausgelöst.
 */
export class AlarmierungErstelltEvent extends DomainEvent {
  public static eventName(): string {
    return EVENT_NAMES.ALARMIERUNG.ERSTELLT;
  }

  constructor(
    public readonly alarmierungId: AlarmierungId,
    public readonly einsatzId: EinsatzId,
    public readonly data: AlarmierungErstelltPayload,
  ) {
    super(alarmierungId.value);
  }
}
