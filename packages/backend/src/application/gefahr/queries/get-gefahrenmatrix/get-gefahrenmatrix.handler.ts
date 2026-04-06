import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IGefahrenmatrixRepository } from '@domain/gefahr/repositories/i-gefahrenmatrix.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { GEFAHRENMATRIX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import type { GetGefahrenmatrixQuery } from './get-gefahrenmatrix.query';
import type { GefahrenmatrixResponseDto } from '../../dto/gefahrenmatrix-response.dto';

@Injectable()
export class GetGefahrenmatrixHandler {
  constructor(
    @Inject(GEFAHRENMATRIX_REPOSITORY)
    private readonly repository: IGefahrenmatrixRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async execute(query: GetGefahrenmatrixQuery): Promise<Result<GefahrenmatrixResponseDto>> {
    const bewertungen = await this.repository.findByEinsatzId(query.einsatzId);

    const response: GefahrenmatrixResponseDto = {
      einsatzId: query.einsatzId,
      bewertungen: bewertungen.map((b) => ({
        id: b.id.value,
        gefahrentyp: b.gefahrentyp,
        schutzobjekt: b.schutzobjekt,
        warnstufe: b.warnstufe,
        beschreibung: b.beschreibung,
        gemeldetVon: b.gemeldetVon,
        updatedAt: b.updatedAt,
      })),
    };

    this.logger.log(`Gefahrenmatrix geladen (einsatzId: ${query.einsatzId}, bewertungen: ${bewertungen.length})`, 'GetGefahrenmatrixHandler');

    return Result.ok(response);
  }
}
