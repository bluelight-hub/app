import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Domain Event: Taktisches Zeichen wurde von der Lagekarte entfernt (gelöscht).
 */
export class ZeichenEntferntEvent extends DomainEvent {
  constructor(
    public readonly zeichenId: string,
    public readonly einsatzId: string,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.TAKTISCHES_ZEICHEN.ENTFERNT;
  }
}
