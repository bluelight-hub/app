import { DomainEvent } from '@domain/common/domain-event';
import type { AlarmierungEmpfaengerId } from '@domain/value-objects/alarmierung-empfaenger-id';
import type { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { AlarmierungEmpfaengerRef } from '@domain/aggregates/alarmierung/alarmierung-empfaenger-ref';
import { EVENT_NAMES } from './event-names';

export interface AlarmierungEmpfaengerHinzugefuegtPayload {
  readonly empfaengerId: AlarmierungEmpfaengerId;
  readonly ref: AlarmierungEmpfaengerRef;
  readonly nameSnapshot: string;
  readonly alarmiertAm: Date;
}

/**
 * Event: Ein Empfänger wurde zur Alarmierung hinzugefügt.
 */
export class AlarmierungEmpfaengerHinzugefuegtEvent extends DomainEvent {
  public static eventName(): string {
    return EVENT_NAMES.ALARMIERUNG.EMPFAENGER_HINZUGEFUEGT;
  }

  constructor(
    public readonly alarmierungId: AlarmierungId,
    public readonly einsatzId: EinsatzId,
    public readonly data: AlarmierungEmpfaengerHinzugefuegtPayload,
  ) {
    super(alarmierungId.value);
  }
}
