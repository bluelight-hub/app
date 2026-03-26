import { DomainEvent } from '@domain/common/domain-event';
import type { NotizId } from '@domain/notiz/value-objects/notiz-id';
import type { UserId } from '@domain/value-objects/user-id';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Domain Event: Notiz wurde gelöscht (Soft-Delete).
 */
export class NotizGeloeschtEvent extends DomainEvent {
  constructor(
    public readonly notizId: NotizId,
    public readonly einsatzId: string,
    public readonly titel: string,
    public readonly geloeschtVon: UserId,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.NOTIZ.GELOESCHT;
  }
}
