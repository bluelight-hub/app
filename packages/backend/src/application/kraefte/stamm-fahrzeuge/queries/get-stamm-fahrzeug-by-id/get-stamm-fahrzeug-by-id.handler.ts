import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@domain/common/result';
// biome-ignore lint/style/useImportType: IStammFahrzeugRepository needed for DI at runtime
import { IStammFahrzeugRepository } from '@domain/kraefte/repositories/i-stamm-fahrzeug.repository';
// biome-ignore lint/style/useImportType: IFahrzeugtypRepository needed for DI at runtime
import { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
import { StammFahrzeugId } from '@domain/kraefte/value-objects/stamm-fahrzeug-id';
import { FahrzeugtypId } from '@domain/kraefte/value-objects/fahrzeugtyp-id';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import type { StammFahrzeugDto } from '../../dto';
import { StammFahrzeugQueryMapper } from '../stamm-fahrzeug-query.mapper';
import type { GetStammFahrzeugByIdQuery } from './get-stamm-fahrzeug-by-id.query';

/**
 * Handler für GetStammFahrzeugByIdQuery.
 *
 * Lädt ein einzelnes Stamm-Fahrzeug nach ID.
 * Lädt den zugehörigen Fahrzeugtyp um vollständiges DTO zu bauen.
 *
 * **NOT_FOUND Error Code:**
 * Gibt Result.ok(null) zurück wenn nicht gefunden (kein Error).
 * Controller mappt null zu HTTP 404.
 *
 * **Fahrzeugtyp-Relation:**
 * - StammFahrzeug hat fahrzeugtypId: string (Foreign Key)
 * - Für DTO-Mapping muss Fahrzeugtyp-Aggregate geladen werden
 * - Nutzt FahrzeugtypRepository.findById()
 *
 * **Story Context:**
 * Story 2-1 (Stamm-Fahrzeuge verwalten) - Application Layer Query Handler
 */
@Injectable()
export class GetStammFahrzeugByIdHandler {
  protected readonly logger = new Logger(GetStammFahrzeugByIdHandler.name);

  constructor(
    @Inject(KRAEFTE_REPOSITORIES.STAMM_FAHRZEUG)
    private readonly stammFahrzeugRepository: IStammFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.FAHRZEUGTYP)
    private readonly fahrzeugtypRepository: IFahrzeugtypRepository,
  ) {}

  /**
   * Führt die Query aus.
   *
   * @returns Result<StammFahrzeugDto | null> - null wenn nicht gefunden
   */
  async execute(query: GetStammFahrzeugByIdQuery): Promise<Result<StammFahrzeugDto | null>> {
    // Validiere stammFahrzeugId via Value Object
    const stammFahrzeugIdResult = StammFahrzeugId.create(query.id);
    if (stammFahrzeugIdResult.isFailure) {
      if (!stammFahrzeugIdResult.error) {
        this.logger.error('StammFahrzeugId.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('ID validation returned failure without error message');
      }
      return Result.fail<StammFahrzeugDto | null>(stammFahrzeugIdResult.error);
    }

    // Type Narrowing: value ist garantiert vorhanden nach isFailure Check
    const stammFahrzeugId = stammFahrzeugIdResult.value;
    if (!stammFahrzeugId) {
      this.logger.error('StammFahrzeugId.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('ID validation succeeded but value is null');
    }

    // Repository Call: Lade StammFahrzeug
    const stammFahrzeugResult = await this.stammFahrzeugRepository.findById(stammFahrzeugId);
    if (stammFahrzeugResult.isFailure) {
      if (!stammFahrzeugResult.error) {
        this.logger.error('Repository.findById returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail<StammFahrzeugDto | null>(stammFahrzeugResult.error);
    }

    // Not found → Return null (not error)
    const stammFahrzeug = stammFahrzeugResult.value;
    if (!stammFahrzeug) {
      return Result.ok<StammFahrzeugDto | null>(null);
    }

    // Lade zugehörigen Fahrzeugtyp
    const fahrzeugtypIdResult = FahrzeugtypId.create(stammFahrzeug.fahrzeugtypId);
    if (fahrzeugtypIdResult.isFailure) {
      // Sollte nicht passieren (DB Constraint), aber Defense in Depth
      this.logger.error(`StammFahrzeug ${stammFahrzeug.id.value} has invalid fahrzeugtypId: ${stammFahrzeug.fahrzeugtypId}`);
      return Result.fail<StammFahrzeugDto | null>(`Dateninkonsistenz: fahrzeugtypId ist ungültig (${fahrzeugtypIdResult.error})`);
    }

    const fahrzeugtypId = fahrzeugtypIdResult.value;
    if (!fahrzeugtypId) {
      this.logger.error(`StammFahrzeug ${stammFahrzeug.id.value} fahrzeugtypId parsing returned null`);
      return Result.fail<StammFahrzeugDto | null>('Dateninkonsistenz: fahrzeugtypId konnte nicht geparst werden');
    }

    const fahrzeugtypResult = await this.fahrzeugtypRepository.findById(fahrzeugtypId);
    if (fahrzeugtypResult.isFailure) {
      this.logger.error(`Failed to load Fahrzeugtyp ${fahrzeugtypId.value} for StammFahrzeug ${stammFahrzeug.id.value}: ${fahrzeugtypResult.error}`);
      return Result.fail<StammFahrzeugDto | null>(`Fehler beim Laden des Fahrzeugtyps: ${fahrzeugtypResult.error}`);
    }

    const fahrzeugtyp = fahrzeugtypResult.value;
    if (!fahrzeugtyp) {
      // Referential Integrity Fehler (sollte durch FK-Constraint verhindert werden)
      this.logger.error(`Fahrzeugtyp ${fahrzeugtypId.value} not found for StammFahrzeug ${stammFahrzeug.id.value}`);
      return Result.fail<StammFahrzeugDto | null>('Dateninkonsistenz: Fahrzeugtyp nicht gefunden (Foreign Key Constraint verletzt)');
    }

    // Map to DTO
    const dto = StammFahrzeugQueryMapper.toDto(stammFahrzeug, fahrzeugtyp);
    return Result.ok<StammFahrzeugDto | null>(dto);
  }
}
