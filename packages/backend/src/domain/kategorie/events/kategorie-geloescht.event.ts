import { DomainEvent } from '@domain/common/domain-event';
import type { KategorieId } from '@domain/kategorie/value-objects/kategorie-id';
import type { UserId } from '@domain/value-objects/user-id';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Domain Event: Kategorie wurde gelöscht (Soft-Delete).
 */
export class KategorieGeloeschtEvent extends DomainEvent {
  constructor(
    public readonly kategorieId: KategorieId,
    public readonly einsatzId: string,
    public readonly name: string,
    public readonly geloeschtVon: UserId,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.KATEGORIE.GELOESCHT;
  }
}
