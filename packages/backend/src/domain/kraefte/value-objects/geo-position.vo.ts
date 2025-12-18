import { Result } from '@domain/common/result';
import { ValueObject } from '@domain/common/value-object';

/**
 * Props Interface für GeoPosition Value Object.
 * Definiert die Struktur der geografischen Koordinaten.
 */
interface GeoPositionProps extends Record<string, unknown> {
  /** Breitengrad: -90 bis +90 (Äquator = 0) */
  lat: number;
  /** Längengrad: -180 bis +180 (Nullmeridian = 0) */
  lng: number;
}

/**
 * Konstanten für GeoPosition Validierung.
 * WGS84 Standard Koordinaten-Grenzen.
 */
export const GEO_POSITION_VALIDATION = {
  LAT_MIN: -90,
  LAT_MAX: 90,
  LNG_MIN: -180,
  LNG_MAX: 180,
} as const;

/**
 * GeoPosition Value Object für geografische Koordinaten.
 *
 * Repräsentiert einen Punkt auf der Erdoberfläche nach WGS84 Standard.
 * Verwendet für Fahrzeug-Positionen auf der Lagekarte.
 *
 * **Warum Value Object?**
 * - Immutabel: Position ändert sich nicht, neues VO bei Positionsupdate
 * - Equality by Value: Zwei Positionen mit gleichen Koordinaten sind gleich
 * - Self-Validating: Konstruktion nur mit validen Koordinaten möglich
 *
 * **WGS84 Koordinatensystem:**
 * - Latitude (Breitengrad): -90° (Südpol) bis +90° (Nordpol)
 * - Longitude (Längengrad): -180° (West) bis +180° (Ost)
 * - Deutschland: ca. 47.3°N - 55.0°N, 5.9°E - 15.0°E
 *
 * @example
 * ```typescript
 * // Feuerwache Köln Innenstadt
 * const position = GeoPosition.create(50.9375, 6.9603);
 * if (position.isSuccess) {
 *   console.log(`Lat: ${position.value.lat}, Lng: ${position.value.lng}`);
 * }
 *
 * // Ungültige Koordinaten
 * const invalid = GeoPosition.create(91, 0); // Lat > 90
 * // invalid.isFailure === true
 * ```
 */
export class GeoPosition extends ValueObject<GeoPositionProps> {
  /**
   * Private Constructor erzwingt Factory Method Nutzung.
   * Verhindert direkte Instanziierung ohne Validation.
   */
  private constructor(lat: number, lng: number) {
    super({ lat, lng });
  }

  /** Breitengrad (Latitude): -90 bis +90 */
  get lat(): number {
    return this.props.lat;
  }

  /** Längengrad (Longitude): -180 bis +180 */
  get lng(): number {
    return this.props.lng;
  }

  /**
   * Factory Method mit Koordinaten-Validierung.
   * Verwendet Result<T> Pattern zur expliziten Fehlerbehandlung.
   *
   * @param lat - Breitengrad (-90 bis +90)
   * @param lng - Längengrad (-180 bis +180)
   * @returns Result<GeoPosition> - Success mit Position oder Failure mit Error
   */
  static create(lat: number, lng: number): Result<GeoPosition> {
    // Latitude Validierung (WGS84: -90 bis +90)
    if (lat < GEO_POSITION_VALIDATION.LAT_MIN || lat > GEO_POSITION_VALIDATION.LAT_MAX) {
      return Result.fail<GeoPosition>(`Latitude must be between ${GEO_POSITION_VALIDATION.LAT_MIN} and ${GEO_POSITION_VALIDATION.LAT_MAX}, got: ${lat}`);
    }

    // Longitude Validierung (WGS84: -180 bis +180)
    if (lng < GEO_POSITION_VALIDATION.LNG_MIN || lng > GEO_POSITION_VALIDATION.LNG_MAX) {
      return Result.fail<GeoPosition>(`Longitude must be between ${GEO_POSITION_VALIDATION.LNG_MIN} and ${GEO_POSITION_VALIDATION.LNG_MAX}, got: ${lng}`);
    }

    return Result.ok<GeoPosition>(new GeoPosition(lat, lng));
  }

  /**
   * Konvertiert zu JSON-kompatiblem Objekt für Prisma JsonB Speicherung.
   * Prisma's JsonB Typ erwartet ein einfaches Objekt.
   *
   * @returns { lat: number, lng: number }
   */
  toJSON(): { lat: number; lng: number } {
    return {
      lat: this.lat,
      lng: this.lng,
    };
  }

  /**
   * Erstellt GeoPosition aus JSON-Objekt (Prisma Rekonstruktion).
   * Validiert die Werte auch bei Rekonstruktion (Defense-in-Depth).
   *
   * @param json - JSON-Objekt mit lat und lng
   * @returns Result<GeoPosition>
   */
  static fromJSON(json: { lat: number; lng: number }): Result<GeoPosition> {
    return GeoPosition.create(json.lat, json.lng);
  }

  /**
   * String-Repräsentation der Position.
   * Format: "lat,lng" (Google Maps kompatibel)
   */
  toString(): string {
    return `${this.lat},${this.lng}`;
  }
}
