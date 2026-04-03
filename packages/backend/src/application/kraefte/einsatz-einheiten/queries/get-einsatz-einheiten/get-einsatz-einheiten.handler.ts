import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { EinsatzEinheitDto } from '../../dto';
import { mapEinheitToDto } from '../../einsatz-einheit-mapper';
import type { GetEinsatzEinheitenQuery } from './get-einsatz-einheiten.query';

/**
 * Handler für GetEinsatzEinheitenQuery.
 *
 * Lädt alle taktischen Einheiten eines Einsatzes aus dem Repository
 * und mappt sie zu Response DTOs.
 *
 * **Read-Only:** Kein TransactionalCommandHandler nötig, da nur gelesen wird.
 */
@Injectable()
export class GetEinsatzEinheitenHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einsatzEinheitRepository: IEinsatzEinheitRepository,
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Führt die Query aus und gibt alle EinsatzEinheiten des Einsatzes zurück.
   *
   * **Flow:**
   * 1. Repository lädt EinsatzEinheiten per findByEinsatzId
   * 2. Mapper konvertiert Domain Aggregates zu DTOs
   * 3. Rückgabe als Result<EinsatzEinheitDto[]>
   *
   * @param query - GetEinsatzEinheitenQuery mit einsatzId
   * @returns Result<EinsatzEinheitDto[]> - Liste der EinsatzEinheiten
   */
  async execute(query: GetEinsatzEinheitenQuery): Promise<Result<EinsatzEinheitDto[]>> {
    this.logger.log(`GetEinsatzEinheitenQuery für Einsatz ${query.einsatzId} wird ausgeführt`);

    // 1. EinsatzEinheiten laden
    const einheitenResult = await this.einsatzEinheitRepository.findByEinsatzId(query.einsatzId);
    if (einheitenResult.isFailure) {
      this.logger.error(`Fehler beim Laden der Einheiten für Einsatz ${query.einsatzId}: ${einheitenResult.error}`);
      return Result.fail(einheitenResult.error ?? 'Fehler beim Laden der Einheiten');
    }

    const einheiten = einheitenResult.value ?? [];

    if (einheiten.length === 0) {
      this.logger.log(`Keine Einheiten gefunden für Einsatz ${query.einsatzId}`);
      return Result.ok([]);
    }

    // 2. Map to DTOs
    const dtos = einheiten.map(mapEinheitToDto);

    // 3. Führernamen nachladen (Batch-Query für alle Führer-IDs)
    const fuehrerIds = dtos.map((d) => d.einheitenfuehrerId).filter((id): id is string => id !== null);
    if (fuehrerIds.length > 0) {
      const personen = await this.prisma.einsatzPerson.findMany({
        where: { id: { in: fuehrerIds } },
        select: { id: true, vorname: true, nachname: true },
      });
      const personenMap = new Map(personen.map((p) => [p.id, `${p.vorname} ${p.nachname}`]));
      for (const dto of dtos) {
        dto.einheitenfuehrerName = dto.einheitenfuehrerId ? (personenMap.get(dto.einheitenfuehrerId) ?? null) : null;
      }
    }

    this.logger.log(`${einheiten.length} Einheiten für Einsatz ${query.einsatzId} erfolgreich geladen`);

    return Result.ok(dtos);
  }
}
