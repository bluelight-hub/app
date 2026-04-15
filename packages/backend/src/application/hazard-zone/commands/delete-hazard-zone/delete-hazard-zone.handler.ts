import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { IHazardZoneRepository } from '@domain/hazard-zone/repositories/i-hazard-zone.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { HAZARD_ZONE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { HAZARD_ZONE_ERROR_CODES } from '../../errors/hazard-zone-error.codes';
import type { DeleteHazardZoneCommand } from './delete-hazard-zone.command';

@Injectable()
export class DeleteHazardZoneHandler extends TransactionalCommandHandler<DeleteHazardZoneCommand, { id: string }> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(HAZARD_ZONE_REPOSITORY)
    private readonly repository: IHazardZoneRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: DeleteHazardZoneCommand, tx: TransactionContext): Promise<Result<{ id: string }> | { result: { id: string }; events: DomainEvent[] }> {
    const zone = await this.repository.findById(command.zoneId, tx);
    if (!zone || zone.einsatzId !== command.einsatzId) {
      return Result.fail<{ id: string }>(HAZARD_ZONE_ERROR_CODES.NOT_FOUND);
    }

    const markResult = zone.markDeleted(command.deletedBy);
    if (markResult.isFailure) {
      return Result.fail<{ id: string }>(markResult.error ?? 'HAZARD_ZONE_DELETE_FAILED');
    }

    await this.repository.deleteById(command.zoneId, tx);

    this.logger.log(`HazardZone gelöscht (einsatzId: ${command.einsatzId}, id: ${command.zoneId})`, 'DeleteHazardZoneHandler');

    const events = zone.getDomainEvents();
    zone.clearDomainEvents();

    return { result: { id: command.zoneId }, events };
  }
}
