import type { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';

/**
 * Eingabedaten für den Kanalplan-PDF-Export.
 */
export interface KanalplanPdfInput {
  readonly einsatzId: string;
  /** Anzeige-Name des Einsatzes (z. B. Einsatznummer oder Titel). */
  readonly einsatzName: string;
  /** Kanalplan inkl. Zuordnungen. */
  readonly kanaele: ReadonlyArray<FunkkanalAggregate>;
  /** Erzeugungszeitpunkt für die Fußzeile. */
  readonly exportiertAm: Date;
}

/**
 * Port: erzeugt ein PDF-Buffer für den Kanalplan-Export.
 *
 * Wird via DI-Token `FUNKKANAL_TOKENS.KANALPLAN_PDF_SERVICE` injiziert — das
 * Binding erfolgt im Funkkanal-Infrastructure-Modul.
 */
export interface IKanalplanPdfService {
  generate(input: KanalplanPdfInput): Promise<Buffer>;
}
