import { Injectable } from '@nestjs/common';
import type { IBefehlCsvService } from '@/application/befehl/ports/i-befehl-csv.service';
import type { Befehl } from '@domain/aggregates/befehl.aggregate';
import { CSV_BOM, CSV_SEPARATOR, escapeCsvField } from './csv-utils';

const BEFEHL_CSV_HEADERS = ['Nummer', 'Zeitstempel', 'Befehlsgeber', 'Auftrag', 'Empfaenger', 'Status', 'Quittierungszeitpunkte', 'Quittierungsart'] as const;

/**
 * Formatiert Befehl-Daten als CSV fuer den Export.
 *
 * **Story 4.4: Befehlsdaten-Export fuer Nachbereitung**
 *
 * Formatierung:
 * - Semikolon als Trennzeichen (deutsche Excel-Versionen)
 * - BOM fuer korrekte UTF-8 Erkennung in Excel
 * - Datum: DD.MM.YYYY HH:mm in Europe/Berlin Timezone
 * - Mehrere Empfaenger/Quittierungen komma-separiert innerhalb einer Zelle
 */
@Injectable()
export class BefehlCsvService implements IBefehlCsvService {
  /**
   * Generiert CSV-Inhalt aus Befehl-Aggregaten.
   *
   * @param befehle - Befehl-Aggregate zum Exportieren
   * @returns CSV-String mit BOM, Header und Datenzeilen
   */
  generateCsv(befehle: Befehl[]): string {
    const headerLine = BEFEHL_CSV_HEADERS.join(CSV_SEPARATOR);

    const dataLines = befehle.map((b) => {
      const empfaengerNames = b.empfaenger.map((e) => e.name).join(', ');

      const quittierungszeitpunkte = b.empfaenger
        .filter((e) => e.quittiertAm)
        .map((e) => `${e.name}: ${this.formatDate(e.quittiertAm!)}`)
        .join(', ');

      const quittierungsarten = b.empfaenger
        .filter((e) => e.quittierungArt)
        .map((e) => `${e.name}: ${this.mapQuittierungArt(e.quittierungArt!)}`)
        .join(', ');

      const fields: string[] = [b.nummer, this.formatDate(b.erteiltAm), b.befehlsgeberName, b.auftrag, empfaengerNames, b.status.value, quittierungszeitpunkte, quittierungsarten];

      return fields.map((f) => escapeCsvField(f)).join(CSV_SEPARATOR);
    });

    return `${CSV_BOM}${[headerLine, ...dataLines].join('\r\n')}\r\n`;
  }

  /**
   * Formatiert ein Datum im deutschen Format DD.MM.YYYY HH:mm in Europe/Berlin Timezone.
   */
  private formatDate(date: Date): string {
    const formatter = new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

    return `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')}`;
  }

  /**
   * Mappt QuittierungArt auf lesbare deutsche Bezeichnung.
   */
  private mapQuittierungArt(art: string): string {
    switch (art) {
      case 'VERSTANDEN':
        return 'Verstanden';
      case 'RUECKFRAGE':
        return 'Rueckfrage';
      case 'NICHT_VERSTANDEN':
        return 'Nicht verstanden';
      default:
        return art;
    }
  }
}
