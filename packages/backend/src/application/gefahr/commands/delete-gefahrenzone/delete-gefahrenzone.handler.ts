import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { IGefahrenzoneRepository } from '@domain/gefahr/repositories/i-gefahrenzone.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { GEFAHRENZONE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { GEFAHRENZONE_APPLICATION_ERROR_CODES } from '../../errors/gefahrenzone-error.codes';
import type { DeleteGefahrenzoneCommand } from './delete-gefahrenzone.command';

@Injectable()
export class DeleteGefahrenzoneHandler extends TransactionalCommandHandler<DeleteGefahrenzoneCommand, true> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(GEFAHRENZONE_REPOSITORY) private readonly repository: IGefahrenzoneRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: DeleteGefahrenzoneCommand, tx: TransactionContext): Promise<Result<true> | { result: true; events: DomainEvent[] }> {
    const zone = await this.repository.findById(command.einsatzId, command.zoneId, tx);
    if (!zone) {
      return Result.fail<true>(GEFAHRENZONE_APPLICATION_ERROR_CODES.NOT_FOUND);
    }

    const markResult = zone.markDeleted(command.geloeschtVon);
    if (markResult.isFailure) {
      return Result.fail<true>(markResult.error ?? 'GEFAHRENZONE_DELETE_FAILED');
    }

    await this.repository.delete(command.einsatzId, command.zoneId, tx);

    this.logger.log(`Gefahrenzone gelöscht (einsatzId=${command.einsatzId}, id=${command.zoneId})`, 'DeleteGefahrenzoneHandler');

    const events = zone.getDomainEvents();
    zone.clearDomainEvents();

    return { result: true, events };
  }
}
