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
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ALARMIERUNG_REPOSITORY, KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { resolveEmpfaengerNameSnapshot } from '../empfaenger-name-resolver';
import type { ErstelleAlarmierungCommand, ErstelleAlarmierungEmpfaengerInput } from './erstelle-alarmierung.command';

/**
 * Handler zum Auslösen einer neuen Alarmierung (Issue #408).
 *
 * Erzeugt das Aggregat, fügt alle Empfänger an und persistiert atomar:
 * - `AlarmierungAggregate.create` → emittiert {@link AlarmierungErstelltEvent}
 *   (und ggf. {@link NachalarmierungErstelltEvent}).
 * - Pro Empfänger `fuegeEmpfaengerHinzu` (mit aufgelöstem `nameSnapshot`).
 * - Repository-`save` + Outbox-Persistierung über die Basisklasse.
 *
 * Für jeden Empfänger ohne mitgeschickten Snapshot wird der Name aus dem
 * jeweiligen Kräfte-Aggregat (Fahrzeug / Person / Einheit) geladen — analog
 * zum Vorgehen im Funkkanal-Modul.
 */
@Injectable()
export class ErstelleAlarmierungHandler extends TransactionalCommandHandler<ErstelleAlarmierungCommand, AlarmierungAggregate> {
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

  protected async executeInTransaction(command: ErstelleAlarmierungCommand, tx: TransactionContext): Promise<Result<AlarmierungAggregate> | { result: AlarmierungAggregate; events: DomainEvent[] }> {
    const einsatzIdResult = EinsatzId.create(command.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail<AlarmierungAggregate>(einsatzIdResult.error ?? 'Ungültige EinsatzId');
    }
    const einsatzId = einsatzIdResult.value;

    let ursprungAlarmierungId: AlarmierungId | undefined;
    if (command.ursprungAlarmierungId) {
      const ursprungIdResult = AlarmierungId.create(command.ursprungAlarmierungId);
      if (ursprungIdResult.isFailure || !ursprungIdResult.value) {
        return Result.fail<AlarmierungAggregate>(ursprungIdResult.error ?? 'Ungültige ursprungAlarmierungId');
      }
      ursprungAlarmierungId = ursprungIdResult.value;
    }

    const aggregateResult = AlarmierungAggregate.create({
      einsatzId,
      bezeichnung: command.bezeichnung,
      beschreibung: command.beschreibung,
      alarmierungszeit: command.alarmierungszeit,
      ursprungAlarmierungId,
      createdBy: command.createdBy,
    });
    if (aggregateResult.isFailure || !aggregateResult.value) {
      return Result.fail<AlarmierungAggregate>(aggregateResult.error ?? 'Alarmierung konnte nicht erstellt werden');
    }
    const aggregate = aggregateResult.value;

    for (const empfaenger of command.empfaenger) {
      const ref = toDomainRef(empfaenger);
      const snapshotResult = await resolveEmpfaengerNameSnapshot({ fahrzeug: this.fahrzeugRepository, person: this.personRepository, einheit: this.einheitRepository }, ref, empfaenger.nameSnapshot);
      if (snapshotResult.isFailure || !snapshotResult.value) {
        return Result.fail<AlarmierungAggregate>(snapshotResult.error ?? 'Name-Snapshot konnte nicht ermittelt werden');
      }

      const addResult = aggregate.fuegeEmpfaengerHinzu({
        ref,
        nameSnapshot: snapshotResult.value,
        alarmiertAm: empfaenger.alarmiertAm,
        createdBy: command.createdBy,
      });
      if (addResult.isFailure) {
        return Result.fail<AlarmierungAggregate>(addResult.error ?? 'Empfänger konnte nicht hinzugefügt werden');
      }
    }

    await this.alarmierungRepository.save(aggregate, tx);

    const events = aggregate.getDomainEvents();
    aggregate.clearDomainEvents();

    return { result: aggregate, events };
  }
}

function toDomainRef(input: ErstelleAlarmierungEmpfaengerInput): AlarmierungEmpfaengerRef {
  switch (input.kind) {
    case 'fahrzeug':
      return { kind: 'fahrzeug', fahrzeugId: input.fahrzeugId };
    case 'person':
      return { kind: 'person', personId: input.personId };
    case 'einheit':
      return { kind: 'einheit', einheitId: input.einheitId };
  }
}
