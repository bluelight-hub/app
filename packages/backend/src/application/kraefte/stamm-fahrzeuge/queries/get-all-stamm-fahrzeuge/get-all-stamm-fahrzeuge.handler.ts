import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Result } from '@domain/common/result';
// biome-ignore lint/style/useImportType: IStammFahrzeugRepository needed for DI at runtime
import { IStammFahrzeugRepository } from '@domain/kraefte/repositories/i-stamm-fahrzeug.repository';
// biome-ignore lint/style/useImportType: IFahrzeugtypRepository needed for DI at runtime
import { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
import { FahrzeugtypId } from '@domain/kraefte/value-objects/fahrzeugtyp-id';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import type { StammFahrzeugDto } from '../../dto';
import { StammFahrzeugQueryMapper } from '../stamm-fahrzeug-query.mapper';
import type { GetAllStammFahrzeugeQuery } from './get-all-stamm-fahrzeuge.query';

/**
 * Handler für GetAllStammFahrzeugeQuery.
 *
 * Lädt alle Stamm-Fahrzeuge mit optionalem includeArchived-Filter.
 * Für jedes StammFahrzeug wird der zugehörige Fahrzeugtyp geladen,
 * um das vollständige DTO mit verschachteltem FahrzeugtypDto zu bauen.
 *
 * **Sortierung:**
 * Repository sortiert nach: rufname ASC (alphabetisch)
 *
 * **Fahrzeugtyp-Relation:**
 * - StammFahrzeug hat fahrzeugtypId: string (Foreign Key)
 * - Für DTO-Mapping muss Fahrzeugtyp-Aggregate geladen werden
 * - Nutzt FahrzeugtypRepository.findById() pro StammFahrzeug
 *
 * **Performance Consideration:**
 * - N+1 Query Problem: Pro StammFahrzeug ein findById() Call
 * - Für Production: Repository könnte Batch-Loading implementieren
 * - Aktuell akzeptabel für Admin-UI mit wenigen Fahrzeugen (<100)
 *
 * **Story Context:**
 * Story 2-1 (Stamm-Fahrzeuge verwalten) - Application Layer Query Handler
 */
@Injectable()
export class GetAllStammFahrzeugeHandler {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(KRAEFTE_REPOSITORIES.STAMM_FAHRZEUG)
    private readonly stammFahrzeugRepository: IStammFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.FAHRZEUGTYP)
    private readonly fahrzeugtypRepository: IFahrzeugtypRepository,
  ) {}

  /**
   * Führt die Query aus.
   *
   * Lädt alle StammFahrzeuge, dann für jedes den zugehörigen Fahrzeugtyp.
   * Mappt beide Aggregates zu StammFahrzeugDto mit verschachteltem FahrzeugtypDto.
   *
   * **Error Handling:**
   * - Repository Failure → Return Result.fail()
   * - Fahrzeugtyp nicht gefunden → Skip StammFahrzeug (Log Warning)
   * - Partielles Laden: Ein fehlerhafter Fahrzeugtyp bricht nicht die ganze Query ab
   */
  async execute(query: GetAllStammFahrzeugeQuery): Promise<Result<StammFahrzeugDto[]>> {
    // Lade alle StammFahrzeuge
    const stammFahrzeugeResult = await this.stammFahrzeugRepository.findAll(query.includeArchived ?? false);

    if (stammFahrzeugeResult.isFailure) {
      if (!stammFahrzeugeResult.error) {
        this.logger.error('Repository.findAll returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail<StammFahrzeugDto[]>(stammFahrzeugeResult.error);
    }

    const stammFahrzeuge = stammFahrzeugeResult.value ?? [];
    const dtos: StammFahrzeugDto[] = [];

    // Lade für jedes StammFahrzeug den zugehörigen Fahrzeugtyp
    for (const stammFahrzeug of stammFahrzeuge) {
      // Parse fahrzeugtypId zu FahrzeugtypId Value Object
      const fahrzeugtypIdResult = FahrzeugtypId.create(stammFahrzeug.fahrzeugtypId);
      if (fahrzeugtypIdResult.isFailure) {
        this.logger.warn(`StammFahrzeug ${stammFahrzeug.id.value} has invalid fahrzeugtypId: ${stammFahrzeug.fahrzeugtypId}. Skipping.`);
        continue; // Skip dieses Fahrzeug
      }

      const fahrzeugtypId = fahrzeugtypIdResult.value;
      if (!fahrzeugtypId) {
        this.logger.warn(`StammFahrzeug ${stammFahrzeug.id.value} fahrzeugtypId parsing returned null. Skipping.`);
        continue;
      }

      // Lade Fahrzeugtyp Aggregate
      const fahrzeugtypResult = await this.fahrzeugtypRepository.findById(fahrzeugtypId);
      if (fahrzeugtypResult.isFailure) {
        this.logger.warn(`Failed to load Fahrzeugtyp ${fahrzeugtypId.value} for StammFahrzeug ${stammFahrzeug.id.value}: ${fahrzeugtypResult.error}. Skipping.`);
        continue; // Skip dieses Fahrzeug
      }

      const fahrzeugtyp = fahrzeugtypResult.value;
      if (!fahrzeugtyp) {
        this.logger.warn(`Fahrzeugtyp ${fahrzeugtypId.value} not found for StammFahrzeug ${stammFahrzeug.id.value}. Skipping.`);
        continue; // Skip dieses Fahrzeug (Referential Integrity Fehler)
      }

      // Mappe zu DTO
      const dto = StammFahrzeugQueryMapper.toDto(stammFahrzeug, fahrzeugtyp);
      dtos.push(dto);
    }

    return Result.ok<StammFahrzeugDto[]>(dtos);
  }
}
