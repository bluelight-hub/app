import type { EigenschutzVorfall } from '@domain/eigenschutz/aggregates/eigenschutz-vorfall.aggregate';

/**
 * Eingabedaten für den Eigenschutz-Vorfall-JSON-Export (Story 5.5, FR35).
 */
export interface EigenschutzVorfallJsonInput {
  /** Vollständig rekonstituiertes Aggregate (mit kontextSnapshot). */
  readonly vorfall: EigenschutzVorfall;
  /** Erzeugungs-Zeitpunkt für den `exportedAt`-Metadaten-Block. */
  readonly erzeugtAm: Date;
  /** UserId des Aufrufers (für den `exportedByUserId`-Metadaten-Block). */
  readonly erzeugtVonUserId: string;
}

/**
 * Port: erzeugt einen UTF-8-`Buffer` mit dem `EigenschutzVorfallExportV1`-
 * konformen JSON-Body (Story 5.5, FR35).
 *
 * Self-contained — arbeitet ausschließlich auf dem Aggregate-Snapshot,
 * keine Live-Joins (Architektur §B11 + §D B11↔B2).
 */
export interface IEigenschutzVorfallJsonRenderer {
  generate(input: EigenschutzVorfallJsonInput): Promise<Buffer>;
}
