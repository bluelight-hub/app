import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn eine Person von einem Fahrzeug entfernt wird.
 *
 * **Business Rule:**
 * - Person muss dem Fahrzeug zuvor zugewiesen gewesen sein
 * - Nach Entfernung ist Person keinem Fahrzeug mehr zugewiesen
 * - Kann explizit oder implizit (bei Neuzuweisung) auftreten
 *
 * Dieses Event triggert die automatische ETB-Eintragerstellung:
 * - "{vorname} {nachname} von {funkrufname} entfernt"
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
 * - Unterschiedlich von PersonZuFahrzeugZugewiesenEvent (Gegenteil-Operation)
 * - Unterschiedlich von EinsatzPersonHinzugefuegtEvent (Person-Registrierung)
 * - Unterschiedlich von FahrzeugErfasstEvent (Fahrzeug-Erstellung)
 * - Dieses Event beschreibt die ENTFERNUNG einer Person von einem Fahrzeug
 *
 * **Use Cases:**
 * - Explizite Entfernung: User entfernt Person manuell
 * - Implizite Entfernung: Person wird anderem Fahrzeug zugewiesen (alte Zuweisung wird gelöscht)
 *
 * @example
 * ```typescript
 * // Im EinsatzPerson.entferneVonFahrzeug() Method:
 * einsatzPerson.addDomainEvent(
 *   new PersonVonFahrzeugEntferntEvent(
 *     einsatz.id.value,
 *     person.id.value,
 *     oldFahrzeug.id.value,
 *     person.vorname,
 *     person.nachname,
 *     oldFahrzeug.funkrufname,
 *     userId
 *   )
 * );
 *
 * // Im ETB Auto-Creation Handler:
 * @OnEvent(PersonVonFahrzeugEntferntEvent.eventName())
 * async handlePersonEntfernt(event: PersonVonFahrzeugEntferntEvent) {
 *   const text = `${event.personVorname} ${event.personNachname} von ${event.fahrzeugFunkrufname} entfernt`;
 *   await this.createEtbEintrag(event.einsatzId, text);
 * }
 * ```
 */
export class PersonVonFahrzeugEntferntEvent extends DomainEvent {
  constructor(
    /** Einsatz-ID (UUID) zu dem Person und Fahrzeug gehören */
    public readonly einsatzId: string,
    /** Einsatz-Person-ID (CUID2) der entfernten Person */
    public readonly personId: string,
    /** Einsatz-Fahrzeug-ID (CUID2) des ehemaligen Fahrzeugs */
    public readonly fahrzeugId: string,
    /** Vorname der Person (KOPIE aus EinsatzPerson) */
    public readonly personVorname: string,
    /** Nachname der Person (KOPIE aus EinsatzPerson) */
    public readonly personNachname: string,
    /** Funkrufname des Fahrzeugs (KOPIE aus EinsatzFahrzeug) */
    public readonly fahrzeugFunkrufname: string,
    /** User-ID (CUID2) der die Entfernung durchgeführt hat (für Audit) */
    public readonly entferntVon: string,
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
    return 'einsatz_person.von_fahrzeug_entfernt';
  }
}
