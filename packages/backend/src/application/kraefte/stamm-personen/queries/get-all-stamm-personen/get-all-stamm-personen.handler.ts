import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@domain/common/result';
// biome-ignore lint/style/useImportType: IStammPersonRepository needed for DI at runtime
import { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
// biome-ignore lint/style/useImportType: IQualifikationRepository needed for DI at runtime
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
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
 * - Nutzt QualifikationRepository.findById() pro Qualifikation
 *
 * **Performance Consideration:**
 * - N+1 Query Problem: Pro StammPerson und pro Qualifikation ein findById() Call
 * - Optimierung möglich: Batch-Loading via QualifikationRepository.findByIds()
 * - Aktuell akzeptabel für Admin-UI mit wenigen Personen (<100) und Qualifikationen (<20)
 * - Future: Repository könnte Eager-Loading mit Prisma `include` implementieren
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
  protected readonly logger = new Logger(GetAllStammPersonenHandler.name);

  constructor(
    @Inject(KRAEFTE_REPOSITORIES.STAMM_PERSON)
    private readonly stammPersonRepository: IStammPersonRepository,
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly qualifikationRepository: IQualifikationRepository,
  ) {}

  /**
   * Führt die Query aus.
   *
   * Lädt alle StammPersonen, dann für jede Person alle zugehörigen Qualifikationen.
   * Mappt StammPerson + Qualifikationen zu StammPersonDto mit verschachtelten QualifikationDtos.
   *
   * **Error Handling:**
   * - Repository Failure → Return Result.fail()
   * - Qualifikation nicht gefunden → Skip Qualifikation (Log Warning)
   * - Partielles Laden: Ein fehlerhafter Load bricht nicht die ganze Query ab
   */
  async execute(query: GetAllStammPersonenQuery): Promise<Result<StammPersonDto[]>> {
    // Lade alle StammPersonen
    const stammPersonenResult = await this.stammPersonRepository.findAll({
      includeArchived: query.includeArchived ?? false,
    });

    if (stammPersonenResult.isFailure) {
      if (!stammPersonenResult.error) {
        this.logger.error('Repository.findAll returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail<StammPersonDto[]>(stammPersonenResult.error);
    }

    const stammPersonen = stammPersonenResult.value ?? [];
    const dtos: StammPersonDto[] = [];

    // Für jede StammPerson: Lade zugehörige Qualifikationen
    for (const stammPerson of stammPersonen) {
      const qualifikationIds = stammPerson.qualifikationIds;

      // Sammle alle Qualifikationen für diese Person
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

      // Mappe zu DTO
      const dto = StammPersonQueryMapper.toDto(stammPerson, qualifikationData);
      dtos.push(dto);
    }

    return Result.ok<StammPersonDto[]>(dtos);
  }
}
