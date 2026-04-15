import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Domain Event: Eine Gefahrenzone wurde aktualisiert (Issue #627).
 */
export class HazardZoneUpdatedEvent extends DomainEvent {
  constructor(
    public readonly einsatzId: string,
    public readonly hazardZoneId: string,
    public readonly gefahrentyp: string,
    public readonly updatedBy: string,
  ) {
    super(hazardZoneId);
  }

  static eventName(): string {
    return EVENT_NAMES.HAZARD_ZONE.AKTUALISIERT;
  }
}
