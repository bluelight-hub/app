import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn Personen aus einem externen System importiert wurden.
 *
 * Story 7.2: HiOrg-Server Import
 *
 * Dieses Event wird nach erfolgreichem (Teil-)Import emittiert und enthält
 * Statistiken über den Import-Vorgang.
 *
 * **Verwendung:**
 * - Audit-Trail: Wer hat wann was importiert
 * - Notifications: Admin über Import-Ergebnis informieren
 * - Analytics: Import-Statistiken erfassen
 *
 * **aggregateId:**
 * - Verwendet eine synthetische ID aus Timestamp + Source
 * - Format: `import-{source}-{timestamp}`
 * - Da es kein einzelnes Aggregate gibt, dient dies der Event-Korrelation
 */
export class PersonenImportiertEvent extends DomainEvent {
  constructor(
    /** Anzahl erfolgreich importierter (neue) Personen */
    public readonly importedCount: number,
    /** Anzahl aktualisierter (existierende) Personen */
    public readonly updatedCount: number,
    /** Anzahl fehlgeschlagener Imports */
    public readonly failedCount: number,
    /** Quelle der Importdaten */
    public readonly source: 'HIORG_SERVER',
    /** User der den Import initiiert hat */
    public readonly importedByUserId: string,
    /** Details zu fehlgeschlagenen Imports (optional) */
    public readonly failures?: Array<{ username: string; reason: string }>,
  ) {
    // Synthetische aggregateId für Event-Korrelation
    super(`import-${source.toLowerCase()}-${Date.now()}`);
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   */
  static override eventName(): string {
    return 'PersonenImportiert';
  }

  /**
   * Gesamtzahl der verarbeiteten Personen.
   */
  get totalProcessed(): number {
    return this.importedCount + this.updatedCount + this.failedCount;
  }

  /**
   * Erfolgsrate in Prozent.
   */
  get successRate(): number {
    if (this.totalProcessed === 0) return 100;
    return Math.round(((this.importedCount + this.updatedCount) / this.totalProcessed) * 100);
  }
}
