import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { IHazardZoneRepository } from '@domain/hazard-zone/repositories/i-hazard-zone.repository';
import type { IGefahrenmatrixRepository } from '@domain/gefahr/repositories/i-gefahrenmatrix.repository';
import { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { GEFAHRENMATRIX_REPOSITORY, HAZARD_ZONE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { HAZARD_ZONE_ERROR_CODES } from '../../errors/hazard-zone-error.codes';
import { computeMaxWarnstufe, mapZoneToDto } from '../../mappers/hazard-zone.mapper';
import type { HazardZoneDto } from '../../dto/hazard-zone-response.dto';
import type { UpdateHazardZoneCommand } from './update-hazard-zone.command';

@Injectable()
export class UpdateHazardZoneHandler extends TransactionalCommandHandler<UpdateHazardZoneCommand, HazardZoneDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(HAZARD_ZONE_REPOSITORY)
    private readonly repository: IHazardZoneRepository,
    @Inject(GEFAHRENMATRIX_REPOSITORY)
    private readonly gefahrenmatrixRepository: IGefahrenmatrixRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: UpdateHazardZoneCommand, tx: TransactionContext): Promise<Result<HazardZoneDto> | { result: HazardZoneDto; events: DomainEvent[] }> {
    const zone = await this.repository.findById(command.zoneId, tx);
    if (!zone || zone.einsatzId !== command.einsatzId) {
      return Result.fail<HazardZoneDto>(HAZARD_ZONE_ERROR_CODES.NOT_FOUND);
    }

    const updateResult = zone.update({
      gefahrentyp: command.gefahrentyp,
      geometryType: command.geometryType,
      geometry: command.geometry,
      radiusMeters: command.radiusMeters,
      label: command.label,
      beschreibung: command.beschreibung,
      updatedBy: command.updatedBy,
    });
    if (updateResult.isFailure) {
      return Result.fail<HazardZoneDto>(updateResult.error ?? 'HAZARD_ZONE_UPDATE_FAILED');
    }

    await this.repository.save(zone, tx);

    const bewertungen = await this.gefahrenmatrixRepository.findByEinsatzId(command.einsatzId, tx);
    const maxWarnstufe = computeMaxWarnstufe(
      bewertungen.map((b) => ({ gefahrentyp: b.gefahrentyp, warnstufe: b.warnstufe as Warnstufe })),
      zone.gefahrentyp,
    );

    this.logger.log(`HazardZone aktualisiert (einsatzId: ${command.einsatzId}, id: ${zone.id.value})`, 'UpdateHazardZoneHandler');

    const events = zone.getDomainEvents();
    zone.clearDomainEvents();

    return { result: mapZoneToDto(zone, maxWarnstufe), events };
  }
}
