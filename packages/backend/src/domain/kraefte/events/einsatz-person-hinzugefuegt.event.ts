import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn eine Person für einen Einsatz registriert wird.
 *
 * **Zwei Varianten:**
 * - **Aus Stammdaten:** stammId ist gesetzt (Person aus StammPerson kopiert)
 * - **Temporär:** stammId ist undefined (Person manuell registriert, z.B. externe Helfer)
 *
 * Dieses Event triggert die automatische ETB-Eintragerstellung:
 * - Mit stammId: "Person {vorname} {nachname} registriert (Funktion: {funktion})"
 * - Ohne stammId: "Temporäre Person {vorname} {nachname} registriert (Funktion: {funktion})"
 *
 * **Snapshot Pattern:** Enthält KOPIEN der Personendaten zum Event-Zeitpunkt.
 * - WARUM? Events sind historische Fakten und müssen unveränderlich sein
 * - Spätere Änderungen an StammPerson dürfen das Event nicht beeinflussen
 * - Event Handler können ohne DB-Query arbeiten (Rich Data Pattern)
 *
 * **Event Immutability:**
 * - Events verwenden PRIMITIVE Strings statt Value Objects
 * - WARUM? Events sind historische Fakten und müssen serialisierbar sein
 * - Event Store / Event Bus benötigt JSON-serialisierbare Daten
 *
 * **Beziehung zu anderen Events:**
 * - Unterschiedlich von StammPersonCreatedEvent (Stammdaten-Erstellung)
 * - Unterschiedlich von EinsatzCreatedEvent (Einsatz-Erstellung)
 * - Dieses Event beschreibt die REGISTRIERUNG einer Person für einen Einsatz
 *
 * @example
 * ```typescript
 * // Im EinsatzPerson.createFromStammdaten() Factory:
 * einsatzPerson.addDomainEvent(
 *   new EinsatzPersonHinzugefuegtEvent(
 *     einsatz.id.value,
 *     einsatzPerson.id.value,
 *     stammPerson.id.value, // stammId gesetzt
 *     stammPerson.vorname,
 *     stammPerson.nachname,
 *     funktion,
 *     userId
 *   )
 * );
 *
 * // Im EinsatzPerson.createTemporary() Factory:
 * einsatzPerson.addDomainEvent(
 *   new EinsatzPersonHinzugefuegtEvent(
 *     einsatz.id.value,
 *     einsatzPerson.id.value,
 *     undefined, // stammId = undefined für temporäre Personen
 *     vorname,
 *     nachname,
 *     funktion,
 *     userId
 *   )
 * );
 *
 * // Im ETB Auto-Creation Handler:
 * @OnEvent(EinsatzPersonHinzugefuegtEvent.eventName())
 * async handlePersonHinzugefuegt(event: EinsatzPersonHinzugefuegtEvent) {
 *   const isTemporary = event.stammId === undefined;
 *   const text = isTemporary
 *     ? `Temporäre Person ${event.vorname} ${event.nachname} registriert (Funktion: ${event.funktion})`
 *     : `Person ${event.vorname} ${event.nachname} registriert (Funktion: ${event.funktion})`;
 *   await this.createEtbEintrag(event.einsatzId, text);
 * }
 * ```
 */
export class EinsatzPersonHinzugefuegtEvent extends DomainEvent {
  constructor(
    /** Einsatz-ID (UUID) zu dem die Person registriert wurde */
    public readonly einsatzId: string,
    /** Einsatz-Person-ID (CUID2) der neu erstellten EinsatzPerson */
    public readonly einsatzPersonId: string,
    /** Stamm-Person-ID (CUID2) - undefined bei temporären Personen */
    public readonly stammId: string | undefined,
    /** Vorname der Person (KOPIE aus StammPerson oder manuell eingegeben) */
    public readonly vorname: string,
    /** Nachname der Person (KOPIE aus StammPerson oder manuell eingegeben) */
    public readonly nachname: string,
    /** Funktion der Person im Einsatz (z.B. "Einsatzleiter", "Maschinist") */
    public readonly funktion: string,
    /** User-ID (CUID2) der die Person registriert hat */
    public readonly registriertVon: string,
  ) {
    // aggregateId = einsatzPersonId für Event Bus Routing
    super(einsatzPersonId);
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   * Verwendet für Event Bus Routing und @OnEvent() Decorator.
   */
  static override eventName(): string {
    return 'einsatz_person.hinzugefuegt';
  }
}
