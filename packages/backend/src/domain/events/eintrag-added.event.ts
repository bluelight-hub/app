import { DomainEvent } from '@domain/common/domain-event';
import type { EintragId } from '@domain/value-objects/eintrag-id';
import type { EintragKontextPersisted } from '@domain/value-objects/eintrag-kontext';
import type { EtbId } from '@domain/value-objects/etb-id';
import type { UserId } from '@domain/value-objects/user-id';
import { EVENT_NAMES } from './event-names';

/**
 * Event: Ein Eintrag wurde zum ETB hinzugefügt.
 *
 * Dieses Event wird emittiert wenn ein neuer Eintrag erfolgreich zum Einsatztagebuch
 * hinzugefügt wurde. Es enthält den vollständigen Kontext für Event-Handler, damit
 * diese ohne zusätzliche Datenbank-Queries reagieren können (Event-Carried State Transfer).
 *
 * **Warum Rich Data?**
 * - sequenceNumber: Für chronologische Sortierung in Read Models
 * - text: Für Notification-Generierung ohne DB-Query
 * - createdBy: Für Audit-Trail und User-Benachrichtigungen
 *
 * **Use Cases:**
 * - Notification Service: Benachrichtige Team über neuen Eintrag
 * - Read Model Update: Aktualisiere denormalisierte ETB-Liste
 * - Audit-Log: Persistiere Änderung in Audit-Datenbank
 * - Analytics: Tracke ETB-Aktivität für Statistiken
 *
 * @example
 * ```typescript
 * // Im EinsatztagebuchAggregate nach addEintrag():
 * this.addDomainEvent(new EintragAddedEvent(
 *   this.id,
 *   eintrag.id,
 *   eintrag.sequenceNumber.value,
 *   'Fahrzeug W1 am Einsatzort',
 *   userId
 * ));
 * ```
 */
export class EintragAddedEvent extends DomainEvent {
  /**
   * Event Name für Event Router (Past Tense).
   *
   * @returns Event Name in past tense
   */
  public static eventName(): string {
    return EVENT_NAMES.ETB.EINTRAG_ADDED;
  }

  /**
   * @param etbId - ID des parent ETB Aggregates
   * @param eintragId - ID des neu hinzugefügten Eintrags
   * @param sequenceNumber - Sequenznummer des Eintrags (primitive für einfache Serialisierung)
   * @param text - Textinhalt des Eintrags
   * @param createdBy - User ID des Erstellers
   * @param kontext - Typisierter Kontext (Default: { type: 'standard' }). Trägt bei
   *   Funksprüchen kanalId + funkPrioritaet und triggert den Notfall-Alert-Handler.
   * @param ereignisZeitpunkt - Optional: Fachlicher Zeitpunkt des Ereignisses
   *   (unterschiedlich zur Erfassungszeit).
   * @param absender - Optional: Absender (Funkrufname) — für Notfall-Alert-Routing
   * @param empfaenger - Optional: Empfänger
   */
  constructor(
    public readonly etbId: EtbId,
    public readonly eintragId: EintragId,
    public readonly sequenceNumber: number,
    public readonly text: string,
    public readonly createdBy: UserId,
    public readonly kontext: EintragKontextPersisted = { type: 'standard' },
    public readonly ereignisZeitpunkt?: Date,
    public readonly absender?: string,
    public readonly empfaenger?: string,
  ) {
    super();
  }
}
