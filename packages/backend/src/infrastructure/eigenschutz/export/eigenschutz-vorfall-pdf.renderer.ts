import { Inject, Injectable, Optional } from '@nestjs/common';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import PDFDocument from 'pdfkit';
import type { EigenschutzVorfallPdfInput, IEigenschutzVorfallPdfRenderer } from '@/application/eigenschutz/ports/i-eigenschutz-vorfall-pdf-renderer.port';
import type { EigenschutzVorfall } from '@domain/eigenschutz/aggregates/eigenschutz-vorfall.aggregate';
import type { BeteiligterProps } from '@domain/eigenschutz/value-objects/beteiligter.vo';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * Konstruktor-Optionen für den PDF-Renderer (Story 5.4 AC2).
 *
 * `compress: false` ist ausschließlich für Renderer-Specs gedacht — String-
 * Substring-Asserts laufen dann gegen den uncompressed Stream. Production
 * verwendet immer den Default `compress: true`.
 */
export interface EigenschutzVorfallPdfRendererOptions {
  readonly compress?: boolean;
}

const REDACT_LENGTH = 8;

/**
 * pdfkit-basierte Implementierung des `IEigenschutzVorfallPdfRenderer`
 * (Story 5.4, FR34/AR13).
 *
 * Self-contained: liest ausschließlich aus dem Aggregate + dem darin
 * eingebetteten `kontextSnapshot`. Keine Live-Joins, keine Repository-
 * Aufrufe, keine I/O.
 *
 * **PII-Hygiene:** alle technischen Identifier (User-IDs, Einsatz-ID,
 * Vorfall-ID) werden via `redactId(id, 8)` redacted und niemals klar
 * geschrieben. Klar-Personennamen aus dem Freitext-Pfad der Beteiligten
 * (`kind: 'freitext'`, `name`/`rolle`) sind als Bestandteil des Unfallkassen-
 * Pflichtformats erlaubt und werden bewusst klar gerendert (PO-Decision
 * Code-Review 2026-05-07, D2). Eingaben sind vom Aggregate validiert.
 */
@Injectable()
export class EigenschutzVorfallPdfRenderer implements IEigenschutzVorfallPdfRenderer {
  constructor(
    @Optional() private readonly options: EigenschutzVorfallPdfRendererOptions = {},
    @Optional() @Inject(LOGGER) private readonly logger?: ILogger,
  ) {}

