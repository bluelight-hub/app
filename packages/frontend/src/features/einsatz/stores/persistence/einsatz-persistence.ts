/**
 * Persistierungs-Layer für aktiven Einsatz
 *
 * Verwaltet die localStorage-Persistierung des aktiven Einsatzes
 * und Cross-Tab-Synchronisation
 */
import { serverStore } from '@/features/server/stores/server.store';

// Constants
const STORAGE_NAMESPACE = 'bluelight-hub';
const STORAGE_KEY = 'activeEinsatzId';
const STORAGE_EVENT_KEY = 'activeEinsatzSync';
const WORKSPACE_HREF_KEY_PREFIX = 'einsatzWorkspaceHref:';

interface PersistenceScopeOptions {
  serverId?: string | null;
}

function resolveServerId(options?: PersistenceScopeOptions): string | null {
  if (options && 'serverId' in options) {
    return options.serverId ?? null;
  }

  return serverStore.state.activeServerId;
}

function buildScopedStorageKey(baseKey: string, serverId: string | null): string {
  return serverId ? `${STORAGE_NAMESPACE}:${serverId}:${baseKey}` : baseKey;
}

function getActiveEinsatzStorageKey(options?: PersistenceScopeOptions): string {
  return buildScopedStorageKey(STORAGE_KEY, resolveServerId(options));
}

function getWorkspaceHrefStorageKey(einsatzId: string, options?: PersistenceScopeOptions): string {
  return buildScopedStorageKey(`${WORKSPACE_HREF_KEY_PREFIX}${einsatzId}`, resolveServerId(options));
}

function dispatchActiveEinsatzSync(newValue: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORAGE_EVENT_KEY,
        newValue,
      }),
    );
  } catch {
    window.dispatchEvent(new Event('storage'));
  }
}

function loadScopedValue(storageKey: string, legacyKey: string, options?: PersistenceScopeOptions): string | null {
  const scopedValue = localStorage.getItem(storageKey);
  if (scopedValue) {
    return scopedValue;
  }

  const serverId = resolveServerId(options);
  if (serverId) {
    return null;
  }

  return localStorage.getItem(legacyKey);
}

/**
 * Speichert die aktive Einsatz-ID im localStorage
 *
 * @param id - Die zu speichernde Einsatz-ID oder null zum Löschen
 */
export function saveActiveEinsatzId(id: string | null, options?: PersistenceScopeOptions): void {
  try {
    const storageKey = getActiveEinsatzStorageKey(options);

    if (id === null) {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(STORAGE_KEY);
      dispatchActiveEinsatzSync(null);
    } else {
      localStorage.setItem(storageKey, id);

      if (resolveServerId(options)) {
        localStorage.removeItem(STORAGE_KEY);
      }

      dispatchActiveEinsatzSync(id);
    }
  } catch (error) {
    // Silent fail bei localStorage-Problemen (z.B. Private Mode)
    console.error('Failed to save active Einsatz ID to localStorage:', error);
  }
}

/**
 * Lädt die aktive Einsatz-ID aus dem localStorage
 *
 * @returns Die gespeicherte Einsatz-ID oder null
 */
export function loadActiveEinsatzId(options?: PersistenceScopeOptions): string | null {
  try {
    const storedId = loadScopedValue(getActiveEinsatzStorageKey(options), STORAGE_KEY, options);
    return storedId || null;
  } catch (error) {
    // Silent fail bei localStorage-Problemen
    console.error('Failed to load active Einsatz ID from localStorage:', error);
    return null;
  }
}

/**
 * Löscht die aktive Einsatz-ID aus dem localStorage
 */
export function clearActiveEinsatz(options?: PersistenceScopeOptions): void {
  saveActiveEinsatzId(null, options);
}

/**
 * Speichert den zuletzt genutzten Arbeitsbereich eines Einsatzes.
 *
 * @param einsatzId - Die Einsatz-ID
 * @param href - Interner App-Pfad inkl. Query oder null zum Löschen
 */
export function saveEinsatzWorkspaceHref(einsatzId: string, href: string | null, options?: PersistenceScopeOptions): void {
  try {
    const storageKey = getWorkspaceHrefStorageKey(einsatzId, options);
    const legacyStorageKey = `${WORKSPACE_HREF_KEY_PREFIX}${einsatzId}`;

    if (!href) {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(legacyStorageKey);
      return;
    }

    localStorage.setItem(storageKey, href);

    if (resolveServerId(options)) {
      localStorage.removeItem(legacyStorageKey);
    }
  } catch (error) {
    console.error('Failed to save Einsatz workspace href to localStorage:', error);
  }
}

export function clearEinsatzWorkspaceHref(einsatzId: string, options?: PersistenceScopeOptions): void {
  saveEinsatzWorkspaceHref(einsatzId, null, options);
}

