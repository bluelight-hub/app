import type { Result } from '@domain/common/result';

/**
 * Daten-Interface für einen Eintrag im Zeichen-Katalog.
 * Enthält alle Informationen, die zur Anzeige und Verwendung des Katalogeintrags benötigt werden.
 */
export interface ZeichenKatalogEintragData {
  id: string;
  name: string;
  kategorie: string;
  beschreibung?: string;
  zeichenDefinition: Record<string, unknown>;
  tags: string[];
  sortOrder: number;
  istStandard: boolean;
}

/**
 * Repository Port Interface für den Zeichen-Katalog.
 *
 * Der Zeichen-Katalog enthält vordefinierte taktische Zeichen, die
 * Benutzer beim Erstellen von Zeichen als Vorlage verwenden können.
 *
 * **Design Constraints:**
 * - Read-Only Interface (Katalogdaten werden nicht über dieses Interface persistiert)
 * - Result<T> Pattern für explizite Fehlerbehandlung
 * - KEINE TransactionContext Parameter (nur Lesezugriff)
 */
export interface IZeichenKatalogRepository {
  /**
   * Gibt alle Katalogeinträge zurück.
   *
   * @returns Result<ZeichenKatalogEintragData[]> - Vollständige Katalogliste
   */
  findAll(): Promise<Result<ZeichenKatalogEintragData[]>>;

  /**
   * Gibt alle Katalogeinträge einer bestimmten Kategorie zurück.
   *
   * @param kategorie - Kategoriename (z.B. "Führung", "Feuerwehr", "THW")
   * @returns Result<ZeichenKatalogEintragData[]> - Gefilterte Katalogliste
   */
  findByKategorie(kategorie: string): Promise<Result<ZeichenKatalogEintragData[]>>;

  /**
   * Durchsucht den Katalog nach Name, Tags und Beschreibung.
   *
   * @param suchbegriff - Freitext-Suchbegriff (case-insensitive)
   * @returns Result<ZeichenKatalogEintragData[]> - Suchergebnisse
   */
  search(suchbegriff: string): Promise<Result<ZeichenKatalogEintragData[]>>;
}
