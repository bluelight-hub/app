import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom, map } from 'rxjs';
import { Throttle } from '@nestjs/throttler';

/**
 * Nominatim API Response Interface
 */
interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/**
 * Geocoding-Service
 *
 * Konvertiert Adressen in geografische Koordinaten mithilfe der Nominatim-API (OpenStreetMap).
 *
 * **Rate-Limiting:**
 * - Nominatim erlaubt maximal 1 Request pro Sekunde
 * - `@Throttle` Decorator erzwingt diese Limitierung
 *
 * **User-Agent Requirement:**
 * - Nominatim Policy erfordert einen User-Agent Header
 * - BluelightHub/1.0 wird automatisch gesetzt
 *
 * **Fallback-Verhalten:**
 * - Bei Geocoding-Fehlern wird `null` zurückgegeben
 * - Frontend muss dann manuelle Koordinaten-Eingabe anbieten
 *
 * @see https://nominatim.org/release-docs/develop/api/Search/
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly nominatimApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.nominatimApiUrl = this.configService.get<string>('NOMINATIM_API_URL') || 'https://nominatim.openstreetmap.org';
  }

  /**
   * Geocodiert eine Adresse zu Koordinaten
   *
   * Nutzt die Nominatim-API, um aus einer Textadresse geografische Koordinaten zu ermitteln.
   * Rate-Limited auf 1 Request/Sekunde gemäß Nominatim Policy.
   *
   * @param address - Adresse als Text (z.B. "Hauptstraße 1, 10115 Berlin")
   * @returns Koordinaten {lat, lon} oder null bei Fehler/keinen Ergebnissen
   *
   * @example
   * ```typescript
   * const coords = await geocodingService.geocodeAddress("Hauptstraße 1, 10115 Berlin");
   * if (coords) {
   *   console.log(`Lat: ${coords.lat}, Lon: ${coords.lon}`);
   * } else {
   *   console.log("Geocoding fehlgeschlagen");
   * }
   * ```
   */
  @Throttle({ default: { limit: 1, ttl: 1000 } }) // 1 req per 1000ms
  async geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
    try {
      this.logger.log(`Geocoding address: ${address}`);

      const url = `${this.nominatimApiUrl}/search`;
      const params = {
        q: address,
        format: 'json',
        limit: '1',
      };

      const response$ = this.httpService
        .get<NominatimResult[]>(url, {
          params,
          headers: {
            'User-Agent': 'BluelightHub/1.0',
          },
        })
        .pipe(
          map((response) => response.data),
          catchError((error) => {
            this.logger.error(`Geocoding failed for address "${address}": ${error.message}`);
            return [null];
          }),
        );

      const results = await firstValueFrom(response$);

      if (!results || results.length === 0 || results[0] === null) {
        this.logger.warn(`No geocoding results for address: ${address}`);
        return null;
      }

      const result = results[0];
      if (!result) {
        this.logger.warn(`Invalid geocoding result for address: ${address}`);
        return null;
      }

      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);

      this.logger.log(`Geocoding successful: ${address} → (${lat}, ${lon})`);

      return { lat, lon };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Unexpected error during geocoding: ${errorMessage}`);
      return null;
    }
  }
}
