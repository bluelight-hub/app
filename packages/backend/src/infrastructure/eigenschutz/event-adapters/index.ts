/**
 * Barrel-Export der lokalen Eigenschutz-Event-Adapter.
 *
 * Diese Datei dient ausschließlich dem Feature-Slice; die **globale**
 * Registry-Stelle 4 für den Event-Consumer-Validator ist
 * `infrastructure/events/adapters/index.ts`.
 */
export { EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter } from './gefaehrdungsbeurteilung-erstellt.adapter';
export { EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter } from './gefaehrdungsbeurteilung-aktualisiert.adapter';
