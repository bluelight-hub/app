/**
 * Payload-Vertrag für Plattform-Push-Notifications (Story 1.1, ADR-011).
 *
 * Die `eventId` ist Pflicht, damit Clients doppelte Zustellungen (Server dedupt
 * laut Architecture §B7 nicht) via LRU-Cache dedupen können.
 *
 * @see ../../domain/push-notifications/push-subscription.entity.ts
 */
export interface PushPayload {
  /** Stabile ID des auslösenden Events (Client-Dedup-Schlüssel, NFR-R3). */
  readonly eventId: string;
  /** Kurze Überschrift, wird als Browser-Notification-Title angezeigt. */
  readonly title: string;
  /** Nachrichtentext der Notification. */
  readonly body: string;
  /** Optionaler Vertiefungs-Link (Deep-Link) für den Client. */
  readonly url?: string;
  /** Zusätzliche frei nutzbare Metadaten. */
  readonly data?: Record<string, unknown>;
}
