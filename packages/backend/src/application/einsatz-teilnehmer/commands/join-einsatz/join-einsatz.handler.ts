import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { EinsatzTeilnehmerDto, IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EINSATZ_TEILNEHMER_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import type { JoinEinsatzCommand } from './join-einsatz.command';

/**
 * Handler für JoinEinsatzCommand.
 *
 * Ermöglicht einem User das Beitreten eines Einsatzes mit einer EinsatzPerson.
 * Falls der User bereits beigetreten ist, wird die verknüpfte Person aktualisiert.
 */
@Injectable()
export class JoinEinsatzHandler {
  constructor(
    @Inject(EINSATZ_TEILNEHMER_REPOSITORY)
    private readonly repository: IEinsatzTeilnehmerRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: JoinEinsatzCommand): Promise<Result<EinsatzTeilnehmerDto>> {
    this.logger.log(`User ${command.userId} joining Einsatz ${command.einsatzId} with EinsatzPerson "${command.einsatzPersonId}"`);

    // 1. Validiere: EinsatzPerson existiert und gehört zum Einsatz
    const person = await this.prisma.einsatzPerson.findFirst({
      where: {
        id: command.einsatzPersonId,
        einsatzId: command.einsatzId,
      },
      select: { id: true },
    });

    if (!person) {
      return Result.fail('EinsatzPerson existiert nicht oder gehört nicht zu diesem Einsatz');
    }

    // 2. Prüfe ob User bereits beigetreten ist
    const existing = await this.repository.findByEinsatzAndUser(command.einsatzId, command.userId);

    if (existing) {
      // 3. Validiere: Person nicht bereits von anderem Bearbeiter verknüpft
      const isLinked = await this.repository.isPersonAlreadyLinked(
        command.einsatzId,
        command.einsatzPersonId,
        command.userId, // Eigene Verknüpfung ausschließen
      );

      if (isLinked) {
        return Result.fail('Diese Person ist bereits einem anderen Bearbeiter zugeordnet');
      }

      // User bereits beigetreten - aktualisiere EinsatzPerson
      this.logger.log(`User ${command.userId} already joined Einsatz ${command.einsatzId}, updating EinsatzPerson`);

      const updated = await this.repository.updateEinsatzPerson(command.einsatzId, command.userId, command.einsatzPersonId);

      if (!updated) {
        this.logger.error(`Failed to update EinsatzPerson for User ${command.userId} in Einsatz ${command.einsatzId}`);
        return Result.fail('EinsatzPerson konnte nicht aktualisiert werden');
      }

      return Result.ok(updated);
    }

    // 4. Validiere: Person nicht bereits von anderem Bearbeiter verknüpft
    const isLinked = await this.repository.isPersonAlreadyLinked(command.einsatzId, command.einsatzPersonId);

    if (isLinked) {
      return Result.fail('Diese Person ist bereits einem anderen Bearbeiter zugeordnet');
    }

    // Neuer Beitritt
    try {
      const teilnehmer = await this.repository.create({
        einsatzId: command.einsatzId,
        userId: command.userId,
        einsatzPersonId: command.einsatzPersonId,
      });

      this.logger.log(`User ${command.userId} successfully joined Einsatz ${command.einsatzId}`);
      return Result.ok(teilnehmer);
    } catch (error) {
      this.logger.error(`Failed to join Einsatz: ${error instanceof Error ? error.message : String(error)}`);
      return Result.fail('Einsatz-Beitritt fehlgeschlagen');
    }
  }
}
