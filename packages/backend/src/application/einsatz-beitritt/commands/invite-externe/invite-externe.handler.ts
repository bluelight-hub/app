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
import type { InviteExterneCommand } from './invite-externe.command';

/**
 * Handler für InviteExterneCommand mit Transactional Outbox Pattern.
 *
 * Lädt einen EXTERNE-User in einen Einsatz ein. Die Beitrittsanfrage
 * wird direkt mit Status GENEHMIGT erstellt (FK-initiierte Einladung).
 *
 * **Validierungen:**
 * 1. User existiert und hat operativeRole === 'EXTERNE'
 * 2. Keine bestehende GENEHMIGT-Beitrittsanfrage für diesen Einsatz+User
 * 3. Einsatz existiert
 *
 * **Sonderfälle:**
 * - Bestehende ABGELEHNT-Anfrage → Update auf GENEHMIGT
 * - Keine bestehende Anfrage → Neue Anfrage mit GENEHMIGT erstellen
 *
 * **Event Flow:**
 * - EinsatzBeitrittsanfrageEntschiedenEvent wird in Outbox persistiert
 */
@Injectable()
export class InviteExterneHandler extends TransactionalCommandHandler<InviteExterneCommand, EinsatzBeitrittsanfrageData> {
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
    command: InviteExterneCommand,
    tx: TransactionContext,
  ): Promise<Result<EinsatzBeitrittsanfrageData> | { result: EinsatzBeitrittsanfrageData; events: DomainEvent[] }> {
    // 1. Prüfe ob User existiert und operative Rolle EXTERNE hat
    const user = await this.prisma.user.findUnique({
      where: { id: command.userId },
      select: { id: true, operativeRole: true },
    });

    if (!user) {
      return Result.fail(`User mit ID ${command.userId} nicht gefunden`);
    }

    if (user.operativeRole !== 'EXTERNE') {
      this.logger.warn('Einladung nur für EXTERNE-User möglich', {
        userId: command.userId,
        operativeRole: user.operativeRole,
      });
      return Result.fail('Nur User mit operativer Rolle EXTERNE können eingeladen werden');
    }

    // 2. Prüfe ob bereits eine GENEHMIGT-Beitrittsanfrage existiert
    const existingAnfrage = await this.prisma.einsatzBeitrittsanfrage.findUnique({
      where: { einsatzId_userId: { einsatzId: command.einsatzId, userId: command.userId } },
    });

    if (existingAnfrage && existingAnfrage.status === 'GENEHMIGT') {
      this.logger.warn('EXTERNE-User bereits für Einsatz genehmigt', {
        einsatzId: command.einsatzId,
        userId: command.userId,
      });
      return Result.fail('Dieser User ist bereits für den Einsatz genehmigt');
    }

    // 3. Prüfe ob Einsatz existiert
    const einsatz = await this.prisma.einsatz.findUnique({
      where: { id: command.einsatzId },
      select: { id: true },
    });

    if (!einsatz) {
      return Result.fail(`Einsatz mit ID ${command.einsatzId} nicht gefunden`);
    }

    // 4. Beitrittsanfrage erstellen oder aktualisieren
    let anfrage: EinsatzBeitrittsanfrageData;

    if (existingAnfrage && existingAnfrage.status === 'ABGELEHNT') {
      // Bestehende ABGELEHNT-Anfrage → auf GENEHMIGT aktualisieren
      anfrage = await this.anfrageRepository.resolve(existingAnfrage.id, 'GENEHMIGT', command.invitedBy, tx);

      this.logger.log('Abgelehnte Beitrittsanfrage auf GENEHMIGT aktualisiert (FK-Einladung)', {
        anfrageId: anfrage.id,
        einsatzId: anfrage.einsatzId,
        userId: anfrage.userId,
        invitedBy: command.invitedBy,
      });
    } else {
      // Keine bestehende Anfrage → neue mit GENEHMIGT erstellen
      const created = await this.anfrageRepository.save({ einsatzId: command.einsatzId, userId: command.userId }, tx);
      anfrage = await this.anfrageRepository.resolve(created.id, 'GENEHMIGT', command.invitedBy, tx);

      this.logger.log('EXTERNE-User eingeladen (Beitrittsanfrage mit GENEHMIGT erstellt)', {
        anfrageId: anfrage.id,
        einsatzId: anfrage.einsatzId,
        userId: anfrage.userId,
        invitedBy: command.invitedBy,
      });
    }

    // 5. Event erstellen
    const event = new EinsatzBeitrittsanfrageEntschiedenEvent(anfrage.id, anfrage.einsatzId, anfrage.userId, 'GENEHMIGT', command.invitedBy);

    return { result: anfrage, events: [event] };
  }
}
