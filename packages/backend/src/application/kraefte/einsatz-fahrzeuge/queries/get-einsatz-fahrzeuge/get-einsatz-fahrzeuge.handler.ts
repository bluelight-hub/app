import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '@domain/common/result';
// biome-ignore lint/style/useImportType: IEinsatzFahrzeugRepository needed for DI at runtime
import { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
// biome-ignore lint/style/useImportType: IFahrzeugtypRepository needed for DI at runtime
import { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
// biome-ignore lint/style/useImportType: IEinsatzPersonRepository needed for DI at runtime
import { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import { FahrzeugtypId } from '@domain/kraefte/value-objects/fahrzeugtyp-id';
import type { Fahrzeugtyp, EinsatzPerson } from '@domain/kraefte';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import type { EinsatzFahrzeugDto } from '../../dto';
import { EinsatzFahrzeugQueryMapper } from '../einsatz-fahrzeug-query.mapper';
import type { GetEinsatzFahrzeugeQuery } from './get-einsatz-fahrzeuge.query';

/**
 * Handler für GetEinsatzFahrzeugeQuery.
 *
 * Lädt alle EinsatzFahrzeuge eines Einsatzes mit ihren Fahrzeugtypen.
 */
@Injectable()
export class GetEinsatzFahrzeugeHandler {
  private readonly logger = new Logger(GetEinsatzFahrzeugeHandler.name);

  constructor(
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG)
    private readonly einsatzFahrzeugRepository: IEinsatzFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.FAHRZEUGTYP)
    private readonly fahrzeugtypRepository: IFahrzeugtypRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON)
    private readonly einsatzPersonRepository: IEinsatzPersonRepository,
  ) {}

  /**
   * Führt die Query aus und gibt alle EinsatzFahrzeuge des Einsatzes zurück.
   *
   * **Fahrzeugtyp Eager Loading:**
   * - Repository lädt EinsatzFahrzeuge per findByEinsatzId
   * - Handler lädt Fahrzeugtypen für DTO Mapping
   * - Caching vermeidet redundante Fahrzeugtyp-Loads
   *
   * **Besatzung Eager Loading (Story 4.3 AC5):**
   * - Handler lädt zugewiesene Personen für jedes Fahrzeug
   * - Cached per Fahrzeug-ID für DTO Mapping
   *
   * @param query - GetEinsatzFahrzeugeQuery mit einsatzId
   * @returns Result<EinsatzFahrzeugDto[]> - Liste der EinsatzFahrzeuge mit Besatzung
   */
  async execute(query: GetEinsatzFahrzeugeQuery): Promise<Result<EinsatzFahrzeugDto[]>> {
    // 1. Load EinsatzFahrzeuge
    const fahrzeugeResult = await this.einsatzFahrzeugRepository.findByEinsatzId(query.einsatzId);
    if (fahrzeugeResult.isFailure) {
      return Result.fail(fahrzeugeResult.error ?? 'Fehler beim Laden der Fahrzeuge');
    }

    const fahrzeuge = fahrzeugeResult.value ?? [];

    if (fahrzeuge.length === 0) {
      return Result.ok([]);
    }

    // 2. Load unique Fahrzeugtypen (cached)
    const fahrzeugtypCache = new Map<string, Fahrzeugtyp>();
    const uniqueFahrzeugtypIds = [...new Set(fahrzeuge.map((f) => f.fahrzeugtypId))];

    for (const fahrzeugtypIdStr of uniqueFahrzeugtypIds) {
      const idResult = FahrzeugtypId.create(fahrzeugtypIdStr);
      if (idResult.isFailure || !idResult.value) {
        this.logger.warn(`Invalid fahrzeugtypId: ${fahrzeugtypIdStr}`);
        continue;
      }

      const fahrzeugtypResult = await this.fahrzeugtypRepository.findById(idResult.value);
      if (fahrzeugtypResult.isSuccess && fahrzeugtypResult.value) {
        fahrzeugtypCache.set(fahrzeugtypIdStr, fahrzeugtypResult.value);
      }
    }

    // 3. Load Besatzung für alle Fahrzeuge
    const besatzungCache = new Map<string, EinsatzPerson[]>();
    for (const fahrzeug of fahrzeuge) {
      const besatzungResult = await this.einsatzPersonRepository.findByFahrzeugId(fahrzeug.id.value);
      if (besatzungResult.isSuccess && besatzungResult.value) {
        besatzungCache.set(fahrzeug.id.value, besatzungResult.value);
      }
    }

    // 4. Map to DTOs
    const dtos: EinsatzFahrzeugDto[] = [];
    for (const fahrzeug of fahrzeuge) {
      const fahrzeugtyp = fahrzeugtypCache.get(fahrzeug.fahrzeugtypId);
      if (!fahrzeugtyp) {
        this.logger.warn(`Fahrzeugtyp not found for EinsatzFahrzeug ${fahrzeug.id.value}: ${fahrzeug.fahrzeugtypId}`);
        continue;
      }
      const besatzung = besatzungCache.get(fahrzeug.id.value) ?? [];
      dtos.push(EinsatzFahrzeugQueryMapper.toDto(fahrzeug, fahrzeugtyp, besatzung));
    }

    return Result.ok(dtos);
  }
}
