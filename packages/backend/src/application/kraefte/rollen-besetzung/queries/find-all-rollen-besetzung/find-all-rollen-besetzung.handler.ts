import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IRollenBesetzungRepository } from '@domain/kraefte/repositories/i-rollen-besetzung.repository';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { FindAllRollenBesetzungQuery } from './find-all-rollen-besetzung.query';
import type { RollenBesetzungListItemDto } from '../../dto';

/**
 * Query Handler für das Laden aller aktiven RollenBesetzungen eines Einsatzes.
 *
 * **Hexagonal Architecture:** Controller ruft Handler auf, Handler nutzt Repository.
 * Controller hat keinen direkten Zugriff auf Repository.
 *
 * **Story 5.2 - AC4:** Freigegebene Rollen werden durch Repository-Filter ausgeschlossen.
 */
@Injectable()
export class FindAllRollenBesetzungQueryHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG)
    private readonly rollenBesetzungRepository: IRollenBesetzungRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {}

  /**
   * Führt die Query aus und gibt alle aktiven RollenBesetzungen zurück.
   *
   * @param query - Die Query mit validierter einsatzId
   * @returns Result<RollenBesetzungListItemDto[]> - Liste der aktiven Besetzungen
   */
  async execute(query: FindAllRollenBesetzungQuery): Promise<Result<RollenBesetzungListItemDto[]>> {
    const result = await this.rollenBesetzungRepository.findByEinsatzId(query.einsatzId);

    if (result.isFailure) {
      this.logger.error(`Failed to load RollenBesetzungen for Einsatz ${query.einsatzId.value}: ${result.error}`, 'FindAllRollenBesetzungQueryHandler');
      return Result.fail(result.error ?? 'Fehler beim Laden der Rollenbesetzungen');
    }

    const besetzungen = result.value ?? [];

    // Map to DTO
    const dtos: RollenBesetzungListItemDto[] = besetzungen.map((b) => ({
      id: b.id.value,
      rollenName: b.rollenName,
      personName: `${b.personVorname} ${b.personNachname}`,
      rollenDefinitionId: b.rolleId.value,
      einsatzPersonId: b.einsatzPersonId.value,
    }));

    return Result.ok(dtos);
  }
}
