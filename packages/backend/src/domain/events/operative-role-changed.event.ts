import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Event: Die operative Rolle eines Users wurde geändert.
 * Ausgelöst von: Admin über ChangeOperativeRoleCommand
 */
export class OperativeRoleChangedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly oldRole: string,
    public readonly newRole: string,
    public readonly changedBy: string,
    aggregateId?: string,
  ) {
    super(aggregateId ?? userId);
  }

  static eventName(): string {
    return EVENT_NAMES.OPERATIVE_ROLLE.CHANGED;
  }
}
