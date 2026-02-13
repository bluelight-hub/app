import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { StammPersonId } from '@domain/kraefte/value-objects/stamm-person-id';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import type { StammPersonDto } from '../../dto/stamm-person.dto';
import { StammPersonQueryMapper } from '../stamm-person-query.mapper';
import type { GetStammPersonByIdQuery } from './get-stamm-person-by-id.query';

/**
 * Handler für GetStammPersonByIdQuery.
 *
 * Lädt eine einzelne Stamm-Person nach ID.
 * Lädt die zugehörigen Qualifikationen um vollständiges DTO zu bauen.
 *
 * **NOT_FOUND Error Code:**
 * Gibt Result.ok(null) zurück wenn nicht gefunden (kein Error).
 * Controller mappt null zu HTTP 404.
 *
 * **Qualifikationen-Relation (M:N):**
 * - StammPerson hat qualifikationIds: string[] (Foreign Keys via Junction Table)
 * - Für DTO-Mapping müssen Qualifikation-Aggregates geladen werden
 * - Nutzt QualifikationRepository.findByIds() für Batch-Loading (Performance-Optimierung)
 *
 * **Performance:**
 * - Batch-Loading: Lade alle Qualifikationen einer Person in EINER Query
 * - Verhindert N+1 Problem (vorher: 1 + N Queries, jetzt: 2 Queries)
 *
 * **Story Context:**
 * Story 2-2 (Stamm-Personen verwalten) - Application Layer Query Handler
 */
@Injectable()
export class GetStammPersonByIdHandler {
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
   * **Performance-Optimierung (N+1 Fix):**
   * 1. Validiere und lade StammPerson (1 Query)
   * 2. Batch-lade alle Qualifikationen in EINER Query (findByIds)
   * 3. Mappe zu DTO
   *
   * @returns Result<StammPersonDto | null> - null wenn nicht gefunden
   */
  async execute(query: GetStammPersonByIdQuery): Promise<Result<StammPersonDto | null>> {
    // 1. Validiere stammPersonId via Value Object
    const stammPersonIdResult = StammPersonId.create(query.id);
    if (stammPersonIdResult.isFailure || !stammPersonIdResult.value) {
      return Result.fail<StammPersonDto | null>(stammPersonIdResult.error ?? 'Invalid StammPerson ID');
    }

    const stammPersonId = stammPersonIdResult.value;

    // 2. Repository Call: Lade StammPerson
    const stammPersonResult = await this.stammPersonRepository.findById(stammPersonId);
    if (stammPersonResult.isFailure) {
      return Result.fail<StammPersonDto | null>(stammPersonResult.error ?? 'Repository error');
    }

    // Not found → Return null (not error)
    const stammPerson = stammPersonResult.value;
    if (!stammPerson) {
      return Result.ok<StammPersonDto | null>(null);
    }

    // 3. Parse QualifikationsIds zu Value Objects
    const qualifikationIdValueObjects: QualifikationId[] = [];
    for (const idString of stammPerson.qualifikationIds) {
      const idResult = QualifikationId.create(idString);
      if (idResult.isFailure || !idResult.value) {
        this.logger.warn(`StammPerson ${stammPerson.id.value} has invalid qualifikationId: ${idString}. Skipping.`);
        continue;
      }
      qualifikationIdValueObjects.push(idResult.value);
    }

    // 4. Batch-lade alle Qualifikationen in EINER Query
    const qualifikationData: Array<{ id: string; name: string; kuerzel: string }> = [];

    if (qualifikationIdValueObjects.length > 0) {
      const qualifikationenResult = await this.qualifikationRepository.findByIds(qualifikationIdValueObjects);

      if (qualifikationenResult.isSuccess && qualifikationenResult.value) {
        // Baue Lookup-Map für korrektes Ordering
        const qualifikationMap = new Map(qualifikationenResult.value.map((q) => [q.id.value, { id: q.id.value, name: q.name, kuerzel: q.abkuerzung }]));

        // Erhalte ursprüngliche Reihenfolge
        for (const idString of stammPerson.qualifikationIds) {
          const qualData = qualifikationMap.get(idString);
          if (qualData) {
            qualifikationData.push(qualData);
          } else {
            this.logger.warn(`Qualifikation ${idString} not found for StammPerson ${stammPerson.id.value}. Skipping.`);
          }
        }
      } else {
        this.logger.warn(`Failed to batch-load Qualifikationen: ${qualifikationenResult.error}. Continuing with empty qualifications.`);
      }
    }

    // 5. Map to DTO
    const dto = StammPersonQueryMapper.toDto(stammPerson, qualifikationData);
    return Result.ok<StammPersonDto | null>(dto);
  }
}
