import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event: Eine Rolle wurde mit einer Person besetzt.
 *
 * Dieses Event wird emittiert wenn eine Führungsrolle (LNA, OrgL, Leiter BHP)
 * mit einer qualifizierten Person besetzt wird. Das Event enthält Snapshot-Daten
 * (Kopien der Namen zum Zeitpunkt der Besetzung), um historische Konsistenz
 * im ETB zu garantieren.
 *
 * @see RollenBesetzung Aggregate für Business Logic
 * @see RollenBesetzungEtbHandler für ETB-Integration
 */
export class RolleBesetzt extends DomainEvent {
  constructor(
    /** Einsatz-ID zu dem die Besetzung gehört */
    public readonly einsatzId: string,
    /** EinsatzPerson-ID der zugewiesenen Person */
    public readonly einsatzPersonId: string,
    /** RollenDefinition-ID der besetzten Rolle */
    public readonly rollenDefinitionId: string,
    /** Snapshot: Rollenname zum Zeitpunkt der Besetzung */
    public readonly rollenName: string,
    /** Snapshot: Vorname der Person zum Zeitpunkt der Besetzung */
    public readonly personVorname: string,
    /** Snapshot: Nachname der Person zum Zeitpunkt der Besetzung */
    public readonly personNachname: string,
    /** User-ID des Benutzers der die Besetzung durchgeführt hat */
    public readonly besetztVon: string,
    occurredOn?: Date,
  ) {
    super(einsatzPersonId, occurredOn);
  }

  /**
   * Eindeutiger Event-Name für Routing und Serialisierung.
   * Verwendet PascalCase-Konvention für neue Events.
   */
  static override eventName(): string {
    return 'rollen_besetzung.besetzt';
  }
}