  generate(input: EigenschutzVorfallPdfInput): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const compress = this.options.compress ?? true;
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ size: 'A4', margin: 50, compress });

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        this.renderHeader(doc, input);
        this.renderVorfallMetadaten(doc, input.vorfall);
        this.renderSnapshotHeader(doc, input.vorfall.kontextSnapshot);
        this.renderGefaehrdungsblock(doc, input.vorfall.kontextSnapshot);
        this.renderPsaProfilBlock(doc, input.vorfall.kontextSnapshot);
        this.renderSicherheitsregelnBlock(doc, input.vorfall.kontextSnapshot);
        this.renderFooter(doc, input);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private renderHeader(doc: PDFKit.PDFDocument, input: EigenschutzVorfallPdfInput): void {
    const einsatzRedact = safeRedact(input.vorfall.einsatzId);
    const vorfallRedact = safeRedact(input.vorfall.id.value);
    doc.fontSize(18).fillColor('black').text('Vorfall-Meldung Eigenschutz', { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#666').text(`Einsatz ${einsatzRedact} · Vorfall ${vorfallRedact}`);
    doc.fillColor('black');
    doc.moveDown(0.6);
  }

  private renderVorfallMetadaten(doc: PDFKit.PDFDocument, vorfall: EigenschutzVorfall): void {
    doc.fontSize(12).fillColor('black').text('Vorfall-Daten', { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(10);
    doc.text(`Wann (gemeldet): ${formatDateTime(vorfall.wann)}`);
    doc.text(`Vorfallzeit: ${formatDateTime(vorfall.vorfallZeit)}`);
    doc.text(`Wo: ${formatWo(vorfall)}`);
    doc.text(`Was: ${vorfall.was}`);
    if (vorfall.massnahmen && vorfall.massnahmen.trim().length > 0) {
      doc.text(`Maßnahmen: ${vorfall.massnahmen}`);
    } else {
      doc.text('Maßnahmen: —');
    }
    doc.text(`Unfallkasse-relevant: ${vorfall.unfallkasseRelevant ? 'ja' : 'nein'}`);
    doc.text(`Erfasst durch: Nutzer-ID ${safeRedact(vorfall.erfasstVonUserId)}`);

    doc.moveDown(0.2);
    doc.text('Beteiligte:');
    const beteiligte = vorfall.beteiligte;
    if (beteiligte.length === 0) {
      doc.fillColor('#666').text('  • Keine Beteiligten erfasst.').fillColor('black');
    } else {
      for (const entry of beteiligte) {
        doc.text(`  • ${formatBeteiligter(entry)}`);
      }
    }
    doc.moveDown(0.6);
  }

  private renderSnapshotHeader(doc: PDFKit.PDFDocument, snapshot: Record<string, unknown>): void {
    if (isEmptySnapshot(snapshot)) {
      doc.fontSize(14).fillColor('black').text('Kontext-Snapshot', { underline: true });
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor('#666').text('Kontext-Snapshot nicht verfügbar (Vorfall vor Story 5.2 erfasst).');
      doc.fillColor('black');
      doc.moveDown(0.6);
      return;
    }

    const snapshotAt = readString(snapshot.snapshotAt);
    const heading = snapshotAt ? `Stand zum Vorfall-Zeitpunkt: ${formatDateTimeFromIso(snapshotAt)}` : 'Stand zum Vorfall-Zeitpunkt';
    doc.fontSize(14).fillColor('black').text(heading, { underline: true });
    doc.moveDown(0.4);
  }

  private renderGefaehrdungsblock(doc: PDFKit.PDFDocument, snapshot: Record<string, unknown>): void {
    if (isEmptySnapshot(snapshot)) return;
    doc.fontSize(12).fillColor('black').text('Gefährdungsbeurteilung (zum Vorfall-Zeitpunkt)');
    doc.fontSize(10);
    const gefRaw = snapshot.gefaehrdungsbeurteilung;
    if (gefRaw !== undefined && (gefRaw === null || typeof gefRaw !== 'object' || Array.isArray(gefRaw))) {
      this.logger?.warn?.('EigenschutzVorfallPdfRenderer: gefaehrdungsbeurteilung hat unerwartete Form — Schema-Drift erkannt');
      doc.fillColor('#a00').text('  Gefährdungsbeurteilung: Daten-Format nicht lesbar (Schema-Drift)').fillColor('black');
      doc.moveDown(0.4);
      return;
    }
    const gef = gefRaw as Record<string, unknown> | undefined;
    if (!gef) {
      doc.fillColor('#666').text('  Keine Gefährdungsbeurteilung im Snapshot.').fillColor('black');
      doc.moveDown(0.4);
      return;
    }
    if (gef.items !== undefined && !Array.isArray(gef.items)) {
      this.logger?.warn?.('EigenschutzVorfallPdfRenderer: gefaehrdungsbeurteilung.items ist kein Array — Schema-Drift erkannt');
      doc.fillColor('#a00').text('  Gefährdungs-Items: Daten-Format nicht lesbar (Schema-Drift)').fillColor('black');
      doc.moveDown(0.4);
      return;
    }
    const items = Array.isArray(gef.items) ? (gef.items as ReadonlyArray<Record<string, unknown>>) : [];
    if (items.length === 0) {
      doc.fillColor('#666').text('  Keine Gefährdungs-Items im Snapshot.').fillColor('black');
      doc.moveDown(0.4);
      return;
    }
    for (const item of items) {
      const title = readString(item.title) ?? '(ohne Titel)';
      doc.fillColor('black').text(`• ${title}`);
      const description = readString(item.description);
      if (description) doc.fillColor('#444').text(`    ${description}`).fillColor('black');
      const eintritt = readString(item.eintritt);
      const schaden = readString(item.schaden);
      const risikoklasse = readString(item.risikoklasse);
      const risikoLine = [eintritt ? `Eintritt: ${eintritt}` : null, schaden ? `Schaden: ${schaden}` : null, risikoklasse ? `Risikoklasse: ${risikoklasse}` : null].filter(
        (v): v is string => v !== null,
      );
      if (risikoLine.length > 0)
        doc
          .fillColor('#444')
          .text(`    ${risikoLine.join(' · ')}`)
          .fillColor('black');
      const massnahmen = readString(item.schutzmassnahmen);
      if (massnahmen) doc.fillColor('#444').text(`    Schutzmaßnahmen: ${massnahmen}`).fillColor('black');
    }
    doc.moveDown(0.4);
  }

  private renderPsaProfilBlock(doc: PDFKit.PDFDocument, snapshot: Record<string, unknown>): void {
    if (isEmptySnapshot(snapshot)) return;
    doc.fontSize(12).fillColor('black').text('Aktive PSA-Profile waren');
    doc.fontSize(10);
    const profile = snapshot.aktivePsaProfile;
    if (profile !== undefined && !Array.isArray(profile)) {
      // Defense-in-Depth: Schema-Drift in DB-JSONB darf den PDF-Pfad nicht killen.
      this.logger?.warn?.('EigenschutzVorfallPdfRenderer: aktivePsaProfile ist kein Array — Schema-Drift erkannt');
      doc.fillColor('#a00').text('  PSA-Profile: Daten-Format nicht lesbar (Schema-Drift)').fillColor('black');
      doc.moveDown(0.4);
      return;
    }
    const list = Array.isArray(profile) ? (profile as ReadonlyArray<Record<string, unknown>>) : [];
    if (list.length === 0) {
      doc.fillColor('#666').text('  Keine aktiven PSA-Profile im Snapshot.').fillColor('black');
      doc.moveDown(0.4);
      return;
    }
    for (const entry of list) {
      const name = readString(entry.profil) ?? '(unbekannt)';
      const gueltigVon = readString(entry.gueltigVon);
      const seit = gueltigVon ? formatDateTimeFromIso(gueltigVon) : '—';
      doc.fillColor('black').text(`• Profil ${name} · seit ${seit}`);
    }
    doc.moveDown(0.4);
  }

  private renderSicherheitsregelnBlock(doc: PDFKit.PDFDocument, snapshot: Record<string, unknown>): void {
    if (isEmptySnapshot(snapshot)) return;
    doc.fontSize(12).fillColor('black').text('Sicherheitsregeln (zugewiesen zum Vorfall-Zeitpunkt)');
    doc.fontSize(10);
    const regeln = snapshot.sicherheitsregeln;
    if (regeln !== undefined && !Array.isArray(regeln)) {
      this.logger?.warn?.('EigenschutzVorfallPdfRenderer: sicherheitsregeln ist kein Array — Schema-Drift erkannt');
      doc.fillColor('#a00').text('  Sicherheitsregeln: Daten-Format nicht lesbar (Schema-Drift)').fillColor('black');
      doc.moveDown(0.4);
      return;
    }
    const list = Array.isArray(regeln) ? (regeln as ReadonlyArray<Record<string, unknown>>) : [];
    if (list.length === 0) {
      doc.fillColor('#666').text('  Keine zugeordneten Sicherheitsregeln im Snapshot.').fillColor('black');
      doc.moveDown(0.4);
      return;
    }
    for (const regel of list) {
      const titel = readString(regel.titel) ?? '(ohne Titel)';
      doc.fillColor('black').text(`• ${titel}`);
      const inhalt = readString(regel.inhalt);
      if (inhalt) {
        const trimmed = inhalt.length > 200 ? `${inhalt.slice(0, 200)}…` : inhalt;
        doc.fillColor('#444').text(`    ${trimmed}`).fillColor('black');
      }
      // Quittungspflicht ist nicht direkt im V1-Schema — `einsatzweit === false`
      // entspricht einer einheitsspezifischen Zuweisung (faktisch Quittungspflicht
      // im Eigenschutz-Kontext). Default-Annahme: jede zugewiesene Regel ist
      // quittungspflichtig. Disclaimer am Block-Ende klärt das gegenüber der
      // Unfallkasse (PO-Decision Code-Review 2026-05-07, D1).
      const einsatzweit = typeof regel.einsatzweit === 'boolean' ? (regel.einsatzweit as boolean) : false;
      doc
        .fillColor('#444')
        .text(`    Quittungspflicht: ${einsatzweit ? 'nein (einsatzweit)' : 'ja'}`)
        .fillColor('black');
    }
    doc.moveDown(0.2);
    doc
      .fontSize(8)
      .fillColor('#888')
      .text(
        'Hinweis: Der Quittungspflicht-Marker ist aus dem Geltungsbereich der Regel ' +
          'abgeleitet (einsatzweit ⇒ keine Einzelquittung) und stellt keine verbindliche ' +
          'Compliance-Aussage dar. Maßgeblich ist der jeweilige Regel-Versionsstand zum ' +
          'Vorfall-Zeitpunkt.',
      )
      .fillColor('black')
      .fontSize(10);
    doc.moveDown(0.4);
  }

  private renderFooter(doc: PDFKit.PDFDocument, input: EigenschutzVorfallPdfInput): void {
    doc.moveDown(1);
    const erzeugtAm = formatDateTime(input.erzeugtAm);
    const callerRedact = safeRedact(input.erzeugtVonUserId);
    const einsatzRedact = safeRedact(input.vorfall.einsatzId);
    doc.fontSize(9).fillColor('#888').text(`Erzeugt am ${erzeugtAm} durch Nutzer-ID ${callerRedact} · Permission eigenschutz:vorfall:export · Einsatz ${einsatzRedact}`, {
      align: 'left',
    });
    doc.fillColor('black');
  }
}

function safeRedact(id: string | null | undefined): string {
  return redactId(id, REDACT_LENGTH) ?? '—';
}

function formatDateTime(date: Date): string {
  return format(date, 'dd.MM.yyyy HH:mm', { locale: de });
}

function formatDateTimeFromIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return formatDateTime(date);
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function isEmptySnapshot(snapshot: Record<string, unknown> | null | undefined): boolean {
  if (!snapshot || typeof snapshot !== 'object') return true;
  return Object.keys(snapshot).length === 0;
}

function formatWo(vorfall: EigenschutzVorfall): string {
  const wo = vorfall.wo;
  if (wo === null) return '—';
  const props = wo.toJSON();
  if (props.kind === 'coordinate') {
    const lat = props.latitude.toFixed(5);
    const lon = props.longitude.toFixed(5);
    const hint = props.addressHint ? ` (${props.addressHint})` : '';
    return `Lat: ${lat}, Lon: ${lon}${hint}`;
  }
  return props.text;
}

function formatBeteiligter(entry: BeteiligterProps): string {
  if (entry.kind === 'user') {
    const rolle = entry.rolle ? ` (${entry.rolle})` : '';
    return `Nutzer-ID ${safeRedact(entry.userId)}${rolle}`;
  }
  const rolle = entry.rolle ? ` (${entry.rolle})` : '';
  return `${entry.name}${rolle}`;
}
