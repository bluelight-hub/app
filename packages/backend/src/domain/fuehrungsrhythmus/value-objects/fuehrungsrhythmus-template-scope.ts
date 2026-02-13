/**
 * Scope eines Fuehrungsrhythmus-Templates.
 * Bestimmt die Sichtbarkeit und den Geltungsbereich.
 *
 * - EINSATZ: Nur fuer einen spezifischen Einsatz gueltig (erfordert einsatzId)
 * - GLOBAL: Organisationsweit verfuegbar, im Admin-Panel verwaltbar
 */
export enum FuehrungsrhythmusTemplateScope {
  /** Nur fuer einen spezifischen Einsatz */
  EINSATZ = 'EINSATZ',
  /** Organisationsweit verfuegbar */
  GLOBAL = 'GLOBAL',
}
