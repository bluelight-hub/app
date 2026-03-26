import { DomainEvent } from '@domain/common/domain-event';
import type { EintragId } from '@domain/value-objects/eintrag-id';
import type { EtbId } from '@domain/value-objects/etb-id';
import type { UserId } from '@domain/value-objects/user-id';
import { EVENT_NAMES } from './event-names';

/**
 * Event: Ein ETB-Eintrag wurde durch einen Korrektur-Eintrag ersetzt.
 *
 * Dieses Event wird emittiert wenn ein bestehender Eintrag korrigiert wird.
 * Der Original-Eintrag bleibt unveraendert erhalten, ein neuer Korrektur-Eintrag
 * wird erstellt und mit dem Original verknuepft.
 *
 * Analog zum Befehl-Korrektur-Pattern (BefehlStatusGeaendertEvent + BefehlErstelltEvent).
 */
export class EintragKorrigiertEvent extends DomainEvent {
  public static eventName(): string {
    return EVENT_NAMES.ETB.EINTRAG_KORRIGIERT;
  }

  constructor(
    public readonly etbId: EtbId,
    public readonly korrekturEintragId: EintragId,
    public readonly originalEintragId: EintragId,
    public readonly sequenceNumber: number,
    public readonly text: string,
    public readonly createdBy: UserId,
  ) {
    super();
  }
}
