import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { EinsatzTeilnehmerDto, IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EINSATZ_TEILNEHMER_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import type { GetMyTeilnahmeQuery } from './get-my-teilnahme.query';

/**
 * Handler für GetMyTeilnahmeQuery.
 *
 * Lädt die aktive Einsatz-Teilnahme eines Users (inkl. Funkrufname).
 * Wird für ETB-Absender Auto-Fill verwendet.
 */
@Injectable()
export class GetMyTeilnahmeHandler {
  constructor(
    @Inject(EINSATZ_TEILNEHMER_REPOSITORY)
    private readonly repository: IEinsatzTeilnehmerRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  async execute(query: GetMyTeilnahmeQuery): Promise<Result<EinsatzTeilnehmerDto | null>> {
    this.logger.log(`Getting Teilnahme for User ${query.userId} in Einsatz ${query.einsatzId}`);

    const teilnahme = await this.repository.findByEinsatzAndUser(query.einsatzId, query.userId);

    if (!teilnahme) {
      this.logger.log(`User ${query.userId} has not joined Einsatz ${query.einsatzId}`);
    }

    return Result.ok(teilnahme);
  }
}
