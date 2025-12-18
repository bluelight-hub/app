import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn ein Fahrzeug für einen Einsatz erfasst wird.
 *
 * **Zwei Varianten:**
 * - **Aus Stammdaten:** stammId ist gesetzt (Fahrzeug aus StammFahrzeug kopiert)
 * - **Temporär:** stammId ist undefined (Fahrzeug manuell angelegt, z.B. Nachbarfeuerwehr)
 *
 * Dieses Event triggert die automatische ETB-Eintragerstellung:
 * - Mit stammId: "Fahrzeug {funkrufname} erfasst (Status: Einsatzbereit)"
 * - Ohne stammId: "Temporäres Fahrzeug {funkrufname} erfasst (Status: Einsatzbereit)"
 *
 * **Rich Data Pattern:** Enthält alle relevanten Daten für Event Handler
 * um DB-Queries zu vermeiden.
 *
 * **Event Immutability:**
 * - Events verwenden PRIMITIVE Strings statt Value Objects
 * - WARUM? Events sind historische Fakten und müssen serialisierbar sein
 * - Event Store / Event Bus benötigt JSON-serialisierbare Daten
 *
 * **Beziehung zu anderen Events:**
 * - Unterschiedlich von StammFahrzeugCreatedEvent (Stammdaten-Erstellung)
 * - Unterschiedlich von EinsatzCreatedEvent (Einsatz-Erstellung)
 * - Dieses Event beschreibt die ERFASSUNG eines Fahrzeugs für einen Einsatz
 *
 * @example
 * ```typescript
 * // Im EinsatzFahrzeug.createFromStammdaten() Factory:
 * einsatzFahrzeug.addDomainEvent(
 *   new FahrzeugErfasstEvent(
 *     einsatz.id.value,
 *     einsatzFahrzeug.id.value,
 *     einsatzFahrzeug.funkrufname,
 *     stammFahrzeug.id.value, // stammId gesetzt
 *     EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_DEFAULT,
 *     userId
 *   )
 * );
 *
 * // Im EinsatzFahrzeug.createTemporary() Factory:
 * einsatzFahrzeug.addDomainEvent(
 *   new FahrzeugErfasstEvent(
 *     einsatz.id.value,
 *     einsatzFahrzeug.id.value,
 *     einsatzFahrzeug.funkrufname,
 *     undefined, // stammId = undefined für temporäre Fahrzeuge
 *     EINSATZ_FAHRZEUG_VALIDATION.FMS_STATUS_DEFAULT,
 *     userId
 *   )
 * );
 *
 * // Im ETB Auto-Creation Handler:
 * @OnEvent(FahrzeugErfasstEvent.eventName())
 * async handleFahrzeugErfasst(event: FahrzeugErfasstEvent) {
 *   const isTemporary = event.stammId === undefined;
 *   const text = isTemporary
 *     ? `Temporäres Fahrzeug ${event.funkrufname} erfasst (Status: Einsatzbereit)`
 *     : `Fahrzeug ${event.funkrufname} erfasst (Status: Einsatzbereit)`;
 *   await this.createEtbEintrag(event.einsatzId, text);
 * }
 * ```
 */
export class FahrzeugErfasstEvent extends DomainEvent {
  constructor(
    /** Einsatz-ID (UUID) zu dem das Fahrzeug erfasst wurde */
    public readonly einsatzId: string,
    /** Einsatz-Fahrzeug-ID (CUID2) des neu erstellten EinsatzFahrzeug */
    public readonly einsatzFahrzeugId: string,
    /** Funkrufname des Fahrzeugs (kopiert aus StammFahrzeug oder manuell eingegeben) */
    public readonly funkrufname: string,
    /** Stamm-Fahrzeug-ID (CUID2) - undefined bei temporären Fahrzeugen */
    public readonly stammId: string | undefined,
    /** Initialer FMS-Status (0-9, normalerweise 2 = Einsatzbereit) */
    public readonly fmsStatus: number,
    /** User-ID (CUID2) der das Fahrzeug erfasst hat */
    public readonly erfasstVon: string,
  ) {
    // aggregateId = einsatzFahrzeugId für Event Bus Routing
    super(einsatzFahrzeugId);
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   * Verwendet für Event Bus Routing und @OnEvent() Decorator.
   */
  static override eventName(): string {
    return 'einsatz_fahrzeug.erfasst';
  }
}
