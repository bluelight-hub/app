import { Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { BEFEHL_ERROR_CODES } from '@/application/befehl/errors/befehl-error.codes';
import { BefehlHistorieEventDto, BefehlHistorieEventStatus, BefehlHistorieEventTyp, BefehlHistorieTimelineDto } from '@/application/befehl/dto/befehl-historie.dto';
import type { GetBefehlHistorieQuery } from './get-befehl-historie.query';

/**
 * Handler fuer GetBefehlHistorieQuery.
 *
 * Konstruiert eine Befehlshistorie-Timeline aus DB-Daten.
 * Die Timeline zeigt chronologisch alle Events eines Befehls
 * im Paket-Tracking-Style (ERTEILT → ZUGESTELLT → QUITTIERT usw.).
 *
 * **Story 4.2: Befehlshistorie-Timeline**
 *
 * **Status-Berechnung:**
 * - Events mit Timestamp → ABGESCHLOSSEN
 * - Letztes ABGESCHLOSSEN Event → AKTUELL
 * - Events ohne Timestamp → AUSSTEHEND (am Ende)
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Aendert niemals Domain State
 * - Prisma Direct: Query bypassed Domain Layer (Performance)
 * - Result<T>: Kein Exception-Throwing fuer vorhersagbare Fehler
 */
@Injectable()
export class GetBefehlHistorieQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fuehrt die Query aus und konstruiert die Befehlshistorie-Timeline.
   *
   * @param query - Die Query mit befehlId
   * @returns Result.ok(BefehlHistorieTimelineDto) bei Erfolg, Result.fail() bei Fehler
   */
  async execute(query: GetBefehlHistorieQuery): Promise<Result<BefehlHistorieTimelineDto>> {
    const befehl = await this.prisma.befehl.findUnique({
      where: { id: query.befehlId },
      include: {
        empfaenger: { orderBy: { zugestelltAm: 'asc' } },
        kommentare: {
          where: { isRueckfrage: true },
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { username: true } } },
        },
        korrekturen: {
          select: { id: true, nummer: true, erteiltAm: true },
        },
      },
    });

    if (!befehl) {
      return Result.fail(BEFEHL_ERROR_CODES.NOT_FOUND);
    }

    const events = this.buildTimelineEvents(befehl);

    const timeline: BefehlHistorieTimelineDto = {
      befehlId: befehl.id,
      befehlNummer: befehl.nummer,
      aktuellerStatus: befehl.status,
      events,
    };

    return Result.ok(timeline);
  }

  /**
   * Konstruiert Timeline-Events aus DB-Daten.
   *
   * Reihenfolge:
   * 1. Alle Events mit Timestamp (chronologisch sortiert)
   * 2. AUSSTEHEND-Events am Ende
   *
   * Status-Berechnung:
   * - Mit Timestamp → ABGESCHLOSSEN
   * - Letzter ABGESCHLOSSEN → AKTUELL
   * - Ohne Timestamp → AUSSTEHEND
   */
  private buildTimelineEvents(befehl: {
    nummer: string;
    befehlsgeberName: string;
    erteiltAm: Date;
    empfaenger: Array<{
      name: string;
      zugestelltAm: Date | null;
      quittiertAm: Date | null;
      quittierungArt: string | null;
    }>;
    kommentare: Array<{
      text: string;
      author: { username: string } | null;
      createdAt: Date;
      isRueckfrage: boolean;
    }>;
    korrekturen: Array<{
      nummer: string;
      erteiltAm: Date;
    }>;
  }): BefehlHistorieEventDto[] {
    const completedEvents: BefehlHistorieEventDto[] = [];
    const pendingEvents: BefehlHistorieEventDto[] = [];

    // 1. ERTEILT (immer vorhanden, immer ABGESCHLOSSEN)
    completedEvents.push({
      typ: BefehlHistorieEventTyp.ERTEILT,
      status: BefehlHistorieEventStatus.ABGESCHLOSSEN,
      zeitpunkt: befehl.erteiltAm,
      beschreibung: `Befehl #${befehl.nummer} erteilt`,
      akteur: befehl.befehlsgeberName,
    });

    // 2. ZUGESTELLT pro Empfaenger
    for (const emp of befehl.empfaenger) {
      if (emp.zugestelltAm) {
        completedEvents.push({
          typ: BefehlHistorieEventTyp.ZUGESTELLT,
          status: BefehlHistorieEventStatus.ABGESCHLOSSEN,
          zeitpunkt: emp.zugestelltAm,
          beschreibung: `Zugestellt an ${emp.name}`,
          akteur: emp.name,
        });
      } else {
        pendingEvents.push({
          typ: BefehlHistorieEventTyp.ZUGESTELLT,
          status: BefehlHistorieEventStatus.AUSSTEHEND,
          zeitpunkt: null,
          beschreibung: `Zustellung an ${emp.name} ausstehend`,
          akteur: emp.name,
        });
      }
    }

    // 3. QUITTIERT/RUECKFRAGE/NICHT_VERSTANDEN pro Empfaenger
    for (const emp of befehl.empfaenger) {
      if (emp.quittiertAm && emp.quittierungArt) {
        const typ = this.mapQuittierungArtToEventTyp(emp.quittierungArt);
        completedEvents.push({
          typ,
          status: BefehlHistorieEventStatus.ABGESCHLOSSEN,
          zeitpunkt: emp.quittiertAm,
          beschreibung: `${emp.name}: ${this.getQuittierungBeschreibung(emp.quittierungArt)}`,
          akteur: emp.name,
        });
      } else if (emp.zugestelltAm && !emp.quittiertAm) {
        // Nur AUSSTEHEND anzeigen wenn zugestellt aber nicht quittiert
        pendingEvents.push({
          typ: BefehlHistorieEventTyp.QUITTIERT,
          status: BefehlHistorieEventStatus.AUSSTEHEND,
          zeitpunkt: null,
          beschreibung: `Quittierung von ${emp.name} ausstehend`,
          akteur: emp.name,
        });
      }
    }

    // 4. KOMMENTAR aus Rueckfrage-Kommentaren
    for (const kommentar of befehl.kommentare) {
      completedEvents.push({
        typ: BefehlHistorieEventTyp.KOMMENTAR,
        status: BefehlHistorieEventStatus.ABGESCHLOSSEN,
        zeitpunkt: kommentar.createdAt,
        beschreibung: `Rückfrage von ${kommentar.author?.username ?? 'Unbekannt'}`,
        akteur: kommentar.author?.username ?? 'Unbekannt',
        details: kommentar.text,
      });
    }

    // 5. KORRIGIERT aus Korrekturen
    for (const korrektur of befehl.korrekturen) {
      completedEvents.push({
        typ: BefehlHistorieEventTyp.KORRIGIERT,
        status: BefehlHistorieEventStatus.ABGESCHLOSSEN,
        zeitpunkt: korrektur.erteiltAm,
        beschreibung: `Korrigiert durch Befehl #${korrektur.nummer}`,
        korrekturBefehlNummer: korrektur.nummer,
      });
    }

    // Chronologisch sortieren (aelteste zuerst)
    completedEvents.sort((a, b) => {
      const timeA = a.zeitpunkt?.getTime() ?? 0;
      const timeB = b.zeitpunkt?.getTime() ?? 0;
      return timeA - timeB;
    });

    // Letztes ABGESCHLOSSEN Event → AKTUELL
    const lastCompleted = completedEvents[completedEvents.length - 1];
    if (lastCompleted) {
      lastCompleted.status = BefehlHistorieEventStatus.AKTUELL;
    }

    // AUSSTEHEND Events ans Ende
    return [...completedEvents, ...pendingEvents];
  }

  /**
   * Mappt QuittierungArt auf BefehlHistorieEventTyp.
   */
  private mapQuittierungArtToEventTyp(quittierungArt: string): BefehlHistorieEventTyp {
    switch (quittierungArt) {
      case 'VERSTANDEN':
        return BefehlHistorieEventTyp.QUITTIERT;
      case 'RUECKFRAGE':
        return BefehlHistorieEventTyp.RUECKFRAGE;
      case 'NICHT_VERSTANDEN':
        return BefehlHistorieEventTyp.NICHT_VERSTANDEN;
      default:
        return BefehlHistorieEventTyp.QUITTIERT;
    }
  }

  /**
   * Gibt eine lesbare Beschreibung fuer die QuittierungArt zurueck.
   */
  private getQuittierungBeschreibung(quittierungArt: string): string {
    switch (quittierungArt) {
      case 'VERSTANDEN':
        return 'Verstanden';
      case 'RUECKFRAGE':
        return 'Rückfrage';
      case 'NICHT_VERSTANDEN':
        return 'Nicht verstanden';
      default:
        return 'Quittiert';
    }
  }
}
