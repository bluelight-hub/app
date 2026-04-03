import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { EINSATZ_EINHEIT_ERROR_CODES, EinsatzEinheitError } from '@domain/kraefte/common/einsatz-einheit-error-codes';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { EinsatzEinheitDetailsDto, EinsatzEinheitPersonDto } from '../../dto';
import { mapEinheitToDto } from '../../einsatz-einheit-mapper';
import type { GetEinheitDetailsQuery } from './get-einheit-details.query';

/**
 * Handler für GetEinheitDetailsQuery.
 *
 * Lädt die Detail-Ansicht einer taktischen Einheit inkl. zugewiesener Personen
 * und aufgelöstem Einheitenführer.
 *
 * **Pragmatischer Ansatz:** Verwendet PrismaService direkt für die Read-Only Query
 * mit Prisma Includes (Personen-Zuordnungen), da das Repository Interface
 * keine spezialisierte Methode dafür hat.
 *
 * **Read-Only:** Kein TransactionalCommandHandler nötig.
 */
@Injectable()
export class GetEinheitDetailsHandler {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einsatzEinheitRepository: IEinsatzEinheitRepository,
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Führt die Query aus und gibt die Einheit mit Personen zurück.
   *
   * **Ablauf:**
   * 1. Einheit über Repository laden (Domain Aggregate)
   * 2. einsatzId-Zugehörigkeit prüfen
   * 3. Personen-Zuordnungen über Prisma laden (Read-Only)
   * 4. DTO zusammenbauen
   *
   * @param query - GetEinheitDetailsQuery mit einsatzId und einheitId
   * @returns Result<EinsatzEinheitDetailsDto> - Detail-DTO oder Fehler
   */
  async execute(query: GetEinheitDetailsQuery): Promise<Result<EinsatzEinheitDetailsDto>> {
    this.logger.log(`GetEinheitDetailsQuery für Einheit ${query.einheitId} in Einsatz ${query.einsatzId}`);

    // 1. Einheit laden (über Repository für Domain-Validierung)
    const einheitResult = await this.einsatzEinheitRepository.findById(query.einheitId);
    if (einheitResult.isFailure) {
      return Result.fail(einheitResult.error ?? 'Fehler beim Laden der Einheit');
    }
    if (!einheitResult.value) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND, `Einheit mit ID '${query.einheitId}' nicht gefunden`));
    }
    const einheit = einheitResult.value;

    // 2. einsatzId-Zugehörigkeit prüfen
    if (einheit.einsatzId !== query.einsatzId) {
      return Result.fail(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND, `Einheit gehört nicht zum angegebenen Einsatz`));
    }

    // 3. Personen-Zuordnungen über Prisma laden (Read-Only, pragmatischer Ansatz)
    const personenZuordnungen = await this.prisma.einsatzPersonEinheit.findMany({
      where: { einheitId: query.einheitId },
      include: {
        einsatzPerson: {
          select: {
            id: true,
            vorname: true,
            nachname: true,
            funktion: true,
            funkrufname: true,
          },
        },
      },
      orderBy: {
        einsatzPerson: { nachname: 'asc' },
      },
    });

    // 4. Personen-DTOs erstellen
    const personenDtos: EinsatzEinheitPersonDto[] = personenZuordnungen.map((zuordnung) => ({
      id: zuordnung.einsatzPerson.id,
      vorname: zuordnung.einsatzPerson.vorname,
      nachname: zuordnung.einsatzPerson.nachname,
      funktion: zuordnung.einsatzPerson.funktion,
      funkrufname: zuordnung.einsatzPerson.funkrufname ?? null,
    }));

    // 5. Einheitenführer auflösen
    let einheitenfuehrer: EinsatzEinheitPersonDto | null = null;
    if (einheit.einheitenfuehrerId) {
      const fuehrer = personenDtos.find((p) => p.id === einheit.einheitenfuehrerId);
      einheitenfuehrer = fuehrer ?? null;
    }

    // 6. Detail-DTO zusammenbauen
    const baseDto = mapEinheitToDto(einheit);
    const detailsDto: EinsatzEinheitDetailsDto = {
      ...baseDto,
      personen: personenDtos,
      einheitenfuehrer,
    } as EinsatzEinheitDetailsDto;

    this.logger.log(`Einheit ${query.einheitId} mit ${personenDtos.length} Personen geladen`);

    return Result.ok(detailsDto);
  }
}
