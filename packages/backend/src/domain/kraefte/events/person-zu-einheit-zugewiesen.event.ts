import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn eine Person einer taktischen Einheit zugewiesen wird.
 *
 * Dieses Event triggert die automatische ETB-Eintragerstellung:
 * - "Person {personVorname} {personNachname} der Einheit {einheitName} zugewiesen"
 *
 * **Rich Data Pattern:** Enthält denormalisierte Daten (Namen) damit Event Handler
 * ohne DB-Query arbeiten können.
 *
 * @example
 * ```typescript
 * // Im Command Handler nach erfolgreicher Zuweisung:
 * einheit.addDomainEvent(
 *   new PersonZuEinheitZugewiesenEvent(
 *     einsatzId,
 *     einheit.id.value,
 *     einheit.name,
 *     person.id.value,
 *     person.vorname,
 *     person.nachname,
 *     createdBy,
 *   )
 * );
 * ```
 */
export class PersonZuEinheitZugewiesenEvent extends DomainEvent {
  constructor(
    /** Einsatz-ID (UUID) zu dem die Einheit gehört */
    public readonly einsatzId: string,
    /** Einheit-ID (CUID2) der die Person zugewiesen wurde */
    public readonly einheitId: string,
    /** Name der Einheit (denormalisiert für ETB) */
    public readonly einheitName: string,
    /** Person-ID (CUID2) der zugewiesenen Person */
    public readonly personId: string,
    /** Vorname der zugewiesenen Person (denormalisiert für ETB) */
    public readonly personVorname: string,
    /** Nachname der zugewiesenen Person (denormalisiert für ETB) */
    public readonly personNachname: string,
    /** User-ID (CUID2) der die Zuweisung vorgenommen hat */
    public readonly createdBy: string,
  ) {
    // aggregateId = einheitId für Event Bus Routing
    super(einheitId);
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   * Verwendet für Event Bus Routing und @OnEvent() Decorator.
   */
  static override eventName(): string {
    return 'einsatz_einheit.person_zugewiesen';
  }
}
