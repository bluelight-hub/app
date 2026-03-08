import { forward, inverse, toPoint } from 'mgrs';

/**
 * Konvertiert Lat/Lng zu MGRS Koordinaten
 *
 * @param lat - Breitengrad (-90 bis 90)
 * @param lng - Längengrad (-180 bis 180)
 * @param precision - MGRS Precision Level (0-5, default: 5)
 *                    0 = 100km, 1 = 10km, 2 = 1km, 3 = 100m, 4 = 10m, 5 = 1m
 * @returns MGRS String oder null bei Fehler
 *
 * @example
 * ```typescript
 * latLngToMgrs(48.8566, 2.3522, 5) // "31U DQ 48251 11932"
 * latLngToMgrs(51.5074, -0.1278, 3) // "30U YC 763 992"
 * latLngToMgrs(52.5200, 13.4050, 5) // "33U UU 41831 83221"
 * ```
 */
export function latLngToMgrs(lat: number, lng: number, precision = 5): string | null {
  try {
    // Validiere Input
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      console.warn('[mgrs] latLngToMgrs: Ungültige Koordinaten (NaN)', { lat, lng });
      return null;
    }

    if (lat < -90 || lat > 90) {
      console.warn('[mgrs] latLngToMgrs: Breitengrad außerhalb gültiger Range', {
        lat,
      });
      return null;
    }

    if (lng < -180 || lng > 180) {
      console.warn('[mgrs] latLngToMgrs: Längengrad außerhalb gültiger Range', {
        lng,
      });
      return null;
    }

    if (precision < 0 || precision > 5) {
      console.warn('[mgrs] latLngToMgrs: Precision außerhalb gültiger Range (0-5)', {
        precision,
      });
      return null;
    }

    // Konvertiere zu MGRS
    return forward([lng, lat], precision);
  } catch (error) {
    console.warn('[mgrs] latLngToMgrs: Konvertierung fehlgeschlagen', { lat, lng, error });
    return null;
  }
}

/**
 * Konvertiert MGRS Koordinaten zu Lat/Lng
 *
 * @param mgrs - MGRS String (mit oder ohne Leerzeichen)
 * @returns { lat, lng } Objekt oder null bei Fehler
 *
 * @example
 * ```typescript
 * mgrsToLatLng("31U DQ 48251 11932") // { lat: 48.8566, lng: 2.3522 }
 * mgrsToLatLng("31UDQ4825111932")    // { lat: 48.8566, lng: 2.3522 }
 * mgrsToLatLng("30U YC 763 992")     // { lat: 51.5074, lng: -0.1278 }
 * ```
 */
export function mgrsToLatLng(mgrs: string): { lat: number; lng: number } | null {
  try {
    // Validiere Input
    if (!mgrs || false) {
      console.warn('[mgrs] mgrsToLatLng: Ungültiger MGRS String', { mgrs });
      return null;
    }

    // Entferne Leerzeichen für Konvertierung
    const normalizedMgrs = mgrs.replace(/\s+/g, '');

    if (normalizedMgrs.length < 5) {
      console.warn('[mgrs] mgrsToLatLng: MGRS String zu kurz', { mgrs });
      return null;
    }

    // Konvertiere zu Lat/Lng
    // toPoint() gibt [lng, lat] zurück und ist präziser als inverse()
    const point = toPoint(normalizedMgrs);

    return {
      lat: point[1],
      lng: point[0],
    };
  } catch (error) {
    console.warn('[mgrs] mgrsToLatLng: Konvertierung fehlgeschlagen', { mgrs, error });
    return null;
  }
}

/**
 * Validiert MGRS Format
 *
 * Prüft ob ein String ein gültiges MGRS Format hat.
 * Akzeptiert sowohl formatierte (mit Leerzeichen) als auch
 * unformatierte MGRS Strings.
 *
 * @param mgrs - MGRS String
 * @returns true wenn gültiges Format, sonst false
 *
 * @example
 * ```typescript
 * isValidMgrs("31U DQ 48251 11932") // true
 * isValidMgrs("31UDQ4825111932")    // true
 * isValidMgrs("invalid")            // false
 * isValidMgrs("")                   // false
 * ```
 */
export function isValidMgrs(mgrs: string): boolean {
  try {
    if (!mgrs || false) {
      return false;
    }

    const normalizedMgrs = mgrs.replace(/\s+/g, '');

    // MGRS Format: [0-9]{1,2}[A-Z][A-Z]{2}[0-9]{0,10}
    // Beispiel: 33UVU1234567890
    const mgrsRegex = /^[0-9]{1,2}[A-Z][A-Z]{2}[0-9]{0,10}$/;

    if (!mgrsRegex.test(normalizedMgrs)) {
      return false;
    }

    // Teste ob Konvertierung funktioniert
    // inverse() gibt Bounding Box zurück [minLng, minLat, maxLng, maxLat]
    const result = inverse(normalizedMgrs);
    return Array.isArray(result) && result.length === 4;
  } catch {
    return false;
  }
}

