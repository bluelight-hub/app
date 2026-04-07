/**
 * Warnungen Controller
 *
 * Proxy-Endpoints für externe Warn-APIs (DWD, NINA).
 * Leitet Anfragen an die externen Services weiter und normalisiert die Responses.
 *
 * @SkipThrottle — Der Modul-Throttler (1 req/s) ist für Nominatim gedacht,
 * nicht für diese Endpoints. DWD/NINA haben eigene Rate-Limits.
 */

import { Controller, Get, ParseFloatPipe, Query as QueryParam, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { DwdWarnungenService } from '../services/dwd-warnungen.service';
import { NinaWarnungenService } from '../services/nina-warnungen.service';
import { NinaMapDataService } from '../services/nina-map-data.service';
import { DwdWarnungDto } from '../dto/dwd-warnung.dto';
import { NinaWarnungDto } from '../dto/nina-warnung.dto';
import { NinaGeoJsonFeatureCollectionDto } from '../dto/nina-geojson.dto';

@ApiTags('Warnungen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@SkipThrottle()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Aktion' })
@Controller({
  path: 'warnungen',
  version: 'alpha',
})
export class WarnungenController {
  constructor(
    private readonly dwdWarnungenService: DwdWarnungenService,
    private readonly ninaWarnungenService: NinaWarnungenService,
    private readonly ninaMapDataService: NinaMapDataService,
  ) {}

  /**
   * DWD-Wetterwarnungen an einer Koordinate abfragen
   *
   * Proxy zum DWD WMS GetFeatureInfo-Service. Gibt alle aktiven
   * Wetterwarnungen an der angegebenen Koordinate zurück.
   */
  @Get('dwd')
  @ApiOperation({ summary: 'DWD-Wetterwarnungen an einer Koordinate abfragen' })
  @ApiQuery({ name: 'lng', type: Number, description: 'Längengrad (WGS84)', example: 10.45 })
  @ApiQuery({ name: 'lat', type: Number, description: 'Breitengrad (WGS84)', example: 51.16 })
  @ApiQuery({ name: 'zoom', type: Number, description: 'Karten-Zoom-Level', example: 8 })
  @ApiWrappedResponse(DwdWarnungDto, { description: 'DWD-Wetterwarnungen an der Koordinate', isArray: true })
  async getDwdWarnungen(@QueryParam('lng', ParseFloatPipe) lng: number, @QueryParam('lat', ParseFloatPipe) lat: number, @QueryParam('zoom', ParseFloatPipe) zoom: number): Promise<DwdWarnungDto[]> {
    const warnungen = await this.dwdWarnungenService.queryWarnungen(lng, lat, zoom);

    return warnungen.map((w) => ({
      event: w.event,
      severity: w.severity,
      description: w.description || undefined,
      instruction: w.instruction || undefined,
      onset: w.onset || undefined,
      expires: w.expires || undefined,
      areaDesc: w.areaDesc || undefined,
      headline: w.headline || undefined,
    }));
  }

  /**
   * NINA-Warnungen an einer Koordinate abfragen
   *
   * Proxy zur NINA/BBK Warn-API. Löst den AGS automatisch
   * per Reverse-Geocoding auf und gibt alle aktiven Warnungen zurück.
   */
  @Get('nina')
  @ApiOperation({ summary: 'NINA-Warnungen an einer Koordinate abfragen (löst AGS automatisch auf)' })
  @ApiQuery({ name: 'lng', type: Number, description: 'Längengrad (WGS84)', example: 10.45 })
  @ApiQuery({ name: 'lat', type: Number, description: 'Breitengrad (WGS84)', example: 51.16 })
  @ApiWrappedResponse(NinaWarnungDto, { description: 'NINA-Warnungen an der Koordinate', isArray: true })
  async getNinaWarnungen(@QueryParam('lng', ParseFloatPipe) lng: number, @QueryParam('lat', ParseFloatPipe) lat: number): Promise<NinaWarnungDto[]> {
    const warnungen = await this.ninaWarnungenService.queryWarnungenByCoordinate(lng, lat);

    return warnungen.map((w) => ({
      id: w.id,
      event: w.event,
      severity: w.severity,
      headline: w.headline || undefined,
      description: w.description || undefined,
      instruction: w.instruction || undefined,
      sender: w.sender || undefined,
      sent: w.sent || undefined,
      onset: w.onset || undefined,
      expires: w.expires || undefined,
      areaDesc: w.areaDesc || undefined,
    }));
  }

  /**
   * NINA-Warnungen als GeoJSON FeatureCollection abfragen
   *
   * Lädt Warnungen von allen 5 NINA-Quellen (KATWARN, BIWAPP, MOWAS, LHP, Polizei),
   * dedupliziert sie und liefert die zugehörigen GeoJSON-Polygone.
   */
  @Get('nina/geojson')
  @ApiOperation({ summary: 'NINA-Warnungen als GeoJSON FeatureCollection (alle Quellen)' })
  @ApiWrappedResponse(NinaGeoJsonFeatureCollectionDto, { description: 'GeoJSON mit allen aktiven NINA-Warnungs-Polygonen' })
  async getNinaGeoJson(): Promise<NinaGeoJsonFeatureCollectionDto> {
    const features = await this.ninaMapDataService.getGeoJsonFeatures();
    return {
      type: 'FeatureCollection',
      features: features.map((f) => ({
        type: 'Feature',
        properties: {
          id: f.id,
          severity: f.severity,
          title: f.title,
          source: f.source,
          startDate: f.startDate || undefined,
        },
        geometry: f.geometry,
      })),
    };
  }
}
