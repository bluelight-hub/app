import { DomainEvent } from '@domain/common/domain-event';
import type { AlarmierungEmpfaengerId } from '@domain/value-objects/alarmierung-empfaenger-id';
import type { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { ZeitpunktFeld } from '@domain/aggregates/alarmierung/alarmierung-empfaenger.entity';
import { EVENT_NAMES } from './event-names';

export interface AlarmierungZeitpunktKorrigiertPayload {
  readonly empfaengerId: AlarmierungEmpfaengerId;
  readonly nameSnapshot: string;
  readonly feld: ZeitpunktFeld;
  readonly alterWert: Date | null;
  readonly neuerWert: Date | null;
  readonly korrigiertVon: string;
}

/**
 * Event: Ein Zeitpunkt eines Alarmierungs-Empfängers wurde manuell korrigiert.
 * Getrennt von `AlarmierungZeitpunktFmsGesetztEvent`, damit Audit-Trails
 * zwischen manuellem Nachtragen und Auto-Population via FMS unterscheidbar sind.
 */
export class AlarmierungZeitpunktKorrigiertEvent extends DomainEvent {
  public static eventName(): string {
    return EVENT_NAMES.ALARMIERUNG.ZEITPUNKT_KORRIGIERT;
  }

  constructor(
    public readonly alarmierungId: AlarmierungId,
    public readonly einsatzId: EinsatzId,
    public readonly data: AlarmierungZeitpunktKorrigiertPayload,
  ) {
    super(alarmierungId.value);
  }
}
