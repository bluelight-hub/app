import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { INotizRepository } from '@domain/notiz/repositories/i-notiz.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { NotizId } from '@domain/notiz/value-objects/notiz-id';
import { UserId } from '@domain/value-objects/user-id';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { NOTIZ_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { DeleteNotizCommand } from './delete-notiz.command';
import { NOTIZ_ERROR_CODES } from '../../errors/notiz-error.codes';

/**
 * Handler zum Loeschen einer Notiz (Soft-Delete, Story 7.4).
 * Nutzt TransactionalCommandHandler fuer atomare Persistenz mit Outbox-Events.
 */
@Injectable()
export class DeleteNotizHandler extends TransactionalCommandHandler<DeleteNotizCommand, void> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(NOTIZ_REPOSITORY)
    private readonly notizRepository: INotizRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: DeleteNotizCommand, _tx: TransactionContext): Promise<Result<void> | { result: void; events: DomainEvent[] }> {
    // 1. NotizId erstellen
    const notizIdResult = NotizId.create(command.notizId);
    if (notizIdResult.isFailure || !notizIdResult.value) {
      return Result.fail<void>(NOTIZ_ERROR_CODES.NOT_FOUND);
    }

    // 2. UserId erstellen
    const userIdResult = UserId.create(command.geloeschtVon);
    if (userIdResult.isFailure || !userIdResult.value) {
      return Result.fail<void>(NOTIZ_ERROR_CODES.GELOESCHT_VON_REQUIRED);
    }

    // 3. Notiz aus Repository laden
    const notiz = await this.notizRepository.findById(notizIdResult.value as NotizId, _tx);
    if (!notiz) {
      return Result.fail<void>(NOTIZ_ERROR_CODES.NOT_FOUND);
    }

    // 4. Soft-Delete durchfuehren (Domain-Validierung in Entity)
    const deleteResult = notiz.delete(userIdResult.value as UserId);
    if (deleteResult.isFailure) {
      return Result.fail<void>(deleteResult.error ?? NOTIZ_ERROR_CODES.DELETE_FAILED);
    }

    // 5. Persistieren (Transaction Context weitergeben!)
    await this.notizRepository.save(notiz, _tx);

    this.logger.log(`Notiz geloescht (id: ${notiz.id.toString()}, titel: "${notiz.titel.value}")`, 'DeleteNotizHandler');

    // 6. Events sammeln
    const events = notiz.getDomainEvents();
    notiz.clearDomainEvents();

    return {
      result: undefined,
      events,
    };
  }
}
