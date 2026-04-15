import { DomainEvent } from '@domain/common/domain-event';
import type { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EVENT_NAMES } from './event-names';

export interface NachalarmierungErstelltPayload {
  readonly bezeichnung: string;
  readonly ursprungAlarmierungId: AlarmierungId;
}

/**
 * Event: Eine Nachalarmierung wurde erstellt (verweist auf die Ursprungsalarmierung).
 *
 * Wird zusätzlich zu `AlarmierungErstelltEvent` emittiert, sodass Handler
 * (z.B. ETB, UI-Timeline) den Nachalarmierungs-Fall sauber erkennen können.
 */
export class NachalarmierungErstelltEvent extends DomainEvent {
  public static eventName(): string {
    return EVENT_NAMES.ALARMIERUNG.NACHALARMIERUNG_ERSTELLT;
  }

  constructor(
    public readonly alarmierungId: AlarmierungId,
    public readonly einsatzId: EinsatzId,
    public readonly data: NachalarmierungErstelltPayload,
  ) {
    super(alarmierungId.value);
  }
}
