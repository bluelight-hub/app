import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { ErinnerungExportItem } from '@domain/repositories/erinnerung-export';
import type { ErinnerungStatistikDto } from '@/application/erinnerung/dto/erinnerung-statistik.dto';
import type { EskalationsAnalyseDto } from '@/application/erinnerung/dto/eskalations-analyse.dto';
import type { ReaktionszeitStatistikDto } from '@/application/erinnerung/dto/reaktionszeit-statistik.dto';
import type { PersonStatistikDto } from '@/application/erinnerung/dto/person-statistik.dto';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

/** Kuerzt eine UUID auf die ersten 8 Zeichen */
function shortId(id: string): string {
  return id.substring(0, 8);
}

/** Formatiert ein Date als dd.MM.yyyy HH:mm */
function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd.MM.yyyy HH:mm', { locale: de });
}

/** Formatiert Sekunden als lesbaren Zeitwert */
function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}min`;
}

/**
 * Service zum Generieren von PDF-Exporten fuer Erinnerungen.
 * Nutzt PDFKit fuer die PDF-Erstellung im A4-Format.
 */
@Injectable()
export class PdfExportService {
  /**
   * Generiert einen PDF-Export mit Zusammenfassung, Detail-Statistiken
   * und der vollstaendigen Erinnerungsliste.
   */
  generateExport(
    statistik: ErinnerungStatistikDto,
    personStatistik: PersonStatistikDto,
    eskalationsAnalyse: EskalationsAnalyseDto,
    reaktionszeiten: ReaktionszeitStatistikDto,
    erinnerungen: ErinnerungExportItem[],
    einsatzNummer: string,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        this.renderZusammenfassung(doc, statistik, reaktionszeiten, einsatzNummer);
        doc.addPage();
        this.renderDetailStatistiken(doc, personStatistik, eskalationsAnalyse, reaktionszeiten);
        doc.addPage();
        this.renderErinnerungsliste(doc, erinnerungen);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Seite 1: Zusammenfassung
  // ---------------------------------------------------------------------------

  private renderZusammenfassung(doc: PDFKit.PDFDocument, statistik: ErinnerungStatistikDto, reaktionszeiten: ReaktionszeitStatistikDto, einsatzNummer: string): void {
    // Titel
    doc.fontSize(20).text(`Erinnerungen Export - Einsatz ${einsatzNummer}`, { align: 'center' });
    doc.moveDown(0.5);

    // Erstellungsdatum
    doc
      .fontSize(10)
      .fillColor('#666666')
      .text(`Erstellt am ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}`, {
        align: 'center',
      });
    doc.fillColor('#000000');
    doc.moveDown(2);

    // Uebersichtstabelle
    doc.fontSize(14).text('Zusammenfassung');
    doc.moveDown(0.5);

    const counts = statistik.statusCounts;
    const eskalationsRate = counts.total > 0 ? ((counts.eskaliert / counts.total) * 100).toFixed(1) : '0.0';

    const rows: [string, string][] = [
      ['Gesamt', String(counts.total)],
      ['Erledigt', String(counts.erledigt)],
      ['Offen', String(counts.total - counts.erledigt)],
      ['Eskaliert', String(counts.eskaliert)],
      ['Eskalationsrate', `${eskalationsRate}%`],
      ['Durchschn. Reaktionszeit', formatSeconds(reaktionszeiten.avgReaktionszeitSeconds)],
    ];

    this.renderKeyValueTable(doc, rows);
  }

  // ---------------------------------------------------------------------------
  // Seite 2: Detail-Statistiken
  // ---------------------------------------------------------------------------

  private renderDetailStatistiken(doc: PDFKit.PDFDocument, personStatistik: PersonStatistikDto, eskalationsAnalyse: EskalationsAnalyseDto, reaktionszeiten: ReaktionszeitStatistikDto): void {
    // Personen-Statistik
    doc.fontSize(14).text('Personen-Statistik');
    doc.moveDown(0.5);

    if (personStatistik.items.length === 0) {
      doc.fontSize(10).text('Keine Daten vorhanden.');
    } else {
      // Header
      doc.fontSize(8).text(
        this.padColumns([
          { text: 'Person', width: 25 },
          { text: 'Zugewiesen', width: 12 },
          { text: 'Bestaetigt', width: 12 },
          { text: 'Eskalationen', width: 14 },
          { text: 'Avg. Reaktionszeit', width: 20 },
        ]),
        { underline: true },
      );

      for (const item of personStatistik.items) {
        doc.fontSize(8).text(
          this.padColumns([
            { text: item.userName, width: 25 },
            { text: String(item.zugewiesen), width: 12 },
            { text: String(item.acknowledged), width: 12 },
            { text: String(item.eskalationen), width: 14 },
            {
              text: item.avgReaktionszeitSeconds !== null ? formatSeconds(item.avgReaktionszeitSeconds) : '-',
              width: 20,
            },
          ]),
        );
      }
    }

    doc.moveDown(1.5);

    // Eskalations-Analyse
    doc.fontSize(14).text('Eskalations-Analyse');
    doc.moveDown(0.5);

    const eskRows: [string, string][] = [
      ['Eskalierte Erinnerungen', String(eskalationsAnalyse.totalEscalated)],
      ['Gesamt Erinnerungen', String(eskalationsAnalyse.totalErinnerungen)],
      ['Eskalationsrate', `${(eskalationsAnalyse.eskalationsRate * 100).toFixed(1)}%`],
      ['Durchschn. Zeit bis Eskalation', formatSeconds(eskalationsAnalyse.avgZeitBisEskalationSeconds)],
    ];

    this.renderKeyValueTable(doc, eskRows);

    if (eskalationsAnalyse.topReceivers.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(10).text('Top Empfaenger:');
      for (const receiver of eskalationsAnalyse.topReceivers) {
        doc.fontSize(9).text(`  ${receiver.userName}: ${receiver.count} Eskalationen`);
      }
    }

    if (eskalationsAnalyse.topSources.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(10).text('Top Quellen:');
      for (const source of eskalationsAnalyse.topSources) {
        doc.fontSize(9).text(`  ${source.userName}: ${source.count} eskalierte Erinnerungen`);
      }
    }

    doc.moveDown(1.5);

    // Reaktionszeiten
    doc.fontSize(14).text('Reaktionszeiten');
    doc.moveDown(0.5);

    const rzRows: [string, string][] = [
      ['Bestaetigt (Gesamt)', String(reaktionszeiten.totalAcknowledged)],
      ['Durchschnitt', formatSeconds(reaktionszeiten.avgReaktionszeitSeconds)],
      ['Median', formatSeconds(reaktionszeiten.medianReaktionszeitSeconds)],
      ['Schnellste', formatSeconds(reaktionszeiten.minReaktionszeitSeconds)],
      ['Langsamste', formatSeconds(reaktionszeiten.maxReaktionszeitSeconds)],
    ];

    this.renderKeyValueTable(doc, rzRows);

    if (reaktionszeiten.buckets.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(10).text('Verteilung:');
      for (const bucket of reaktionszeiten.buckets) {
        doc.fontSize(9).text(`  ${bucket.label}: ${bucket.count}`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Seite 3+: Erinnerungsliste
  // ---------------------------------------------------------------------------

  private renderErinnerungsliste(doc: PDFKit.PDFDocument, erinnerungen: ErinnerungExportItem[]): void {
    doc.fontSize(14).text('Erinnerungsliste');
    doc.moveDown(0.5);

    if (erinnerungen.length === 0) {
      doc.fontSize(10).text('Keine Erinnerungen vorhanden.');
      return;
    }

    // Header
    doc.fontSize(7).text(
      this.padColumns([
        { text: 'ID', width: 10 },
        { text: 'Titel', width: 20 },
        { text: 'Status', width: 12 },
        { text: 'Ersteller', width: 14 },
        { text: 'Zugewiesen', width: 14 },
        { text: 'Faellig Am', width: 16 },
        { text: 'Erledigt Am', width: 16 },
      ]),
      { underline: true },
    );

    for (const item of erinnerungen) {
      // Pruefen ob genug Platz auf der Seite ist (min. 20pt)
      const currentY = doc.y;
      const pageHeight = doc.page.height - doc.page.margins.bottom;
      if (currentY > pageHeight - 20) {
        doc.addPage();
      }

      doc.fontSize(7).text(
        this.padColumns([
          { text: shortId(item.id), width: 10 },
          { text: item.titel.substring(0, 25), width: 20 },
          { text: item.status, width: 12 },
          { text: item.erstelltVonName, width: 14 },
          { text: item.assignedToName ?? '-', width: 14 },
          { text: formatDate(item.faelligAm), width: 16 },
          { text: formatDate(item.erledigtAm), width: 16 },
        ]),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Hilfs-Methoden
  // ---------------------------------------------------------------------------

  /** Rendert eine einfache Key-Value-Tabelle */
  private renderKeyValueTable(doc: PDFKit.PDFDocument, rows: [string, string][]): void {
    for (const [label, value] of rows) {
      doc.fontSize(10).text(`${label}:`, { continued: true }).text(`  ${value}`);
    }
  }

  /** Erstellt einen Spalten-String mit fester Breite (Zeichenanzahl) */
  private padColumns(columns: { text: string; width: number }[]): string {
    return columns.map((col) => col.text.padEnd(col.width)).join('');
  }
}
