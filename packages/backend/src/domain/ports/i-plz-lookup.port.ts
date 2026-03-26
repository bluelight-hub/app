/**
 * PLZ-Lookup Port - Framework-agnostisches Interface für Postleitzahlen-Abfragen.
 *
 * Ermöglicht die Abfrage von Ortsinformationen anhand einer Postleitzahl
 * über eine externe API (zippopotam.us) im Application Layer ohne
 * direkte HTTP-Client-Abhängigkeiten.
 *
 * **Clean Architecture:**
 * - Domain/Application Layer hängen von diesem Port ab (Dependency Inversion)
 * - Infrastructure Layer implementiert diesen Port mit HTTP-Client
 * - Ermöglicht einfaches Testen (Mock API) und Framework-Unabhängigkeit
 *
 * @module domain/ports
 * @see PlzLookupAdapter - Infrastructure Adapter für zippopotam.us
 */

import type { Result } from '@domain/common/result';

/**
 * Ortsangabe eines PLZ-Eintrags.
 *
 * Eine PLZ kann mehrere Orte referenzieren (z.B. Stadtteile).
 */
export interface PlzOrt {
  /** Name des Ortes (z.B. "München") */
  ortsname: string;
  /** Bundesland oder Region (z.B. "Bayern") */
  bundesland: string;
  /** Kürzel des Bundeslandes (z.B. "BY") */
  bundeslandKuerzel: string;
  /** Längengrad als String (z.B. "11.571") */
  laengengrad: string;
  /** Breitengrad als String (z.B. "48.1345") */
  breitengrad: string;
}

/**
 * Ergebnis einer PLZ-Abfrage.
 */
export interface PlzLookupErgebnis {
  /** Abgefragte Postleitzahl */
  postleitzahl: string;
  /** Land (z.B. "Germany") */
  land: string;
  /** ISO-3166-1 Alpha-2 Ländercode (z.B. "DE") */
  landKuerzel: string;
  /** Zugehörige Orte (eine PLZ kann mehrere Orte haben) */
  orte: PlzOrt[];
}

/**
 * Framework-agnostisches Interface für PLZ-Lookup.
 *
 * Verwendet von Application Layer Handlers für Postleitzahlen-Abfragen.
 */
export interface IPlzLookupPort {
  /**
   * Sucht Ortsinformationen zur angegebenen Postleitzahl.
   *
   * @param landKuerzel - ISO-3166-1 Alpha-2 Ländercode (z.B. "DE", "AT", "CH")
   * @param plz - Postleitzahl (z.B. "80331")
   * @returns Result mit PLZ-Ergebnis bei Erfolg
   *
   * **Mögliche Fehler:**
   * - GEO_001: PLZ nicht gefunden (404)
   * - GEO_002: Land nicht unterstützt
   * - GEO_003: Externe API nicht erreichbar (Circuit Open oder Timeout)
   */
  lookup(landKuerzel: string, plz: string): Promise<Result<PlzLookupErgebnis>>;
}
