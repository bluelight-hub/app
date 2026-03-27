import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common';
import { Result } from '@domain/common/result';
import { OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { StammpersonAssignedEvent } from '@domain/events/stammperson-assigned.event';
import { AssignStammpersonCommand } from './assign-stammperson.command';

/**
 * Handler für AssignStammpersonCommand mit Transactional Outbox Pattern.
 *
 * Weist einem User eine Stammperson zu oder entfernt die Zuweisung.
 *
 * **Transaktionaler Flow:**
 * 1. User in DB laden (via tx)
 * 2. Prüfen ob User existiert
 * 3. Wenn stammpersonId nicht null: Prüfen ob Stammperson existiert
 * 4. Wenn stammpersonId nicht null: Prüfen ob Stammperson nicht bereits einem anderen User zugewiesen ist
 * 5. stammpersonId auf User-Record aktualisieren
 * 6. StammpersonAssignedEvent erstellen (nur bei Zuweisung, nicht bei Entfernung)
 */
@CommandHandler(AssignStammpersonCommand)
@Injectable()
export class AssignStammpersonHandler extends TransactionalCommandHandler<AssignStammpersonCommand, string> {
  constructor(prisma: PrismaService, @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository) {
    super(prisma, outboxRepository);
  }

  /**
   * Führt die Stammperson-Zuweisung innerhalb einer Datenbank-Transaktion aus.
   */
  protected async executeInTransaction(command: AssignStammpersonCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    // Prisma TX für DB-Zugriff casten
    const prismaTransaction = tx as { user: PrismaService['user']; stammPerson: PrismaService['stammPerson'] };

    // 1. User laden
    const user = await prismaTransaction.user.findUnique({
      where: { id: command.userId },
      select: { id: true, stammpersonId: true },
    });

    if (!user) {
      return Result.fail(`User mit ID ${command.userId} nicht gefunden`);
    }

    // 2. Stammperson-Validierung (wenn zugewiesen wird)
    if (command.stammpersonId !== null) {
      // Prüfen ob Stammperson existiert
      const stammperson = await prismaTransaction.stammPerson.findUnique({
        where: { id: command.stammpersonId },
        select: { id: true },
      });

      if (!stammperson) {
        return Result.fail(`Stammperson mit ID ${command.stammpersonId} nicht gefunden`);
      }

      // Prüfen ob Stammperson bereits einem anderen User zugewiesen ist
      const existingAssignment = await prismaTransaction.user.findFirst({
        where: {
          stammpersonId: command.stammpersonId,
          id: { not: command.userId },
        },
        select: { id: true },
      });

      if (existingAssignment) {
        return Result.fail(`Stammperson ist bereits einem anderen User zugewiesen`);
      }
    }

    // 3. Stammperson-Zuweisung aktualisieren
    await prismaTransaction.user.update({
      where: { id: command.userId },
      data: { stammpersonId: command.stammpersonId },
    });

    // 4. Event erstellen (nur bei Zuweisung, nicht bei Entfernung)
    const events: DomainEvent[] = [];
    if (command.stammpersonId !== null) {
      events.push(new StammpersonAssignedEvent(command.userId, command.stammpersonId, command.assignedBy));
    }

    return {
      result: command.userId,
      events,
    };
  }
}
