import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Event: Eine Beitrittsanfrage wurde durch eine Führungskraft entschieden.
 */
export class EinsatzBeitrittsanfrageEntschiedenEvent extends DomainEvent {
  constructor(
    public readonly anfrageId: string,
    public readonly einsatzId: string,
    public readonly userId: string,
    public readonly decision: 'GENEHMIGT' | 'ABGELEHNT',
    public readonly resolvedBy: string,
    aggregateId?: string,
  ) {
    super(aggregateId ?? anfrageId);
  }

  static eventName(): string {
    return EVENT_NAMES.BEITRITTSANFRAGE.ENTSCHIEDEN;
  }
}
