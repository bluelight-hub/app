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
