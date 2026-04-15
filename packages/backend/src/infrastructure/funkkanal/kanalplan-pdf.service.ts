import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { KanalDetailsShape } from '@domain/aggregates/funkkanal/kanal-details.vo';
import type { FunkkanalZuordnung } from '@domain/aggregates/funkkanal/funkkanal-zuordnung.entity';
import type { IKanalplanPdfService, KanalplanPdfInput } from '@/application/funkkanal/ports/i-kanalplan-pdf.service';

/**
 * PDFKit-basierte Implementierung des {@link IKanalplanPdfService}.
 *
 * Layout (A4, portrait):
 * - Kopfzeile: Titel + Einsatzname
 * - Tabelle pro Kanal (Name, Typ-Label, Kennung, Zweck, Status)
 * - Darunter pro Zuordnung: "• Rufname (Rolle)"
 * - Fußzeile: Export-Zeitstempel
 */
@Injectable()
export class KanalplanPdfService implements IKanalplanPdfService {
  generate(input: KanalplanPdfInput): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        this.renderHeader(doc, input);
        this.renderKanaele(doc, input);
        this.renderFooter(doc, input);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private renderHeader(doc: PDFKit.PDFDocument, input: KanalplanPdfInput): void {
    doc.fontSize(18).text('Kanalplan', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(12).text(`Einsatz: ${input.einsatzName}`);
    doc.moveDown(0.8);
  }

  private renderKanaele(doc: PDFKit.PDFDocument, input: KanalplanPdfInput): void {
    if (input.kanaele.length === 0) {
      doc.fontSize(11).fillColor('#666').text('Keine Kanäle im Plan.').fillColor('black');
      return;
    }

    for (const aggregate of input.kanaele) {
      const kanal = aggregate.kanal;
      doc.moveDown(0.4);
      doc
        .fontSize(13)
        .fillColor('black')
        .text(`${kanal.sortIndex + 1}. ${kanal.name}`, { continued: false });

      doc.fontSize(10).fillColor('#444');
      doc.text(`Typ: ${describeDetails(kanal.details)}`);
      if (kanal.zweck) {
        doc.text(`Zweck: ${kanal.zweck}`);
      }
      doc.text(`Status: ${kanal.status}`);
      doc.fillColor('black');

      if (aggregate.zuordnungen.length === 0) {
        doc.fontSize(10).fillColor('#888').text('  — Keine Zuordnungen —').fillColor('black');
      } else {
        doc.fontSize(10);
        for (const zuordnung of aggregate.zuordnungen) {
          doc.text(`  • ${formatZuordnung(zuordnung)}`);
        }
      }
    }
  }

  private renderFooter(doc: PDFKit.PDFDocument, input: KanalplanPdfInput): void {
    doc.moveDown(1);
    const exportiertAm = format(input.exportiertAm, 'dd.MM.yyyy HH:mm', { locale: de });
    doc.fontSize(9).fillColor('#888').text(`Exportiert am ${exportiertAm}`, { align: 'right' });
    doc.fillColor('black');
  }
}

function describeDetails(details: KanalDetailsShape): string {
  switch (details.type) {
    case 'tmo': {
      const gssi = details.gssi ? ` (GSSI ${details.gssi})` : '';
      return `TMO ${details.sprechgruppe}${gssi}`;
    }
    case 'dmo': {
      const repeater = details.repeater ? ` · Repeater ${details.repeater}` : '';
      return `DMO Kanal ${details.dmoKanal}${repeater}`;
    }
    case 'analog': {
      const kanalnr = details.kanalnummer ? ` (${details.kanalnummer})` : '';
      return `Analog ${details.band} · ${details.frequenz}${kanalnr}`;
    }
    default:
      return 'Unbekannt';
  }
}

function formatZuordnung(zuordnung: FunkkanalZuordnung): string {
  return `${zuordnung.rufnameSnapshot} — ${zuordnung.rolle}`;
}
