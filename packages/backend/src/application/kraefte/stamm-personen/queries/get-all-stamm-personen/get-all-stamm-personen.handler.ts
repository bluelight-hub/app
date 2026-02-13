import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import type { StammPersonDto } from '../../dto/stamm-person.dto';
import { StammPersonQueryMapper } from '../stamm-person-query.mapper';
import type { GetAllStammPersonenQuery } from './get-all-stamm-personen.query';

/**
 * Handler für GetAllStammPersonenQuery.
 *
 * Lädt alle Stamm-Personen mit optionalem includeArchived-Filter.
 * Für jede StammPerson werden die zugehörigen Qualifikationen geladen,
 * um das vollständige DTO mit verschachtelten Qualifikations-Details zu bauen.
 *
 * **Sortierung:**
 * Repository sortiert nach: nachname ASC (alphabetisch)
 *
 * **Qualifikationen-Relation (M:N):**
 * - StammPerson hat qualifikationIds: string[] (Foreign Keys via Junction Table)
 * - Für DTO-Mapping müssen Qualifikation-Aggregates geladen werden
 * - Nutzt QualifikationRepository.findByIds() für Batch-Loading (Performance-Optimierung)
 *
 * **Performance:**
 * - Batch-Loading: Sammle alle Qualifikations-IDs, lade in EINER Query
 * - Verhindert N+1 Problem (vorher: 1 + N*M Queries, jetzt: 2 Queries)
 *
 * **Error Handling:**
 * - Repository Failure → Return Result.fail()
 * - Qualifikation nicht gefunden → Skip diese Qualifikation (Log Warning)
 * - Partielles Laden: Eine fehlerhafte Qualifikation bricht nicht die ganze Query ab
 *
 * **Story Context:**
 * Story 2-2 (Stamm-Personen verwalten) - Application Layer Query Handler
 */
@Injectable()
export class GetAllStammPersonenHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.STAMM_PERSON)
    private readonly stammPersonRepository: IStammPersonRepository,
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly qualifikationRepository: IQualifikationRepository,
    @Inject(LOGGER) protected readonly logger: ILogger,
  ) {}

  /**
   * Führt die Query aus.
   *
   * Lädt alle StammPersonen, dann ALLE Qualifikationen in einem Batch-Load.
   * Mappt StammPerson + Qualifikationen zu StammPersonDto mit verschachtelten QualifikationDtos.
   *
   * **Performance-Optimierung (N+1 Fix):**
   * 1. Lade alle StammPersonen (1 Query)
   * 2. Sammle ALLE unique QualifikationsIds über alle Personen
   * 3. Lade ALLE Qualifikationen in EINER Query (findByIds)
   * 4. Baue Lookup-Map für O(1) Zugriff
   * 5. Mappe zu DTOs
   *
   * **Error Handling:**
   * - Repository Failure → Return Result.fail()
   * - Qualifikation nicht gefunden → Skip Qualifikation (Log Warning)
   * - Partielles Laden: Ein fehlerhafter Load bricht nicht die ganze Query ab
   */
  async execute(query: GetAllStammPersonenQuery): Promise<Result<StammPersonDto[]>> {
    // 1. Lade alle StammPersonen
    const stammPersonenResult = await this.stammPersonRepository.findAll({
      includeArchived: query.includeArchived ?? false,
    });

    if (stammPersonenResult.isFailure) {
      return Result.fail<StammPersonDto[]>(stammPersonenResult.error ?? 'Repository returned failure without error');
    }

    const stammPersonen = stammPersonenResult.value ?? [];

    // 2. Sammle alle unique QualifikationsIds
    const allQualifikationIdStrings = new Set<string>();
    for (const stammPerson of stammPersonen) {
      for (const qualifikationIdString of stammPerson.qualifikationIds) {
        allQualifikationIdStrings.add(qualifikationIdString);
      }
    }

    // 3. Parse und batch-lade Qualifikationen
    const qualifikationIdValueObjects: QualifikationId[] = [];
    for (const idString of allQualifikationIdStrings) {
      const idResult = QualifikationId.create(idString);
      if (idResult.isFailure || !idResult.value) {
        this.logger.warn(`Invalid qualifikationId found: ${idString}. Skipping.`);
        continue;
      }
      qualifikationIdValueObjects.push(idResult.value);
    }

    // Single batch query für alle Qualifikationen
    const qualifikationenResult = await this.qualifikationRepository.findByIds(qualifikationIdValueObjects);
    if (qualifikationenResult.isFailure) {
      this.logger.warn(`Failed to batch-load Qualifikationen: ${qualifikationenResult.error}. Continuing with empty qualifications.`);
    }

    // 4. Baue Lookup-Map für O(1) Zugriff
    const qualifikationMap = new Map<string, { id: string; name: string; kuerzel: string }>();
    if (qualifikationenResult.isSuccess && qualifikationenResult.value) {
      for (const qualifikation of qualifikationenResult.value) {
        qualifikationMap.set(qualifikation.id.value, {
          id: qualifikation.id.value,
          name: qualifikation.name,
          kuerzel: qualifikation.abkuerzung,
        });
      }
    }

    // 5. Mappe zu DTOs
    const dtos: StammPersonDto[] = [];
    for (const stammPerson of stammPersonen) {
      const qualifikationData: Array<{ id: string; name: string; kuerzel: string }> = [];

      for (const qualifikationIdString of stammPerson.qualifikationIds) {
        const qualData = qualifikationMap.get(qualifikationIdString);
        if (qualData) {
          qualifikationData.push(qualData);
        } else {
          this.logger.warn(`Qualifikation ${qualifikationIdString} not found for StammPerson ${stammPerson.id.value}. Skipping.`);
        }
      }

      const dto = StammPersonQueryMapper.toDto(stammPerson, qualifikationData);
      dtos.push(dto);
    }

    return Result.ok<StammPersonDto[]>(dtos);
  }
}
