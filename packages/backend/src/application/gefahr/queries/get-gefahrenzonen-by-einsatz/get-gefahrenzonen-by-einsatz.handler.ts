import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IGefahrenzoneRepository } from '@domain/gefahr/repositories/i-gefahrenzone.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { GEFAHRENZONE_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';
import { toGefahrenzoneDto } from '../../mappers/gefahrenzone.mapper';
import type { GefahrenzoneListResponseDto } from '../../dto/gefahrenzone-response.dto';
import type { GetGefahrenzonenByEinsatzQuery } from './get-gefahrenzonen-by-einsatz.query';

@Injectable()
export class GetGefahrenzonenByEinsatzHandler {
  constructor(
    @Inject(GEFAHRENZONE_REPOSITORY) private readonly repository: IGefahrenzoneRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async execute(query: GetGefahrenzonenByEinsatzQuery): Promise<Result<GefahrenzoneListResponseDto>> {
    const rows = await this.repository.findByEinsatzIdWithWarnstufe(query.einsatzId);

    const zonen = rows.map(({ zone, warnstufe }) => {
      // `Warnstufe.KEINE` behandeln wir als "unbewertet" — der Client rendert die Zone dann mit
      // dem KEINE-Style (dashed, 15 % fill). Das entspricht der UX-Spec §Visual Design Foundation.
      const normalized = warnstufe === Warnstufe.KEINE ? Warnstufe.KEINE : warnstufe;
      return toGefahrenzoneDto(zone, normalized);
    });

    this.logger.log(`Gefahrenzonen geladen (einsatzId=${query.einsatzId}, count=${zonen.length})`, 'GetGefahrenzonenByEinsatzHandler');

    return Result.ok({ einsatzId: query.einsatzId, zonen });
  }
}
