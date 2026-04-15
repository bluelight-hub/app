import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import type { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import type { FunkkanalZuordnungKraftRef } from '@domain/aggregates/funkkanal/funkkanal-zuordnung.entity';
import type { IFunkkanalRepository } from '@domain/repositories/i-funkkanal.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import type { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { EinsatzFahrzeugId } from '@domain/kraefte/value-objects/einsatz-fahrzeug-id';
import { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';
import { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FUNKKANAL_REPOSITORY, KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { ZuordneKraftRef, ZuordneKraftZuKanalCommand } from './zuordne-kraft-zu-kanal.command';

/**
 * Handler zum Zuordnen einer Kraft (Fahrzeug / Person / Einheit) zu einem Funkkanal.
 *
 * Der `rufnameSnapshot` wird transaktional aus dem zuständigen
 * Kräfte-Repository gelesen, damit Exporte dauerhaft auch nach späteren
 * Umbenennungen aussagekräftig bleiben.
 */
@Injectable()
export class ZuordneKraftZuKanalHandler extends TransactionalCommandHandler<ZuordneKraftZuKanalCommand, FunkkanalAggregate> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(FUNKKANAL_REPOSITORY) private readonly funkkanalRepository: IFunkkanalRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG) private readonly fahrzeugRepository: IEinsatzFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON) private readonly personRepository: IEinsatzPersonRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT) private readonly einheitRepository: IEinsatzEinheitRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: ZuordneKraftZuKanalCommand, tx: TransactionContext): Promise<Result<FunkkanalAggregate> | { result: FunkkanalAggregate; events: DomainEvent[] }> {
    const kanalIdResult = FunkkanalId.create(command.kanalId);
    if (kanalIdResult.isFailure || !kanalIdResult.value) {
      return Result.fail<FunkkanalAggregate>(kanalIdResult.error ?? 'Ungültige FunkkanalId');
    }

    const aggregate = await this.funkkanalRepository.findById(kanalIdResult.value, tx);
    if (!aggregate) {
      return Result.fail<FunkkanalAggregate>('Funkkanal nicht gefunden');
    }

    const snapshotResult = await this.resolveRufnameSnapshot(command.kraft, tx);
    if (snapshotResult.isFailure || !snapshotResult.value) {
      return Result.fail<FunkkanalAggregate>(snapshotResult.error ?? 'Rufname konnte nicht ermittelt werden');
    }

    const zuordnung = aggregate.zuordneKraft({
      kraftRef: toDomainKraftRef(command.kraft),
      rufnameSnapshot: snapshotResult.value,
      rolle: command.rolle,
      createdBy: command.userId,
    });
    if (zuordnung.isFailure) {
      return Result.fail<FunkkanalAggregate>(zuordnung.error ?? 'Zuordnung fehlgeschlagen');
    }

    await this.funkkanalRepository.save(aggregate, tx);

    const events = aggregate.getDomainEvents();
    aggregate.clearDomainEvents();

    return { result: aggregate, events };
  }

  private async resolveRufnameSnapshot(kraft: ZuordneKraftRef, tx: TransactionContext): Promise<Result<string>> {
    switch (kraft.kind) {
      case 'fahrzeug': {
        const idResult = EinsatzFahrzeugId.create(kraft.fahrzeugId);
        if (idResult.isFailure || !idResult.value) {
          return Result.fail<string>(idResult.error ?? 'Ungültige EinsatzFahrzeugId');
        }
        const fzResult = await this.fahrzeugRepository.findById(idResult.value, tx);
        if (fzResult.isFailure || !fzResult.value) {
          return Result.fail<string>('Fahrzeug nicht gefunden');
        }
        return Result.ok<string>(fzResult.value.funkrufname);
      }
      case 'person': {
        const idResult = EinsatzPersonId.create(kraft.personId);
        if (idResult.isFailure || !idResult.value) {
          return Result.fail<string>(idResult.error ?? 'Ungültige EinsatzPersonId');
        }
        const personResult = await this.personRepository.findById(idResult.value, tx);
        if (personResult.isFailure || !personResult.value) {
          return Result.fail<string>('Person nicht gefunden');
        }
        const person = personResult.value;
        const snapshot = person.funkrufname?.trim() || `${person.vorname} ${person.nachname}`.trim();
        if (!snapshot) {
          return Result.fail<string>('Person hat weder Funkrufnamen noch Namensangabe');
        }
        return Result.ok<string>(snapshot);
      }
      case 'einheit': {
        const einheitResult = await this.einheitRepository.findById(kraft.einheitId, tx);
        if (einheitResult.isFailure || !einheitResult.value) {
          return Result.fail<string>('Einheit nicht gefunden');
        }
        return Result.ok<string>(einheitResult.value.name);
      }
    }
  }
}

function toDomainKraftRef(kraft: ZuordneKraftRef): FunkkanalZuordnungKraftRef {
  switch (kraft.kind) {
    case 'fahrzeug':
      return { kind: 'fahrzeug', fahrzeugId: kraft.fahrzeugId };
    case 'person':
      return { kind: 'person', personId: kraft.personId };
    case 'einheit':
      return { kind: 'einheit', einheitId: kraft.einheitId };
  }
}
