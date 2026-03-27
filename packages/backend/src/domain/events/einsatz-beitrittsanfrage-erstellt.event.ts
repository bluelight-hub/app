import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Event: Eine Einsatzkraft hat einen Beitritt zu einem Einsatz angefragt.
 */
export class EinsatzBeitrittsanfrageErstelltEvent extends DomainEvent {
  constructor(
    public readonly anfrageId: string,
    public readonly einsatzId: string,
    public readonly userId: string,
    aggregateId?: string,
  ) {
    super(aggregateId ?? anfrageId);
  }

  static eventName(): string {
    return EVENT_NAMES.BEITRITTSANFRAGE.ERSTELLT;
  }
}
