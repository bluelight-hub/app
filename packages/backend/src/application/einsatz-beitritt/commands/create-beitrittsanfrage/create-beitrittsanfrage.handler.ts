import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEinsatzBeitrittsanfrageRepository } from '@domain/repositories/i-einsatz-beitrittsanfrage.repository';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common';
import { Result } from '@domain/common/result';
import { EINSATZ_BEITRITTSANFRAGE_REPOSITORY, OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { EinsatzBeitrittsanfrageErstelltEvent } from '@domain/events/einsatz-beitrittsanfrage-erstellt.event';
import type { EinsatzBeitrittsanfrageData } from '@domain/repositories/i-einsatz-beitrittsanfrage.repository';
import type { CreateBeitrittsanfrageCommand } from './create-beitrittsanfrage.command';

/**
 * Handler für CreateBeitrittsanfrageCommand mit Transactional Outbox Pattern.
 *
 * Erstellt eine Beitrittsanfrage für einen Einsatz.
 *
 * **Validierungen:**
 * 1. Keine offene Anfrage für diesen User+Einsatz vorhanden
 * 2. Einsatz existiert und ist IN_BEARBEITUNG
 *
 * **Event Flow:**
 * - EinsatzBeitrittsanfrageErstelltEvent wird in Outbox persistiert
 */
@Injectable()
export class CreateBeitrittsanfrageHandler extends TransactionalCommandHandler<CreateBeitrittsanfrageCommand, EinsatzBeitrittsanfrageData> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(EINSATZ_BEITRITTSANFRAGE_REPOSITORY)
    private readonly anfrageRepository: IEinsatzBeitrittsanfrageRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: CreateBeitrittsanfrageCommand,
    tx: TransactionContext,
  ): Promise<Result<EinsatzBeitrittsanfrageData> | { result: EinsatzBeitrittsanfrageData; events: DomainEvent[] }> {
    // 1. Prüfe ob bereits eine offene Anfrage existiert
    const existingAnfrage = await this.anfrageRepository.findOpenByEinsatzAndUser(command.einsatzId, command.userId);
    if (existingAnfrage) {
      this.logger.warn('Offene Beitrittsanfrage existiert bereits', {
        einsatzId: command.einsatzId,
        userId: command.userId,
      });
      return Result.fail('Es existiert bereits eine offene Beitrittsanfrage für diesen Einsatz');
    }

    // 2. Prüfe ob Einsatz existiert und IN_BEARBEITUNG ist
    const einsatz = await this.prisma.einsatz.findUnique({
      where: { id: command.einsatzId },
      select: { id: true, status: true },
    });

    if (!einsatz) {
      return Result.fail(`Einsatz mit ID ${command.einsatzId} nicht gefunden`);
    }

    if (einsatz.status !== 'IN_BEARBEITUNG') {
      return Result.fail('Beitrittsanfragen können nur für aktive Einsätze (IN_BEARBEITUNG) gestellt werden');
    }

    // 3. Anfrage erstellen
    const anfrage = await this.anfrageRepository.save({ einsatzId: command.einsatzId, userId: command.userId }, tx);

    // 4. Event erstellen
    const event = new EinsatzBeitrittsanfrageErstelltEvent(anfrage.id, anfrage.einsatzId, anfrage.userId);

    this.logger.log('Beitrittsanfrage erstellt', {
      anfrageId: anfrage.id,
      einsatzId: anfrage.einsatzId,
      userId: anfrage.userId,
    });

    return { result: anfrage, events: [event] };
  }
}
