import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
// biome-ignore lint/style/useImportType: IEinsatzPersonRepository needed for DI at runtime
import { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import type { EinsatzPersonResponseDto } from '../../dto';
import { EinsatzPersonDtoMapper } from '../../dto';
import type { GetEinsatzPersonenQuery } from './get-einsatz-personen.query';

/**
 * Handler für GetEinsatzPersonenQuery.
 *
 * Lädt alle EinsatzPersonen eines Einsatzes aus dem Repository und
 * mappt sie zu Response DTOs.
 *
 * **Story 4-1 Context:**
 * - Zeigt alle registrierten Personen im Einsatz
 * - Inkludiert sowohl Stammdaten-Personen (mit stammId) als auch
 *   temporäre Personen (ohne stammId)
 * - Sortierung erfolgt im Repository (nach Erfassungszeitpunkt)
 */
@Injectable()
export class GetEinsatzPersonenHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON)
    private readonly einsatzPersonRepository: IEinsatzPersonRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Führt die Query aus und gibt alle EinsatzPersonen des Einsatzes zurück.
   *
   * **Flow:**
   * 1. Repository lädt EinsatzPersonen per findByEinsatzId
   * 2. Mapper konvertiert Domain Aggregates zu DTOs
   * 3. Rückgabe als Result<EinsatzPersonResponseDto[]>
   *
   * @param query - GetEinsatzPersonenQuery mit einsatzId
   * @returns Result<EinsatzPersonResponseDto[]> - Liste der EinsatzPersonen
   */
  async execute(query: GetEinsatzPersonenQuery): Promise<Result<EinsatzPersonResponseDto[]>> {
    this.logger.log(`GetEinsatzPersonenQuery für Einsatz ${query.einsatzId} wird ausgeführt`);

    // 1. Load EinsatzPersonen
    const personenResult = await this.einsatzPersonRepository.findByEinsatzId(query.einsatzId);
    if (personenResult.isFailure) {
      this.logger.error(`Fehler beim Laden der Personen für Einsatz ${query.einsatzId}: ${personenResult.error}`);
      return Result.fail(personenResult.error ?? 'Fehler beim Laden der Personen');
    }

    const personen = personenResult.value ?? [];

    if (personen.length === 0) {
      this.logger.log(`Keine Personen gefunden für Einsatz ${query.einsatzId}`);
      return Result.ok([]);
    }

    // 2. Map to DTOs
    const dtos = EinsatzPersonDtoMapper.toResponseDtoList(personen);

    this.logger.log(`${personen.length} Personen für Einsatz ${query.einsatzId} erfolgreich geladen`);

    return Result.ok(dtos);
  }
}
