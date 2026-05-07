/**
 * Barrel-Export der lokalen Eigenschutz-Event-Adapter.
 *
 * Diese Datei dient ausschließlich dem Feature-Slice; die **globale**
 * Registry-Stelle 4 für den Event-Consumer-Validator ist
 * `infrastructure/events/adapters/index.ts`.
 */
export { EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter } from './gefaehrdungsbeurteilung-erstellt.adapter';
export { EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter } from './gefaehrdungsbeurteilung-aktualisiert.adapter';
export { EigenschutzSicherheitsregelAusgerufenEventAdapter } from './sicherheitsregel-ausgerufen.adapter';
export { EigenschutzSicherheitsregelQuittiertEventAdapter } from './sicherheitsregel-quittiert.adapter';
export { EigenschutzPsaProfilGeaendertEventAdapter } from './psa-profil-geaendert.adapter';
export { EigenschutzQuittungAbgegebenEventAdapter } from './psa-quittung-abgegeben.adapter';
export { EigenschutzLueckeGemeldetEventAdapter } from './luecke-gemeldet.adapter';
export { EigenschutzQuittungUeberfaelligEventAdapter } from './quittung-ueberfaellig.adapter';
export { EigenschutzKonfliktErkanntEventAdapter } from './konflikt-erkannt.adapter';
export { EigenschutzKonfliktAufgeloestEventAdapter } from './konflikt-aufgeloest.adapter';
export { EigenschutzSicherungspostenEingerichtetEventAdapter } from './sicherungsposten-eingerichtet.adapter';
export { EigenschutzSicherungspostenAktualisiertEventAdapter } from './sicherungsposten-aktualisiert.adapter';
export { EigenschutzVorfallGemeldetEventAdapter } from './vorfall-gemeldet.adapter';
