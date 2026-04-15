import { DomainEvent } from '@domain/common/domain-event';
import type { AlarmierungEmpfaengerId } from '@domain/value-objects/alarmierung-empfaenger-id';
import type { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EVENT_NAMES } from './event-names';

export interface AlarmierungEmpfaengerEntferntPayload {
  readonly empfaengerId: AlarmierungEmpfaengerId;
  readonly nameSnapshot: string;
}

/**
 * Event: Ein Empfänger wurde aus der Alarmierung entfernt.
 */
export class AlarmierungEmpfaengerEntferntEvent extends DomainEvent {
  public static eventName(): string {
    return EVENT_NAMES.ALARMIERUNG.EMPFAENGER_ENTFERNT;
  }

  constructor(
    public readonly alarmierungId: AlarmierungId,
    public readonly einsatzId: EinsatzId,
    public readonly data: AlarmierungEmpfaengerEntferntPayload,
  ) {
    super(alarmierungId.value);
  }
}
