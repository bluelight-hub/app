import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Domain Event: Gefahrenmatrix-Bewertung wurde aktualisiert.
 */
export class GefahrenmatrixAktualisiertEvent extends DomainEvent {
  constructor(
    public readonly einsatzId: string,
    public readonly gefahrentyp: string,
    public readonly schutzobjekt: string,
    public readonly warnstufe: string,
    public readonly aktualisiertVon: string,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.GEFAHRENMATRIX.AKTUALISIERT;
  }
}
