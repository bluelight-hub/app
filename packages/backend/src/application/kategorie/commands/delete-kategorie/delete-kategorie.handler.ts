import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IKategorieRepository } from '@domain/kategorie/repositories/i-kategorie.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KategorieId } from '@domain/kategorie/value-objects/kategorie-id';
import { UserId } from '@domain/value-objects/user-id';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { KATEGORIE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { DeleteKategorieCommand } from './delete-kategorie.command';
import { KATEGORIE_ERROR_CODES } from '../../errors/kategorie-error.codes';

/**
 * Handler zum Loeschen einer Kategorie (Soft-Delete).
 * Nutzt TransactionalCommandHandler fuer atomare Persistenz mit Outbox-Events.
 */
@Injectable()
export class DeleteKategorieHandler extends TransactionalCommandHandler<DeleteKategorieCommand, void> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KATEGORIE_REPOSITORY)
    private readonly kategorieRepository: IKategorieRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: DeleteKategorieCommand, _tx: TransactionContext): Promise<Result<void> | { result: undefined; events: DomainEvent[] }> {
    // 1. KategorieId erstellen
    const kategorieIdResult = KategorieId.create(command.kategorieId);
    if (kategorieIdResult.isFailure || !kategorieIdResult.value) {
      return Result.fail<void>(KATEGORIE_ERROR_CODES.NOT_FOUND);
    }

    // 2. UserId erstellen
    const userIdResult = UserId.create(command.geloeschtVon);
    if (userIdResult.isFailure || !userIdResult.value) {
      return Result.fail<void>(KATEGORIE_ERROR_CODES.GELOESCHT_VON_REQUIRED);
    }

    // 3. Kategorie aus Repository laden
    const kategorie = await this.kategorieRepository.findById(kategorieIdResult.value as KategorieId, _tx);
    if (!kategorie) {
      return Result.fail<void>(KATEGORIE_ERROR_CODES.NOT_FOUND);
    }

    // 4. Soft-Delete durchfuehren (Domain-Validierung in Entity)
    const deleteResult = kategorie.softDelete(userIdResult.value as UserId);
    if (deleteResult.isFailure) {
      return Result.fail<void>(deleteResult.error ?? KATEGORIE_ERROR_CODES.DELETE_FAILED);
    }

    // 5. Persistieren (Transaction Context weitergeben!)
    await this.kategorieRepository.save(kategorie, _tx);

    this.logger.log(`Kategorie geloescht (id: ${kategorie.id.toString()}, name: "${kategorie.name.value}")`, 'DeleteKategorieHandler');

    // 6. Events sammeln
    const events = kategorie.getDomainEvents();
    kategorie.clearDomainEvents();

    return {
      result: undefined,
      events,
    };
  }
}
