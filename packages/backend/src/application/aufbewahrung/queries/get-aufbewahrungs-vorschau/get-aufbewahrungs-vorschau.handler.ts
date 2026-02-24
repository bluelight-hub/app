import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { AufbewahrungsKonfiguration } from '@domain/value-objects/aufbewahrungs-konfiguration';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IAufbewahrungsKonfigurationRepository } from '@/application/aufbewahrung/ports/i-aufbewahrungs-konfiguration.repository';
import { AUFBEWAHRUNGS_KONFIGURATION_REPOSITORY } from '@infrastructure/di-tokens';
import { AufbewahrungsVorschauDto, AufbewahrungsVorschauEinsatzDto } from '@/application/aufbewahrung/dto/aufbewahrungs-vorschau.dto';
import type { GetAufbewahrungsVorschauQuery } from './get-aufbewahrungs-vorschau.query';

/**
 * Handler fuer GetAufbewahrungsVorschauQuery.
 *
 * Zeigt welche Einsaetze bei der aktuellen Aufbewahrungskonfiguration
 * von Anonymisierung/Loeschung betroffen waeren.
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Aendert niemals Domain State
 * - Prisma Direct: Optimierte Aggregations-Query
 *
 * @remarks Story 5.5 AC1
 */
@Injectable()
export class GetAufbewahrungsVorschauQueryHandler {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUFBEWAHRUNGS_KONFIGURATION_REPOSITORY)
    private readonly konfigurationRepository: IAufbewahrungsKonfigurationRepository,
  ) {}

  async execute(_query: GetAufbewahrungsVorschauQuery): Promise<Result<AufbewahrungsVorschauDto>> {
    // 1. Konfiguration laden
    const konfigResult = await this.konfigurationRepository.find();
    if (konfigResult.isFailure) {
      return Result.fail(konfigResult.error ?? 'Konfiguration konnte nicht geladen werden');
    }
    const konfig = konfigResult.value ?? AufbewahrungsKonfiguration.default();

    // 2. Cutoff-Datum berechnen
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - konfig.aufbewahrungsfristJahre);

    // 3. Betroffene Einsaetze mit Befehlsanzahl finden
    const betroffeneEinsaetze = await this.prisma.einsatz.findMany({
      where: {
        archivedAt: { not: null, lte: cutoffDate },
        befehle: {
          some: {
            anonymisiertAm: null,
            isDeleted: false,
          },
        },
      },
      include: {
        _count: {
          select: {
            befehle: {
              where: {
                anonymisiertAm: null,
                isDeleted: false,
              },
            },
          },
        },
      },
      orderBy: { archivedAt: 'asc' },
    });

    // 4. DTOs erstellen
    let gesamtBefehlCount = 0;
    const einsaetze: AufbewahrungsVorschauEinsatzDto[] = betroffeneEinsaetze.map((e) => {
      const dto = new AufbewahrungsVorschauEinsatzDto();
      dto.einsatzId = e.id;
      dto.einsatzNummer = e.alarmstichwort ?? e.id;
      dto.befehlCount = e._count.befehle;
      dto.archiviertAm = e.archivedAt!;

      // Anonymisierung faellig: archivedAt + Aufbewahrungsfrist
      const faelligAm = new Date(e.archivedAt!);
      faelligAm.setFullYear(faelligAm.getFullYear() + konfig.aufbewahrungsfristJahre);
      dto.anonymisierungFaelligAm = faelligAm;

      gesamtBefehlCount += e._count.befehle;
      return dto;
    });

    const vorschau = new AufbewahrungsVorschauDto();
    vorschau.einsaetze = einsaetze;
    vorschau.gesamtBefehlCount = gesamtBefehlCount;

    return Result.ok(vorschau);
  }
}
