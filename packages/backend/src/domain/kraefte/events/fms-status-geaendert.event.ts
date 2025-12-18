import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn der FMS-Status eines Fahrzeugs geändert wird.
 *
 * Dieses Event triggert die automatische ETB-Eintragerstellung:
 * "Fahrzeug {funkrufname} Status: {alterStatus} → {neuerStatus}"
 *
 * **Rich Data Pattern:** Enthält alle relevanten Daten für Event Handler
 * um DB-Queries zu vermeiden.
 *
 * **Event Immutability:**
 * - Events verwenden PRIMITIVE Strings/Numbers statt Value Objects
 * - WARUM? Events sind historische Fakten und müssen serialisierbar sein
 * - Event Store / Event Bus benötigt JSON-serialisierbare Daten
 *
 * **Beziehung zu anderen Events:**
 * - Unterschiedlich von FahrzeugErfasstEvent (initiale Erfassung)
 * - Dieses Event beschreibt die FMS-STATUS-ÄNDERUNG während eines Einsatzes
 *
 * @example
 * ```typescript
 * // Im EinsatzFahrzeug.updateFmsStatus() Methode:
 * const alterStatus = this.fmsStatus;
 * this.fmsStatus = neuerStatus;
 * this.addDomainEvent(
 *   new FmsStatusGeaendertEvent(
 *     this.id.value,
 *     this.einsatzId.value,
 *     this.funkrufname,
 *     alterStatus,
 *     neuerStatus,
 *     userId
 *   )
 * );
 *
 * // Im ETB Auto-Creation Handler:
 * @OnEvent(FmsStatusGeaendertEvent.eventName())
 * async handleFmsStatusGeaendert(event: FmsStatusGeaendertEvent) {
 *   const text = `Fahrzeug ${event.funkrufname} Status: ${event.alterStatus} → ${event.neuerStatus}`;
 *   await this.createEtbEintrag(event.einsatzId, text);
 * }
 * ```
 */
export class FmsStatusGeaendertEvent extends DomainEvent {
  constructor(
    /** Einsatz-Fahrzeug-ID (CUID2) */
    public readonly einsatzFahrzeugId: string,
    /** Einsatz-ID (UUID) */
    public readonly einsatzId: string,
    /** Funkrufname des Fahrzeugs */
    public readonly funkrufname: string,
    /** Vorheriger FMS-Status (0-9) */
    public readonly alterStatus: number,
    /** Neuer FMS-Status (0-9) */
    public readonly neuerStatus: number,
    /** User-ID (CUID2) der die Änderung durchgeführt hat */
    public readonly geaendertVon: string,
  ) {
    // aggregateId = einsatzFahrzeugId für Event Bus Routing
    super(einsatzFahrzeugId);
  }

  /**
   * Eindeutiger Event-Name für Event-Bus Routing.
   *
   * Format: `{aggregate}.{event_type}` (snake_case)
   * Verwendet von NestJS EventEmitter2 und Outbox Pattern.
   */
  static override eventName(): string {
    return 'einsatz_fahrzeug.fms_status_geaendert';
  }
}
