import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEinsatzBeitrittsanfrageRepository, EinsatzBeitrittsanfrageData } from '@domain/repositories/i-einsatz-beitrittsanfrage.repository';
import { EINSATZ_BEITRITTSANFRAGE_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import type { GetBeitrittsanfragenQuery } from './get-beitrittsanfragen.query';

/**
 * Handler zum Abrufen aller Beitrittsanfragen eines Einsatzes.
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Ändert niemals Domain State
 * - Result<T>: Kein Exception-Throwing für vorhersagbare Fehler
 */
@Injectable()
export class GetBeitrittsanfragenHandler {
  constructor(
    @Inject(EINSATZ_BEITRITTSANFRAGE_REPOSITORY)
    private readonly anfrageRepository: IEinsatzBeitrittsanfrageRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  /**
   * Führt die Query aus und gibt alle Beitrittsanfragen zurück.
   *
   * @param query - Validierte Query mit einsatzId und optionalem Status-Filter
   * @returns Result mit Liste von EinsatzBeitrittsanfrageData
   */
  async execute(query: GetBeitrittsanfragenQuery): Promise<Result<EinsatzBeitrittsanfrageData[]>> {
    try {
      const anfragen = await this.anfrageRepository.findByEinsatz(query.einsatzId, query.status);

      this.logger.log(`Beitrittsanfragen abgerufen (einsatz: ${query.einsatzId}, count: ${anfragen.length})`, 'GetBeitrittsanfragenHandler');

      return Result.ok<EinsatzBeitrittsanfrageData[]>(anfragen);
    } catch (error) {
      this.logger.error(`[GetBeitrittsanfragenHandler] Fehler beim Laden der Beitrittsanfragen für Einsatz ${query.einsatzId}: ${error instanceof Error ? error.stack : String(error)}`);

      const errorMessage = error instanceof Error ? error.message : 'Unerwarteter Fehler beim Laden der Beitrittsanfragen';
      return Result.fail<EinsatzBeitrittsanfrageData[]>(errorMessage);
    }
  }
}
