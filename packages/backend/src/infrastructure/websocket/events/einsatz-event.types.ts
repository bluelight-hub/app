/**
 * Typen für den einsatzgebundenen WebSocket-Broadcast (Issue #407, Task 18).
 *
 * Das Gateway verwaltet einen Room pro Einsatz (`einsatz:{id}`) und broadcastet
 * sowohl Funkkanal- als auch ETB-Funkspruch-Events an alle verbundenen Clients
 * dieses Rooms.
 *
 * @module infrastructure/websocket/events
 */

/**
 * Stabile Channel-Namen aller einsatzgebundenen Broadcast-Events.
 *
 * Konvention: `<bereich>:<aktion>` (lowercase, kebab-case).
 */
export type EinsatzEventName =
  | 'etb:eintrag-erstellt'
  | 'etb:eintrag-korrigiert'
  | 'funkkanal:erstellt'
  | 'funkkanal:geaendert'
  | 'funkkanal:archiviert'
  | 'funkkanal:reihenfolge-geaendert'
  | 'funkkanal:zuordnung-erstellt'
  | 'funkkanal:zuordnung-entfernt'
  | 'funk:notfall-alert';

/**
 * Port für den einsatzgebundenen WebSocket-Publisher.
 *
 * - `broadcast(einsatzId, ...)` — direkter Broadcast an `einsatz:{id}`.
 * - `broadcastByEtb(etbId, ...)` — resolved zuerst etbId → einsatzId und
 *   broadcastet anschließend in den passenden Einsatz-Room. Wird vom
 *   `EtbFunkspruchBroadcastAdapter` verwendet, da `EintragAddedEvent`
 *   und `EintragKorrigiertEvent` nur die etbId tragen.
 */
export interface IEinsatzEventPublisher {
  broadcast(einsatzId: string, channel: EinsatzEventName, payload: Record<string, unknown>): Promise<void>;
  broadcastByEtb(etbId: string, channel: EinsatzEventName, payload: Record<string, unknown>): Promise<void>;
}
