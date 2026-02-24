import { DomainEvent } from '@domain/common/domain-event';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event: Befehle eines Einsatzes wurden DSGVO-konform anonymisiert.
 *
 * Wird ausgelöst wenn die Aufbewahrungsfrist abgelaufen ist und
 * personenbezogene Daten irreversibel anonymisiert wurden.
 *
 * @remarks Story 5.5 AC2
 */
export class BefehlAnonymisiertEvent extends DomainEvent {
  constructor(
    public readonly einsatzId: EinsatzId,
    public readonly befehlCount: number,
    public readonly empfaengerCount: number,
    public readonly kommentarCount: number,
    public readonly anonymisiertAm: Date,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.BEFEHL.ANONYMISIERT;
  }
}
