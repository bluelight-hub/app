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
import type { RenameFunkkanalCommand } from './rename-funkkanal.command';

/**
 * Handler zum Umbenennen eines Funkkanals.
 *
 * Transaktional: Aggregat + `FunkkanalGeaendertEvent` werden atomar über
 * den Outbox persistiert.
 */
@Injectable()
export class RenameFunkkanalHandler extends TransactionalCommandHandler<RenameFunkkanalCommand, FunkkanalAggregate> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(FUNKKANAL_REPOSITORY) private readonly funkkanalRepository: IFunkkanalRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: RenameFunkkanalCommand, tx: TransactionContext): Promise<Result<FunkkanalAggregate> | { result: FunkkanalAggregate; events: DomainEvent[] }> {
    const kanalIdResult = FunkkanalId.create(command.kanalId);
    if (kanalIdResult.isFailure || !kanalIdResult.value) {
      return Result.fail<FunkkanalAggregate>(kanalIdResult.error ?? 'Ungültige FunkkanalId');
    }
    const kanalId = kanalIdResult.value;

    const aggregate = await this.funkkanalRepository.findById(kanalId, tx);
    if (!aggregate) {
      return Result.fail<FunkkanalAggregate>('Funkkanal nicht gefunden');
    }

    if (await this.funkkanalRepository.existsByName(aggregate.einsatzId, command.name, kanalId, tx)) {
      return Result.fail<FunkkanalAggregate>('Kanalname bereits vergeben');
    }

    const renameResult = aggregate.rename(command.name, command.userId);
    if (renameResult.isFailure) {
      return Result.fail<FunkkanalAggregate>(renameResult.error ?? 'Rename fehlgeschlagen');
    }

    await this.funkkanalRepository.save(aggregate, tx);

    const events = aggregate.getDomainEvents();
    aggregate.clearDomainEvents();

    return { result: aggregate, events };
  }
}
