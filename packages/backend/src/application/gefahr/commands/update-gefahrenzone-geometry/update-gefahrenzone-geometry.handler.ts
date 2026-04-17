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
import { toGefahrenzoneDto } from '../../mappers/gefahrenzone.mapper';
import type { GefahrenzoneDto } from '../../dto/gefahrenzone-response.dto';
import { GEFAHRENZONE_APPLICATION_ERROR_CODES } from '../../errors/gefahrenzone-error.codes';
import type { UpdateGefahrenzoneGeometryCommand } from './update-gefahrenzone-geometry.command';

@Injectable()
export class UpdateGefahrenzoneGeometryHandler extends TransactionalCommandHandler<UpdateGefahrenzoneGeometryCommand, GefahrenzoneDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(GEFAHRENZONE_REPOSITORY) private readonly repository: IGefahrenzoneRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: UpdateGefahrenzoneGeometryCommand, tx: TransactionContext): Promise<Result<GefahrenzoneDto> | { result: GefahrenzoneDto; events: DomainEvent[] }> {
    const zone = await this.repository.findById(command.einsatzId, command.zoneId, tx);
    if (!zone) {
      return Result.fail<GefahrenzoneDto>(GEFAHRENZONE_APPLICATION_ERROR_CODES.NOT_FOUND);
    }

    const updateResult = zone.updateGeometry(command.geometryType, command.geometry, command.aktualisiertVon);
    if (updateResult.isFailure) {
      return Result.fail<GefahrenzoneDto>(updateResult.error ?? 'GEFAHRENZONE_UPDATE_FAILED');
    }

    await this.repository.save(zone, tx);

    this.logger.log(`Gefahrenzone-Geometrie aktualisiert (einsatzId=${command.einsatzId}, id=${command.zoneId})`, 'UpdateGefahrenzoneGeometryHandler');

    const events = zone.getDomainEvents();
    zone.clearDomainEvents();

    return { result: toGefahrenzoneDto(zone, null), events };
  }
}
