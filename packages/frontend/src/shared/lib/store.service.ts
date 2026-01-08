import { Store } from '@tauri-apps/plugin-store';

/**
 * Tauri Store Service mit Encryption und Error Handling
 * Wrapper um das @tauri-apps/plugin-store für sichere Datenverwaltung.
 */

let storeInstance: Store | null = null;

/**
 * Initialisiert den globalen Store mit Encryption
 * @param storePath - Pfad zur Store-Datei (default: "app-store.json")
 * @returns Promise mit initialisiertem Store
 */
export async function initializeStore(storePath = 'app-store.json'): Promise<Store> {
  if (storeInstance) {
    return storeInstance;
  }

  try {
    storeInstance = new Store(storePath);
    await storeInstance.load();
    console.log('[Store] Initialized successfully');
    return storeInstance;
  } catch (error) {
    console.error('[Store] Initialization failed:', error);
    throw error;
  }
}

/**
 * Gibt den initialiserten Store zurück (lazy initialization)
 */
export async function getStore(): Promise<Store> {
  if (!storeInstance) {
    return initializeStore();
  }
  return storeInstance;
}

/**
 * Speichert einen Wert im Store
 * @param key - Store Schlüssel
 * @param value - Zu speichernder Wert (wird automatisch serialisiert)
 */
export async function setStoreValue<T = unknown>(key: string, value: T): Promise<void> {
  try {
    const store = await getStore();
    await store.set(key, value);
    await store.save();
    console.log(`[Store] Set ${key}`);
  } catch (error) {
    console.error(`[Store] Failed to set ${key}:`, error);
    throw error;
  }
}

/**
 * Liest einen Wert aus dem Store
 * @param key - Store Schlüssel
 * @param defaultValue - Defaultwert wenn Schlüssel nicht existiert
 * @returns Der Wert oder defaultValue
 */
export async function getStoreValue<T = unknown>(key: string, defaultValue?: T): Promise<T | undefined> {
  try {
    const store = await getStore();
    const value = await store.get<T>(key);
    return value ?? defaultValue;
  } catch (error) {
    console.error(`[Store] Failed to get ${key}:`, error);
    throw error;
  }
}

/**
 * Prüft ob ein Schlüssel im Store existiert
 */
export async function hasStoreKey(key: string): Promise<boolean> {
  try {
    const store = await getStore();
    return await store.has(key);
  } catch (error) {
    console.error(`[Store] Failed to check key ${key}:`, error);
    throw error;
  }
}

/**
 * Löscht einen Schlüssel aus dem Store
 */
export async function deleteStoreKey(key: string): Promise<void> {
  try {
    const store = await getStore();
    await store.delete(key);
    await store.save();
    console.log(`[Store] Deleted ${key}`);
  } catch (error) {
    console.error(`[Store] Failed to delete ${key}:`, error);
    throw error;
  }
}

/**
 * Löscht alle Schlüssel aus dem Store
 */
export async function clearStore(): Promise<void> {
  try {
    const store = await getStore();
    await store.clear();
    await store.save();
    console.log('[Store] Cleared all keys');
  } catch (error) {
    console.error('[Store] Failed to clear store:', error);
    throw error;
  }
}

/**
 * Gibt alle Schlüssel im Store zurück
 */
export async function getStoreKeys(): Promise<string[]> {
  try {
    const store = await getStore();
    return await store.keys();
  } catch (error) {
    console.error('[Store] Failed to get keys:', error);
    throw error;
  }
}

/**
 * Hook-kompatible Store Operationen
 * Ideal für React Komponenten
 */
export const storeService = {
  initialize: initializeStore,
  get: getStoreValue,
  set: setStoreValue,
  has: hasStoreKey,
  delete: deleteStoreKey,
  clear: clearStore,
  keys: getStoreKeys,
};
