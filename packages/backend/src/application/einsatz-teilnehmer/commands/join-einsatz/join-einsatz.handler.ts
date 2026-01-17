import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { EinsatzTeilnehmerDto, IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EINSATZ_TEILNEHMER_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import type { JoinEinsatzCommand } from './join-einsatz.command';

/**
 * Handler für JoinEinsatzCommand.
 *
 * Ermöglicht einem User das Beitreten eines Einsatzes mit einem Funkrufnamen.
 * Falls der User bereits beigetreten ist, wird der Funkrufname aktualisiert.
 */
@Injectable()
export class JoinEinsatzHandler {
  constructor(
    @Inject(EINSATZ_TEILNEHMER_REPOSITORY)
    private readonly repository: IEinsatzTeilnehmerRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  async execute(command: JoinEinsatzCommand): Promise<Result<EinsatzTeilnehmerDto>> {
    this.logger.log(`User ${command.userId} joining Einsatz ${command.einsatzId} with Funkrufname "${command.funkrufname}"`);

    // Prüfe ob User bereits beigetreten ist
    const existing = await this.repository.findByEinsatzAndUser(command.einsatzId, command.userId);

    if (existing) {
      // User bereits beigetreten - aktualisiere Funkrufname
      this.logger.log(`User ${command.userId} already joined Einsatz ${command.einsatzId}, updating Funkrufname`);

      const updated = await this.repository.updateFunkrufname(command.einsatzId, command.userId, command.funkrufname);

      if (!updated) {
        this.logger.error(`Failed to update Funkrufname for User ${command.userId} in Einsatz ${command.einsatzId}`);
        return Result.fail('Funkrufname konnte nicht aktualisiert werden');
      }

      return Result.ok(updated);
    }

    // Neuer Beitritt
    try {
      const teilnehmer = await this.repository.create({
        einsatzId: command.einsatzId,
        userId: command.userId,
        funkrufname: command.funkrufname,
      });

      this.logger.log(`User ${command.userId} successfully joined Einsatz ${command.einsatzId}`);
      return Result.ok(teilnehmer);
    } catch (error) {
      this.logger.error(`Failed to join Einsatz: ${error instanceof Error ? error.message : String(error)}`);
      return Result.fail('Einsatz-Beitritt fehlgeschlagen');
    }
  }
}
