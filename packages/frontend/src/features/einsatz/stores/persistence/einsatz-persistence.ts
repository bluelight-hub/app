/**
 * Persistierungs-Layer für aktiven Einsatz
 *
 * Verwaltet die localStorage-Persistierung des aktiven Einsatzes
 * und Cross-Tab-Synchronisation
 */

// Constants
const STORAGE_KEY = 'activeEinsatzId';
const STORAGE_EVENT_KEY = 'activeEinsatzSync';

/**
 * Speichert die aktive Einsatz-ID im localStorage
 *
 * @param id - Die zu speichernde Einsatz-ID oder null zum Löschen
 */
export function saveActiveEinsatzId(id: string | null): void {
  try {
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
      // Trigger storage event für Cross-Tab-Sync
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_EVENT_KEY,
          newValue: null,
          storageArea: localStorage,
        }),
      );
    } else {
      localStorage.setItem(STORAGE_KEY, id);
      // Trigger storage event für Cross-Tab-Sync
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_EVENT_KEY,
          newValue: id,
          storageArea: localStorage,
        }),
      );
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
export function loadActiveEinsatzId(): string | null {
  try {
    const storedId = localStorage.getItem(STORAGE_KEY);
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
export function clearActiveEinsatz(): void {
  saveActiveEinsatzId(null);
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
export function subscribeToStorageChanges(callback: (einsatzId: string | null) => void): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    // Nur auf relevante Storage-Events reagieren
    if (event.key === STORAGE_KEY || event.key === STORAGE_EVENT_KEY) {
      const newId = event.newValue;
      callback(newId);
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
export async function rehydrateActiveEinsatz(idOrCallback?: string | ((id: string) => Promise<boolean>), validateCallback?: (id: string) => Promise<boolean>): Promise<string | null> {
  // Handle overloaded parameters for backward compatibility
  let storedId: string | null;
  let validationFn: ((id: string) => Promise<boolean>) | undefined;

  if (typeof idOrCallback === 'string') {
    // New signature: ID passed directly
    storedId = idOrCallback;
    validationFn = validateCallback;
  } else {
    // Legacy signature: callback only, read ID from storage
    storedId = loadActiveEinsatzId();
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
          clearActiveEinsatz();
        }
        return null;
      }
    } catch (error) {
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
