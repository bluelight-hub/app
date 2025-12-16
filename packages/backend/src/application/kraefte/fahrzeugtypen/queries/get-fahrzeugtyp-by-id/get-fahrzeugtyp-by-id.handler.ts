import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@domain/common/result';
// biome-ignore lint/style/useImportType: IFahrzeugtypRepository needed for DI at runtime
import { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
import { FahrzeugtypId } from '@domain/kraefte/value-objects/fahrzeugtyp-id';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import type { FahrzeugtypDto } from '../../dto/fahrzeugtyp.dto';
import { FahrzeugtypQueryMapper } from '../fahrzeugtyp-query.mapper';
import type { GetFahrzeugtypByIdQuery } from './get-fahrzeugtyp-by-id.query';

/**
 * Handler für GetFahrzeugtypByIdQuery.
 *
 * Lädt einen einzelnen Fahrzeugtyp nach ID.
 *
 * **NOT_FOUND Error Code (Task 10):**
 * Gibt Result.ok(null) zurück wenn nicht gefunden (kein Error).
 * Controller mapped null zu HTTP 404.
 */
@Injectable()
export class GetFahrzeugtypByIdHandler {
  protected readonly logger = new Logger(GetFahrzeugtypByIdHandler.name);

  constructor(
    @Inject(KRAEFTE_REPOSITORIES.FAHRZEUGTYP)
    private readonly repository: IFahrzeugtypRepository,
  ) {}

  /**
   * Führt die Query aus.
   *
   * @returns Result<FahrzeugtypDto | null> - null wenn nicht gefunden
   */
  async execute(query: GetFahrzeugtypByIdQuery): Promise<Result<FahrzeugtypDto | null>> {
    // Validiere fahrzeugtypId via Value Object
    const fahrzeugtypIdResult = FahrzeugtypId.create(query.id);
    if (fahrzeugtypIdResult.isFailure) {
      if (!fahrzeugtypIdResult.error) {
        this.logger.error('FahrzeugtypId.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('ID validation returned failure without error message');
      }
      return Result.fail<FahrzeugtypDto | null>(fahrzeugtypIdResult.error);
    }

    // Type Narrowing: value ist garantiert vorhanden nach isFailure Check
    const fahrzeugtypId = fahrzeugtypIdResult.value;
    if (!fahrzeugtypId) {
      this.logger.error('FahrzeugtypId.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('ID validation succeeded but value is null');
    }

    // Repository Call
    const repoResult = await this.repository.findById(fahrzeugtypId);
    if (repoResult.isFailure) {
      if (!repoResult.error) {
        this.logger.error('Repository.findById returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail<FahrzeugtypDto | null>(repoResult.error);
    }

    // Not found → Return null (not error)
    if (!repoResult.value) {
      return Result.ok<FahrzeugtypDto | null>(null);
    }

    // Map to DTO
    const dto = FahrzeugtypQueryMapper.toDto(repoResult.value);
    return Result.ok<FahrzeugtypDto | null>(dto);
  }
}
