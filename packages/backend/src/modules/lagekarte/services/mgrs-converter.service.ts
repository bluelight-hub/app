import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as mgrs from 'mgrs';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';

/**
 * MGRS Converter Service
 *
 * Konvertiert zwischen geografischen Koordinaten (Lat/Lng) und dem
 * Military Grid Reference System (MGRS) Format.
 *
 * **MGRS Format:**
 * - Grid Zone Designator (z.B. "33U")
 * - 100km Square Identifier (z.B. "VU")
 * - Numerische Koordinaten (z.B. "1234567890")
 *
 * **Precision Levels:**
 * - 0: 100km (keine numerischen Koordinaten)
 * - 1: 10km (1 Ziffer pro Achse)
 * - 2: 1km (2 Ziffern pro Achse)
 * - 3: 100m (3 Ziffern pro Achse)
 * - 4: 10m (4 Ziffern pro Achse)
 * - 5: 1m (5 Ziffern pro Achse) - Default
 *
 * @see https://en.wikipedia.org/wiki/Military_Grid_Reference_System
 */
@Injectable()
export class MgrsConverterService {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  /**
   * Konvertiert geografische Koordinaten (Lat/Lng) zu MGRS Format
   *
   * Nutzt die mgrs Library, um WGS84-Koordinaten in das Military Grid Reference System
   * Format zu konvertieren. Die Precision bestimmt die Genauigkeit der Koordinaten.
   *
   * @param latitude - Breitengrad (-90 bis 90)
   * @param longitude - Längengrad (-180 bis 180)
   * @param precision - MGRS Precision (0-5, default: 5 = 1m Genauigkeit)
   * @returns MGRS String (z.B. "33UVU1234567890" für precision=5)
   * @throws BadRequestException wenn Koordinaten ungültig sind
   *
   * @example
   * ```typescript
   * // Berlin Brandenburger Tor mit 1m Genauigkeit
   * const mgrsStr = mgrsConverter.latLngToMgrs(52.516275, 13.377704, 5);
   * console.log(mgrsStr); // "33UUU9185320652"
   *
   * // Mit 100m Genauigkeit
   * const mgrsStr100m = mgrsConverter.latLngToMgrs(52.516275, 13.377704, 3);
   * console.log(mgrsStr100m); // "33UUU918206"
   * ```
   */
  latLngToMgrs(latitude: number, longitude: number, precision = 5): string {
    // Input-Validierung
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new BadRequestException('Latitude und Longitude müssen Zahlen sein');
    }

    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException(`Ungültiger Breitengrad: ${latitude} (erlaubt: -90 bis 90)`);
    }

    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException(`Ungültiger Längengrad: ${longitude} (erlaubt: -180 bis 180)`);
    }

    if (precision < 0 || precision > 5 || !Number.isInteger(precision)) {
      throw new BadRequestException(`Ungültige Precision: ${precision} (erlaubt: 0-5)`);
    }

    try {
      // mgrs Library erwartet [longitude, latitude] Format
      const mgrsString = mgrs.forward([longitude, latitude], precision);

      this.logger.debug(`LatLng → MGRS: (${latitude}, ${longitude}) [precision=${precision}] → ${mgrsString}`);

      return mgrsString;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Fehler bei LatLng → MGRS Konvertierung: ${errorMessage}`);
      throw new BadRequestException(`Konvertierung zu MGRS fehlgeschlagen: ${errorMessage}`);
    }
  }

  /**
   * Konvertiert MGRS Format zu geografischen Koordinaten (Lat/Lng)
   *
   * Nutzt die mgrs Library, um einen MGRS String in WGS84-Koordinaten zu konvertieren.
   * Gibt den Mittelpunkt der MGRS-Zelle zurück.
   *
   * @param mgrsString - MGRS String (z.B. "33UVU1234567890")
   * @returns Koordinaten-Objekt { latitude: number, longitude: number }
   * @throws BadRequestException wenn MGRS String ungültig ist
   *
   * @example
   * ```typescript
   * const coords = mgrsConverter.mgrsToLatLng("33UUU9185320652");
   * console.log(coords); // { latitude: 52.516275, longitude: 13.377704 }
   * ```
   */
  mgrsToLatLng(mgrsString: string): { latitude: number; longitude: number } {
    // Input-Validierung
    if (typeof mgrsString !== 'string' || mgrsString.trim().length === 0) {
      throw new BadRequestException('MGRS String darf nicht leer sein');
    }

    const trimmedMgrs = mgrsString.trim();

    // Basis-Validierung des MGRS Formats
    if (!this.isValidMgrs(trimmedMgrs)) {
      throw new BadRequestException(`Ungültiges MGRS Format: ${trimmedMgrs}`);
    }

    try {
      // mgrs Library gibt [longitude, latitude] zurück
      const point = mgrs.toPoint(trimmedMgrs);

      if (!point || point.length !== 2) {
        throw new Error('Konvertierung lieferte ungültiges Ergebnis');
      }

      const [longitude, latitude] = point;

      this.logger.debug(`MGRS → LatLng: ${trimmedMgrs} → (${latitude}, ${longitude})`);

      return { latitude, longitude };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Fehler bei MGRS → LatLng Konvertierung: ${errorMessage}`);
      throw new BadRequestException(`Konvertierung von MGRS fehlgeschlagen: ${errorMessage}`);
    }
  }

  /**
   * Validiert ob ein String ein gültiges MGRS Format hat
   *
   * Prüft ob der String dem MGRS Format-Schema entspricht, ohne die Konvertierung durchzuführen.
   * Das Format besteht aus:
   * - Grid Zone Designator (1-2 Ziffern + Buchstabe, z.B. "33U")
   * - 100km Square Identifier (2 Buchstaben, z.B. "VU")
   * - Optionale numerische Koordinaten (0-10 Ziffern, gerade Anzahl)
   *
   * @param mgrsString - Zu validierender MGRS String
   * @returns true wenn Format gültig, false sonst
   *
   * @example
   * ```typescript
   * mgrsConverter.isValidMgrs("33UVU1234567890"); // true
   * mgrsConverter.isValidMgrs("33UVU");           // true (precision=0)
   * mgrsConverter.isValidMgrs("invalid");         // false
   * mgrsConverter.isValidMgrs("");                // false
   * ```
   */
  isValidMgrs(mgrsString: string): boolean {
    if (typeof mgrsString !== 'string' || mgrsString.trim().length === 0) {
      return false;
    }

    const trimmedMgrs = mgrsString.trim();

    // MGRS Format: [Grid Zone][100km Square][Easting][Northing]
    // z.B. "33UVU1234567890"
    // - Grid Zone: 1-2 Ziffern + Buchstabe (z.B. "33U" oder "5Q")
    // - 100km Square: 2 Buchstaben (z.B. "VU")
    // - Easting/Northing: 0-10 Ziffern (gerade Anzahl, je 0-5 pro Achse)
    //
    // Minimum: "1ABC" (4 chars) - Grid Zone + 100km Square
    // Maximum: "99ABC1234567890" (15 chars) - mit voller Precision
    const mgrsRegex = /^(\d{1,2}[A-Z])([A-Z]{2})(\d{0,10})$/;

    const match = trimmedMgrs.match(mgrsRegex);

    if (!match) {
      return false;
    }

    const [, , , digits] = match;

    // Numerische Koordinaten müssen gerade Anzahl haben (Easting + Northing)
    if (digits && digits.length % 2 !== 0) {
      return false;
    }

    // Zusätzliche Validierung durch Konvertierungs-Versuch
    try {
      mgrs.toPoint(trimmedMgrs);
      return true;
    } catch {
      return false;
    }
  }
}
