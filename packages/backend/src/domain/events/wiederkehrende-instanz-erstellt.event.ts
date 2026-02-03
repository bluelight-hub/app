import { DomainEvent } from '@domain/common/domain-event';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { ErinnerungId } from '@domain/value-objects/erinnerung-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event das auftritt wenn eine neue wiederkehrende Instanz erstellt wurde.
 * Wird ausgelöst wenn eine wiederkehrende Erinnerung erledigt wird und die nächste Instanz erstellt wird.
 */
export class WiederkehrendeInstanzErstelltEvent extends DomainEvent {
  constructor(
    public readonly erinnerungId: ErinnerungId,
    public readonly parentId: ErinnerungId,
    public readonly einsatzId: EinsatzId,
    public readonly titel: string,
    public readonly faelligAm: Date,
    public readonly sequenceNumber: number,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.ERINNERUNG.WIEDERKEHRENDE_INSTANZ_ERSTELLT;
  }
}
