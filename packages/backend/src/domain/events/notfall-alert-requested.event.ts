import { DomainEvent } from '@domain/common/domain-event';
import type { EintragId } from '@domain/value-objects/eintrag-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { EVENT_NAMES } from './event-names';

/**
 * Event: Ein Funkspruch mit Priorität `notfall` wurde erfasst. Dieses Event
 * wird vom `FunkNotfallHandler` (Application Layer) aus einem `EintragAdded`
 * abgeleitet und löst den Broadcast eines `funk:notfall-alert` an den
 * Einsatz-Room aus.
 *
 * Hinweis: Das Event ist bewusst einsatz-, nicht kanal-bezogen — die
 * aggregateId entspricht der `einsatzId`, damit Broadcast-Adapter ohne
 * zusätzlichen Lookup routen können.
 */
export class NotfallAlertRequestedEvent extends DomainEvent {
  public static eventName(): string {
    return EVENT_NAMES.FUNK.NOTFALL_ALERT_REQUESTED;
  }

  constructor(
    public readonly einsatzId: EinsatzId,
    public readonly funkkanalId: FunkkanalId,
    public readonly funkspruchEintragId: EintragId,
    public readonly text: string,
    public readonly absender?: string,
  ) {
    super(einsatzId.value);
  }
}
