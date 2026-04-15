import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IHazardZoneRepository } from '@domain/hazard-zone/repositories/i-hazard-zone.repository';
import type { IGefahrenmatrixRepository } from '@domain/gefahr/repositories/i-gefahrenmatrix.repository';
import { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';
import type { ILogger } from '@domain/ports/i-logger.port';
import { GEFAHRENMATRIX_REPOSITORY, HAZARD_ZONE_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import type { HazardZoneListResponseDto } from '../../dto/hazard-zone-response.dto';
import { computeMaxWarnstufe, mapZoneToDto } from '../../mappers/hazard-zone.mapper';
import type { ListHazardZonesQuery } from './list-hazard-zones.query';

@Injectable()
export class ListHazardZonesHandler {
  constructor(
    @Inject(HAZARD_ZONE_REPOSITORY)
    private readonly repository: IHazardZoneRepository,
    @Inject(GEFAHRENMATRIX_REPOSITORY)
    private readonly gefahrenmatrixRepository: IGefahrenmatrixRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async execute(query: ListHazardZonesQuery): Promise<Result<HazardZoneListResponseDto>> {
    const [zones, bewertungen] = await Promise.all([this.repository.findByEinsatzId(query.einsatzId), this.gefahrenmatrixRepository.findByEinsatzId(query.einsatzId)]);

    const bewertungenAsSimple = bewertungen.map((b) => ({
      gefahrentyp: b.gefahrentyp,
      warnstufe: b.warnstufe as Warnstufe,
    }));

    const zonesDto = zones.map((z) => mapZoneToDto(z, computeMaxWarnstufe(bewertungenAsSimple, z.gefahrentyp)));

    this.logger.log(`HazardZones geladen (einsatzId: ${query.einsatzId}, zones: ${zones.length})`, 'ListHazardZonesHandler');

    return Result.ok({ einsatzId: query.einsatzId, zones: zonesDto });
  }
}
