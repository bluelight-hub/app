import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Event: Eine Stammperson wurde einem User zugewiesen.
 * Ausgelöst von: Admin über AssignStammpersonCommand
 */
export class StammpersonAssignedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly stammpersonId: string,
    public readonly assignedBy: string,
    aggregateId?: string,
  ) {
    super(aggregateId ?? userId);
  }

  static eventName(): string {
    return EVENT_NAMES.OPERATIVE_ROLLE.STAMMPERSON_ASSIGNED;
  }
}
