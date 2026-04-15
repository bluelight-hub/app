import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Domain Event: Eine Gefahrenzone wurde auf der Lagekarte erstellt (Issue #627).
 */
export class HazardZoneCreatedEvent extends DomainEvent {
  constructor(
    public readonly einsatzId: string,
    public readonly hazardZoneId: string,
    public readonly gefahrentyp: string,
    public readonly createdBy: string,
  ) {
    super(hazardZoneId);
  }

  static eventName(): string {
    return EVENT_NAMES.HAZARD_ZONE.ERSTELLT;
  }
}
