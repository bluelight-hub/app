import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PoiRepository } from '../repositories/poi.repository';
import { GeocodingService } from './geocoding.service';
import { MgrsConverterService } from './mgrs-converter.service';
import { LagekartePoi, Prisma } from '@prisma/client';
import { CreatePoiDto } from '../dto/create-poi.dto';
import { UpdatePoiDto } from '../dto/update-poi.dto';

/**
 * POI Service
 *
 * Business Logic für Point-of-Interest (POI) Management auf Lagekarten.
 *
 * **Koordinaten-Strategie:**
 * - MGRS ist das PRIMÄRE Format für POI-Koordinaten
 * - Lat/Lng wird aus MGRS berechnet (oder als Fallback verwendet)
 * - Beide Formate werden IMMER in der Datenbank gespeichert
 *
 * **Priorität bei Erstellung:**
 * 1. MGRS angegeben → Konvertierung zu Lat/Lng
 * 2. Lat/Lng angegeben → Konvertierung zu MGRS
 * 3. Adresse angegeben → Geocoding → Konvertierung zu MGRS
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
    private readonly mgrsConverter: MgrsConverterService,
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
   * **Koordinaten-Strategie (Prioritätsreihenfolge):**
   * 1. MGRS angegeben → Konvertierung zu Lat/Lng
   * 2. Lat/Lng angegeben → Konvertierung zu MGRS
   * 3. Adresse angegeben → Geocoding → Konvertierung zu MGRS
   *
   * **Wichtig:**
   * - MGRS ist das PRIMÄRE Format
   * - Beide Formate (MGRS + Lat/Lng) werden IMMER gespeichert
   * - Validierung erfolgt durch DTOs und MGRS-Converter
   *
   * @param dto - POI-Daten (CreatePoiDto)
   * @returns Neu erstellter POI mit MGRS und Lat/Lng Koordinaten
   * @throws BadRequestException bei ungültigen Koordinaten oder fehlenden Eingaben
   *
   * @example
   * ```typescript
   * // Priorität 1: MGRS Format (PRIMÄR)
   * const poi1 = await service.createPoi({
   *   lagekarteId: "clw3h8x9y",
   *   type: "EINSATZORT",
   *   mgrs: "33UVU1234567890"
   * });
   *
   * // Priorität 2: Lat/Lng Koordinaten
   * const poi2 = await service.createPoi({
   *   lagekarteId: "clw3h8x9y",
   *   type: "FAHRZEUG",
   *   latitude: 52.52,
   *   longitude: 13.405
   * });
   *
   * // Priorität 3: Adresse mit Geocoding
   * const poi3 = await service.createPoi({
   *   lagekarteId: "clw3h8x9y",
   *   type: "EINSATZORT",
   *   adresse: "Hauptstraße 1, 10115 Berlin"
   * });
   * ```
   */
  async createPoi(dto: CreatePoiDto): Promise<LagekartePoi> {
    this.logger.log(`Creating POI (type: ${dto.type}) for Lagekarte ${dto.lagekarteId}`);

    let finalMgrs: string | null = null;
    let finalLat: number;
    let finalLng: number;

    // Priority 1: MGRS provided (PRIMARY FORMAT)
    if (dto.mgrs) {
      this.logger.log(`Using MGRS coordinates (PRIMARY): ${dto.mgrs}`);
      try {
        const coords = this.mgrsConverter.mgrsToLatLng(dto.mgrs);
        finalMgrs = dto.mgrs;
        finalLat = coords.latitude;
        finalLng = coords.longitude;
        this.logger.log(`MGRS → Lat/Lng conversion successful: (${finalLat}, ${finalLng})`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new BadRequestException(`MGRS Konvertierung fehlgeschlagen: ${errorMessage}`);
      }
    }
    // Priority 2: Lat/Lng provided
    else if (dto.latitude !== undefined && dto.longitude !== undefined) {
      this.logger.log(`Using Lat/Lng coordinates: (${dto.latitude}, ${dto.longitude})`);
      try {
        finalMgrs = this.mgrsConverter.latLngToMgrs(dto.latitude, dto.longitude, 5);
        finalLat = dto.latitude;
        finalLng = dto.longitude;
        this.logger.log(`Lat/Lng → MGRS conversion successful: ${finalMgrs}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new BadRequestException(`MGRS Konvertierung fehlgeschlagen: ${errorMessage}`);
      }
    }
    // Priority 3: Address geocoding
    else if (dto.adresse) {
      this.logger.log(`Geocoding address: ${dto.adresse}`);
      const coords = await this.geocodingService.geocodeAddress(dto.adresse);

      if (!coords) {
        throw new BadRequestException(`Adresse konnte nicht geocoded werden: "${dto.adresse}". Bitte geben Sie MGRS oder Lat/Lng Koordinaten an.`);
      }

      try {
        finalMgrs = this.mgrsConverter.latLngToMgrs(coords.lat, coords.lon, 5);
        finalLat = coords.lat;
        finalLng = coords.lon;
        this.logger.log(`Geocoding successful: (${finalLat}, ${finalLng}) → MGRS: ${finalMgrs}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new BadRequestException(`MGRS Konvertierung nach Geocoding fehlgeschlagen: ${errorMessage}`);
      }
    } else {
      throw new BadRequestException('Entweder mgrs, latitude+longitude oder adresse erforderlich');
    }

    // Create POI with both MGRS and Lat/Lng coordinates
    const poiData: Prisma.LagekartePoiCreateInput = {
      lagekarte: {
        connect: { id: dto.lagekarteId },
      },
      type: dto.type,
      name: dto.name ?? null,
      adresse: dto.adresse ?? null,
      mgrs: finalMgrs,
      latitude: finalLat,
      longitude: finalLng,
      icon: dto.icon ?? null,
      metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : Prisma.DbNull,
    };

    const poi = await this.poiRepository.create(poiData);
    this.logger.log(`POI ${poi.id} created with MGRS: ${finalMgrs}, Lat/Lng: (${finalLat}, ${finalLng})`);

    return poi;
  }

  /**
   * Aktualisiert einen POI
   *
   * **Koordinaten-Update-Strategie (Prioritätsreihenfolge):**
   * 1. MGRS im DTO → Konvertierung zu Lat/Lng (überschreibt alte Koordinaten)
   * 2. Lat/Lng im DTO → Konvertierung zu MGRS (überschreibt alte Koordinaten)
   * 3. Adresse im DTO → Geocoding → Konvertierung zu MGRS
   * 4. Keine Koordinaten im DTO → Bestehende Werte bleiben erhalten
   *
   * **Wichtig:**
   * - Bei Koordinaten-Update werden IMMER beide Formate aktualisiert
   * - MGRS hat höchste Priorität
   * - Bestehende Koordinaten bleiben bei Validierungsfehlern erhalten
   *
   * @param id - ID des POI
   * @param dto - Zu aktualisierende Felder (UpdatePoiDto)
   * @returns Aktualisierter POI
   * @throws BadRequestException bei ungültigen Koordinaten
   */
  async updatePoi(id: string, dto: UpdatePoiDto): Promise<LagekartePoi> {
    this.logger.log(`Updating POI ${id}`);

    // Check if POI exists
    const existingPoi = await this.getPoiById(id);

    const updateData: Prisma.LagekartePoiUpdateInput = {
      type: dto.type,
      name: dto.name,
      adresse: dto.adresse,
      icon: dto.icon,
      metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : undefined,
    };

    // Coordinate Update Logic (Priority-based)
    let coordinatesUpdated = false;

    // Priority 1: MGRS provided (PRIMARY FORMAT)
    if (dto.mgrs !== undefined) {
      this.logger.log(`Updating MGRS coordinates (PRIMARY): ${dto.mgrs}`);
      try {
        const coords = this.mgrsConverter.mgrsToLatLng(dto.mgrs);
        updateData.mgrs = dto.mgrs;
        updateData.latitude = coords.latitude;
        updateData.longitude = coords.longitude;
        coordinatesUpdated = true;
        this.logger.log(`MGRS → Lat/Lng conversion successful: (${coords.latitude}, ${coords.longitude})`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new BadRequestException(`MGRS Konvertierung fehlgeschlagen: ${errorMessage}`);
      }
    }
    // Priority 2: Lat/Lng provided
    else if (dto.latitude !== undefined || dto.longitude !== undefined) {
      const newLat = dto.latitude ?? existingPoi.latitude;
      const newLng = dto.longitude ?? existingPoi.longitude;

      this.logger.log(`Updating Lat/Lng coordinates: (${newLat}, ${newLng})`);
      try {
        const mgrsString = this.mgrsConverter.latLngToMgrs(newLat, newLng, 5);
        updateData.mgrs = mgrsString;
        updateData.latitude = newLat;
        updateData.longitude = newLng;
        coordinatesUpdated = true;
        this.logger.log(`Lat/Lng → MGRS conversion successful: ${mgrsString}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new BadRequestException(`MGRS Konvertierung fehlgeschlagen: ${errorMessage}`);
      }
    }
    // Priority 3: Address geocoding
    else if (dto.adresse) {
      this.logger.log(`Re-geocoding address: ${dto.adresse}`);
      const coords = await this.geocodingService.geocodeAddress(dto.adresse);

      if (coords) {
        try {
          const mgrsString = this.mgrsConverter.latLngToMgrs(coords.lat, coords.lon, 5);
          updateData.mgrs = mgrsString;
          updateData.latitude = coords.lat;
          updateData.longitude = coords.lon;
          coordinatesUpdated = true;
          this.logger.log(`Geocoding successful: (${coords.lat}, ${coords.lon}) → MGRS: ${mgrsString}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`MGRS Konvertierung nach Geocoding fehlgeschlagen: ${errorMessage}, behalte bestehende Koordinaten`);
          // Keep existing coordinates on conversion failure
        }
      } else {
        this.logger.warn(`Geocoding failed for address "${dto.adresse}", keeping existing coordinates`);
        // Keep existing coordinates on geocoding failure
      }
    }

    const updated = await this.poiRepository.update(id, updateData);

    if (coordinatesUpdated) {
      this.logger.log(`POI ${id} updated with MGRS: ${updated.mgrs}, Lat/Lng: (${updated.latitude}, ${updated.longitude})`);
    } else {
      this.logger.log(`POI ${id} updated (coordinates unchanged)`);
    }

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
