/**
 * NINA Warnungen Service
 *
 * Proxy für die NINA/BBK Warn-API.
 * Nutzt die öffentliche API des Bundesamts für Bevölkerungsschutz und Katastrophenhilfe.
 *
 * Flow: Koordinate → Gemeinde-Schlüssel (AGS) per Reverse Geocoding → NINA API → Warnungen
 *
 * NINA API Dokumentation: https://nina.api.bund.dev/
 */

import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LOGGER } from '@/infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';
import { firstValueFrom } from 'rxjs';

/** NINA API Basis-URL */
const NINA_API_BASE = 'https://nina.api.proxy.bund.dev/api31';

/** Normalisierte NINA-Warnung */
export interface NinaWarnungResult {
  id: string;
  event: string;
  severity: string;
  headline: string;
  description: string;
  instruction: string;
  sender: string;
  sent: string;
  onset: string;
  expires: string;
  areaDesc: string;
}

/** NINA Dashboard-Response Eintrag */
interface NinaDashboardEntry {
  id: string;
  payload: {
    id: string;
    type: string;
    data: {
      headline: string;
      severity: string;
      area: { description: string };
      expires?: string;
      onset?: string;
      sent?: string;
    };
    sender?: string;
  };
}

/** NINA Warn-Detail Response */
interface NinaWarnungDetail {
  info?: Array<{
    event?: string;
    severity?: string;
    headline?: string;
    description?: string;
    instruction?: string;
    onset?: string;
    expires?: string;
    senderName?: string;
    area?: Array<{ areaDesc?: string }>;
  }>;
  sent?: string;
}

@Injectable()
export class NinaWarnungenService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Fragt NINA-Warnungen an einer Koordinate ab
   *
   * Löst zuerst den AGS per Nominatim Reverse-Geocoding auf,
   * dann fragt die NINA-API ab.
   *
   * @param lng - Längengrad (WGS84)
   * @param lat - Breitengrad (WGS84)
   * @returns Normalisierte Warnungen oder leeres Array
   */
  async queryWarnungenByCoordinate(lng: number, lat: number): Promise<NinaWarnungResult[]> {
    const ags = await this.resolveAgs(lng, lat);
    if (!ags) {
      return [];
    }
    return this.queryWarnungenByAgs(ags);
  }

  /**
   * Löst Koordinaten zu einem 12-stelligen AGS auf (Nominatim Reverse-Geocoding)
   *
   * Nominatim liefert in `extratags` den `de:amtlicher_gemeindeschluessel` (8-stellig).
   * NINA braucht 12 Stellen, daher wird mit '0000' aufgefüllt.
   */
  private async resolveAgs(lng: number, lat: number): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://nominatim.openstreetmap.org/reverse', {
          params: {
            lat: lat.toString(),
            lon: lng.toString(),
            format: 'json',
            extratags: '1',
            'accept-language': 'de',
            zoom: '10',
          },
          headers: {
            'User-Agent': 'BluelightHub/1.0 (Katastrophenschutz-App)',
          },
          timeout: 5000,
        }),
      );

      const data = response.data;
      const ags8 = data?.extratags?.['de:amtlicher_gemeindeschluessel'];

      if (!ags8) {
        this.logger.warn('Kein AGS in Nominatim-Response gefunden', { lng, lat });
        return null;
      }

      // 8-stelligen AGS auf 12 Stellen erweitern (NINA-Format)
      return ags8.padEnd(12, '0');
    } catch (error) {
      this.logger.warn('Nominatim Reverse-Geocoding fehlgeschlagen', { error, lng, lat });
      return null;
    }
  }

  /**
   * Fragt NINA-Warnungen für einen Gemeinde-Schlüssel (AGS) ab
   *
   * @param ags - 12-stelliger Amtlicher Gemeindeschlüssel
   * @returns Normalisierte Warnungen oder leeres Array
   */
  async queryWarnungenByAgs(ags: string): Promise<NinaWarnungResult[]> {
    try {
      // Schritt 1: Dashboard-Warnungen für den AGS laden
      const dashboardUrl = `${NINA_API_BASE}/dashboard/${ags}.json`;
      const dashboardResponse = await firstValueFrom(this.httpService.get<NinaDashboardEntry[]>(dashboardUrl, { timeout: 10000 }));

      const entries = dashboardResponse.data;
      if (!entries || entries.length === 0) {
        return [];
      }

      // Schritt 2: Details für jede Warnung laden (parallel, max 5)
      const detailPromises = entries.slice(0, 5).map((entry) => this.fetchWarnungDetail(entry));
      const results = await Promise.allSettled(detailPromises);

      return results
        .filter((r): r is PromiseFulfilledResult<NinaWarnungResult | null> => r.status === 'fulfilled')
        .map((r) => r.value)
        .filter((r): r is NinaWarnungResult => r !== null);
    } catch (error) {
      this.logger.warn('NINA-Warnungen Abfrage fehlgeschlagen', { error, ags });
      return [];
    }
  }

  /**
   * Lädt Detail-Informationen für eine einzelne Warnung
   */
  private async fetchWarnungDetail(entry: NinaDashboardEntry): Promise<NinaWarnungResult | null> {
    try {
      const detailUrl = `${NINA_API_BASE}/warnings/${entry.id}.json`;
      const detailResponse = await firstValueFrom(this.httpService.get<NinaWarnungDetail>(detailUrl, { timeout: 10000 }));

      const detail = detailResponse.data;
      const info = detail?.info?.[0];

      return {
        id: entry.id,
        event: info?.event ?? entry.payload?.data?.headline ?? '',
        severity: info?.severity ?? entry.payload?.data?.severity ?? '',
        headline: info?.headline ?? entry.payload?.data?.headline ?? '',
        description: info?.description ?? '',
        instruction: info?.instruction ?? '',
        sender: info?.senderName ?? entry.payload?.sender ?? '',
        sent: detail?.sent ?? entry.payload?.data?.sent ?? '',
        onset: info?.onset ?? entry.payload?.data?.onset ?? '',
        expires: info?.expires ?? entry.payload?.data?.expires ?? '',
        areaDesc: info?.area?.[0]?.areaDesc ?? entry.payload?.data?.area?.description ?? '',
      };
    } catch {
      // Fallback: Dashboard-Daten nutzen wenn Detail-Abfrage fehlschlägt
      return {
        id: entry.id,
        event: entry.payload?.data?.headline ?? '',
        severity: entry.payload?.data?.severity ?? '',
        headline: entry.payload?.data?.headline ?? '',
        description: '',
        instruction: '',
        sender: entry.payload?.sender ?? '',
        sent: entry.payload?.data?.sent ?? '',
        onset: entry.payload?.data?.onset ?? '',
        expires: entry.payload?.data?.expires ?? '',
        areaDesc: entry.payload?.data?.area?.description ?? '',
      };
    }
  }
}
