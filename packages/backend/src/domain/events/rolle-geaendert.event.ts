import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event: Eine Einsatz-Rolle wurde geaendert.
 *
 * Wird emittiert wenn eine Rolle zugewiesen, geaendert oder entfernt wird.
 * Enthaelt Rich Data fuer Event-Carried State Transfer, damit Handler
 * keine DB-Queries benoetigen (ETB-Eintrag, WebSocket-Benachrichtigung).
 *
 * @remarks Story 5.4 AC4 - Audit Trail
 */
export class RolleGeaendertEvent extends DomainEvent {
  constructor(
    /** ID des betroffenen Einsatzes */
    public readonly einsatzId: string,
    /** ID des Users dessen Rolle geaendert wurde */
    public readonly userId: string,
    /** Anzeigename des Users (fuer ETB-Text ohne DB-Query) */
    public readonly userName: string,
    /** Vorherige Rolle (null bei neuer Zuweisung) */
    public readonly alteRolle: string | null,
    /** Neue Rolle (null bei Entfernung) */
    public readonly neueRolle: string | null,
    /** User-ID desjenigen der die Aenderung durchfuehrt */
    public readonly aenderungDurch: string,
    /** Name desjenigen der die Aenderung durchfuehrt (fuer ETB-Text) */
    public readonly aenderungDurchName: string,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.EINSATZ_ROLLE.GEAENDERT;
  }
}
