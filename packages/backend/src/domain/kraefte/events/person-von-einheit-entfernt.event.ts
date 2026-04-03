import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn eine Person von einer taktischen Einheit entfernt wird.
 *
 * Dieses Event triggert die automatische ETB-Eintragerstellung:
 * - "Person {personVorname} {personNachname} von Einheit {einheitName} entfernt"
 *
 * **Rich Data Pattern:** Enthält denormalisierte Daten (Namen) damit Event Handler
 * ohne DB-Query arbeiten können.
 *
 * @example
 * ```typescript
 * // Im Command Handler nach erfolgreicher Entfernung:
 * einheit.addDomainEvent(
 *   new PersonVonEinheitEntferntEvent(
 *     einsatzId,
 *     einheit.id.value,
 *     einheit.name,
 *     person.id.value,
 *     person.vorname,
 *     person.nachname,
 *     updatedBy,
 *   )
 * );
 * ```
 */
export class PersonVonEinheitEntferntEvent extends DomainEvent {
  constructor(
    /** Einsatz-ID (UUID) zu dem die Einheit gehört */
    public readonly einsatzId: string,
    /** Einheit-ID (CUID2) von der die Person entfernt wurde */
    public readonly einheitId: string,
    /** Name der Einheit (denormalisiert für ETB) */
    public readonly einheitName: string,
    /** Person-ID (CUID2) der entfernten Person */
    public readonly personId: string,
    /** Vorname der entfernten Person (denormalisiert für ETB) */
    public readonly personVorname: string,
    /** Nachname der entfernten Person (denormalisiert für ETB) */
    public readonly personNachname: string,
    /** User-ID (CUID2) der die Entfernung vorgenommen hat */
    public readonly updatedBy: string,
  ) {
    // aggregateId = einheitId für Event Bus Routing
    super(einheitId);
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   * Verwendet für Event Bus Routing und @OnEvent() Decorator.
   */
  static override eventName(): string {
    return 'einsatz_einheit.person_entfernt';
  }
}
