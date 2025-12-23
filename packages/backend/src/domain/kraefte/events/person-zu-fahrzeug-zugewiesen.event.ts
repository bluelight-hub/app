import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn eine Person einem Fahrzeug zugewiesen wird.
 *
 * **Business Rule:**
 * - Person und Fahrzeug müssen zum gleichen Einsatz gehören
 * - Person kann maximal einem Fahrzeug zugewiesen sein (1:n Beziehung)
 * - Zuweisung überschreibt vorherige Zuweisungen automatisch
 *
 * Dieses Event triggert die automatische ETB-Eintragerstellung:
 * - "{vorname} {nachname} zu {funkrufname} zugewiesen"
 *
 * **Snapshot Pattern:** Enthält KOPIEN der Personen- und Fahrzeugdaten zum Event-Zeitpunkt.
 * - WARUM? Events sind historische Fakten und müssen unveränderlich sein
 * - Spätere Änderungen an EinsatzPerson oder EinsatzFahrzeug dürfen das Event nicht beeinflussen
 * - Event Handler können ohne DB-Query arbeiten (Rich Data Pattern)
 *
 * **Event Immutability:**
 * - Events verwenden PRIMITIVE Strings statt Value Objects
 * - WARUM? Events sind historische Fakten und müssen serialisierbar sein
 * - Event Store / Event Bus benötigt JSON-serialisierbare Daten
 *
 * **Beziehung zu anderen Events:**
 * - Unterschiedlich von PersonVonFahrzeugEntferntEvent (Gegenteil-Operation)
 * - Unterschiedlich von EinsatzPersonHinzugefuegtEvent (Person-Registrierung)
 * - Unterschiedlich von FahrzeugErfasstEvent (Fahrzeug-Erstellung)
 * - Dieses Event beschreibt die ZUWEISUNG einer Person zu einem Fahrzeug
 *
 * @example
 * ```typescript
 * // Im EinsatzPerson.zuweiseZuFahrzeug() Method:
 * einsatzPerson.addDomainEvent(
 *   new PersonZuFahrzeugZugewiesenEvent(
 *     einsatz.id.value,
 *     person.id.value,
 *     fahrzeug.id.value,
 *     person.vorname,
 *     person.nachname,
 *     fahrzeug.funkrufname,
 *     userId
 *   )
 * );
 *
 * // Im ETB Auto-Creation Handler:
 * @OnEvent(PersonZuFahrzeugZugewiesenEvent.eventName())
 * async handlePersonZugewiesen(event: PersonZuFahrzeugZugewiesenEvent) {
 *   const text = `${event.personVorname} ${event.personNachname} zu ${event.fahrzeugFunkrufname} zugewiesen`;
 *   await this.createEtbEintrag(event.einsatzId, text);
 * }
 * ```
 */
export class PersonZuFahrzeugZugewiesenEvent extends DomainEvent {
  constructor(
    /** Einsatz-ID (UUID) zu dem Person und Fahrzeug gehören */
    public readonly einsatzId: string,
    /** Einsatz-Person-ID (CUID2) der zugewiesenen Person */
    public readonly personId: string,
    /** Einsatz-Fahrzeug-ID (CUID2) des Zielfahrzeugs */
    public readonly fahrzeugId: string,
    /** Vorname der Person (KOPIE aus EinsatzPerson) */
    public readonly personVorname: string,
    /** Nachname der Person (KOPIE aus EinsatzPerson) */
    public readonly personNachname: string,
    /** Funkrufname des Fahrzeugs (KOPIE aus EinsatzFahrzeug) */
    public readonly fahrzeugFunkrufname: string,
    /** User-ID (CUID2) der die Zuweisung durchgeführt hat (für Audit) */
    public readonly zugewiesenVon: string,
    /** Optional: Override für occurredAt Timestamp (für Rehydration) */
    occurredOn?: Date,
  ) {
    // aggregateId = personId für Event Bus Routing
    super(personId, occurredOn);
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   * Verwendet für Event Bus Routing und @OnEvent() Decorator.
   */
  static override eventName(): string {
    return 'einsatz_person.zu_fahrzeug_zugewiesen';
  }
}
