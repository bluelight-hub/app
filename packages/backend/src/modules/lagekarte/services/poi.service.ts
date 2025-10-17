import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PoiRepository } from '../repositories/poi.repository';
import { GeocodingService } from './geocoding.service';
import { LagekartePoi, Prisma } from '@prisma/client';
import { CreatePoiDto } from '../dto/create-poi.dto';
import { UpdatePoiDto } from '../dto/update-poi.dto';

/**
 * POI Service
 *
 * Business Logic für Point-of-Interest (POI) Management auf Lagekarten.
 *
 * **Geocoding-Integration:**
 * - POIs können durch Adresse (Geocoding) oder manuelle Koordinaten erstellt werden
 * - Geocoding-Fehler führen zu Fallback auf manuelle Koordinaten
 *
 * **POI-Typen:**
 * - Siehe PoiType Enum für 13 Katastrophenschutz-spezifische Typen
 */
@Injectable()
export class PoiService {
  private readonly logger = new Logger(PoiService.name);

  constructor(
    private readonly poiRepository: PoiRepository,
    private readonly geocodingService: GeocodingService,
  ) {}

  /**
   * Gibt alle POIs einer Lagekarte zurück
   *
   * @param lagekarteId - ID der Lagekarte
   * @returns Liste aller POIs (sortiert nach Erstellungsdatum)
   */
  async getPoisByLagekarteId(lagekarteId: string): Promise<LagekartePoi[]> {
    this.logger.log(`Fetching POIs for Lagekarte ${lagekarteId}`);
    return this.poiRepository.findByLagekarteId(lagekarteId);
  }

  /**
   * Gibt einen einzelnen POI zurück
   *
   * @param id - ID des POI
   * @returns POI
   * @throws NotFoundException wenn POI nicht existiert
   */
  async getPoiById(id: string): Promise<LagekartePoi> {
    this.logger.log(`Fetching POI ${id}`);
    const poi = await this.poiRepository.findById(id);

    if (!poi) {
      throw new NotFoundException(`POI with ID ${id} not found`);
    }

    return poi;
  }

  /**
   * Erstellt einen neuen POI
   *
   * **Geocoding-Workflow:**
   * 1. Wenn `adresse` angegeben: Geocode Adresse → Koordinaten
   * 2. Wenn Geocoding fehlschlägt: Fallback auf manuelle `latitude`/`longitude`
   * 3. Wenn keine Adresse: Nutze manuelle Koordinaten aus DTO
   *
   * @param dto - POI-Daten (CreatePoiDto)
   * @returns Neu erstellter POI
   *
   * @example
   * ```typescript
   * // Mit Geocoding
   * const poi1 = await service.createPoi({
   *   lagekarteId: "clw3h8x9y",
   *   type: "EINSATZORT",
   *   adresse: "Hauptstraße 1, 10115 Berlin"
   * });
   *
   * // Manuelle Koordinaten
   * const poi2 = await service.createPoi({
   *   lagekarteId: "clw3h8x9y",
   *   type: "FAHRZEUG",
   *   latitude: 52.52,
   *   longitude: 13.405
   * });
   * ```
   */
  async createPoi(dto: CreatePoiDto): Promise<LagekartePoi> {
    this.logger.log(`Creating POI (type: ${dto.type}) for Lagekarte ${dto.lagekarteId}`);

    let latitude = dto.latitude;
    let longitude = dto.longitude;

    // Geocode address if provided
    if (dto.adresse) {
      this.logger.log(`Geocoding address: ${dto.adresse}`);
      const coords = await this.geocodingService.geocodeAddress(dto.adresse);

      if (coords) {
        latitude = coords.lat;
        longitude = coords.lon;
        this.logger.log(`Geocoding successful: (${latitude}, ${longitude})`);
      } else {
        this.logger.warn(`Geocoding failed for address "${dto.adresse}", using manual coordinates`);
        // Fallback: Use manual coordinates from DTO
        if (latitude === undefined || longitude === undefined) {
          throw new BadRequestException('Geocoding failed and no manual coordinates (latitude/longitude) provided');
        }
      }
    }

    // Ensure coordinates are defined (custom validator prevents this, but TypeScript check)
    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException('Coordinates must be provided (either via geocoding or manual input)');
    }

    // Create POI with geocoded or manual coordinates
    const poiData: Prisma.LagekartePoiCreateInput = {
      lagekarte: {
        connect: { id: dto.lagekarteId },
      },
      type: dto.type,
      name: dto.name ?? null,
      adresse: dto.adresse ?? null,
      latitude,
      longitude,
      icon: dto.icon ?? null,
      metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : Prisma.DbNull,
    };

    const poi = await this.poiRepository.create(poiData);
    this.logger.log(`POI ${poi.id} created at (${latitude}, ${longitude})`);

    return poi;
  }

  /**
   * Aktualisiert einen POI
   *
   * **Geocoding bei Adressänderung:**
   * - Wenn `adresse` im DTO enthalten ist, wird neu geocoded
   * - Wenn Geocoding fehlschlägt, bleiben alte Koordinaten erhalten
   *
   * @param id - ID des POI
   * @param dto - Zu aktualisierende Felder (UpdatePoiDto)
   * @returns Aktualisierter POI
   */
  async updatePoi(id: string, dto: UpdatePoiDto): Promise<LagekartePoi> {
    this.logger.log(`Updating POI ${id}`);

    // Check if POI exists
    await this.getPoiById(id);

    const updateData: Prisma.LagekartePoiUpdateInput = {
      type: dto.type,
      name: dto.name,
      adresse: dto.adresse,
      icon: dto.icon,
      metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : undefined,
    };

    // Re-geocode if address changed
    if (dto.adresse) {
      const coords = await this.geocodingService.geocodeAddress(dto.adresse);
      if (coords) {
        updateData.latitude = coords.lat;
        updateData.longitude = coords.lon;
        this.logger.log(`POI ${id} geocoded to (${coords.lat}, ${coords.lon})`);
      } else {
        this.logger.warn(`Geocoding failed for address "${dto.adresse}", keeping existing coordinates`);
      }
    }

    // Use manual coordinates if provided (overrides geocoding)
    if (dto.latitude !== undefined) {
      updateData.latitude = dto.latitude;
    }
    if (dto.longitude !== undefined) {
      updateData.longitude = dto.longitude;
    }

    const updated = await this.poiRepository.update(id, updateData);
    this.logger.log(`POI ${id} updated`);

    return updated;
  }

  /**
   * Löscht einen POI
   *
   * @param id - ID des POI
   * @throws NotFoundException wenn POI nicht existiert
   */
  async deletePoi(id: string): Promise<void> {
    this.logger.log(`Deleting POI ${id}`);

    // Check if POI exists
    await this.getPoiById(id);

    await this.poiRepository.delete(id);
    this.logger.log(`POI ${id} deleted`);
  }
}
