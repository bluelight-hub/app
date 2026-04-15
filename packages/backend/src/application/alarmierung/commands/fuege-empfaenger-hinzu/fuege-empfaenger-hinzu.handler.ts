import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { AlarmierungEmpfaengerRef } from '@domain/aggregates/alarmierung/alarmierung-empfaenger-ref';
import type { IAlarmierungRepository } from '@domain/repositories/i-alarmierung.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import type { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import type { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ALARMIERUNG_REPOSITORY, KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { resolveEmpfaengerNameSnapshot } from '../empfaenger-name-resolver';
import type { FuegeEmpfaengerHinzuCommand, FuegeEmpfaengerHinzuRef } from './fuege-empfaenger-hinzu.command';

/**
 * Handler: Fügt einen Empfänger nachträglich zu einer bestehenden,
 * noch aktiven Alarmierung hinzu. Lädt die Alarmierung, ermittelt
 * den Name-Snapshot (falls nicht mitgeschickt) und persistiert atomar.
 */
@Injectable()
export class FuegeEmpfaengerHinzuHandler extends TransactionalCommandHandler<FuegeEmpfaengerHinzuCommand, AlarmierungAggregate> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(ALARMIERUNG_REPOSITORY) private readonly alarmierungRepository: IAlarmierungRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG) private readonly fahrzeugRepository: IEinsatzFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON) private readonly personRepository: IEinsatzPersonRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT) private readonly einheitRepository: IEinsatzEinheitRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: FuegeEmpfaengerHinzuCommand, tx: TransactionContext): Promise<Result<AlarmierungAggregate> | { result: AlarmierungAggregate; events: DomainEvent[] }> {
    const idResult = AlarmierungId.create(command.alarmierungId);
    if (idResult.isFailure || !idResult.value) {
      return Result.fail<AlarmierungAggregate>(idResult.error ?? 'Ungültige AlarmierungId');
    }

    const aggregate = await this.alarmierungRepository.findById(idResult.value, tx);
    if (!aggregate) {
      return Result.fail<AlarmierungAggregate>('Alarmierung nicht gefunden');
    }

    const ref = toDomainRef(command.empfaenger);
    const snapshotResult = await resolveEmpfaengerNameSnapshot({ fahrzeug: this.fahrzeugRepository, person: this.personRepository, einheit: this.einheitRepository }, ref, command.nameSnapshot);
    if (snapshotResult.isFailure || !snapshotResult.value) {
      return Result.fail<AlarmierungAggregate>(snapshotResult.error ?? 'Name-Snapshot konnte nicht ermittelt werden');
    }

    const addResult = aggregate.fuegeEmpfaengerHinzu({
      ref,
      nameSnapshot: snapshotResult.value,
      alarmiertAm: command.alarmiertAm,
      createdBy: command.createdBy,
    });
    if (addResult.isFailure) {
      return Result.fail<AlarmierungAggregate>(addResult.error ?? 'Empfänger konnte nicht hinzugefügt werden');
    }

    await this.alarmierungRepository.save(aggregate, tx);

    const events = aggregate.getDomainEvents();
    aggregate.clearDomainEvents();

    return { result: aggregate, events };
  }
}

function toDomainRef(input: FuegeEmpfaengerHinzuRef): AlarmierungEmpfaengerRef {
  switch (input.kind) {
    case 'fahrzeug':
      return { kind: 'fahrzeug', fahrzeugId: input.fahrzeugId };
    case 'person':
      return { kind: 'person', personId: input.personId };
    case 'einheit':
      return { kind: 'einheit', einheitId: input.einheitId };
  }
}
