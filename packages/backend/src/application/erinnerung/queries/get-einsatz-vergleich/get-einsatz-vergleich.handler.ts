import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ERINNERUNG_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import type { EinsatzVergleichDto } from '../../dto/einsatz-vergleich.dto';
import { ERINNERUNG_ERROR_CODES } from '../../errors/erinnerung-error.codes';
import type { GetEinsatzVergleichQuery } from './get-einsatz-vergleich.query';

@Injectable()
export class GetEinsatzVergleichHandler {
  constructor(
    @Inject(ERINNERUNG_REPOSITORY)
    private readonly erinnerungRepository: IErinnerungRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  async execute(query: GetEinsatzVergleichQuery): Promise<Result<EinsatzVergleichDto>> {
    const einsatzIds: EinsatzId[] = [];
    for (const id of query.einsatzIds) {
      const einsatzIdResult = EinsatzId.create(id);
      if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
        return Result.fail<EinsatzVergleichDto>(einsatzIdResult.error ?? ERINNERUNG_ERROR_CODES.EINSATZ_ID_INVALID);
      }
      einsatzIds.push(einsatzIdResult.value);
    }

    const vergleichResult = await this.erinnerungRepository.getVergleichsStatistik(einsatzIds);

    if (vergleichResult.isFailure) {
      this.logger.error(`Failed to load Vergleichsstatistik: ${vergleichResult.error}`, 'GetEinsatzVergleichHandler');
      return Result.fail<EinsatzVergleichDto>(vergleichResult.error ?? ERINNERUNG_ERROR_CODES.QUERY_FAILED);
    }

    // eslint-disable-next-line typescript/no-non-null-assertion -- Result pattern - value guaranteed after isFailure check
    const vergleich = vergleichResult.value!;

    const dto: EinsatzVergleichDto = {
      items: vergleich.items.map((item) => ({
        einsatzId: item.einsatzId.toString(),
        alarmstichwort: item.alarmstichwort,
        alarmierungszeit: item.alarmierungszeit?.toISOString() ?? null,
        erinnerungenProStunde: item.erinnerungenProStunde,
        eskalationsrate: item.eskalationsrate,
        durchschnittlicheReaktionszeit: item.durchschnittlicheReaktionszeit,
        gesamtErinnerungen: item.gesamtErinnerungen,
        dauer: item.dauer,
      })),
    };

    return Result.ok(dto);
  }
}
