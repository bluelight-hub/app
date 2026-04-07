/**
 * NINA Map Data Service
 *
 * Sammelt Warnungen von allen 5 NINA-Quellen (KATWARN, BIWAPP, MOWAS, LHP, Polizei),
 * dedupliziert sie und lädt die GeoJSON-Geometrien.
 */

import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LOGGER } from '@/infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';
import { firstValueFrom } from 'rxjs';

const NINA_API_BASE = 'https://warnung.bund.de/api31';

const NINA_SOURCES = ['katwarn', 'biwapp', 'mowas', 'lhp', 'police'] as const;
type NinaSource = (typeof NINA_SOURCES)[number];

/** NINA mapData Entry */
interface NinaMapDataEntry {
  id: string;
  severity: string;
  i18nTitle?: { de?: string };
  startDate?: string;
}

/** Internes Feature */
export interface NinaGeoFeature {
  id: string;
  severity: string;
  title: string;
  source: NinaSource;
  startDate: string;
  geometry: Record<string, unknown> | null;
}

@Injectable()
export class NinaMapDataService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Lädt alle NINA-Warnungen als GeoJSON Features
   */
  async getGeoJsonFeatures(): Promise<NinaGeoFeature[]> {
    // Schritt 1: Alle 5 Quellen parallel laden
    const results = await Promise.allSettled(NINA_SOURCES.map((source) => this.fetchMapData(source)));

    // Schritt 2: Deduplizieren (gleiche ID kann in mehreren Quellen sein)
    const featureMap = new Map<string, { entry: NinaMapDataEntry; source: NinaSource }>();
    results.forEach((result, i) => {
      const source = NINA_SOURCES[i];
      if (result.status === 'fulfilled' && source) {
        for (const entry of result.value) {
          if (!featureMap.has(entry.id)) {
            featureMap.set(entry.id, { entry, source });
          }
        }
      }
    });

    if (featureMap.size === 0) return [];

    // Schritt 3: Geometrien in Batches laden (max 10 parallel)
    const entries = Array.from(featureMap.values());
    const features: NinaGeoFeature[] = [];

    for (let i = 0; i < entries.length; i += 10) {
      const batch = entries.slice(i, i + 10);
      const geometries = await Promise.allSettled(batch.map(({ entry }) => this.fetchGeometry(entry.id)));

      for (let j = 0; j < batch.length; j++) {
        const batchEntry = batch[j];
        const geoResult = geometries[j];
        if (!batchEntry || !geoResult) continue;
        const { entry, source } = batchEntry;
        const geometry = geoResult.status === 'fulfilled' ? geoResult.value : null;

        features.push({
          id: entry.id,
          severity: entry.severity ?? '',
          title: entry.i18nTitle?.de ?? '',
          source,
          startDate: entry.startDate ?? '',
          geometry,
        });
      }
    }

    return features;
  }

  /** Lädt mapData für eine Quelle */
  private async fetchMapData(source: NinaSource): Promise<NinaMapDataEntry[]> {
    try {
      const url = `${NINA_API_BASE}/${source}/mapData.json`;
      const response = await firstValueFrom(this.httpService.get<NinaMapDataEntry[]>(url, { timeout: 10000 }));
      return response.data ?? [];
    } catch (error) {
      this.logger.warn(`NINA mapData Abfrage fehlgeschlagen für ${source}`, { error });
      return [];
    }
  }

  /** Lädt GeoJSON-Geometrie für eine Warnung */
  private async fetchGeometry(id: string): Promise<Record<string, unknown> | null> {
    try {
      const url = `${NINA_API_BASE}/warnings/${id}.geojson`;
      const response = await firstValueFrom(this.httpService.get(url, { timeout: 5000 }));
      // Die GeoJSON Response ist ein FeatureCollection — wir brauchen die erste Feature-Geometry
      const data = response.data;
      if (data?.type === 'FeatureCollection' && data.features?.length > 0) {
        return data.features[0].geometry ?? null;
      }
      if (data?.type === 'Feature') {
        return data.geometry ?? null;
      }
      // Falls direkt eine Geometry zurückkommt
      if (data?.type === 'Polygon' || data?.type === 'MultiPolygon') {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }
}
