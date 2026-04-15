import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { IAlarmierungRepository } from '@domain/repositories/i-alarmierung.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ALARMIERUNG_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { SchliesseAlarmierungAbCommand } from './schliesse-alarmierung-ab.command';

/**
 * Handler: Schließt eine Alarmierung ab. Idempotenz wird durch das Aggregat
 * sichergestellt (Aufruf auf bereits abgeschlossener Alarmierung scheitert).
 */
@Injectable()
export class SchliesseAlarmierungAbHandler extends TransactionalCommandHandler<SchliesseAlarmierungAbCommand, AlarmierungAggregate> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(ALARMIERUNG_REPOSITORY) private readonly alarmierungRepository: IAlarmierungRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(
    command: SchliesseAlarmierungAbCommand,
    _tx: TransactionContext,
  ): Promise<Result<AlarmierungAggregate> | { result: AlarmierungAggregate; events: DomainEvent[] }> {
    const idResult = AlarmierungId.create(command.alarmierungId);
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<AlarmierungAggregate>(idResult.error ?? 'Ungültige AlarmierungId');
    }

    const aggregate = await this.alarmierungRepository.findById(idResult.value);
    if (!aggregate) {
      return Result.fail<AlarmierungAggregate>('Alarmierung nicht gefunden');
    }

    const closeResult = aggregate.abschliessen(command.updatedBy);
    if (closeResult.isFailure) {
      return Result.fail<AlarmierungAggregate>(closeResult.error ?? 'Alarmierung konnte nicht abgeschlossen werden');
    }

    await this.alarmierungRepository.save(aggregate);

    const events = aggregate.getDomainEvents();
    aggregate.clearDomainEvents();

    return { result: aggregate, events };
  }
}
