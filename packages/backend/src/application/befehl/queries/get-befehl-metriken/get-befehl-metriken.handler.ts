import { Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { BefehlMetrikenDto, EinsatzMetrikDto } from '@/application/befehl/dto/befehl-metriken.dto';
import type { GetBefehlMetrikenQuery } from './get-befehl-metriken.query';

/**
 * Handler fuer GetBefehlMetrikenQuery.
 *
 * Berechnet aggregierte Adoptionsmetriken und Dokumentationsqualitaet
 * ueber alle Einsaetze eines Zeitraums.
 *
 * **Story 4.5: Adoptionsmetriken & Dokumentationsqualitaet-Dashboard**
 *
 * **Metriken:**
 * - AC2: Erfassungszeit (Median erteiltAm → erste zugestelltAm)
 * - AC3: Quittierungszeit (Median zugestelltAm → quittiertAm pro Empfaenger)
 * - AC4: Papier-Rueckfallquote (Einsaetze ohne Befehle)
 * - AC5: Adoptionsrate (Einsaetze mit mindestens einem Befehl)
 * - AC6: Dokumentationsqualitaet (alle Empfaenger quittiert)
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Aendert niemals Domain State
 * - Prisma Direct: Aggregation ohne Domain Layer (Performance)
 * - Result<T>: Kein Exception-Throwing fuer vorhersagbare Fehler
 */
@Injectable()
export class GetBefehlMetrikenQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fuehrt die Query aus und berechnet aggregierte Metriken.
   *
   * @param query - Die Query mit vonDatum und bisDatum
   * @returns Result.ok(BefehlMetrikenDto) bei Erfolg
   */
  async execute(query: GetBefehlMetrikenQuery): Promise<Result<BefehlMetrikenDto>> {
    const { vonDatum, bisDatum } = query;

    // 1. Alle Einsaetze im Zeitraum (nicht archiviert)
    const einsaetze = await this.prisma.einsatz.findMany({
      where: {
        createdAt: { gte: vonDatum, lte: bisDatum },
        archivedAt: null,
      },
      select: { id: true, alarmstichwort: true, createdAt: true },
    });

    // Leerzustand (AC10)
    if (einsaetze.length === 0) {
      return Result.ok(this.buildEmptyMetriken(vonDatum, bisDatum));
    }

    const einsatzIds = einsaetze.map((e) => e.id);

    // 2. Befehle mit Empfaengern fuer diese Einsaetze
    const befehle = await this.prisma.befehl.findMany({
      where: {
        einsatzId: { in: einsatzIds },
      },
      select: {
        id: true,
        einsatzId: true,
        erteiltAm: true,
        empfaenger: {
          select: { zugestelltAm: true, quittiertAm: true },
        },
      },
    });

    // 3. Globale Metriken berechnen
    const einsatzIdsWithBefehle = new Set(befehle.map((b) => b.einsatzId));
    const gesamtEinsaetze = einsaetze.length;
    const einsaetzeMitBefehlen = einsatzIdsWithBefehle.size;

    // AC4: Papier-Rueckfallquote
    const papierRueckfallquoteProzent = gesamtEinsaetze > 0 ? Math.round(((gesamtEinsaetze - einsaetzeMitBefehlen) / gesamtEinsaetze) * 100) : 0;

    // AC5: Adoptionsrate
    const adoptionsrateProzent = gesamtEinsaetze > 0 ? Math.round((einsaetzeMitBefehlen / gesamtEinsaetze) * 100) : 0;

    // AC2: Erfassungszeit (erteiltAm → erste zugestelltAm)
    const erfassungszeiten: number[] = [];
    for (const befehl of befehle) {
      const zugestelltTimestamps = befehl.empfaenger.filter((e) => e.zugestelltAm !== null).map((e) => e.zugestelltAm!.getTime());
      if (zugestelltTimestamps.length > 0) {
        const ersteZustellung = Math.min(...zugestelltTimestamps);
        const diffSekunden = (ersteZustellung - befehl.erteiltAm.getTime()) / 1000;
        erfassungszeiten.push(diffSekunden);
      }
    }

    // AC3: Quittierungszeit (zugestelltAm → quittiertAm pro Empfaenger)
    const quittierungszeiten: number[] = [];
    for (const befehl of befehle) {
      for (const emp of befehl.empfaenger) {
        if (emp.zugestelltAm && emp.quittiertAm) {
          const diffSekunden = (emp.quittiertAm.getTime() - emp.zugestelltAm.getTime()) / 1000;
          quittierungszeiten.push(diffSekunden);
        }
      }
    }

    // AC6: Dokumentationsqualitaet (Befehle bei denen ALLE Empfaenger quittiert haben)
    let vollstaendigQuittiert = 0;
    for (const befehl of befehle) {
      if (befehl.empfaenger.length > 0 && befehl.empfaenger.every((e) => e.quittiertAm !== null)) {
        vollstaendigQuittiert++;
      }
    }
    const dokumentationsqualitaetProzent = befehle.length > 0 ? Math.round((vollstaendigQuittiert / befehle.length) * 100) : 0;

    // 4. Pro-Einsatz-Breakdown (AC8)
    const einsatzDetails = this.buildEinsatzDetails(einsaetze, befehle);

    const dto: BefehlMetrikenDto = {
      erfassungszeitMedianSekunden: this.calculateMedian(erfassungszeiten),
      quittierungszeitMedianSekunden: this.calculateMedian(quittierungszeiten),
      papierRueckfallquoteProzent,
      adoptionsrateProzent,
      dokumentationsqualitaetProzent,
      gesamtEinsaetze,
      einsaetzeMitBefehlen,
      gesamtBefehle: befehle.length,
      vonDatum,
      bisDatum,
      einsatzDetails,
    };

    return Result.ok(dto);
  }

  /**
   * Baut die Pro-Einsatz-Metriken fuer den Drill-Down.
   */
  private buildEinsatzDetails(
    einsaetze: Array<{ id: string; alarmstichwort: string | null; createdAt: Date }>,
    befehle: Array<{
      id: string;
      einsatzId: string;
      erteiltAm: Date;
      empfaenger: Array<{ zugestelltAm: Date | null; quittiertAm: Date | null }>;
    }>,
  ): EinsatzMetrikDto[] {
    // M1-Fix: Map vorbauen fuer O(n+m) statt O(n*m)
    const befehleByEinsatz = new Map<string, typeof befehle>();
    for (const befehl of befehle) {
      const existing = befehleByEinsatz.get(befehl.einsatzId) ?? [];
      existing.push(befehl);
      befehleByEinsatz.set(befehl.einsatzId, existing);
    }

    return einsaetze.map((einsatz) => {
      const einsatzBefehle = befehleByEinsatz.get(einsatz.id) ?? [];

      // Erfassungszeiten fuer diesen Einsatz
      const erfassungszeiten: number[] = [];
      for (const befehl of einsatzBefehle) {
        const zugestelltTimestamps = befehl.empfaenger.filter((e) => e.zugestelltAm !== null).map((e) => e.zugestelltAm!.getTime());
        if (zugestelltTimestamps.length > 0) {
          const ersteZustellung = Math.min(...zugestelltTimestamps);
          erfassungszeiten.push((ersteZustellung - befehl.erteiltAm.getTime()) / 1000);
        }
      }

      // Quittierungszeiten fuer diesen Einsatz
      const quittierungszeiten: number[] = [];
      for (const befehl of einsatzBefehle) {
        for (const emp of befehl.empfaenger) {
          if (emp.zugestelltAm && emp.quittiertAm) {
            quittierungszeiten.push((emp.quittiertAm.getTime() - emp.zugestelltAm.getTime()) / 1000);
          }
        }
      }

      // Dokumentationsqualitaet fuer diesen Einsatz
      let vollstaendig = 0;
      for (const befehl of einsatzBefehle) {
        if (befehl.empfaenger.length > 0 && befehl.empfaenger.every((e) => e.quittiertAm !== null)) {
          vollstaendig++;
        }
      }

      return {
        einsatzId: einsatz.id,
        alarmstichwort: einsatz.alarmstichwort ?? '',
        datum: einsatz.createdAt,
        befehlAnzahl: einsatzBefehle.length,
        erfassungszeitMedianSekunden: this.calculateMedian(erfassungszeiten),
        quittierungszeitMedianSekunden: this.calculateMedian(quittierungszeiten),
        dokumentationsqualitaetProzent: einsatzBefehle.length > 0 ? Math.round((vollstaendig / einsatzBefehle.length) * 100) : 0,
      };
    });
  }

  /**
   * Berechnet den Median eines numerischen Arrays.
   *
   * @param values - Sortierbare Zahlenwerte
   * @returns Median oder null bei leerem Array
   */
  private calculateMedian(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  }

  /**
   * Erstellt ein leeres Metriken-DTO fuer den Leerzustand (AC10).
   */
  private buildEmptyMetriken(vonDatum: Date, bisDatum: Date): BefehlMetrikenDto {
    return {
      erfassungszeitMedianSekunden: null,
      quittierungszeitMedianSekunden: null,
      papierRueckfallquoteProzent: 0,
      adoptionsrateProzent: 0,
      dokumentationsqualitaetProzent: 0,
      gesamtEinsaetze: 0,
      einsaetzeMitBefehlen: 0,
      gesamtBefehle: 0,
      vonDatum,
      bisDatum,
      einsatzDetails: [],
    };
  }
}
