import { DomainEvent } from '@domain/common/domain-event';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event: Anonymisierte Befehle eines Einsatzes wurden soft-deleted.
 *
 * Wird ausgelöst nach Ablauf der Freigabeperiode — Daten sind
 * über die API nicht mehr abrufbar, Audit-Trail bleibt erhalten.
 *
 * @remarks Story 5.5 AC3
 */
export class BefehlGeloeschtEvent extends DomainEvent {
  constructor(
    public readonly einsatzId: EinsatzId,
    public readonly befehlCount: number,
    public readonly geloeschtAm: Date,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.BEFEHL.GELOESCHT;
  }
}
