import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Domain Event: Taktisches Zeichen wurde auf der Lagekarte verschoben.
 * Enthält neue Positionsdaten (WGS84 + optional MGRS).
 */
export class ZeichenVerschobenEvent extends DomainEvent {
  constructor(
    public readonly zeichenId: string,
    public readonly einsatzId: string,
    public readonly lat: number,
    public readonly lng: number,
    public readonly mgrs: string | undefined,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.TAKTISCHES_ZEICHEN.VERSCHOBEN;
  }
}
