import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
// biome-ignore lint/style/useImportType: IStammPersonRepository needed for DI at runtime
import { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
// biome-ignore lint/style/useImportType: IQualifikationRepository needed for DI at runtime
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import type { Qualifikation } from '@domain/kraefte/aggregates/qualifikation.aggregate';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import type { StammPersonDto } from '../../dto/stamm-person.dto';
import { StammPersonQueryMapper } from '../stamm-person-query.mapper';
import type { SucheStammPersonenQuery } from './suche-stamm-personen.query';

/**
 * Handler für SucheStammPersonenQuery.
 *
 * Sucht StammPersonen nach Nachname (LIKE-Search, Case-Insensitive)
 * für Autocomplete-Funktionalität.
 *
 * **Story 4-1 AC1 Context:**
 * - Autocomplete beim Person-Hinzufügen
 * - User tippt Nachname → Backend liefert max. limit Vorschläge
 * - Zeigt Name + Personalnummer für eindeutige Identifikation
 * - Archivierte Personen werden ausgeschlossen
 *
 * **Qualifikationen-Loading:**
 * - Lädt Qualifikationen für jede gefundene Person
 * - Frontend kann Qualifikationen anzeigen (z.B. Rettungssanitäter, etc.)
 * - Verwendet Caching um redundante DB-Calls zu vermeiden
 */
@Injectable()
export class SucheStammPersonenHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.STAMM_PERSON)
    private readonly stammPersonRepository: IStammPersonRepository,
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly qualifikationRepository: IQualifikationRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Führt die Autocomplete-Suche aus.
   *
   * **Flow:**
   * 1. Repository sucht nach Nachname (LIKE-Search)
   * 2. Lädt Qualifikationen für gefundene Personen (cached)
   * 3. Mappt Domain Aggregates zu DTOs
   * 4. Rückgabe sortiert nach Nachname, Vorname
   *
   * @param query - SucheStammPersonenQuery mit searchTerm und limit
   * @returns Result<StammPersonDto[]> - Gefundene Personen (max. limit)
   */
  async execute(query: SucheStammPersonenQuery): Promise<Result<StammPersonDto[]>> {
    // 1. Search StammPersonen
    const searchResult = await this.stammPersonRepository.search(query.searchTerm, query.limit);
    if (searchResult.isFailure) {
      return Result.fail(searchResult.error ?? 'Fehler bei der Suche');
    }

    const personen = searchResult.value ?? [];

    if (personen.length === 0) {
      return Result.ok([]);
    }

    // 2. Load unique Qualifikationen (cached to avoid redundant DB calls)
    const qualifikationCache = new Map<string, Qualifikation>();
    const uniqueQualifikationIds = [...new Set(personen.flatMap((p) => p.qualifikationIds))];

    for (const qId of uniqueQualifikationIds) {
      const idResult = QualifikationId.create(qId);
      if (idResult.isFailure || !idResult.value) {
        this.logger.warn(`Invalid qualifikationId: ${qId}`);
        continue;
      }

      const qualResult = await this.qualifikationRepository.findById(idResult.value);
      if (qualResult.isSuccess && qualResult.value) {
        qualifikationCache.set(qId, qualResult.value);
      } else {
        this.logger.warn(`Qualifikation not found: ${qId}`);
      }
    }

    // 3. Map to DTOs with Qualifikationen
    const dtos: StammPersonDto[] = [];
    for (const person of personen) {
      // Get qualifikationen for this person
      const qualifikationen: Qualifikation[] = [];
      for (const qId of person.qualifikationIds) {
        const qual = qualifikationCache.get(qId);
        if (qual) {
          qualifikationen.push(qual);
        }
      }

      dtos.push(StammPersonQueryMapper.toDto(person, qualifikationen));
    }

    return Result.ok(dtos);
  }
}
