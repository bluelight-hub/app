/**
 * Storage Port Interface für Platform-agnostischen Datenzugriff
 *
 * Definiert einen abstrakten Contract für Key-Value Storage,
 * der sowohl von Tauri (Tauri Store Plugin) als auch von Web
 * (localStorage/sessionStorage) implementiert werden kann.
 *
 * @example
 * ```typescript
 * const storage: IStoragePort = getTauriStorage();
 * await storage.setItem('user-token', 'abc123');
 * const token = await storage.getItem('user-token');
 * ```
 */
export interface IStoragePort {
  /**
   * Liest einen Wert aus dem Storage.
   *
   * @param key - Storage Key
   * @returns Promise mit Wert als String oder null wenn nicht vorhanden
   */
  getItem(key: string): Promise<string | null>;

  /**
   * Speichert einen Wert im Storage.
   *
   * @param key - Storage Key
   * @param value - Wert als String
   * @returns Promise wenn Operation abgeschlossen
   */
  setItem(key: string, value: string): Promise<void>;

  /**
   * Entfernt einen Wert aus dem Storage.
   *
   * @param key - Storage Key
   * @returns Promise wenn Operation abgeschlossen
   */
  removeItem(key: string): Promise<void>;

  /**
   * Löscht alle Einträge aus dem Storage.
   *
   * @returns Promise wenn Operation abgeschlossen
   */
  clear(): Promise<void>;
}
