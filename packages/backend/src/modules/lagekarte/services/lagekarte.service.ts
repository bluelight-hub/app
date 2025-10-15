import { Injectable, Logger } from '@nestjs/common';
import { LagekarteRepository } from '../repositories/lagekarte.repository';
import { PoiRepository } from '../repositories/poi.repository';
import { GeocodingService } from './geocoding.service';
import { EinsatzService } from '../../../einsatz/einsatz.service';
import { Lagekarte, PoiType } from '@prisma/client';

/**
 * Lagekarte Service
 *
 * Business Logic für Lagekarten-Management mit Lazy-Creation-Pattern.
 *
 * **Lazy Creation:**
 * - Lagekarten werden erst beim ersten Abruf erstellt, nicht bei Einsatz-Erstellung
 * - Bei Erstellung wird automatisch ein initialer POI (Typ: EINSATZORT) aus `einsatz.einsatzort` geocoded
 *
 * **Integration:**
 * - Nutzt EinsatzService für Einsatzort-Abfrage (read-only)
 * - Nutzt GeocodingService für Adress → Koordinaten Konvertierung
 */
@Injectable()
export class LagekarteService {
  private readonly logger = new Logger(LagekarteService.name);

  constructor(
    private readonly lagekarteRepository: LagekarteRepository,
    private readonly poiRepository: PoiRepository,
    private readonly geocodingService: GeocodingService,
    private readonly einsatzService: EinsatzService,
  ) {}

  /**
   * Gibt eine Lagekarte zurück oder erstellt sie lazy
   *
   * Implementiert das Lazy-Creation-Pattern: Lagekarten werden erst beim ersten
   * Abruf erstellt, um Datenbank-Overhead bei Einsatz-Erstellung zu vermeiden.
   *
   * @param einsatzId - Eindeutige ID des Einsatzes
   * @returns Lagekarte mit initialen POIs (bei Neuerstellung)
   *
   * @example
   * ```typescript
   * // Erster Aufruf: Erstellt Lagekarte + initialen POI
   * const lagekarte = await service.getOrCreateLagekarte("clw3h8x9y");
   *
   * // Zweiter Aufruf: Gibt existierende Lagekarte zurück
   * const same = await service.getOrCreateLagekarte("clw3h8x9y");
   * ```
   */
  async getOrCreateLagekarte(einsatzId: string): Promise<Lagekarte> {
    this.logger.log(`Fetching Lagekarte for Einsatz ${einsatzId}`);

    // Check if Lagekarte already exists
    let lagekarte = await this.lagekarteRepository.findByEinsatzId(einsatzId);

    if (lagekarte) {
      this.logger.log(`Lagekarte ${lagekarte.id} exists for Einsatz ${einsatzId}`);
      return lagekarte;
    }

    // Lazy Creation: Create new Lagekarte
    this.logger.log(`Creating new Lagekarte for Einsatz ${einsatzId}`);
    lagekarte = await this.lagekarteRepository.create(einsatzId);

    // Create initial POI from einsatz.einsatzort
    await this.createInitialPoi(lagekarte.id, einsatzId);

    // Refresh to include created POI
    const refreshedLagekarte = await this.lagekarteRepository.findByEinsatzId(einsatzId);

    if (!refreshedLagekarte) {
      throw new Error(`Failed to retrieve created Lagekarte for Einsatz ${einsatzId}`);
    }

    this.logger.log(`Lagekarte ${refreshedLagekarte.id} created with initial POI for Einsatz ${einsatzId}`);
    return refreshedLagekarte;
  }

  /**
   * Erstellt initialen POI aus Einsatzort-Adresse
   *
   * **Workflow:**
   * 1. Fetch `einsatz.einsatzort` (Adresse) von EinsatzService
   * 2. Geocode Adresse → Koordinaten via Nominatim
   * 3. Create POI mit Typ EINSATZORT
   *
   * **Fallback:**
   * - Wenn Geocoding fehlschlägt, wird POI mit Standardkoordinaten (0, 0) erstellt
   * - Frontend kann POI dann manuell verschieben
   *
   * @param lagekarteId - ID der Lagekarte
   * @param einsatzId - ID des Einsatzes (für Einsatzort-Abfrage)
   */
  private async createInitialPoi(lagekarteId: string, einsatzId: string): Promise<void> {
    try {
      // Fetch Einsatz to get einsatzort (address)
      const einsatz = await this.einsatzService.findOne(einsatzId, false);

      if (!einsatz.einsatzort) {
        this.logger.warn(`Einsatz ${einsatzId} has no einsatzort, skipping initial POI creation`);
        return;
      }

      const address = einsatz.einsatzort;
      this.logger.log(`Geocoding initial POI for address: ${address}`);

      // Geocode address to coordinates
      const coords = await this.geocodingService.geocodeAddress(address);

      if (!coords) {
        this.logger.warn(`Geocoding failed for address "${address}", using fallback coordinates (0, 0)`);
      }

      // Create initial POI
      await this.poiRepository.create({
        lagekarte: {
          connect: { id: lagekarteId },
        },
        type: PoiType.EINSATZORT,
        name: address,
        adresse: address,
        latitude: coords?.lat ?? 0,
        longitude: coords?.lon ?? 0,
      });

      this.logger.log(`Initial POI created for Lagekarte ${lagekarteId} at (${coords?.lat ?? 0}, ${coords?.lon ?? 0})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create initial POI for Lagekarte ${lagekarteId}: ${errorMessage}`);
      // Don't throw - Lagekarte can exist without initial POI
    }
  }

  /**
   * Aktualisiert den GeoJSON State einer Lagekarte
   *
   * @param id - ID der Lagekarte
   * @param state - GeoJSON FeatureCollection mit Zeichnungen
   * @returns Aktualisierte Lagekarte
   */
  async updateState(id: string, state: object): Promise<Lagekarte> {
    this.logger.log(`Updating Lagekarte ${id} state`);
    return this.lagekarteRepository.update(id, state);
  }

  /**
   * Löscht eine Lagekarte
   *
   * **Cascade Delete:** POIs werden automatisch mitgelöscht
   *
   * @param id - ID der Lagekarte
   */
  async deleteLagekarte(id: string): Promise<void> {
    this.logger.warn(`Deleting Lagekarte ${id} (with CASCADE to POIs)`);
    await this.lagekarteRepository.delete(id);
  }

  /**
   * Findet eine Lagekarte anhand der Einsatz-ID
   *
   * @param einsatzId - ID des Einsatzes
   * @returns Lagekarte oder null
   */
  async findByEinsatzId(einsatzId: string): Promise<Lagekarte | null> {
    return this.lagekarteRepository.findByEinsatzId(einsatzId);
  }
}
