import { DomainEvent } from '@domain/common/domain-event';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { EVENT_NAMES } from './event-names';

/**
 * Event: Ein Funkkanal wurde archiviert (finale, aber reversible Transition —
 * aktuell wird nur durch Repository-Prüfung `hasFunkspruchReferenz` vor harter
 * Löschung geschützt).
 */
export class FunkkanalArchiviertEvent extends DomainEvent {
  public static eventName(): string {
    return EVENT_NAMES.FUNKKANAL.ARCHIVIERT;
  }

  constructor(
    public readonly funkkanalId: FunkkanalId,
    public readonly einsatzId: EinsatzId,
  ) {
    super(funkkanalId.value);
  }
}
