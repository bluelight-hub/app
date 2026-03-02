import { Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EmpfaengerSucheResultDto, EmpfaengerQuelle } from '@/application/befehl/dto/empfaenger-suche-result.dto';
import type { EmpfaengerSucheQuery } from './empfaenger-suche.query';

/**
 * Handler fuer EmpfaengerSucheQuery.
 *
 * Durchsucht EinsatzPersonen und StammPersonen fuer die
 * Empfaenger-Auswahl bei der Befehlserstellung.
 *
 * **Story 5.1: Empfaenger-Suche mit Kraefte-Stammdaten-Integration**
 *
 * **Suchlogik:**
 * 1. EinsatzPerson mit einsatzId: case-insensitive LIKE auf vorname, nachname, funkrufname
 * 2. Nur wenn weniger als 20 EinsatzPerson-Treffer: EinsatzFahrzeuge nach funkrufname durchsuchen
 * 3. Nur bei verbleibenden Slots: StammPerson als Fallback
 * 4. Deduplizierung: StammPerson-IDs ausschliessen die bereits als EinsatzPerson.stammId gemapped sind
 * 5. Limit: Max 20 Ergebnisse total
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Aendert niemals Domain State
 * - Prisma Direct: Suche ohne Domain Layer (Performance)
 * - Result<T>: Kein Exception-Throwing fuer vorhersagbare Fehler
 */
@Injectable()
export class EmpfaengerSucheQueryHandler {
  private static readonly MAX_RESULTS = 20;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fuehrt die Empfaenger-Suche aus.
   *
   * @param query - Die Query mit searchTerm und einsatzId
   * @returns Result.ok(EmpfaengerSucheResultDto[]) bei Erfolg
   */
  async execute(query: EmpfaengerSucheQuery): Promise<Result<EmpfaengerSucheResultDto[]>> {
    const { searchTerm, einsatzId } = query;

    // Defense-in-Depth: Controller validiert bereits, Handler als Fallback fuer direkte Aufrufe
    const trimmedTerm = searchTerm.trim();
    if (trimmedTerm.length < 2) {
      return Result.ok([]);
    }

    try {
      // 1. EinsatzPerson mit einsatzId suchen
      const einsatzPersonen = await this.prisma.einsatzPerson.findMany({
        where: {
          einsatzId,
          OR: [
            { vorname: { contains: trimmedTerm, mode: 'insensitive' } },
            { nachname: { contains: trimmedTerm, mode: 'insensitive' } },
            { funkrufname: { contains: trimmedTerm, mode: 'insensitive' } },
          ],
        },
        include: {
          qualifikationen: {
            include: { qualifikation: true },
            take: 1,
          },
        },
        take: EmpfaengerSucheQueryHandler.MAX_RESULTS,
      });

      // userId via EinsatzTeilnehmer-Mapping aufloesen (fuer In-App-Quittierung)
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
      const einsatzResults: EmpfaengerSucheResultDto[] = einsatzPersonen.map((ep) => {
        const dto = new EmpfaengerSucheResultDto();
        dto.id = ep.id;
        dto.name = ep.funkrufname ?? `${ep.nachname}, ${ep.vorname}`;
        dto.rolle = ep.funktion;
        dto.qualifikation = ep.qualifikationen?.[0]?.qualifikation?.name;
        dto.userId = teilnehmerMap.get(ep.id);
        dto.quelle = EmpfaengerQuelle.EINSATZ;
        return dto;
      });

      // 2. Nur wenn weniger als MAX_RESULTS EinsatzPerson-Treffer: EinsatzFahrzeuge als zweiter Suchraum
      if (einsatzResults.length >= EmpfaengerSucheQueryHandler.MAX_RESULTS) {
        return Result.ok(einsatzResults);
      }

      const remainingForFahrzeuge = EmpfaengerSucheQueryHandler.MAX_RESULTS - einsatzResults.length;
      const einsatzFahrzeuge = await this.prisma.einsatzFahrzeug.findMany({
        where: {
          einsatzId,
          funkrufname: { contains: trimmedTerm, mode: 'insensitive' },
        },
        select: {
          id: true,
          funkrufname: true,
        },
        orderBy: {
          funkrufname: 'asc',
        },
        take: remainingForFahrzeuge,
      });

      const fahrzeugResults: EmpfaengerSucheResultDto[] = einsatzFahrzeuge.map((fahrzeug) => {
        const dto = new EmpfaengerSucheResultDto();
        dto.id = fahrzeug.id;
        dto.name = fahrzeug.funkrufname;
        dto.rolle = 'Fahrzeug';
        dto.quelle = EmpfaengerQuelle.EINSATZ_FAHRZEUG;
        return dto;
      });

      const combinedWithFahrzeuge = [...einsatzResults, ...fahrzeugResults];
      if (combinedWithFahrzeuge.length >= EmpfaengerSucheQueryHandler.MAX_RESULTS) {
        return Result.ok(combinedWithFahrzeuge);
      }

      const remainingForStamm = EmpfaengerSucheQueryHandler.MAX_RESULTS - combinedWithFahrzeuge.length;

      // 3. Deduplizierung: StammPerson-IDs ausschliessen die bereits als EinsatzPerson.stammId vorhanden sind
      const mappedStammIds = einsatzPersonen.filter((ep) => ep.stammId !== null).map((ep) => ep.stammId as string);

      const stammPersonen = await this.prisma.stammPerson.findMany({
        where: {
          id: mappedStammIds.length > 0 ? { notIn: mappedStammIds } : undefined,
          archivedAt: null,
          OR: [{ vorname: { contains: trimmedTerm, mode: 'insensitive' } }, { nachname: { contains: trimmedTerm, mode: 'insensitive' } }],
        },
        include: {
          qualifikationen: {
            include: { qualifikation: true },
            take: 1,
          },
        },
        take: remainingForStamm,
      });

      // StammPerson -> DTO
      const stammResults: EmpfaengerSucheResultDto[] = stammPersonen.map((sp) => {
        const dto = new EmpfaengerSucheResultDto();
        dto.id = sp.id;
        dto.name = `${sp.nachname}, ${sp.vorname}`;
        dto.qualifikation = sp.qualifikationen[0]?.qualifikation?.name;
        dto.quelle = EmpfaengerQuelle.STAMMDATEN;
        return dto;
      });

      return Result.ok([...combinedWithFahrzeuge, ...stammResults]);
    } catch (error) {
      return Result.fail(`Empfaenger-Suche fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }
}
