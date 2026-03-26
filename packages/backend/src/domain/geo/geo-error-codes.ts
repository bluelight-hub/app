/**
 * Error Codes für Geo-Module (PLZ-Lookup, Geocoding).
 *
 * Strukturierte Fehlercodes für externe Geo-APIs.
 * Folgt dem Projekt-Pattern: `[ERROR_CODE] Message` Format.
 *
 * @module domain/geo
 */

export const GEO_ERROR_CODES = {
  /** PLZ nicht gefunden (404 von externer API) */
  PLZ_NOT_FOUND: 'GEO_001',
  /** Land wird nicht unterstützt */
  COUNTRY_NOT_SUPPORTED: 'GEO_002',
  /** Externe API nicht erreichbar (Circuit Open oder Timeout) */
  SERVICE_UNAVAILABLE: 'GEO_003',
  /** Ungültiges PLZ- oder Ländercode-Format (Client-Fehler) */
  INVALID_INPUT: 'GEO_004',
} as const;

/** Typisierter Error Code Union Type. */
export type GeoErrorCode = (typeof GEO_ERROR_CODES)[keyof typeof GEO_ERROR_CODES];

/**
 * Hilfsfunktionen für Geo Error Handling.
 */
export class GeoError {
  /** Prüft ob ein Error String einen bestimmten Error Code enthält. */
  static hasCode(error: string | undefined, code: GeoErrorCode): boolean {
    if (!error) return false;
    return error.includes(code);
  }

  /** Extrahiert die Message aus einem formatierten Error String. */
  static extractMessage(error: string | undefined): string {
    if (!error) return 'Unbekannter Fehler';
    const bracketEnd = error.indexOf(']');
    if (bracketEnd === -1 || !error.startsWith('[GEO_')) return error;
    return error.slice(bracketEnd + 1).trimStart() || error;
  }

  /** Erstellt einen formatierten Error String. */
  static format(code: GeoErrorCode, message: string): string {
    return `[${code}] ${message}`;
  }
}
