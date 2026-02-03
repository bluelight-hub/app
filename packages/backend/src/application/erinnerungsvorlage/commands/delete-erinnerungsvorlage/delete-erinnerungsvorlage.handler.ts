import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IErinnerungsvorlageRepository } from '@domain/erinnerungsvorlage/repositories/i-erinnerungsvorlage.repository';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { ErinnerungsvorlageId } from '@domain/erinnerungsvorlage/value-objects/erinnerungsvorlage-id';
import { UserId } from '@domain/value-objects/user-id';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ERINNERUNGSVORLAGE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { ERINNERUNGSVORLAGE_ERROR_CODES } from '../../errors/erinnerungsvorlage-error.codes';
import type { DeleteErinnerungsvorlageCommand } from './delete-erinnerungsvorlage.command';

/**
 * Handler zum Löschen einer Erinnerungsvorlage (Soft-Delete).
 * Nutzt TransactionalCommandHandler für atomare Persistenz mit Outbox-Events.
 */
@Injectable()
export class DeleteErinnerungsvorlageHandler extends TransactionalCommandHandler<DeleteErinnerungsvorlageCommand, void> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(ERINNERUNGSVORLAGE_REPOSITORY)
    private readonly vorlageRepository: IErinnerungsvorlageRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: DeleteErinnerungsvorlageCommand, _tx: TransactionContext): Promise<Result<void> | { result: void; events: DomainEvent[] }> {
    // 1. Vorlage laden
    const vorlageIdResult = ErinnerungsvorlageId.create(command.vorlageId);
    if (vorlageIdResult.isFailure || !vorlageIdResult.value) {
      return Result.fail<void>(ERINNERUNGSVORLAGE_ERROR_CODES.NOT_FOUND);
    }

    const vorlage = await this.vorlageRepository.findById(vorlageIdResult.value as ErinnerungsvorlageId);
    if (!vorlage) {
      return Result.fail<void>(ERINNERUNGSVORLAGE_ERROR_CODES.NOT_FOUND);
    }

    // 2. UserId erstellen
    const userIdResult = UserId.create(command.deletedBy);
    if (userIdResult.isFailure || !userIdResult.value) {
      return Result.fail<void>(userIdResult.error ?? ERINNERUNGSVORLAGE_ERROR_CODES.DELETE_FAILED);
    }

    // 3. Soft-Delete durchführen (Domain-Validierung in Entity)
    const deleteResult = vorlage.softDelete(userIdResult.value);
    if (deleteResult.isFailure) {
      return Result.fail<void>(deleteResult.error ?? ERINNERUNGSVORLAGE_ERROR_CODES.DELETE_FAILED);
    }

    // 4. Persistieren
    await this.vorlageRepository.save(vorlage);

    this.logger.log(`Erinnerungsvorlage gelöscht (id: ${vorlage.id.toString()}, titel: "${vorlage.titel.value}")`, 'DeleteErinnerungsvorlageHandler');

    // 5. Events sammeln
    const events = vorlage.getDomainEvents();
    vorlage.clearDomainEvents();

    return {
      result: undefined,
      events,
    };
  }
}
