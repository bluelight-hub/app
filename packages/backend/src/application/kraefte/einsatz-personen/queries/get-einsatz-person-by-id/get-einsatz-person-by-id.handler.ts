import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import type { EinsatzPersonResponseDto } from '../../dto';
import { EinsatzPersonDtoMapper } from '../../dto';
import type { GetEinsatzPersonByIdQuery } from './get-einsatz-person-by-id.query';
import { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';

/**
 * Handler für GetEinsatzPersonByIdQuery.
 *
 * Lädt eine einzelne EinsatzPerson per ID aus dem Repository und
 * mappt sie zu Response DTO.
 *
 * Verwendet nach Command-Operationen um aktualisierte Person zu laden
 * ohne N+1 Query Problem (alle Personen laden + filtern).
 */
@Injectable()
export class GetEinsatzPersonByIdHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON)
    private readonly einsatzPersonRepository: IEinsatzPersonRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Führt die Query aus und gibt die EinsatzPerson zurück.
   *
   * @param query - GetEinsatzPersonByIdQuery mit personId
   * @returns Result<EinsatzPersonResponseDto | null> - Person oder null wenn nicht gefunden
   */
  async execute(query: GetEinsatzPersonByIdQuery): Promise<Result<EinsatzPersonResponseDto | null>> {
    // 1. Create Value Object
    const personIdResult = EinsatzPersonId.create(query.personId);
    if (personIdResult.isFailure || !personIdResult.value) {
      return Result.fail(`Ungültige Person-ID: ${query.personId}`);
    }

    // 2. Load EinsatzPerson
    const personResult = await this.einsatzPersonRepository.findById(personIdResult.value);
    if (personResult.isFailure) {
      this.logger.error(`Fehler beim Laden der Person ${query.personId}: ${personResult.error}`);
      return Result.fail(personResult.error ?? 'Fehler beim Laden der Person');
    }

    const person = personResult.value;
    if (!person) {
      return Result.ok(null);
    }

    // 3. Map to DTO
    const dto = EinsatzPersonDtoMapper.toResponseDto(person);

    return Result.ok(dto);
  }
}
