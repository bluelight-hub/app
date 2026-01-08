import type { IStoragePort } from './storage.interface';

/**
 * Wrapper-Struktur für localStorage-Einträge.
 *
 * Markiert Daten als unsicher (Browser localStorage ist kein verschlüsselter Speicher).
 */
interface StorageWrapper {
  data: string;
  storageType: 'insecure';
}

/**
 * Web Storage Adapter - Browser localStorage Fallback.
 *
 * Nutzt `window.localStorage` als unsicheren Fallback-Speicher für Browser-Umgebungen.
 * Alle Daten werden mit Security-Flag `storageType: 'insecure'` markiert.
 *
 * **Warum async-wrapped:**
 * - Interface-Kompatibilität mit Tauri Store (async API)
 * - Ermöglicht einheitliche Nutzung beider Adapter ohne Conditional Branching
 *
 * **Warum Security-Flag:**
 * - Warnung für Entwickler: localStorage ist unverschlüsselt
 * - Spätere Migration zu verschlüsselten Storage ermöglichen
 * - Audit-Trail für Sicherheits-Reviews
 *
 * @example
 * ```typescript
 * const adapter = new WebStorageAdapter();
 * await adapter.setItem('auth-token', 'xyz123');
 * const token = await adapter.getItem('auth-token'); // 'xyz123'
 * ```
 */
export class WebStorageAdapter implements IStoragePort {
  /**
   * Ruft einen Wert aus localStorage ab.
   *
   * Parst gespeicherte Wrapper-Struktur und extrahiert `data`-Feld.
   * Fehlerhafte oder fehlende Daten werden als `null` zurückgegeben.
   *
   * @param key - Storage Key
   * @returns Promise mit Wert oder `null` wenn nicht gefunden
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as StorageWrapper;
      return parsed.data ?? null;
    } catch (error) {
      console.error('[WebStorageAdapter] getItem failed:', error);
      return null;
    }
  }

  /**
   * Speichert einen Wert in localStorage.
   *
   * Wraps Daten mit Security-Flag `storageType: 'insecure'` um Entwickler
   * auf unverschlüsselte Speicherung hinzuweisen.
   *
   * @param key - Storage Key
   * @param value - Zu speichernder Wert
   * @throws Error bei QuotaExceededError (Storage voll)
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      const wrapped: StorageWrapper = {
        data: value,
        storageType: 'insecure',
      };
      window.localStorage.setItem(key, JSON.stringify(wrapped));
    } catch (error) {
      console.error('[WebStorageAdapter] setItem failed:', error);
      throw error; // QuotaExceededError ist wertvoll für Caller
    }
  }

  /**
   * Entfernt einen Eintrag aus localStorage.
   *
   * Wirft keine Exception bei nicht-existierenden Keys.
   *
   * @param key - Storage Key
   */
  async removeItem(key: string): Promise<void> {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error('[WebStorageAdapter] removeItem failed:', error);
      // Silent fail - removeItem sollte idempotent sein
    }
  }

  /**
   * Löscht alle Einträge aus localStorage.
   *
   * **Warnung:** Löscht auch Daten anderer Apps auf gleicher Domain!
   */
  async clear(): Promise<void> {
    try {
      window.localStorage.clear();
    } catch (error) {
      console.error('[WebStorageAdapter] clear failed:', error);
    }
  }
}
