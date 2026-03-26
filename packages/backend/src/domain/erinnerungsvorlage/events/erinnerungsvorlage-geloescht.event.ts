import { DomainEvent } from '@domain/common/domain-event';
import type { ErinnerungsvorlageId } from '@domain/erinnerungsvorlage/value-objects/erinnerungsvorlage-id';
import type { UserId } from '@domain/value-objects/user-id';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Domain Event: Erinnerungsvorlage wurde gelöscht (Soft-Delete).
 */
export class ErinnerungsvorlageGeloeschtEvent extends DomainEvent {
  constructor(
    public readonly vorlageId: ErinnerungsvorlageId,
    public readonly titel: string,
    public readonly deletedBy: UserId,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.ERINNERUNGSVORLAGE.GELOESCHT;
  }
}
