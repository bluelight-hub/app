/**
 * Adresssuche Port - Framework-agnostisches Interface für Adress-Autocomplete.
 *
 * Ermöglicht die Suche nach Adressen über eine externe API (Photon/Komoot)
 * im Application Layer ohne direkte HTTP-Client-Abhängigkeiten.
 *
 * **Clean Architecture:**
 * - Domain/Application Layer hängen von diesem Port ab (Dependency Inversion)
 * - Infrastructure Layer implementiert diesen Port mit HTTP-Client
 * - Ermöglicht einfaches Testen (Mock API) und Framework-Unabhängigkeit
 *
 * @module domain/ports
 * @see AddressSucheAdapter - Infrastructure Adapter für Photon/Komoot
 */

import type { Result } from '@domain/common/result';

/**
 * Einzelnes Adress-Suchergebnis.
 *
 * Enthält strukturierte Adressdaten mit Geokoordinaten.
 */
export interface AddressSucheErgebnis {
  /** Straßenname (z.B. "Marienplatz") */
  strasse: string;
  /** Hausnummer (optional, z.B. "1a") */
  hausnummer?: string;
  /** Ortsname (z.B. "München") */
  ort: string;
  /** Postleitzahl (optional, z.B. "80331") */
  plz?: string;
  /** Bundesland oder Region (optional, z.B. "Bayern") */
  bundesland?: string;
  /** Land (z.B. "Germany") */
  land: string;
  /** Längengrad als String (z.B. "11.5761") */
  laengengrad: string;
  /** Breitengrad als String (z.B. "48.1372") */
  breitengrad: string;
}

/**
 * Optionale Parameter für die Adresssuche.
 */
export interface AddressSucheOptionen {
  /** Breitengrad für Ergebnis-Bias (z.B. "48.1372") */
  lat?: string;
  /** Längengrad für Ergebnis-Bias (z.B. "11.5761") */
  lon?: string;
  /** Sprache der Ergebnisse (z.B. "de") */
  lang?: string;
  /** Maximale Anzahl Ergebnisse (1-10) */
  limit?: number;
  /** ISO-3166-1 Alpha-2 Ländercode-Filter (z.B. "de") */
  countryCode?: string;
}

/**
 * Framework-agnostisches Interface für Adresssuche.
 *
 * Verwendet von Application Layer Handlers für Adress-Autocomplete-Abfragen.
 */
export interface IAddressSuchePort {
  /**
   * Sucht Adressen anhand eines Suchbegriffs.
   *
   * @param query - Suchbegriff (z.B. "Marienplatz München")
   * @param options - Optionale Such-Parameter (Koordinaten, Sprache, Limit)
   * @returns Result mit Liste von Adress-Ergebnissen bei Erfolg
   *
   * **Mögliche Fehler:**
   * - GEO_003: Externe API nicht erreichbar (Circuit Open oder Timeout)
   * - GEO_004: Ungültiger Suchbegriff
   */
  search(query: string, options?: AddressSucheOptionen): Promise<Result<AddressSucheErgebnis[]>>;
}
