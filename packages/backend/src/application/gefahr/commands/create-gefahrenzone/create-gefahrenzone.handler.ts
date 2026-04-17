import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import { Gefahrenzone } from '@domain/gefahr/entities/gefahrenzone.entity';
import type { IGefahrenzoneRepository } from '@domain/gefahr/repositories/i-gefahrenzone.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { GEFAHRENZONE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { toGefahrenzoneDto } from '../../mappers/gefahrenzone.mapper';
import type { GefahrenzoneDto } from '../../dto/gefahrenzone-response.dto';
import type { CreateGefahrenzoneCommand } from './create-gefahrenzone.command';

@Injectable()
export class CreateGefahrenzoneHandler extends TransactionalCommandHandler<CreateGefahrenzoneCommand, GefahrenzoneDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(GEFAHRENZONE_REPOSITORY) private readonly repository: IGefahrenzoneRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: CreateGefahrenzoneCommand, tx: TransactionContext): Promise<Result<GefahrenzoneDto> | { result: GefahrenzoneDto; events: DomainEvent[] }> {
    const zoneResult = Gefahrenzone.create({
      einsatzId: command.einsatzId,
      gefahrentyp: command.gefahrentyp,
      schutzobjekt: command.schutzobjekt,
      geometryType: command.geometryType,
      geometry: command.geometry,
      bezeichnung: command.bezeichnung ?? null,
      erstelltVon: command.erstelltVon,
    });

    if (zoneResult.isFailure || !zoneResult.value) {
      return Result.fail<GefahrenzoneDto>(zoneResult.error ?? 'GEFAHRENZONE_CREATION_FAILED');
    }

    const zone = zoneResult.value;
    await this.repository.save(zone, tx);

    this.logger.log(`Gefahrenzone erstellt (einsatzId=${command.einsatzId}, id=${zone.id.value}, typ=${command.gefahrentyp}, objekt=${command.schutzobjekt})`, 'CreateGefahrenzoneHandler');

    const events = zone.getDomainEvents();
    zone.clearDomainEvents();

    // Warnstufe zum Response-Zeitpunkt: null. Sie wird asynchron vom Client aus der
    // Matrix-Query bezogen (ADR-010); initiale Response hält sich an die Zone-Grenze.
    return { result: toGefahrenzoneDto(zone, null), events };
  }
}
