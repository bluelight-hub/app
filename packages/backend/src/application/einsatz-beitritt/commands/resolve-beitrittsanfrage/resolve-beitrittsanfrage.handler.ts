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
import { EinsatzBeitrittsanfrageEntschiedenEvent } from '@domain/events/einsatz-beitrittsanfrage-entschieden.event';
import type { EinsatzBeitrittsanfrageData } from '@domain/repositories/i-einsatz-beitrittsanfrage.repository';
import type { ResolveBeitrittsanfrageCommand } from './resolve-beitrittsanfrage.command';

/**
 * Handler für ResolveBeitrittsanfrageCommand mit Transactional Outbox Pattern.
 *
 * Entscheidet eine Beitrittsanfrage (GENEHMIGT oder ABGELEHNT).
 *
 * **Validierungen:**
 * 1. Anfrage existiert
 * 2. Anfrage ist noch OFFEN (nicht bereits entschieden)
 *
 * **Event Flow:**
 * - EinsatzBeitrittsanfrageEntschiedenEvent wird in Outbox persistiert
 */
@Injectable()
export class ResolveBeitrittsanfrageHandler extends TransactionalCommandHandler<ResolveBeitrittsanfrageCommand, EinsatzBeitrittsanfrageData> {
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
    command: ResolveBeitrittsanfrageCommand,
    tx: TransactionContext,
  ): Promise<Result<EinsatzBeitrittsanfrageData> | { result: EinsatzBeitrittsanfrageData; events: DomainEvent[] }> {
    // 1. Anfrage laden
    const anfrage = await this.anfrageRepository.findById(command.anfrageId);
    if (!anfrage) {
      return Result.fail(`Beitrittsanfrage mit ID ${command.anfrageId} nicht gefunden`);
    }

    // 2. Prüfe ob Anfrage noch OFFEN ist
    if (anfrage.status !== 'OFFEN') {
      this.logger.warn('Beitrittsanfrage bereits entschieden', {
        anfrageId: command.anfrageId,
        currentStatus: anfrage.status,
      });
      return Result.fail('Diese Beitrittsanfrage wurde bereits entschieden');
    }

    // 3. Anfrage entscheiden
    const resolvedAnfrage = await this.anfrageRepository.resolve(command.anfrageId, command.decision, command.resolvedBy, tx);

    // 4. Event erstellen
    const event = new EinsatzBeitrittsanfrageEntschiedenEvent(resolvedAnfrage.id, resolvedAnfrage.einsatzId, resolvedAnfrage.userId, command.decision, command.resolvedBy);

    this.logger.log('Beitrittsanfrage entschieden', {
      anfrageId: resolvedAnfrage.id,
      einsatzId: resolvedAnfrage.einsatzId,
      decision: command.decision,
      resolvedBy: command.resolvedBy,
    });

    return { result: resolvedAnfrage, events: [event] };
  }
}
