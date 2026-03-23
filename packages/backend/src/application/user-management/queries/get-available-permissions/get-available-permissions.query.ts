/**
 * Query fuer das Abrufen aller verfuegbaren Permission-Patterns.
 *
 * CQRS Read-Only Query - keine State-Aenderungen, keine Events.
 * Gibt eine statische Liste der definierbaren Permission-Domains zurueck.
 */
export class GetAvailablePermissionsQuery {}
