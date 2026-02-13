import { Injectable } from '@nestjs/common';
import type { ErinnerungExportItem } from '@domain/repositories/erinnerung-export';
import type { RohdatenExportItem } from '@domain/repositories/rohdaten-export';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

@Injectable()
export class JsonExportService {
  /** Generiert einen JSON-Export aller Erinnerungen (Story 9.6 AC3). */
  generateExport(erinnerungen: ErinnerungExportItem[]): Buffer {
    const data = erinnerungen.map((e) => ({
      ID: e.id,
      Titel: e.titel,
      Status: e.status,
      Ersteller: e.erstelltVonName,
      Zugewiesener: e.assignedToName ?? null,
      FaelligAm: this.formatDate(e.faelligAm),
      AusgeloestAm: this.formatDate(e.ausgeloestAm),
      AcknowledgedAm: this.formatDate(e.acknowledgedAm),
      ErledigtAm: this.formatDate(e.erledigtAm),
      Kategorie: e.kategorieName ?? null,
      Eskaliert: e.wurdeEskaliert,
      'Snooze-Anzahl': e.snoozeCount,
    }));

    return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  }

  /** Generiert einen JSON-Export aller Rohdaten-Felder (Story 9.10 AC4). */
  generateRawExport(items: RohdatenExportItem[]): Buffer {
    const data = items.map((e) => ({
      ID: e.id,
      Titel: e.titel,
      Beschreibung: e.beschreibung,
      Status: e.status,
      Kategorie: e.kategorieName ?? null,
      Ersteller: e.erstelltVonName,
      'Erstellt-Am': this.formatDate(e.createdAt),
      'Faellig-Am': this.formatDate(e.faelligAm),
      'Ausgeloest-Am': this.formatDate(e.ausgeloestAm),
      'Acknowledged-Am': this.formatDate(e.acknowledgedAm),
      'Acknowledged-Von': e.acknowledgedByName ?? null,
      'Snoozed-Am': this.formatDate(e.snoozedAt),
      'Snoozed-Von': e.snoozedByName ?? null,
      'Snoozed-Bis': this.formatDate(e.snoozedUntil),
      'Snooze-Anzahl': e.snoozeCount,
      'Erledigt-Am': this.formatDate(e.erledigtAm),
      'Erledigt-Von': e.erledigtByName ?? null,
      'Erledigungs-Notiz': e.erledigungsNotiz ?? null,
      Zugewiesener: e.assignedToName ?? null,
      'Zugewiesen-Von': e.assignedByName ?? null,
      'Zugewiesen-Am': this.formatDate(e.assignedAt),
      Eskaliert: e.wurdeEskaliert,
      'Eskaliert-Am': this.formatDate(e.eskaliertAm),
      Eskalationsperson: e.eskalationsPersonName ?? null,
      'Vorheriger-Zugewiesener': e.previousAssigneeName ?? null,
    }));

    return Buffer.from(JSON.stringify(data, null, 2), 'utf-8');
  }

  /** Formatiert ein Datum im deutschen Format oder gibt null zurueck. */
  private formatDate(date: Date | null): string | null {
    if (!date) {
      return null;
    }

    return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
  }
}
