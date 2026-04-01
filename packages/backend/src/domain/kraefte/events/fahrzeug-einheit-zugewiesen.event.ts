import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn ein Fahrzeug einer Einheit zugewiesen oder entfernt wird.
 *
 * Triggert automatischen ETB-Eintrag:
 * - Zuweisung: "Fahrzeug {funkrufname} der Einheit {einheitName} zugewiesen"
 * - Entfernung: "Fahrzeug {funkrufname} von Einheit entfernt"
 *
 * Rich Data Pattern: Enthält denormalisierte Daten damit Event Handler ohne DB-Query arbeiten.
 */
export class FahrzeugEinheitZugewiesenEvent extends DomainEvent {
  constructor(
    /** Einsatz-ID (UUID) */
    public readonly einsatzId: string,
    /** Fahrzeug-ID (CUID2) */
    public readonly fahrzeugId: string,
    /** Funkrufname des Fahrzeugs (denormalisiert für ETB) */
    public readonly funkrufname: string,
    /** Neue Einheit-ID (CUID2) oder null bei Entfernung */
    public readonly einheitId: string | null,
    /** Name der neuen Einheit (denormalisiert für ETB) oder null */
    public readonly einheitName: string | null,
    /** Vorherige Einheit-ID oder null */
    public readonly previousEinheitId: string | null,
    /** User-ID (CUID2) der die Zuweisung vorgenommen hat */
    public readonly updatedBy: string,
  ) {
    super(fahrzeugId);
  }

  static override eventName(): string {
    return 'einsatz_fahrzeug.einheit_zugewiesen';
  }
}
