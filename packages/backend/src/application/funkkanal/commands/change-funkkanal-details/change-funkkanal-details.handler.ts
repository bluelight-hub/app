import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import type { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import { KanalDetails } from '@domain/aggregates/funkkanal/kanal-details.vo';
import type { KanalDetailsShape } from '@domain/aggregates/funkkanal/kanal-details.vo';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { ChangeFunkkanalDetailsCommand, ChangeFunkkanalDetailsInput } from './change-funkkanal-details.command';

/**
 * Handler zum Ändern der KanalDetails eines Funkkanals.
 *
 * Erlaubt Wechsel zwischen TMO/DMO/Analog; validiert die neue Shape
 * vor der Mutation.
 */
@Injectable()
export class ChangeFunkkanalDetailsHandler extends TransactionalCommandHandler<ChangeFunkkanalDetailsCommand, FunkkanalAggregate> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(FUNKKANAL_REPOSITORY) private readonly funkkanalRepository: IFunkkanalRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: ChangeFunkkanalDetailsCommand, tx: TransactionContext): Promise<Result<FunkkanalAggregate> | { result: FunkkanalAggregate; events: DomainEvent[] }> {
    const kanalIdResult = FunkkanalId.create(command.kanalId);
    if (kanalIdResult.isFailure || !kanalIdResult.value) {
      return Result.fail<FunkkanalAggregate>(kanalIdResult.error ?? 'Ungültige FunkkanalId');
    }

    const detailsResult = buildKanalDetails(command.details);
    if (detailsResult.isFailure || !detailsResult.value) {
      return Result.fail<FunkkanalAggregate>(detailsResult.error ?? 'Ungültige KanalDetails');
    }

    const aggregate = await this.funkkanalRepository.findById(kanalIdResult.value, tx);
    if (!aggregate) {
      return Result.fail<FunkkanalAggregate>('Funkkanal nicht gefunden');
    }

    const mutation = aggregate.changeDetails(detailsResult.value, command.userId);
    if (mutation.isFailure) {
      return Result.fail<FunkkanalAggregate>(mutation.error ?? 'changeDetails fehlgeschlagen');
    }

    await this.funkkanalRepository.save(aggregate, tx);

    const events = aggregate.getDomainEvents();
    aggregate.clearDomainEvents();

    return { result: aggregate, events };
  }
}

function buildKanalDetails(details: ChangeFunkkanalDetailsInput): Result<KanalDetailsShape> {
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
