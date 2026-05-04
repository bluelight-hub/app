import type { PushPayload } from './push-payload';

/**
 * Domain-Port für Plattform-Push-Notifications (Story 3.8 / ADR-011).
 *
 * Wird von feature-spezifischen Event-Handlern (z. B. Eigenschutz
 * `EmitCriticalPushOnPsaProfilGeaendertHandler`) konsumiert; die einzige
 * Implementierung lebt in `infrastructure/push-notifications/` und wird via
 * `useExisting`-Token gebunden.
 *
 * **Fire-and-Forget-Semantik** (übernommen aus Story 1.1): At-Least-Once-
 * Zustellung läuft über die Outbox des aufrufenden Handlers (im Eigenschutz-
 * Pfad ist das die `PsaProfilGeaendert`-Outbox-Row). Client-Dedup via
 * `eventId`-LRU (Story 1.2). Der Service-Aufruf darf weder werfen noch
 * Handler-`Result.fail` produzieren — Fehler werden im Service strukturiert
 * geloggt.
 */
export interface IPushNotificationService {
  /**
   * Sendet `payload` an alle Push-Subscriptions des Users. Implementiert
   * Fan-Out (mehrere Geräte), 410/404-Aufräumen und VAPID-Signing.
   */
  send(userId: string, payload: PushPayload): Promise<void>;
}