export function clearPersistedResumeContext(einsatzId: string, options?: PersistenceScopeOptions): void {
  clearActiveEinsatz(options);
  clearEinsatzWorkspaceHref(einsatzId, options);
}

/**
 * Lädt den zuletzt genutzten Arbeitsbereich eines Einsatzes.
 *
 * @param einsatzId - Die Einsatz-ID
 * @returns Interner App-Pfad inkl. Query oder null
 */
export function loadEinsatzWorkspaceHref(einsatzId: string, options?: PersistenceScopeOptions): string | null {
  try {
    const href = loadScopedValue(getWorkspaceHrefStorageKey(einsatzId, options), `${WORKSPACE_HREF_KEY_PREFIX}${einsatzId}`, options);

    if (!href) {
      return null;
    }

    if (href.startsWith(`/app/einsatz/${einsatzId}`)) {
      return href;
    }

    clearEinsatzWorkspaceHref(einsatzId, options);
    return null;
  } catch (error) {
    console.error('Failed to load Einsatz workspace href from localStorage:', error);
    return null;
  }
}

/**
 * Listener für Cross-Tab-Synchronisation
 *
 * Registriert einen Event-Listener für Storage-Events zur
 * Synchronisation zwischen Browser-Tabs
 *
 * @param callback - Callback-Funktion, die bei Änderungen aufgerufen wird
 * @returns Cleanup-Funktion zum Entfernen des Listeners
 */
export function subscribeToStorageChanges(callback: (einsatzId: string | null) => void, options?: PersistenceScopeOptions): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    const scopedStorageKey = getActiveEinsatzStorageKey(options);

    // Nur auf relevante Storage-Events reagieren
    if (event.key === scopedStorageKey || event.key === STORAGE_KEY || event.key === STORAGE_EVENT_KEY || event.key === null) {
      callback(loadActiveEinsatzId(options));
    }
  };

  // Storage event für Cross-Tab-Sync und Same-Tab-Sync (via dispatchEvent)
  window.addEventListener('storage', handleStorageChange);

  // Cleanup-Funktion
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}

/**
 * Initialisiert die Rehydration des aktiven Einsatzes
 *
 * Diese Funktion sollte beim App-Start aufgerufen werden,
 * um den gespeicherten aktiven Einsatz wiederherzustellen.
 *
 * @param idOrCallback
 * @param validateCallback - Optional: Callback zur Validierung der ID
 * @returns Promise mit der validierten Einsatz-ID oder null
 */
export async function rehydrateActiveEinsatz(
  idOrCallback?: string | ((id: string) => Promise<boolean>),
  validateCallback?: (id: string) => Promise<boolean>,
  options?: PersistenceScopeOptions,
): Promise<string | null> {
  // Handle overloaded parameters for backward compatibility
  let storedId: string | null;
  let validationFn: ((id: string) => Promise<boolean>) | undefined;

  if (typeof idOrCallback === 'string') {
    // New signature: ID passed directly
    storedId = idOrCallback;
    validationFn = validateCallback;
  } else {
    // Legacy signature: callback only, read ID from storage
    storedId = loadActiveEinsatzId(options);
    validationFn = idOrCallback;
  }

  if (!storedId) {
    return null;
  }

  // Wenn Validierungs-Callback vorhanden, ID validieren
  if (validationFn) {
    try {
      const isValid = await validationFn(storedId);
      if (!isValid) {
        // Ungültige ID aus Storage entfernen - only if we're using stored ID
        if (typeof idOrCallback !== 'string') {
          clearPersistedResumeContext(storedId, options);
        }
        return null;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'ActiveEinsatzRuntimeStaleError') {
        throw error;
      }

      console.error('Failed to validate stored Einsatz ID:', error);
      // Bei Validierungs-Fehler ID behalten (könnte temporäres Netzwerk-Problem sein)
      return storedId;
    }
  }

  return storedId;
}

/**
 * Hilfsfunktion zum Prüfen, ob localStorage verfügbar ist
 *
 * @returns true wenn localStorage verfügbar und nutzbar ist
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Migration von alten Storage-Keys (falls vorhanden)
 *
 * Diese Funktion kann genutzt werden, um von älteren
 * Storage-Formaten zu migrieren.
 */
export function migrateOldStorageFormat(): void {
  try {
    // Check for old format keys
    const oldKeys = ['selectedEinsatz', 'currentEinsatz', 'einsatz_active'];

    for (const oldKey of oldKeys) {
      const oldValue = localStorage.getItem(oldKey);
      if (oldValue) {
        // Migrate to new format
        saveActiveEinsatzId(oldValue);
        // Remove old key
        localStorage.removeItem(oldKey);
        console.info(`Migrated old storage key "${oldKey}" to new format`);
      }
    }
  } catch (error) {
    console.error('Failed to migrate old storage format:', error);
  }
}
