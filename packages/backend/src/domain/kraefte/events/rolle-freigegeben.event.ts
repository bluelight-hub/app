import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event: Eine Rollenbesetzung wurde freigegeben.
 *
 * Dieses Event wird emittiert wenn eine bestehende Rollenbesetzung aufgehoben wird,
 * entweder manuell oder automatisch bei Neu-Besetzung (AC4). Das Event enthält
 * Snapshot-Daten für ETB-Historisierung.
 *
 * @see RollenBesetzung.freigeben() für Business Logic
 * @see AC4: Automatische Freigabe bei Neu-Besetzung
 */
export class RolleFreigegeben extends DomainEvent {
  constructor(
    /** Einsatz-ID zu dem die Besetzung gehörte */
    public readonly einsatzId: string,
    /** EinsatzPerson-ID der freigegebenen Person */
    public readonly einsatzPersonId: string,
    /** RollenDefinition-ID der freigegebenen Rolle */
    public readonly rollenDefinitionId: string,
    /** Snapshot: Rollenname zum Zeitpunkt der Freigabe */
    public readonly rollenName: string,
    /** Snapshot: Vorname der Person zum Zeitpunkt der Freigabe */
    public readonly personVorname: string,
    /** Snapshot: Nachname der Person zum Zeitpunkt der Freigabe */
    public readonly personNachname: string,
    /** User-ID des Benutzers der die Freigabe durchgeführt hat */
    public readonly freigegebenVon: string,
    occurredOn?: Date,
  ) {
    super(einsatzPersonId, occurredOn);
  }

  /**
   * Eindeutiger Event-Name für Routing und Serialisierung.
   * Verwendet Underscore-Konvention konsistent mit RolleBesetzt.
   */
  static override eventName(): string {
    return 'rollen_besetzung.freigegeben';
  }
}
