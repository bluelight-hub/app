import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { EinsatzTeilnehmerDto, IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EINSATZ_TEILNEHMER_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import type { GetAllTeilnehmerQuery } from './get-all-teilnehmer.query';

/**
 * Handler für GetAllTeilnehmerQuery.
 *
 * Lädt alle aktiven Einsatz-Teilnehmer (Funkrufnamen).
 * Wird für ETB-Absender/Empfänger Autocomplete-Vorschläge verwendet.
 */
@Injectable()
export class GetAllTeilnehmerHandler {
  constructor(
    @Inject(EINSATZ_TEILNEHMER_REPOSITORY)
    private readonly repository: IEinsatzTeilnehmerRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  async execute(query: GetAllTeilnehmerQuery): Promise<Result<EinsatzTeilnehmerDto[]>> {
    this.logger.log(`Getting all Teilnehmer for Einsatz ${query.einsatzId}`);

    const teilnehmer = await this.repository.findActiveByEinsatz(query.einsatzId);

    this.logger.log(`Found ${teilnehmer.length} active Teilnehmer for Einsatz ${query.einsatzId}`);

    return Result.ok(teilnehmer);
  }
}
