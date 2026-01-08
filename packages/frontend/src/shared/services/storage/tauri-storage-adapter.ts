import { invoke } from '@tauri-apps/api/core';
import type { IStoragePort } from '@/shared/types/storage';

/**
 * Tauri Storage Adapter für platform-agnostischen Storage-Zugriff
 *
 * Implementiert IStoragePort Interface via Tauri IPC Commands.
 * Nutzt Rust-Backend für In-Memory Key-Value Storage mit Mutex-basiertem State.
 *
 * WICHTIG: Daten sind NICHT persistent über App-Restarts (RAM only).
 * Für persistente Daten muss tauri-plugin-store genutzt werden.
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
   * Liest einen Wert aus dem Storage.
   *
   * Ruft Rust Command `storage_get` via Tauri IPC.
   *
   * @param key - Storage Key
   * @returns Promise mit Wert als String oder null wenn nicht vorhanden
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const result = await invoke<string | null>('storage_get', { key });
      return result ?? null;
    } catch (error) {
      console.error('[TauriStorageAdapter] getItem failed:', error);
      return null;
    }
  }

  /**
   * Speichert einen Wert im Storage.
   *
   * Ruft Rust Command `storage_set` via Tauri IPC.
   *
   * @param key - Storage Key
   * @param value - Wert als String
   * @returns Promise wenn Operation abgeschlossen
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await invoke<void>('storage_set', { key, value });
    } catch (error) {
      console.error('[TauriStorageAdapter] setItem failed:', error);
      throw error;
    }
  }

  /**
   * Entfernt einen Wert aus dem Storage.
   *
   * Ruft Rust Command `storage_remove` via Tauri IPC.
   *
   * @param key - Storage Key
   * @returns Promise wenn Operation abgeschlossen
   */
  async removeItem(key: string): Promise<void> {
    try {
      await invoke<boolean>('storage_remove', { key });
    } catch (error) {
      console.error('[TauriStorageAdapter] removeItem failed:', error);
      throw error;
    }
  }

  /**
   * Löscht alle Einträge aus dem Storage.
   *
   * Ruft Rust Command `storage_clear` via Tauri IPC.
   *
   * @returns Promise wenn Operation abgeschlossen
   */
  async clear(): Promise<void> {
    try {
      await invoke<void>('storage_clear');
    } catch (error) {
      console.error('[TauriStorageAdapter] clear failed:', error);
      throw error;
    }
  }
}
