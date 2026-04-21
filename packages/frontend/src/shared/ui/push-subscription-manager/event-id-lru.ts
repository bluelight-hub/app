/**
 * LRU-Cache für bereits dispatchte `eventId`s (Story 1.2 AC5).
 *
 * Dedupliziert parallele Zustellung desselben Events über Web-Push + WebSocket,
 * damit der User keine Doppel-Banner sieht. Der Service-Worker selbst dedupt
 * bewusst NICHT — Background-Push muss immer ankommen (Architecture §B7).
 */

export const EVENT_ID_LRU_MAX_ENTRIES = 200;

/**
 * Insertion-Order basierter LRU (JavaScript Map behält Insert-Reihenfolge).
 *
 * `has()` re-inserted die ID nicht (read-only Check), damit echte Dubletten-Stoße
 * den Cache nicht verzerren. Bei `add()` wird bei Überlauf der älteste Eintrag
 * via `keys().next().value` evicted.
 */
export class EventIdLru {
  private readonly entries = new Map<string, true>();

  constructor(private readonly maxEntries: number = EVENT_ID_LRU_MAX_ENTRIES) {}

  has(id: string): boolean {
    return this.entries.has(id);
  }

  add(id: string): void {
    if (this.entries.has(id)) {
      return;
    }
    this.entries.set(id, true);
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) {
        this.entries.delete(oldest);
      }
    }
  }

  get size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }
}

/** Page-scoped Singleton — ein Cache pro Tab-Lifetime. */
export const eventIdLru = new EventIdLru();
