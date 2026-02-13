/**
 * ImportSelectedPersonsHandler - Handler für den Import ausgewählter HiOrg-Personen.
 *
 * Story 7.2: HiOrg-Server Import - Import mit Qualifikations-Mapping
 *
 * **Import-Logik:**
 * 1. Lädt Personen aus HiOrg-Server (mit vollständigen Daten)
 * 2. Filtert auf ausgewählte Usernames
 * 3. Für jede Person:
 *    - Prüft ob bereits als StammPerson existiert (via externalSource + externalId)
 *    - Bei Duplikat: Je nach Strategy 'skip' oder 'update'
 *    - Bei Neu: Erstellt StammPerson mit gemappten Qualifikationen
 * 4. Mappt HiOrg-Qualifikationen via QualifikationMapping auf interne
 *
 * **Duplikatserkennung:**
 * - Primär: externalSource='HIORG_SERVER' + externalId=username
 * - Sekundär: personalnummer (falls mitgliednr vorhanden)
 *
 * @module application/integrations/commands/import-selected-persons
 */

import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IHiOrgServerPort, HiOrgPersonDto } from '@domain/ports/i-hiorg-server.port';
import type { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
import type { IQualifikationMappingRepository } from '@domain/integrations/repositories/i-qualifikation-mapping.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { StammPerson } from '@domain/kraefte/aggregates/stamm-person.aggregate';
import { INTEGRATION_ERROR_CODES, IntegrationError, INTEGRATION_TYPES } from '@domain/integrations';
import { INTEGRATIONS, KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import { HiOrgTokenRefreshService } from '../../services/hiorg-token-refresh.service';
import type { ImportSelectedPersonsCommand } from './import-selected-persons.command';

/**
 * Import-Ergebnis für eine einzelne Person.
 */
export interface PersonImportResultItem {
  /** HiOrg Username */
  username: string;
  /** Vorname */
  vorname: string;
  /** Nachname */
  nachname: string;
  /** Import-Status */
  status: 'created' | 'updated' | 'skipped' | 'failed';
  /** Fehlergrund (nur bei status='failed') */
  error?: string;
  /** StammPerson ID (nur bei created/updated) */
  stammPersonId?: string;
  /** Anzahl gemappter Qualifikationen */
  qualifikationenMapped: number;
  /** Anzahl nicht gemappter Qualifikationen (Warnung) */
  qualifikationenUnmapped: number;
}

/**
 * Import-Ergebnis DTO für Response.
 */
export interface ImportResultDto {
  /** Gesamt importierte Personen */
  totalProcessed: number;
  /** Erfolgreich neu erstellt */
  created: number;
  /** Erfolgreich aktualisiert */
  updated: number;
  /** Übersprungen (Duplikate) */
  skipped: number;
  /** Fehlgeschlagen */
  failed: number;
  /** Detaillierte Ergebnisse pro Person */
  results: PersonImportResultItem[];
}

/**
 * Handler für ImportSelectedPersonsCommand.
 *
 * Verwendet OAuth2 Access Token für HiOrg-Server API-Zugriff.
 * Emittiert PersonenImportiertEvent nach erfolgreichem Import.
 */
@Injectable()
export class ImportSelectedPersonsHandler {
  constructor(
    @Inject(LOGGER)
    private readonly logger: ILogger,
    @Inject(INTEGRATIONS.HIORG_SERVER_PORT)
    private readonly hiorg: IHiOrgServerPort,
    @Inject(KRAEFTE_REPOSITORIES.STAMM_PERSON)
    private readonly stammPersonRepo: IStammPersonRepository,
    @Inject(INTEGRATIONS.QUALIFIKATION_MAPPING_REPOSITORY)
    private readonly mappingRepo: IQualifikationMappingRepository,
    private readonly tokenRefresh: HiOrgTokenRefreshService,
  ) {}

  /**
   * Führt den Import-Command aus.
   */
  async execute(command: ImportSelectedPersonsCommand): Promise<Result<ImportResultDto>> {
    this.logger.log(`Starting import of ${command.usernames.length} persons from HiOrg-Server`);

    // 1. Gültiges Access Token holen
    const tokenResult = await this.tokenRefresh.getValidAccessToken();
    if (tokenResult.isFailure) {
      return Result.fail(IntegrationError.format(INTEGRATION_ERROR_CODES.CREDENTIALS_NOT_FOUND, tokenResult.error ?? 'Keine gültigen Credentials'));
    }

    const tokenData = tokenResult.value;
    if (!tokenData) {
      return Result.fail(IntegrationError.format(INTEGRATION_ERROR_CODES.CREDENTIALS_NOT_FOUND, 'Kein Access Token verfügbar'));
    }

    // 2. Alle Personen aus HiOrg laden
    const personsResult = await this.hiorg.fetchPersons(tokenData.accessToken, {
      status: ['aktiv', 'eingeschraenkt'], // Auch eingeschränkte Personen können importiert werden
    });

    if (personsResult.isFailure) {
      return Result.fail(personsResult.error ?? 'Fehler beim Laden der Personen aus HiOrg');
    }

    const allPersons = personsResult.value ?? [];

    // 3. Filtern auf ausgewählte Usernames
    const selectedPersons = allPersons.filter((p) => command.usernames.includes(p.username));

    if (selectedPersons.length === 0) {
      return Result.fail(IntegrationError.format(INTEGRATION_ERROR_CODES.IMPORT_FAILED, 'Keine der ausgewählten Personen wurde in HiOrg gefunden'));
    }

    // 4. Qualifikation-Mappings laden
    const mappingsResult = await this.mappingRepo.findByExternalSource(INTEGRATION_TYPES.HIORG_SERVER);
    if (mappingsResult.isFailure) {
      this.logger.warn('Qualifikation-Mappings konnten nicht geladen werden - Import ohne Qualifikationen');
    }
    const mappings = mappingsResult.isSuccess ? (mappingsResult.value ?? []) : [];

    // Map für schnellen Lookup: externalName → qualifikationId
    const mappingLookup = new Map<string, string>();
    for (const mapping of mappings) {
      if (mapping.qualifikationId) {
        mappingLookup.set(mapping.externalName.toLowerCase(), mapping.qualifikationId);
      }
    }

    // 5. Personen importieren
    const results: PersonImportResultItem[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const hiorgPerson of selectedPersons) {
      const result = await this.importPerson(hiorgPerson, command.importedBy, command.duplicateStrategy, mappingLookup);
      results.push(result);

      switch (result.status) {
        case 'created':
          created++;
          this.logger.log(`Created: ${hiorgPerson.username}`);
          break;
        case 'updated':
          updated++;
          this.logger.log(`Updated: ${hiorgPerson.username}`);
          break;
        case 'skipped':
          skipped++;
          this.logger.log(`Skipped: ${hiorgPerson.username} - ${result.error ?? 'Duplikat'}`);
          break;
        case 'failed':
          failed++;
          this.logger.error(`Failed: ${hiorgPerson.username} - ${result.error ?? 'Unbekannter Fehler'}`);
          break;
      }
    }

    this.logger.log(`Import completed: ${created} created, ${updated} updated, ${skipped} skipped, ${failed} failed`);

    return Result.ok({
      totalProcessed: selectedPersons.length,
      created,
      updated,
      skipped,
      failed,
      results,
    });
  }

  /**
   * Importiert eine einzelne Person.
   */
  private async importPerson(hiorgPerson: HiOrgPersonDto, importedBy: string, duplicateStrategy: 'skip' | 'update', mappingLookup: Map<string, string>): Promise<PersonImportResultItem> {
    const baseResult: Omit<PersonImportResultItem, 'status' | 'stammPersonId' | 'error'> = {
      username: hiorgPerson.username,
      vorname: hiorgPerson.vorname,
      nachname: hiorgPerson.nachname,
      qualifikationenMapped: 0,
      qualifikationenUnmapped: 0,
    };

    // Qualifikationen mappen
    const { mapped, unmapped } = this.mapQualifikationen(hiorgPerson, mappingLookup);
    baseResult.qualifikationenMapped = mapped.length;
    baseResult.qualifikationenUnmapped = unmapped;

    // Prüfen ob Person bereits existiert (via externalId)
    const existingResult = await this.stammPersonRepo.findByExternalId(INTEGRATION_TYPES.HIORG_SERVER, hiorgPerson.username);

    if (existingResult.isFailure) {
      return {
        ...baseResult,
        status: 'failed',
        error: 'Fehler bei Duplikatsprüfung',
      };
    }

    const existingPerson = existingResult.value;

    if (existingPerson) {
      // Person existiert bereits
      if (duplicateStrategy === 'skip') {
        return {
          ...baseResult,
          status: 'skipped',
          stammPersonId: existingPerson.id.value,
        };
      }

      // Update-Strategie: Qualifikationen und Sync-Zeit aktualisieren
      const updateResult = existingPerson.update({
        vorname: hiorgPerson.vorname,
        nachname: hiorgPerson.nachname,
        qualifikationIds: mapped,
        updatedBy: importedBy,
      });

      if (updateResult.isFailure) {
        return {
          ...baseResult,
          status: 'failed',
          error: updateResult.error ?? 'Update fehlgeschlagen',
        };
      }

      // Sync-Zeit aktualisieren
      const syncUpdateResult = existingPerson.updateLastSync(importedBy);
      if (syncUpdateResult.isFailure) {
        return {
          ...baseResult,
          status: 'failed',
          error: syncUpdateResult.error ?? 'Sync-Zeit konnte nicht aktualisiert werden',
        };
      }

      // Speichern
      const saveResult = await this.stammPersonRepo.save(existingPerson);
      if (saveResult.isFailure) {
        return {
          ...baseResult,
          status: 'failed',
          error: saveResult.error ?? 'Speichern fehlgeschlagen',
        };
      }

      return {
        ...baseResult,
        status: 'updated',
        stammPersonId: existingPerson.id.value,
      };
    }

    // Neue Person erstellen
    // Personalnummer muss in HiOrg gepflegt sein - kein Raten!
    const personalnummer = hiorgPerson.mitgliednr?.trim();
    if (!personalnummer) {
      return {
        ...baseResult,
        status: 'failed',
        error: 'Keine Personalnummer in HiOrg-Server hinterlegt',
      };
    }

    // Prüfen ob Personalnummer bereits existiert
    const existsByPnrResult = await this.stammPersonRepo.findByPersonalnummer(personalnummer);
    if (existsByPnrResult.isSuccess && existsByPnrResult.value) {
      // Personalnummer existiert bereits, aber andere externalId
      // Das ist ein Konflikt - überspringen mit Warnung
      this.logger.warn(`Personalnummer ${personalnummer} existiert bereits für andere Person - überspringe ${hiorgPerson.username}`);
      return {
        ...baseResult,
        status: 'skipped',
        error: `Personalnummer ${personalnummer} existiert bereits für andere Person`,
      };
    }

    const createResult = StammPerson.create({
      vorname: hiorgPerson.vorname,
      nachname: hiorgPerson.nachname,
      personalnummer,
      funkkenungBOS: undefined, // HiOrg liefert keine Funkkennung
      qualifikationIds: mapped,
      createdBy: importedBy,
    });

    if (createResult.isFailure) {
      return {
        ...baseResult,
        status: 'failed',
        error: createResult.error ?? 'Erstellung fehlgeschlagen',
      };
    }

    const newPerson = createResult.value;
    if (!newPerson) {
      return {
        ...baseResult,
        status: 'failed',
        error: 'StammPerson konnte nicht erstellt werden',
      };
    }

    // Externe Sync-Informationen setzen
    const syncResult = newPerson.markAsSynced(INTEGRATION_TYPES.HIORG_SERVER, hiorgPerson.username, importedBy);
    if (syncResult.isFailure) {
      return {
        ...baseResult,
        status: 'failed',
        error: syncResult.error ?? 'Sync-Informationen konnten nicht gesetzt werden',
      };
    }

    // Speichern
    const saveResult = await this.stammPersonRepo.save(newPerson);
    if (saveResult.isFailure) {
      return {
        ...baseResult,
        status: 'failed',
        error: saveResult.error ?? 'Speichern fehlgeschlagen',
      };
    }

    return {
      ...baseResult,
      status: 'created',
      stammPersonId: newPerson.id.value,
    };
  }

  /**
   * Mappt HiOrg-Qualifikationen auf interne Qualifikation-IDs.
   */
  private mapQualifikationen(hiorgPerson: HiOrgPersonDto, mappingLookup: Map<string, string>): { mapped: string[]; unmapped: number } {
    const mapped: string[] = [];
    let unmapped = 0;

    // Alle Qualifikationen der Person durchgehen
    for (const qual of hiorgPerson.qualifikationen) {
      // Versuche Mapping zu finden (case-insensitive)
      const normalizedName = qual.name.toLowerCase();
      const qualId = mappingLookup.get(normalizedName);

      if (qualId) {
        // Mapping gefunden
        if (!mapped.includes(qualId)) {
          mapped.push(qualId);
        }
      } else {
        // Kein Mapping - auch Kurzname versuchen
        if (qual.name_kurz) {
          const normalizedKurz = qual.name_kurz.toLowerCase();
          const qualIdByKurz = mappingLookup.get(normalizedKurz);
          if (qualIdByKurz && !mapped.includes(qualIdByKurz)) {
            mapped.push(qualIdByKurz);
          } else {
            unmapped++;
          }
        } else {
          unmapped++;
        }
      }
    }

    return { mapped, unmapped };
  }
}
