import { LazyStore } from '@tauri-apps/plugin-store';
import type { IStoragePort } from '@/shared/types/storage';

/**
 * Storage-Dateiname für Tauri Plugin Store.
 *
 * Wird im App-Data-Verzeichnis gespeichert:
 * - macOS: ~/Library/Application Support/<app-identifier>/
 * - Windows: %APPDATA%/<app-identifier>/
 * - Linux: ~/.config/<app-identifier>/
 */
const STORE_FILENAME = 'bluelight-storage.json';

/**
 * Tauri Storage Adapter für persistenten Storage-Zugriff.
 *
 * Implementiert IStoragePort Interface via tauri-plugin-store.
 * Nutzt LazyStore für verzögerte Initialisierung (lädt erst bei erstem Zugriff).
 *
 * WICHTIG: Daten sind PERSISTENT über App-Restarts!
 * Die Daten werden als JSON-Datei im App-Data-Verzeichnis gespeichert.
 *
 * @example
 * ```typescript
 * const storage = new TauriStorageAdapter();
 * await storage.setItem('user-token', 'abc123');
 * const token = await storage.getItem('user-token'); // 'abc123'
 * await storage.removeItem('user-token');
 * ```
 */
export class TauriStorageAdapter implements IStoragePort {
  /**
   * LazyStore Instanz - wird bei erstem Zugriff initialisiert.
   * autoSave: true sorgt für automatisches Speichern nach Änderungen.
   */
  private store = new LazyStore(STORE_FILENAME, { autoSave: true, defaults: {} });

  /**
   * Liest einen Wert aus dem persistenten Storage.
   *
   * @param key - Storage Key
   * @returns Promise mit Wert als String oder null wenn nicht vorhanden
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const result = await this.store.get<string>(key);
      return result ?? null;
    } catch (error) {
      console.error('[TauriStorageAdapter] getItem failed:', error);
      throw error;
    }
  }

  /**
   * Speichert einen Wert im persistenten Storage.
   *
   * @param key - Storage Key
   * @param value - Wert als String
   * @returns Promise wenn Operation abgeschlossen
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.store.set(key, value);
    } catch (error) {
      console.error('[TauriStorageAdapter] setItem failed:', error);
      throw error;
    }
  }

  /**
   * Entfernt einen Wert aus dem persistenten Storage.
   *
   * @param key - Storage Key
   * @returns Promise wenn Operation abgeschlossen
   */
  async removeItem(key: string): Promise<void> {
    try {
      await this.store.delete(key);
    } catch (error) {
      console.error('[TauriStorageAdapter] removeItem failed:', error);
      throw error;
    }
  }

  /**
   * Löscht alle Einträge aus dem Storage.
   *
   * @returns Promise wenn Operation abgeschlossen
   */
  async clear(): Promise<void> {
    try {
      await this.store.clear();
    } catch (error) {
      console.error('[TauriStorageAdapter] clear failed:', error);
      throw error;
    }
  }
}
