import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { AufbewahrungsKonfiguration } from '@domain/value-objects/aufbewahrungs-konfiguration';
import type { IAufbewahrungsKonfigurationRepository } from '@/application/aufbewahrung/ports/i-aufbewahrungs-konfiguration.repository';
import { AUFBEWAHRUNGS_KONFIGURATION_REPOSITORY } from '@infrastructure/di-tokens';
import { AufbewahrungsKonfigurationDto } from '@/application/aufbewahrung/dto/aufbewahrungs-konfiguration.dto';
import type { GetAufbewahrungsKonfigurationQuery } from './get-aufbewahrungs-konfiguration.query';

/**
 * Handler fuer GetAufbewahrungsKonfigurationQuery.
 *
 * Gibt die aktuelle Aufbewahrungskonfiguration zurueck.
 * Falls keine konfiguriert, wird die Default-Konfiguration zurueckgegeben.
 *
 * @remarks Story 5.5 AC1
 */
@Injectable()
export class GetAufbewahrungsKonfigurationQueryHandler {
  constructor(
    @Inject(AUFBEWAHRUNGS_KONFIGURATION_REPOSITORY)
    private readonly repository: IAufbewahrungsKonfigurationRepository,
  ) {}

  async execute(_query: GetAufbewahrungsKonfigurationQuery): Promise<Result<AufbewahrungsKonfigurationDto>> {
    const result = await this.repository.find();
    if (result.isFailure) {
      return Result.fail(result.error ?? 'Konfiguration konnte nicht geladen werden');
    }

    const konfig = result.value ?? AufbewahrungsKonfiguration.default();

    const dto = new AufbewahrungsKonfigurationDto();
    dto.aufbewahrungsfristJahre = konfig.aufbewahrungsfristJahre;
    dto.freigabeperiodeTage = konfig.freigabeperiodeTage;
    dto.automatischLoeschenAktiv = konfig.automatischLoeschenAktiv;

    return Result.ok(dto);
  }
}
