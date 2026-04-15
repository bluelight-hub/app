import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { IAlarmierungRepository } from '@domain/repositories/i-alarmierung.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { AlarmierungEmpfaengerId } from '@domain/value-objects/alarmierung-empfaenger-id';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ALARMIERUNG_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { KorrigiereZeitpunktCommand } from './korrigiere-zeitpunkt.command';

/**
 * Handler: Korrigiert oder löscht einen Zeitpunkt eines Empfängers.
 * Emittiert `AlarmierungZeitpunktKorrigiertEvent` (Audit).
 */
@Injectable()
export class KorrigiereZeitpunktHandler extends TransactionalCommandHandler<KorrigiereZeitpunktCommand, AlarmierungAggregate> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(ALARMIERUNG_REPOSITORY) private readonly alarmierungRepository: IAlarmierungRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: KorrigiereZeitpunktCommand, tx: TransactionContext): Promise<Result<AlarmierungAggregate> | { result: AlarmierungAggregate; events: DomainEvent[] }> {
    const idResult = AlarmierungId.create(command.alarmierungId);
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<AlarmierungAggregate>(idResult.error ?? 'Ungültige AlarmierungId');
    }
    const empfaengerIdResult = AlarmierungEmpfaengerId.create(command.empfaengerId);
    if (empfaengerIdResult.isFailure || !empfaengerIdResult.value) {
      return Result.fail<AlarmierungAggregate>(empfaengerIdResult.error ?? 'Ungültige empfaengerId');
    }

    const aggregate = await this.alarmierungRepository.findById(idResult.value, tx);
    if (!aggregate) {
      return Result.fail<AlarmierungAggregate>('Alarmierung nicht gefunden');
    }

    const updateResult = aggregate.korrigiereZeitpunkt(empfaengerIdResult.value, command.feld, command.wert, command.updatedBy);
    if (updateResult.isFailure) {
      return Result.fail<AlarmierungAggregate>(updateResult.error ?? 'Zeitpunkt konnte nicht korrigiert werden');
    }

    await this.alarmierungRepository.save(aggregate, tx);

    const events = aggregate.getDomainEvents();
    aggregate.clearDomainEvents();

    return { result: aggregate, events };
  }
}
