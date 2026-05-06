import type { ILogger } from '@domain/ports/i-logger.port';
import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { Sicherungsposten } from '@domain/eigenschutz/aggregates/sicherungsposten.aggregate';
import type { ISicherungspostenRepository } from '@domain/eigenschutz/repositories';
import { Standort } from '@domain/eigenschutz/value-objects/standort.vo';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { LOGGER, OUTBOX_REPOSITORY, SICHERUNGSPOSTEN_REPOSITORY } from '@infrastructure/di-tokens';
import { CreateSicherungspostenCommand } from './create-sicherungsposten.command';

/**
 * Handler für `CreateSicherungspostenCommand` (Story 4.1, AC6).
 *
 * Transactional Flow:
 * 1. Standort-VO aus Props erzeugen.
 * 2. Aggregate `Sicherungsposten.create` (emittiert SicherungspostenEingerichtetEvent).
 * 3. Repo `save` schreibt Aggregate + Versions-Snapshot in derselben TX.
 * 4. Base-Handler persistiert Events atomar via Outbox.
 */
@Injectable()
@CommandHandler(CreateSicherungspostenCommand)
export class CreateSicherungspostenHandler extends TransactionalCommandHandler<CreateSicherungspostenCommand, string> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(SICHERUNGSPOSTEN_REPOSITORY)
    private readonly postenRepo: ISicherungspostenRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: CreateSicherungspostenCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    const standortResult = Standort.create(command.standort);
    if (standortResult.isFailure || !standortResult.value) {
      return Result.fail<string>(`ValidationFailed:Standort:${standortResult.error ?? 'Standort ungültig'}`);
    }

    const aggregateResult = Sicherungsposten.create({
      einsatzId: command.einsatzId,
      bezeichnung: command.bezeichnung,
      standort: standortResult.value,
      personal: command.personal,
      createdBy: command.createdBy,
      einheitId: command.einheitId,
      zustaendigkeitsbereich: command.zustaendigkeitsbereich,
      abloesezeiten: command.abloesezeiten,
    });
    if (aggregateResult.isFailure || !aggregateResult.value) {
      return Result.fail<string>(`ValidationFailed:${aggregateResult.error ?? 'Aggregate konnte nicht erstellt werden'}`);
    }
    const aggregate = aggregateResult.value;

    const saveResult = await this.postenRepo.save(aggregate, command.createdBy, tx);
    if (saveResult.isFailure) {
      return Result.fail<string>(saveResult.error ?? 'Sicherungsposten konnte nicht gespeichert werden');
    }

    this.logger.log('Sicherungsposten erstellt', {
      sicherungspostenId: aggregate.id.value,
      einsatzId: command.einsatzId,
      einheitId: aggregate.einheitId,
    });

    return { result: aggregate.id.value, events: aggregate.getDomainEvents() };
  }
}
