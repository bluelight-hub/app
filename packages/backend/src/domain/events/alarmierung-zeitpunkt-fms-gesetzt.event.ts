import { DomainEvent } from '@domain/common/domain-event';
import type { AlarmierungEmpfaengerId } from '@domain/value-objects/alarmierung-empfaenger-id';
import type { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { ZeitpunktFeld } from '@domain/aggregates/alarmierung/alarmierung-empfaenger.entity';
import { EVENT_NAMES } from './event-names';

export interface AlarmierungZeitpunktFmsGesetztPayload {
  readonly empfaengerId: AlarmierungEmpfaengerId;
  readonly nameSnapshot: string;
  readonly feld: ZeitpunktFeld;
  readonly wert: Date;
  readonly fmsStatus: number;
}

/**
 * Event: Ein Zeitpunkt wurde automatisch aus einem FMS-Statuswechsel gesetzt.
 * Nur für Empfänger vom Typ `fahrzeug` relevant.
 */
export class AlarmierungZeitpunktFmsGesetztEvent extends DomainEvent {
  public static eventName(): string {
    return EVENT_NAMES.ALARMIERUNG.ZEITPUNKT_FMS_GESETZT;
  }

  constructor(
    public readonly alarmierungId: AlarmierungId,
    public readonly einsatzId: EinsatzId,
    public readonly data: AlarmierungZeitpunktFmsGesetztPayload,
  ) {
    super(alarmierungId.value);
  }
}
