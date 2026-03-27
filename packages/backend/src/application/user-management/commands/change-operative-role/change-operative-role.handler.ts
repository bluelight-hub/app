import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common';
import { Result } from '@domain/common/result';
import { OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { OperativeRoleChangedEvent } from '@domain/events/operative-role-changed.event';
import { ChangeOperativeRoleCommand } from './change-operative-role.command';

/**
 * Handler für ChangeOperativeRoleCommand mit Transactional Outbox Pattern.
 *
 * Ändert die operative Rolle eines Users und erstellt ein OperativeRoleChangedEvent.
 *
 * **Transaktionaler Flow:**
 * 1. User in DB laden und prüfen ob er existiert
 * 2. Prüfen ob sich die Rolle tatsächlich ändert
 * 3. operativeRole auf User-Record aktualisieren
 * 4. OperativeRoleChangedEvent erstellen
 * 5. Base Handler speichert Event in Outbox (atomar in gleicher TX)
 */
@CommandHandler(ChangeOperativeRoleCommand)
@Injectable()
export class ChangeOperativeRoleHandler extends TransactionalCommandHandler<ChangeOperativeRoleCommand, string> {
  constructor(prisma: PrismaService, @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository) {
    super(prisma, outboxRepository);
  }

  /**
   * Führt die Rollenänderung innerhalb einer Datenbank-Transaktion aus.
   */
  protected async executeInTransaction(command: ChangeOperativeRoleCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    // Prisma TX für DB-Zugriff casten
    const prismaTransaction = tx as { user: PrismaService['user'] };

    // 1. User laden
    const user = await prismaTransaction.user.findUnique({
      where: { id: command.userId },
      select: { id: true, operativeRole: true },
    });

    if (!user) {
      return Result.fail(`User mit ID ${command.userId} nicht gefunden`);
    }

    // 2. Prüfen ob sich die Rolle ändert (Rollen-Validierung erfolgt bereits im Command)
    if (user.operativeRole === command.newRole) {
      return Result.fail(`User hat bereits die Rolle ${command.newRole}`);
    }

    const oldRole = user.operativeRole;

    // 3. Rolle aktualisieren
    await prismaTransaction.user.update({
      where: { id: command.userId },
      data: { operativeRole: command.newRole as 'FUEHRUNGSKRAFT' | 'EINSATZKRAFT' | 'EXTERNE' },
    });

    // 4. Event erstellen
    const event = new OperativeRoleChangedEvent(command.userId, oldRole, command.newRole, command.changedBy);

    return {
      result: command.userId,
      events: [event],
    };
  }
}
