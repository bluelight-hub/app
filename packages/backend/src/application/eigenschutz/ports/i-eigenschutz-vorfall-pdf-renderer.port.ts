import type { EigenschutzVorfall } from '@domain/eigenschutz/aggregates/eigenschutz-vorfall.aggregate';

/**
 * Eingabedaten für den Eigenschutz-Vorfall-PDF-Export (Story 5.4).
 */
export interface EigenschutzVorfallPdfInput {
  /** Vollständig rekonstituiertes Aggregate (mit kontextSnapshot). */
  readonly vorfall: EigenschutzVorfall;
  /** Erzeugungs-Zeitpunkt für Footer + Dateiname. */
  readonly erzeugtAm: Date;
  /** UserId des Aufrufers (für PII-redacted Footer). */
  readonly erzeugtVonUserId: string;
}

/**
 * Port: erzeugt ein PDF-Buffer für den Eigenschutz-Vorfall-Export.
 *
 * Self-contained — arbeitet ausschließlich auf dem Aggregate-Snapshot,
 * keine Live-Joins (Architektur §B11 + §D B11↔B2).
 */
export interface IEigenschutzVorfallPdfRenderer {
  generate(input: EigenschutzVorfallPdfInput): Promise<Buffer>;
}
