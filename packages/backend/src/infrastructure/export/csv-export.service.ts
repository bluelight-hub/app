import { Injectable } from '@nestjs/common';
import type { ErinnerungExportItem } from '@domain/repositories/erinnerung-export';
import type { RohdatenExportItem } from '@domain/repositories/rohdaten-export';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const CSV_HEADERS = ['ID', 'Titel', 'Status', 'Ersteller', 'Zugewiesener', 'FaelligAm', 'AusgeloestAm', 'AcknowledgedAm', 'ErledigtAm', 'Kategorie', 'Eskaliert', 'Snooze-Anzahl'] as const;

const RAW_CSV_HEADERS = [
  'ID',
  'Titel',
  'Beschreibung',
  'Status',
  'Kategorie',
  'Ersteller',
  'Erstellt-Am',
  'Faellig-Am',
  'Ausgeloest-Am',
  'Acknowledged-Am',
  'Acknowledged-Von',
  'Snoozed-Am',
  'Snoozed-Von',
  'Snoozed-Bis',
  'Snooze-Anzahl',
  'Erledigt-Am',
  'Erledigt-Von',
  'Erledigungs-Notiz',
  'Zugewiesener',
  'Zugewiesen-Von',
  'Zugewiesen-Am',
  'Eskaliert',
  'Eskaliert-Am',
  'Eskalationsperson',
  'Vorheriger-Zugewiesener',
] as const;

const SEPARATOR = ';';
const BOM = '\uFEFF';

@Injectable()
export class CsvExportService {
  /** Generiert einen CSV-Export aller Erinnerungen (Story 9.6 AC3). */
  generateExport(erinnerungen: ErinnerungExportItem[]): Buffer {
    const headerLine = CSV_HEADERS.join(SEPARATOR);

    const dataLines = erinnerungen.map((e) => {
      const fields: string[] = [
        e.id,
        e.titel,
        e.status,
        e.erstelltVonName,
        e.assignedToName ?? '',
        this.formatDate(e.faelligAm),
        this.formatDate(e.ausgeloestAm),
        this.formatDate(e.acknowledgedAm),
        this.formatDate(e.erledigtAm),
        e.kategorieName ?? '',
        e.wurdeEskaliert ? 'Ja' : 'Nein',
        String(e.snoozeCount),
      ];

      return fields.map((f) => this.escapeCsvField(f)).join(SEPARATOR);
    });

    const csv = `${BOM + [headerLine, ...dataLines].join('\r\n')}\r\n`;

    return Buffer.from(csv, 'utf-8');
  }

  /** Generiert einen CSV-Export aller Rohdaten-Felder (Story 9.10 AC3). */
  generateRawExport(items: RohdatenExportItem[]): Buffer {
    const headerLine = RAW_CSV_HEADERS.join(SEPARATOR);

    const dataLines = items.map((e) => {
      const fields: string[] = [
        e.id,
        e.titel,
        e.beschreibung,
        e.status,
        e.kategorieName ?? '',
        e.erstelltVonName,
        this.formatDate(e.createdAt),
        this.formatDate(e.faelligAm),
        this.formatDate(e.ausgeloestAm),
        this.formatDate(e.acknowledgedAm),
        e.acknowledgedByName ?? '',
        this.formatDate(e.snoozedAt),
        e.snoozedByName ?? '',
        this.formatDate(e.snoozedUntil),
        String(e.snoozeCount),
        this.formatDate(e.erledigtAm),
        e.erledigtByName ?? '',
        e.erledigungsNotiz ?? '',
        e.assignedToName ?? '',
        e.assignedByName ?? '',
        this.formatDate(e.assignedAt),
        e.wurdeEskaliert ? 'Ja' : 'Nein',
        this.formatDate(e.eskaliertAm),
        e.eskalationsPersonName ?? '',
        e.previousAssigneeName ?? '',
      ];

      return fields.map((f) => this.escapeCsvField(f)).join(SEPARATOR);
    });

    const csv = `${BOM + [headerLine, ...dataLines].join('\r\n')}\r\n`;

    return Buffer.from(csv, 'utf-8');
  }

  /** Formatiert ein Datum im deutschen Format oder gibt einen leeren String zurueck. */
  private formatDate(date: Date | null): string {
    if (!date) {
      return '';
    }

    return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
  }

  /** Escaped ein CSV-Feld: Felder mit Semikolon, Zeilenumbruch oder Anfuehrungszeichen werden in Anfuehrungszeichen gewrappt. */
  private escapeCsvField(field: string): string {
    if (field.includes(SEPARATOR) || field.includes('\n') || field.includes('\r') || field.includes('"')) {
      return `"${field.replace(/"/g, '""')}"`;
    }

    return field;
  }
}
