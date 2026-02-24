import type { Befehl } from '@domain/aggregates/befehl.aggregate';

/**
 * Port-Interface fuer Befehl-CSV-Generierung.
 *
 * Definiert im Application Layer, implementiert im Infrastructure Layer.
 * Ermoeglicht saubere Dependency Inversion (Hexagonale Architektur).
 *
 * **Story 4.4: Befehlsdaten-Export fuer Nachbereitung**
 */
export interface IBefehlCsvService {
  /**
   * Generiert CSV-Inhalt aus Befehl-Aggregaten.
   *
   * @param befehle - Befehl-Aggregate zum Exportieren
   * @returns CSV-String mit BOM, Header und Datenzeilen
   */
  generateCsv(befehle: Befehl[]): string;
}
