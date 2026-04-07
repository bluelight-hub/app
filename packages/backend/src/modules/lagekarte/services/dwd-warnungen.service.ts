/**
 * DWD Warnungen Service
 *
 * Proxy für DWD WMS GetFeatureInfo-Abfragen.
 * Holt Wetterwarnungen an einer bestimmten Koordinate und normalisiert die Daten.
 */

import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LOGGER } from '@/infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';
import { firstValueFrom } from 'rxjs';

/** DWD WMS Konfiguration */
const DWD_WMS_URL = 'https://maps.dwd.de/geoserver/dwd/wms';
const DWD_WMS_LAYERS = 'dwd:Warnungen_Gemeinden_vereinigt';

/** Normalisierte DWD-Warnung */
export interface DwdWarnungResult {
  event: string;
  severity: string;
  description: string;
  instruction: string;
  onset: string;
  expires: string;
  areaDesc: string;
  headline: string;
}

@Injectable()
export class DwdWarnungenService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Fragt DWD-Warnungen an einer Koordinate ab
   *
   * Sendet einen WMS GetFeatureInfo-Request an den DWD-GeoServer
   * und normalisiert die Response.
   *
   * @param lng - Längengrad (WGS84)
   * @param lat - Breitengrad (WGS84)
   * @param zoom - Karten-Zoom-Level (für BBOX-Berechnung)
   * @returns Normalisierte Warnungen oder leeres Array
   */
  async queryWarnungen(lng: number, lat: number, zoom: number): Promise<DwdWarnungResult[]> {
    const bbox = this.computeBbox(lng, lat, zoom);

    const params = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: '1.1.1',
      REQUEST: 'GetFeatureInfo',
      LAYERS: DWD_WMS_LAYERS,
      QUERY_LAYERS: DWD_WMS_LAYERS,
      STYLES: '',
      SRS: 'EPSG:3857',
      WIDTH: '256',
      HEIGHT: '256',
      BBOX: `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`,
      X: '128',
      Y: '128',
      INFO_FORMAT: 'application/json',
      FEATURE_COUNT: '10',
    });

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${DWD_WMS_URL}?${params.toString()}`, {
          timeout: 10000,
        }),
      );

      const data = response.data;

      if (!data?.features || data.features.length === 0) {
        return [];
      }

      return data.features.map((feature: { properties: Record<string, string> }) => {
        const props = feature.properties;
        return {
          event: props.EVENT ?? props.event ?? '',
          severity: props.SEVERITY ?? props.severity ?? '',
          description: props.DESCRIPTION ?? props.description ?? '',
          instruction: props.INSTRUCTION ?? props.instruction ?? '',
          onset: props.ONSET ?? props.onset ?? '',
          expires: props.EXPIRES ?? props.expires ?? '',
          areaDesc: props.AREADESC ?? props.areaDesc ?? props.AREA_DESC ?? '',
          headline: props.HEADLINE ?? props.headline ?? '',
        };
      });
    } catch (error) {
      this.logger.warn('DWD GetFeatureInfo-Abfrage fehlgeschlagen', { error, lng, lat, zoom });
      return [];
    }
  }

  /**
   * Konvertiert Lat/Lng (EPSG:4326) nach Web Mercator (EPSG:3857)
   */
  private toEpsg3857(lng: number, lat: number): { x: number; y: number } {
    const x = (lng * 20037508.34) / 180;
    const latRad = (lat * Math.PI) / 180;
    const y = (Math.log(Math.tan(Math.PI / 4 + latRad / 2)) * 20037508.34) / Math.PI;
    return { x, y };
  }

  /**
   * Berechnet eine BBOX um einen Punkt basierend auf Zoom-Level
   */
  private computeBbox(lng: number, lat: number, zoom: number) {
    const resolution = 156543.03 / Math.pow(2, zoom);
    const halfSize = resolution * 128;

    const center = this.toEpsg3857(lng, lat);
    return {
      minX: center.x - halfSize,
      minY: center.y - halfSize,
      maxX: center.x + halfSize,
      maxY: center.y + halfSize,
    };
  }
}
