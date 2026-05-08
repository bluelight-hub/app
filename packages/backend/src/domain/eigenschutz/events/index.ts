/**
 * Barrel-Export für das Eigenschutz-Event-Framework (Story 1.7).
 *
 * Aktuell nur die abstrakte Basisklasse — konkrete Event-Klassen (siehe
 * Architecture §B13, 14 Einträge) ergänzen die Stories aus Epic 2–5, sobald
 * die jeweiligen fachlichen Features umgesetzt sind.
 */
export { EigenschutzDomainEvent } from './eigenschutz-domain-event';
export { GefaehrdungsbeurteilungErstelltEvent } from './gefaehrdungsbeurteilung-erstellt.event';
export { SicherheitsregelAusgerufenEvent } from './sicherheitsregel-ausgerufen.event';
export type { SicherheitsregelAusgerufenChangedFields, SicherheitsregelFieldKey } from './sicherheitsregel-ausgerufen.event';
export { SicherheitsregelQuittiertEvent } from './sicherheitsregel-quittiert.event';
export { PsaProfilGeaendertEvent } from './psa-profil-geaendert.event';
export type { PsaProfilAktion } from './psa-profil-geaendert.event';
export { QuittungAbgegebenEvent } from './quittung-abgegeben.event';
export { LueckeGemeldetEvent } from './luecke-gemeldet.event';
export { QuittungUeberfaelligEvent } from './quittung-ueberfaellig.event';
export { KonfliktErkanntEvent } from './konflikt-erkannt.event';
export type { SyncConflictEntityType } from './konflikt-erkannt.event';
export { KonfliktAufgeloestEvent } from './konflikt-aufgeloest.event';
export type { SyncConflictResolution } from './konflikt-aufgeloest.event';
export { SicherungspostenEingerichtetEvent } from './sicherungsposten-eingerichtet.event';
export { SicherungspostenAktualisiertEvent } from './sicherungsposten-aktualisiert.event';
export type { SicherungspostenAktualisiertChangedFields, SicherungspostenFieldKey } from './sicherungsposten-aktualisiert.event';
export { VorfallGemeldetEvent } from './vorfall-gemeldet.event';
export { VorfallExportiertEvent } from './vorfall-exportiert.event';
export type { VorfallExportFormat } from './vorfall-exportiert.event';
