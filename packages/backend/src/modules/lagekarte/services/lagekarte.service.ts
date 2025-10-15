import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { LagekarteRepository } from '../repositories/lagekarte.repository';
import { PoiRepository } from '../repositories/poi.repository';
import { GeocodingService } from './geocoding.service';
import { EinsatzService } from '../../../einsatz/einsatz.service';
import { Lagekarte, PoiType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

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
    readonly _poiRepository: PoiRepository,
    private readonly geocodingService: GeocodingService,
    private readonly einsatzService: EinsatzService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Gibt eine Lagekarte zurück oder erstellt sie lazy
   *
   * Implementiert das Lazy-Creation-Pattern: Lagekarten werden erst beim ersten
   * Abruf erstellt, um Datenbank-Overhead bei Einsatz-Erstellung zu vermeiden.
   *
   * **Transactional Integrity:**
   * - Lagekarte-Erstellung und initialer POI werden in einer Transaktion ausgeführt
   * - Verhindert inkonsistente Zustände (Lagekarte ohne POI bei Fehlern)
   * - Bei Fehler wird gesamte Operation zurückgerollt
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

    // Lazy Creation: Create new Lagekarte + initial POI in transaction
    this.logger.log(`Creating new Lagekarte for Einsatz ${einsatzId} (transactional)`);

    try {
      lagekarte = await this.prisma.$transaction(async (tx) => {
        // 1. Create Lagekarte
        const newLagekarte = await tx.lagekarte.create({
          data: {
            einsatzId,
            state: {}, // Empty GeoJSON FeatureCollection
          },
        });

        // 2. Create initial POI from einsatz.einsatzort
        await this.createInitialPoiInTransaction(tx, newLagekarte.id, einsatzId);

        // 3. Return Lagekarte with POIs
        const result = await tx.lagekarte.findUnique({
          where: { id: newLagekarte.id },
          include: { pois: true },
        });

        if (!result) {
          throw new InternalServerErrorException(`Failed to retrieve created Lagekarte ${newLagekarte.id}`);
        }

        return result;
      });

      this.logger.log(`Lagekarte ${lagekarte.id} created with initial POI for Einsatz ${einsatzId}`);
      return lagekarte;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Transaction failed for Lagekarte creation (Einsatz ${einsatzId}): ${errorMessage}`);
      throw new InternalServerErrorException(`Failed to create Lagekarte for Einsatz ${einsatzId}: ${errorMessage}`);
    }
  }

  /**
   * Erstellt initialen POI aus Einsatzort-Adresse (innerhalb Transaktion)
   *
   * **Workflow:**
   * 1. Fetch `einsatz.einsatzort` (Adresse) von EinsatzService
   * 2. Geocode Adresse → Koordinaten via Nominatim
   * 3. Create POI mit Typ EINSATZORT innerhalb der Transaction
   *
   * **Fallback:**
   * - Wenn Geocoding fehlschlägt, wird POI mit Standardkoordinaten (0, 0) erstellt
   * - Frontend kann POI dann manuell verschieben
   *
   * **Transactional Behavior:**
   * - Errors werden nicht gefangen - Transaction rollt automatisch zurück
   * - Lagekarte bleibt konsistent (mit oder ohne POI)
   *
   * @param tx - Prisma Transaction Client
   * @param lagekarteId - ID der Lagekarte
   * @param einsatzId - ID des Einsatzes (für Einsatzort-Abfrage)
   */
  private async createInitialPoiInTransaction(tx: Prisma.TransactionClient, lagekarteId: string, einsatzId: string): Promise<void> {
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

    // Create initial POI within transaction
    await tx.lagekartePoi.create({
      data: {
        lagekarteId,
        type: PoiType.EINSATZORT,
        name: address,
        adresse: address,
        latitude: coords?.lat ?? 0,
        longitude: coords?.lon ?? 0,
      },
    });

    this.logger.log(`Initial POI created for Lagekarte ${lagekarteId} at (${coords?.lat ?? 0}, ${coords?.lon ?? 0})`);
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
