import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Domain Event: Gefahrenzone wurde gelöscht.
 *
 * Die zugeordnete Matrix-Zelle bleibt unverändert — Zonen sind der räumliche Layer,
 * Bewertungen liegen in der Matrix (ADR-010).
 */
export class GefahrenzoneGeloeschtEvent extends DomainEvent {
  constructor(
    public readonly zoneId: string,
    public readonly einsatzId: string,
    public readonly geloeschtVon: string,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.GEFAHRENZONE.GELOESCHT;
  }
}
