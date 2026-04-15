import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import type { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { FunkkanalZuordnungId } from '@domain/value-objects/funkkanal-zuordnung-id';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { AendereZuordnungRolleCommand } from './aendere-zuordnung-rolle.command';

/**
 * Handler zum Ändern der Rolle einer bestehenden Funkkanal-Zuordnung.
 */
@Injectable()
export class AendereZuordnungRolleHandler extends TransactionalCommandHandler<AendereZuordnungRolleCommand, FunkkanalAggregate> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(FUNKKANAL_REPOSITORY) private readonly funkkanalRepository: IFunkkanalRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: AendereZuordnungRolleCommand, tx: TransactionContext): Promise<Result<FunkkanalAggregate> | { result: FunkkanalAggregate; events: DomainEvent[] }> {
    const kanalIdResult = FunkkanalId.create(command.kanalId);
    if (kanalIdResult.isFailure || !kanalIdResult.value) {
      return Result.fail<FunkkanalAggregate>(kanalIdResult.error ?? 'Ungültige FunkkanalId');
    }
    const zuordnungIdResult = FunkkanalZuordnungId.create(command.zuordnungId);
    if (zuordnungIdResult.isFailure || !zuordnungIdResult.value) {
      return Result.fail<FunkkanalAggregate>(zuordnungIdResult.error ?? 'Ungültige ZuordnungId');
    }

    const aggregate = await this.funkkanalRepository.findById(kanalIdResult.value, tx);
    if (!aggregate) {
      return Result.fail<FunkkanalAggregate>('Funkkanal nicht gefunden');
    }

    const mutation = aggregate.aendereZuordnungRolle(zuordnungIdResult.value, command.rolle, command.userId);
    if (mutation.isFailure) {
      return Result.fail<FunkkanalAggregate>(mutation.error ?? 'aendereZuordnungRolle fehlgeschlagen');
    }

    await this.funkkanalRepository.save(aggregate, tx);

    const events = aggregate.getDomainEvents();
    aggregate.clearDomainEvents();

    return { result: aggregate, events };
  }
}
