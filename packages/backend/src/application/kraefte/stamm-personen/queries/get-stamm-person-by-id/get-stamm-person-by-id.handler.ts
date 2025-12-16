import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@domain/common/result';
// biome-ignore lint/style/useImportType: IStammPersonRepository needed for DI at runtime
import { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
// biome-ignore lint/style/useImportType: IQualifikationRepository needed for DI at runtime
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { StammPersonId } from '@domain/kraefte/value-objects/stamm-person-id';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
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
 * - Nutzt QualifikationRepository.findById() pro Qualifikation
 *
 * **Performance Consideration:**
 * - N+1 Query Problem: Pro Qualifikation ein findById() Call
 * - Optimierung möglich: Batch-Loading via QualifikationRepository.findByIds()
 * - Aktuell akzeptabel für Admin-UI mit wenigen Qualifikationen pro Person (<20)
 *
 * **Story Context:**
 * Story 2-2 (Stamm-Personen verwalten) - Application Layer Query Handler
 */
@Injectable()
export class GetStammPersonByIdHandler {
  protected readonly logger = new Logger(GetStammPersonByIdHandler.name);

  constructor(
    @Inject(KRAEFTE_REPOSITORIES.STAMM_PERSON)
    private readonly stammPersonRepository: IStammPersonRepository,
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly qualifikationRepository: IQualifikationRepository,
  ) {}

  /**
   * Führt die Query aus.
   *
   * @returns Result<StammPersonDto | null> - null wenn nicht gefunden
   */
  async execute(query: GetStammPersonByIdQuery): Promise<Result<StammPersonDto | null>> {
    // Validiere stammPersonId via Value Object
    const stammPersonIdResult = StammPersonId.create(query.id);
    if (stammPersonIdResult.isFailure) {
      if (!stammPersonIdResult.error) {
        this.logger.error('StammPersonId.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('ID validation returned failure without error message');
      }
      return Result.fail<StammPersonDto | null>(stammPersonIdResult.error);
    }

    // Type Narrowing: value ist garantiert vorhanden nach isFailure Check
    const stammPersonId = stammPersonIdResult.value;
    if (!stammPersonId) {
      this.logger.error('StammPersonId.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('ID validation succeeded but value is null');
    }

    // Repository Call: Lade StammPerson
    const stammPersonResult = await this.stammPersonRepository.findById(stammPersonId);
    if (stammPersonResult.isFailure) {
      if (!stammPersonResult.error) {
        this.logger.error('Repository.findById returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail<StammPersonDto | null>(stammPersonResult.error);
    }

    // Not found → Return null (not error)
    const stammPerson = stammPersonResult.value;
    if (!stammPerson) {
      return Result.ok<StammPersonDto | null>(null);
    }

    // Lade zugehörige Qualifikationen
    const qualifikationIds = stammPerson.qualifikationIds;
    const qualifikationData: Array<{
      id: string;
      name: string;
      kuerzel: string;
    }> = [];

    for (const qualifikationIdString of qualifikationIds) {
      // Parse qualifikationId zu QualifikationId Value Object
      const qualifikationIdResult = QualifikationId.create(qualifikationIdString);
      if (qualifikationIdResult.isFailure) {
        this.logger.warn(`StammPerson ${stammPerson.id.value} has invalid qualifikationId: ${qualifikationIdString}. Skipping.`);
        continue; // Skip diese Qualifikation
      }

      const qualifikationId = qualifikationIdResult.value;
      if (!qualifikationId) {
        this.logger.warn(`StammPerson ${stammPerson.id.value} qualifikationId parsing returned null. Skipping.`);
        continue;
      }

      // Lade Qualifikation Aggregate
      const qualifikationResult = await this.qualifikationRepository.findById(qualifikationId);
      if (qualifikationResult.isFailure) {
        this.logger.warn(`Failed to load Qualifikation ${qualifikationId.value} for StammPerson ${stammPerson.id.value}: ${qualifikationResult.error}. Skipping.`);
        continue; // Skip diese Qualifikation
      }

      const qualifikation = qualifikationResult.value;
      if (!qualifikation) {
        this.logger.warn(`Qualifikation ${qualifikationId.value} not found for StammPerson ${stammPerson.id.value}. Skipping (Referential Integrity Fehler).`);
        continue; // Skip diese Qualifikation (Junction Table Data Inconsistency)
      }

      // Sammle Qualifikations-Daten
      qualifikationData.push({
        id: qualifikation.id.value,
        name: qualifikation.name,
        kuerzel: qualifikation.abkuerzung,
      });
    }

    // Map to DTO
    const dto = StammPersonQueryMapper.toDto(stammPerson, qualifikationData);
    return Result.ok<StammPersonDto | null>(dto);
  }
}
