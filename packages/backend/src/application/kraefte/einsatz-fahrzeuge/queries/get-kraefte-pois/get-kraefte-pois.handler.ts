import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import { IFunkStatusConfigRepository } from '@domain/kraefte/repositories/i-funk-status-config.repository';
import { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
import type { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';
import type { FunkStatusConfig } from '@domain/kraefte/aggregates/funk-status-config.aggregate';
import type { Fahrzeugtyp, SollbesatzungSchema } from '@domain/kraefte/aggregates/fahrzeugtyp.aggregate';
import { FahrzeugtypId } from '@domain/kraefte/value-objects/fahrzeugtyp-id';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import type { GetKraeftePoisQuery } from './get-kraefte-pois.query';
import { GeoJsonPointDto, KraeftePoisFeatureCollectionDto, KraeftePoisFeatureDto, type KraeftePoisPropertiesDto } from './kraefte-pois.dto';

/**
 * Default-Farbe fuer FMS-Status falls keine Konfiguration vorhanden ist.
 *
 * **WARUM Grau?**
 * - Neutrale Farbe die keinen Status impliziert
 * - Signalisiert "Status unbekannt/unkonfiguriert"
 * - Konsistent mit AC5 Story 8.1: Fallback bei fehlender Konfiguration
 */
const DEFAULT_STATUS_FARBE = '#808080'; // Grau - AC5 Fallback

/**
 * Default-Label fuer FMS-Status falls keine Konfiguration vorhanden ist.
 */
const DEFAULT_STATUS_LABEL = 'Status unbekannt';

/**
 * Handler fuer GetKraeftePoisQuery.
 *
 * Laedt alle EinsatzFahrzeuge eines Einsatzes mit Position und
 * gibt sie als GeoJSON FeatureCollection zurueck.
 *
 * **RFC 7946 Compliance:**
 * - Koordinaten: [longitude, latitude] (NICHT [lat, lng]!)
 * - Feature ID auf Feature-Ebene (nicht in properties)
 * - type: "FeatureCollection" bzw. "Feature"
 *
 * **Filterung:**
 * - Nur Fahrzeuge MIT gueltiger Position werden zurueckgegeben
 * - Fahrzeuge ohne Position werden herausgefiltert
 *
 * **Status-Farben:**
 * - Farben aus FunkStatusConfig fuer jeden Status-Code
 * - Fallback auf DEFAULT_STATUS_FARBE wenn Config fehlt
 */
@Injectable()
export class GetKraeftePoisHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG)
    private readonly einsatzFahrzeugRepository: IEinsatzFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.FUNK_STATUS_CONFIG)
    private readonly funkStatusRepository: IFunkStatusConfigRepository,
    @Inject(KRAEFTE_REPOSITORIES.FAHRZEUGTYP)
    private readonly fahrzeugtypRepository: IFahrzeugtypRepository,
  ) {}

  /**
   * Fuehrt die Query aus und gibt GeoJSON FeatureCollection zurueck.
   *
   * @param query - GetKraeftePoisQuery mit einsatzId
   * @returns Result<KraeftePoisFeatureCollectionDto> - GeoJSON FeatureCollection
   */
  async execute(query: GetKraeftePoisQuery): Promise<Result<KraeftePoisFeatureCollectionDto>> {
    // 1. EinsatzId Validation ist bereits in Query.create() erfolgt

    // 2. Fahrzeuge laden
    const fahrzeugeResult = await this.einsatzFahrzeugRepository.findByEinsatzId(query.einsatzId);
    if (fahrzeugeResult.isFailure) {
      return Result.fail(fahrzeugeResult.error ?? 'Fehler beim Laden der Fahrzeuge');
    }

    const fahrzeuge = fahrzeugeResult.value ?? [];

    // 3. Leere Collection zurueckgeben wenn keine Fahrzeuge vorhanden
    if (fahrzeuge.length === 0) {
      return Result.ok(new KraeftePoisFeatureCollectionDto([]));
    }

    // 4. Nur Fahrzeuge MIT Position filtern
    const fahrzeugeMitPosition = fahrzeuge.filter((f) => f.position !== undefined);

    if (fahrzeugeMitPosition.length === 0) {
      return Result.ok(new KraeftePoisFeatureCollectionDto([]));
    }

    // 5. FunkStatusConfigs laden (gecached fuer alle Status-Codes)
    const statusConfigCache = await this.loadStatusConfigs();

    // 6. Fahrzeugtypen laden (gecached fuer alle eindeutigen Fahrzeugtyp-IDs)
    const fahrzeugtypCache = await this.loadFahrzeugtypen(fahrzeugeMitPosition);

    // 7. Features erstellen
    const features = fahrzeugeMitPosition.map((fahrzeug) => this.mapToFeature(fahrzeug, statusConfigCache, fahrzeugtypCache));

    return Result.ok(new KraeftePoisFeatureCollectionDto(features));
  }

  /**
   * Laedt alle FunkStatusConfig Eintraege und cached sie nach Code.
   */
  private async loadStatusConfigs(): Promise<Map<number, FunkStatusConfig>> {
    const cache = new Map<number, FunkStatusConfig>();

    const configResult = await this.funkStatusRepository.findAll();
    if (configResult.isSuccess && configResult.value) {
      for (const config of configResult.value) {
        cache.set(config.code, config);
      }
    }

    return cache;
  }

  /**
   * Laedt alle Fahrzeugtypen fuer die gegebenen Fahrzeuge und cached sie nach ID.
   */
  private async loadFahrzeugtypen(fahrzeuge: EinsatzFahrzeug[]): Promise<Map<string, Fahrzeugtyp>> {
    const cache = new Map<string, Fahrzeugtyp>();
    const uniqueTypIds = [...new Set(fahrzeuge.map((f) => f.fahrzeugtypId))];

    for (const typIdStr of uniqueTypIds) {
      const idResult = FahrzeugtypId.create(typIdStr);
      if (idResult.isFailure || !idResult.value) {
        continue;
      }

      const typResult = await this.fahrzeugtypRepository.findById(idResult.value);
      if (typResult.isSuccess && typResult.value) {
        cache.set(typIdStr, typResult.value);
      }
    }

    return cache;
  }

  /**
   * Mappt ein EinsatzFahrzeug zu einem GeoJSON Feature.
   */
  private mapToFeature(fahrzeug: EinsatzFahrzeug, statusConfigCache: Map<number, FunkStatusConfig>, fahrzeugtypCache: Map<string, Fahrzeugtyp>): KraeftePoisFeatureDto {
    // Position ist garantiert vorhanden (bereits in execute() gefiltert)
    const position = fahrzeug.position!;
    const statusConfig = statusConfigCache.get(fahrzeug.fmsStatus);
    const fahrzeugtyp = fahrzeugtypCache.get(fahrzeug.fahrzeugtypId);

    // Geometry: [longitude, latitude] nach RFC 7946
    const geometry = new GeoJsonPointDto(position.lng, position.lat);

    // Properties
    const properties: KraeftePoisPropertiesDto = {
      name: fahrzeug.funkrufname,
      status: fahrzeug.fmsStatus,
      statusLabel: statusConfig?.displayLabel ?? DEFAULT_STATUS_LABEL,
      statusFarbe: statusConfig?.farbe ?? DEFAULT_STATUS_FARBE,
      staerke: this.formatSollbesatzung(fahrzeugtyp?.sollbesatzung),
      fahrzeugtypCode: fahrzeugtyp?.code ?? 'UNKNOWN',
      positionTimestamp: fahrzeug.updatedAt.toISOString(),
    };

    const feature = new KraeftePoisFeatureDto();
    feature.id = fahrzeug.id.value; // ID auf Feature-Ebene (RFC 7946)
    feature.geometry = geometry;
    feature.properties = properties;

    return feature;
  }

  /**
   * Formatiert die Sollbesatzung als Staerke-String.
   *
   * **Format:** "Fuehrung/technische Besatzung/Mannschaft" (z.B. "1/2/6")
   *
   * **Mapping:**
   * - Fuehrung: fahrer
   * - Technische Besatzung: sanitaeter + notarzt
   * - Mannschaft: funktrupp + helfer
   *
   * @param sollbesatzung - Das Sollbesatzung-Schema
   * @returns Formatierter Staerke-String oder null wenn keine Sollbesatzung
   */
  private formatSollbesatzung(sollbesatzung: SollbesatzungSchema | undefined): string | null {
    if (!sollbesatzung) {
      return null;
    }

    const fuehrung = sollbesatzung.fahrer ?? 0;
    const techBesatzung = (sollbesatzung.sanitaeter ?? 0) + (sollbesatzung.notarzt ?? 0);
    const mannschaft = (sollbesatzung.funktrupp ?? 0) + (sollbesatzung.helfer ?? 0);

    // Nur wenn mindestens ein Wert > 0 ist
    if (fuehrung === 0 && techBesatzung === 0 && mannschaft === 0) {
      return null;
    }

    return `${fuehrung}/${techBesatzung}/${mannschaft}`;
  }
}
