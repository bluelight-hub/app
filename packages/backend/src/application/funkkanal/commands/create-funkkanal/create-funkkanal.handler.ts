import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { KanalDetails } from '@domain/aggregates/funkkanal/kanal-details.vo';
import type { KanalDetailsShape } from '@domain/aggregates/funkkanal/kanal-details.vo';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { CreateFunkkanalCommand, CreateFunkkanalCommandDetails } from './create-funkkanal.command';

/**
 * Handler zum Anlegen eines neuen Funkkanals.
 *
 * Transaktional: Aggregat + `FunkkanalErstelltEvent` werden atomar in der
 * gleichen TX persistiert (Outbox-Pattern via {@link TransactionalCommandHandler}).
 */
@Injectable()
export class CreateFunkkanalHandler extends TransactionalCommandHandler<CreateFunkkanalCommand, FunkkanalAggregate> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(FUNKKANAL_REPOSITORY) private readonly funkkanalRepository: IFunkkanalRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: CreateFunkkanalCommand, tx: TransactionContext): Promise<Result<FunkkanalAggregate> | { result: FunkkanalAggregate; events: DomainEvent[] }> {
    const einsatzIdResult = EinsatzId.create(command.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail<FunkkanalAggregate>(einsatzIdResult.error ?? 'Ungültige EinsatzId');
    }
    const einsatzId = einsatzIdResult.value;

    const userIdResult = UserId.create(command.userId);
    if (userIdResult.isFailure || !userIdResult.value) {
      return Result.fail<FunkkanalAggregate>(userIdResult.error ?? 'Ungültige UserId');
    }

    const detailsResult = buildKanalDetails(command.details);
    if (detailsResult.isFailure || !detailsResult.value) {
      return Result.fail<FunkkanalAggregate>(detailsResult.error ?? 'Ungültige KanalDetails');
    }

    if (await this.funkkanalRepository.existsByName(einsatzId, command.name, undefined, tx)) {
      return Result.fail<FunkkanalAggregate>('Kanalname bereits vergeben');
    }

    const sortIndex = command.sortIndex ?? (await this.nextSortIndex(einsatzId, tx));

    const aggregateResult = FunkkanalAggregate.create({
      einsatzId,
      name: command.name,
      details: detailsResult.value,
      sortIndex,
      zweck: command.zweck,
      createdBy: command.userId,
    });
    if (aggregateResult.isFailure || !aggregateResult.value) {
      return Result.fail<FunkkanalAggregate>(aggregateResult.error ?? 'Funkkanal konnte nicht erstellt werden');
    }
    const aggregate = aggregateResult.value;

    await this.funkkanalRepository.save(aggregate, tx);

    const events = aggregate.getDomainEvents();
    aggregate.clearDomainEvents();

    return { result: aggregate, events };
  }

  private async nextSortIndex(einsatzId: EinsatzId, tx: TransactionContext): Promise<number> {
    const existing = await this.funkkanalRepository.findByEinsatzId(einsatzId, { includeArchived: true }, tx);
    if (existing.length === 0) {
      return 0;
    }
    const max = existing.reduce((acc, kanal) => (kanal.sortIndex > acc ? kanal.sortIndex : acc), -1);
    return max + 1;
  }
}

function buildKanalDetails(details: CreateFunkkanalCommandDetails): Result<KanalDetailsShape> {
  switch (details.type) {
    case 'tmo':
      return KanalDetails.tmo({ sprechgruppe: details.sprechgruppe, gssi: details.gssi });
    case 'dmo':
      return KanalDetails.dmo({ dmoKanal: details.dmoKanal, repeater: details.repeater });
    case 'analog':
      return KanalDetails.analog({ band: details.band, frequenz: details.frequenz, kanalnummer: details.kanalnummer });
    default:
      return Result.fail<KanalDetailsShape>('Unbekannter details.type');
  }
}