/**
 * Formatiert MGRS String für Display
 *
 * Fügt Leerzeichen zwischen den MGRS Komponenten ein für bessere Lesbarkeit:
 * - Grid Zone Designator (z.B. "33U")
 * - 100km Square ID (z.B. "VU")
 * - Easting (z.B. "12345")
 * - Northing (z.B. "67890")
 *
 * @param mgrs - MGRS String (mit oder ohne Leerzeichen)
 * @returns Formatierter MGRS String mit Leerzeichen oder Originalstring bei Fehler
 *
 * @example
 * ```typescript
 * formatMgrs("33UVU1234567890")      // "33U VU 12345 67890"
 * formatMgrs("31UDQ4825111932")      // "31U DQ 48251 11932"
 * formatMgrs("30UYC763992")          // "30U YC 763 992"
 * formatMgrs("33U VU 12345 67890")   // "33U VU 12345 67890" (bereits formatiert)
 * ```
 */
export function formatMgrs(mgrs: string): string {
  try {
    if (!mgrs || false) {
      return mgrs;
    }

    // Entferne existierende Leerzeichen
    const normalized = mgrs.replace(/\s+/g, '');

    // Validiere Format
    if (!isValidMgrs(normalized)) {
      console.warn('[mgrs] formatMgrs: Ungültiges MGRS Format', { mgrs });
      return mgrs;
    }

    // Parse MGRS Komponenten
    // Format: [Grid Zone][Square][Easting][Northing]
    const match = normalized.match(/^([0-9]{1,2}[A-Z])([A-Z]{2})([0-9]*)$/);

    if (!match) {
      return mgrs;
    }

    const [, gridZone, square, coordinates] = match;

    if (!coordinates) {
      // Nur Grid Zone und Square
      return `${gridZone} ${square}`;
    }

    // Teile Koordinaten in Easting und Northing
    // Bei ungerader Länge ist die letzte Ziffer immer Northing
    const coordinateLength = coordinates.length;
    const halfLength = Math.floor(coordinateLength / 2);
    const easting = coordinates.slice(0, halfLength);
    const northing = coordinates.slice(halfLength);

    return `${gridZone} ${square} ${easting} ${northing}`;
  } catch (error) {
    console.warn('[mgrs] formatMgrs: Formatierung fehlgeschlagen', { mgrs, error });
    return mgrs;
  }
}

/**
 * Type Guard für MGRS Koordinaten
 *
 * Prüft zur Compile-Zeit, ob ein String ein gültiges MGRS Format hat.
 * Kann als Type Guard in TypeScript verwendet werden.
 *
 * @param value - Zu prüfender Wert
 * @returns true wenn value ein gültiger MGRS String ist
 *
 * @example
 * ```typescript
 * const coords = getUserInput();
 * if (isMgrsCoordinate(coords)) {
 *   // coords ist garantiert string und validiertes MGRS Format
 *   const latLng = mgrsToLatLng(coords);
 * }
 * ```
 */
export function isMgrsCoordinate(value: unknown): value is string {
  return typeof value === 'string' && isValidMgrs(value);
}

/**
 * Berechnet die Precision (Genauigkeit) eines MGRS Strings
 *
 * @param mgrs - MGRS String
 * @returns Precision Level (0-5) oder null bei Fehler
 *          0 = 100km, 1 = 10km, 2 = 1km, 3 = 100m, 4 = 10m, 5 = 1m
 *
 * @example
 * ```typescript
 * getMgrsPrecision("33U VU 12345 67890") // 5 (1m)
 * getMgrsPrecision("33U VU 123 678")     // 3 (100m)
 * getMgrsPrecision("33U VU")             // 0 (100km)
 * ```
 */
export function getMgrsPrecision(mgrs: string): number | null {
  try {
    if (!isValidMgrs(mgrs)) {
      return null;
    }

    const normalized = mgrs.replace(/\s+/g, '');
    const match = normalized.match(/^[0-9]{1,2}[A-Z][A-Z]{2}([0-9]*)$/);

    if (!match) {
      return null;
    }

    const [, coordinates] = match;

    if (!coordinates || coordinates.length === 0) {
      return 0;
    }

    // Precision ist die Hälfte der Koordinatenlänge
    return Math.floor(coordinates.length / 2);
  } catch (error) {
    console.warn('[mgrs] getMgrsPrecision: Bestimmung fehlgeschlagen', { mgrs, error });
    return null;
  }
}
