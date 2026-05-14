/**
 * Infrastructure Event Adapters - Barrel Export.
 *
 * Diese Adapters verbinden NestJS EventEmitter Framework mit
 * framework-agnostischen Application Layer Event Handlers.
 *
 * **Adapter Pattern:**
 * - Adapters verwenden @OnEvent Decorator (Framework-spezifisch)
 * - Delegieren an Application Handlers via IEventHandler (Framework-agnostisch)
 * - Ermöglichen Clean Architecture im Application Layer
 *
 * @module infrastructure/events/adapters
 */

export * from './etb-event.adapter';
export * from './lagekarte-event.adapter';
export * from './fahrzeug-erfasst-event.adapter';
export * from './fms-status-geaendert-event.adapter';
export * from './einsatz-person-hinzugefuegt-event.adapter';
export * from './person-fahrzeug-zuweisung-event.adapter';
export * from './rolle-besetzt-event.adapter';
export * from './rolle-freigegeben-event.adapter';
export * from './erinnerung-aktualisiert-event.adapter';
export * from './erinnerung-geloescht-event.adapter';
export * from './erinnerung-ausgeloest-event.adapter';
export * from './erinnerung-acknowledged-event.adapter';
export * from './erinnerung-websocket-event.adapter';
export * from './erinnerung-snoozed-event.adapter';
export * from './erinnerung-retriggered-event.adapter';
export * from './erinnerung-erledigt-event.adapter';
export * from './erinnerung-eskaliert-event.adapter';
export * from './erinnerung-intensiviert-event.adapter';
export * from './fuehrungsrhythmus-aktiviert-event.adapter';
export * from './notiz-erstellt-event.adapter';
export * from './notiz-aktualisiert-event.adapter';
export * from './notiz-geloescht-event.adapter';
export * from './kategorie-erstellt-event.adapter';
export * from './kategorie-geloescht-event.adapter';
export * from './befehl-event.adapter';
export * from './befehl-erstellt-etb-event.adapter';
export * from './befehl-quittiert-etb-event.adapter';
export * from './befehl-status-geaendert-etb-event.adapter';
export * from './befehl-zugestellt-etb-event.adapter';
export * from './rolle-geaendert-etb-event.adapter';
export * from './rolle-geaendert-websocket-event.adapter';
export * from './befehl-anonymisiert-etb-event.adapter';
export * from './befehl-geloescht-etb-event.adapter';
export * from './aufbewahrungs-konfiguration-geaendert-etb-event.adapter';
export * from './system-warnung-websocket-event.adapter';
export * from './system-warnung-etb-event.adapter';
export * from './einsatz-completed-etb-event.adapter';
export * from './gefahrenmatrix-aktualisiert-etb-event.adapter';
export * from './gefahrenmatrix-aktualisiert-broadcast.adapter';
export * from './einheit-erstellt-etb-event.adapter';
export * from './einheit-status-geaendert-etb-event.adapter';
export * from './person-zu-einheit-zugewiesen-etb-event.adapter';
export * from './person-von-einheit-entfernt-etb-event.adapter';
export * from './fahrzeug-einheit-zugewiesen-etb-event.adapter';
export * from './lagekarte-state-geaendert-websocket-event.adapter';
export * from './zeichen-event.adapter';
export * from './funkkanal-event.adapter';
export * from './gefahrenzone-event.adapter';
export * from './etb-funkspruch-broadcast-event.adapter';
export * from './notfall-funkspruch-alert-event.adapter';
export * from './alarmierung-event.adapter';
export * from './alarmierung-erstellt-etb-event.adapter';
export * from './alarmierung-empfaenger-hinzugefuegt-etb-event.adapter';
export * from './alarmierung-zeitpunkt-korrigiert-etb-event.adapter';
export * from './alarmierung-abgeschlossen-etb-event.adapter';
export * from './fms-alarmierung-zeitpunkt.adapter';
// Eigenschutz Events (Story 2.1+) — der Slug-Proxy re-exportiert den Feature-
// Slice-Adapter und wird von der Konsistenz-Spec `eigenschutz-event-registry.spec.ts`
// über das `./eigenschutz-…`-Import-Pattern als Registry-Stelle 4 gezählt.
export * from './eigenschutz-gefaehrdungsbeurteilung-erstellt-event.adapter';
export * from './eigenschutz-gefaehrdungsbeurteilung-aktualisiert-event.adapter';
export * from './eigenschutz-sicherheitsregel-ausgerufen-event.adapter';
export * from './eigenschutz-sicherheitsregel-quittiert-event.adapter';
export * from './eigenschutz-psa-profil-geaendert-event.adapter';
export * from './eigenschutz-quittung-abgegeben-event.adapter';
export * from './eigenschutz-luecke-gemeldet-event.adapter';
export * from './eigenschutz-quittung-ueberfaellig-event.adapter';
export * from './eigenschutz-konflikt-erkannt-event.adapter';
export * from './eigenschutz-konflikt-aufgeloest-event.adapter';
export * from './eigenschutz-sicherungsposten-eingerichtet-event.adapter';
export * from './eigenschutz-sicherungsposten-aktualisiert-event.adapter';
export * from './eigenschutz-vorfall-gemeldet-event.adapter';
export * from './eigenschutz-vorfall-geschlossen-event.adapter';
export * from './eigenschutz-vorfall-exportiert-event.adapter';

// Eigenschutz → ETB Adapters (Issue 415)
export * from './eigenschutz-gefaehrdungsbeurteilung-erstellt-etb-event.adapter';
export * from './eigenschutz-gefaehrdungsbeurteilung-aktualisiert-etb-event.adapter';
export * from './eigenschutz-sicherheitsregel-ausgerufen-etb-event.adapter';
export * from './eigenschutz-sicherheitsregel-quittiert-etb-event.adapter';
export * from './eigenschutz-psa-profil-geaendert-etb-event.adapter';
export * from './eigenschutz-quittung-abgegeben-etb-event.adapter';
export * from './eigenschutz-luecke-gemeldet-etb-event.adapter';
export * from './eigenschutz-quittung-ueberfaellig-etb-event.adapter';
export * from './eigenschutz-sicherungsposten-eingerichtet-etb-event.adapter';
export * from './eigenschutz-sicherungsposten-aktualisiert-etb-event.adapter';
export * from './eigenschutz-vorfall-gemeldet-etb-event.adapter';
export * from './eigenschutz-vorfall-exportiert-etb-event.adapter';
export * from './eigenschutz-konflikt-erkannt-etb-event.adapter';
export * from './eigenschutz-konflikt-aufgeloest-etb-event.adapter';
