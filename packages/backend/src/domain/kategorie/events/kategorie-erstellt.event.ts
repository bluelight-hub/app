import { DomainEvent } from '@domain/common/domain-event';
import type { KategorieId } from '@domain/kategorie/value-objects/kategorie-id';
import type { UserId } from '@domain/value-objects/user-id';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Domain Event: Kategorie wurde erstellt.
 */
export class KategorieErstelltEvent extends DomainEvent {
  constructor(
    public readonly kategorieId: KategorieId,
    public readonly einsatzId: string,
    public readonly name: string,
    public readonly farbe: string,
    public readonly erstelltVon: UserId,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.KATEGORIE.ERSTELLT;
  }
}
