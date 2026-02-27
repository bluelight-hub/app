import { Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { BefehlsgeberSucheResultDto, BefehlsgeberQuelle } from '@/application/befehl/dto/befehlsgeber-suche-result.dto';
import type { BefehlsgeberSucheQuery } from './befehlsgeber-suche.query';

/**
 * Handler fuer BefehlsgeberSucheQuery.
 *
 * Kombiniert BefehlsgeberVorschlaege (Admin-konfiguriert) und
 * EinsatzPersonen des Einsatzes in einem gruppierten Ergebnis.
 *
 * **Suchlogik:**
 * 1. Aktive BefehlsgeberVorschlaege laden (gefiltert nach searchTerm)
 * 2. EinsatzPersonen laden (case-insensitive LIKE auf vorname/nachname/funkrufname)
 * 3. userId via EinsatzTeilnehmer-Mapping aufloesen
 * 4. Ergebnisse mit quelle-Tag zurueckgeben
 */
@Injectable()
export class BefehlsgeberSucheQueryHandler {
  private static readonly MAX_PERSONEN = 20;

  constructor(private readonly prisma: PrismaService) {}

  async execute(query: BefehlsgeberSucheQuery): Promise<Result<BefehlsgeberSucheResultDto[]>> {
    const { einsatzId, searchTerm } = query;
    const trimmedTerm = searchTerm?.trim() ?? '';

    try {
      // 1. Aktive BefehlsgeberVorschlaege laden
      const vorschlaegeWhere: Record<string, unknown> = { istAktiv: true };
      if (trimmedTerm.length > 0) {
        vorschlaegeWhere.OR = [{ kuerzel: { contains: trimmedTerm, mode: 'insensitive' } }, { label: { contains: trimmedTerm, mode: 'insensitive' } }];
      }

      const vorschlaege = await this.prisma.befehlsgeberVorschlag.findMany({
        where: vorschlaegeWhere,
        orderBy: { sortOrder: 'asc' },
      });

      const vorschlaegeResults: BefehlsgeberSucheResultDto[] = vorschlaege.map((v) => {
        const dto = new BefehlsgeberSucheResultDto();
        dto.id = v.id;
        dto.name = v.kuerzel;
        dto.label = v.label;
        dto.quelle = BefehlsgeberQuelle.VORSCHLAG;
        return dto;
      });

      // 2. EinsatzPersonen laden
      const personenWhere: Record<string, unknown> = { einsatzId };
      if (trimmedTerm.length > 0) {
        personenWhere.OR = [
          { vorname: { contains: trimmedTerm, mode: 'insensitive' } },
          { nachname: { contains: trimmedTerm, mode: 'insensitive' } },
          { funkrufname: { contains: trimmedTerm, mode: 'insensitive' } },
        ];
      }

      const einsatzPersonen = await this.prisma.einsatzPerson.findMany({
        where: personenWhere,
        take: BefehlsgeberSucheQueryHandler.MAX_PERSONEN,
      });

      // 3. userId via EinsatzTeilnehmer-Mapping aufloesen
      const einsatzPersonIds = einsatzPersonen.map((ep) => ep.id);
      const teilnehmerMap = new Map<string, string>();
      if (einsatzPersonIds.length > 0) {
        const teilnehmer = await this.prisma.einsatzTeilnehmer.findMany({
          where: {
            einsatzId,
            einsatzPersonId: { in: einsatzPersonIds },
            leftAt: null,
          },
          select: { einsatzPersonId: true, userId: true },
        });
        for (const t of teilnehmer) {
          teilnehmerMap.set(t.einsatzPersonId, t.userId);
        }
      }

      // EinsatzPerson -> DTO
      const personenResults: BefehlsgeberSucheResultDto[] = einsatzPersonen.map((ep) => {
        const dto = new BefehlsgeberSucheResultDto();
        dto.id = ep.id;
        const displayName = ep.funkrufname ?? `${ep.nachname}, ${ep.vorname}`;
        dto.name = displayName;
        dto.label = ep.funktion ? `${displayName} (${ep.funktion})` : displayName;
        dto.userId = teilnehmerMap.get(ep.id);
        dto.quelle = BefehlsgeberQuelle.EINSATZ_PERSON;
        return dto;
      });

      return Result.ok([...vorschlaegeResults, ...personenResults]);
    } catch (error) {
      return Result.fail(`Befehlsgeber-Suche fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }
}
