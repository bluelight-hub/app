import type { IStoragePort } from '@/shared/types/storage';
import { getPlatform } from '@/shared/utils/platform';
import { TauriStorageAdapter } from './tauri-storage-adapter';
import { WebStorageAdapter } from './web-storage-adapter';

/**
 * Singleton Cache für den Storage-Adapter.
 *
 * Verhindert mehrfache Instanziierung und reduziert Overhead.
 */
let cachedAdapter: IStoragePort | null = null;

/**
 * Liefert den plattform-spezifischen Storage-Adapter (Singleton).
 *
 * Nutzt Platform Detection um automatisch zwischen Tauri Desktop
 * (`TauriStorageAdapter`) und Browser localStorage (`WebStorageAdapter`)
 * zu wählen. Die Instanz wird gecacht (Singleton Pattern).
 *
 * @returns {IStoragePort} - Plattform-spezifischer Storage-Adapter
 *
 * @example
 * ```typescript
 * const storage = getStorageAdapter();
 * await storage.setItem('token', 'abc123');
 * ```
 */
export function getStorageAdapter(): IStoragePort {
  if (!cachedAdapter) {
    const platform = getPlatform();
    cachedAdapter = platform === 'tauri' ? new TauriStorageAdapter() : new WebStorageAdapter();
  }
  return cachedAdapter;
}

/**
 * Setzt den Singleton zurück (nur für Tests).
 *
 * Invalidiert den gecachten Storage-Adapter, sodass der nächste
 * `getStorageAdapter()` Call eine neue Instanz erstellt. Dies ist
 * essentiell für Test-Isolation, um Platform-Switches zu ermöglichen.
 *
 * **Achtung:** Nur in Tests verwenden! Production Code sollte niemals
 * den Singleton zurücksetzen.
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   resetStorageAdapter(); // Singleton vor jedem Test zurücksetzen
 * });
 * ```
 */
export function resetStorageAdapter(): void {
  cachedAdapter = null;
}
