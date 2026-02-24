/**
 * Query zum Abrufen des aktuellen System-Gesundheitszustands.
 *
 * Parameterlose Query — gibt immer den aktuellen Snapshot zurueck.
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Aendert niemals Domain State
 * - Aggregation: Sammelt Metriken aus verschiedenen Quellen
 * - Result<T>: Kein Exception-Throwing fuer vorhersagbare Fehler
 *
 * @remarks Story 5.6 AC2
 */
export class GetSystemHealthQuery {}
