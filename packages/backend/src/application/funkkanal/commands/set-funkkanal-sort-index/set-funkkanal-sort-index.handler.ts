import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import type { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { SetFunkkanalSortIndexCommand } from './set-funkkanal-sort-index.command';

/**
 * Handler zum Aktualisieren des `sortIndex` eines einzelnen Funkkanals.
 */
@Injectable()
export class SetFunkkanalSortIndexHandler extends TransactionalCommandHandler<SetFunkkanalSortIndexCommand, FunkkanalAggregate> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(FUNKKANAL_REPOSITORY) private readonly funkkanalRepository: IFunkkanalRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: SetFunkkanalSortIndexCommand, tx: TransactionContext): Promise<Result<FunkkanalAggregate> | { result: FunkkanalAggregate; events: DomainEvent[] }> {
    const kanalIdResult = FunkkanalId.create(command.kanalId);
    if (kanalIdResult.isFailure || !kanalIdResult.value) {
      return Result.fail<FunkkanalAggregate>(kanalIdResult.error ?? 'Ungültige FunkkanalId');
    }

    const aggregate = await this.funkkanalRepository.findById(kanalIdResult.value, tx);
    if (!aggregate) {
      return Result.fail<FunkkanalAggregate>('Funkkanal nicht gefunden');
    }

    const mutation = aggregate.setSortIndex(command.sortIndex, command.userId);
    if (mutation.isFailure) {
      return Result.fail<FunkkanalAggregate>(mutation.error ?? 'setSortIndex fehlgeschlagen');
    }

    await this.funkkanalRepository.save(aggregate, tx);

    const events = aggregate.getDomainEvents();
    aggregate.clearDomainEvents();

    return { result: aggregate, events };
  }
}
