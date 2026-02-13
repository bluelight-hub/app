/**
 * Offline Store fuer ETB-Offline Management
 *
 * Verwaltet offline erstellte ETB-Eintraege und die Sync-Queue mit TanStack Store.
 * Integriert mit Tauri Store fuer Persistence.
 *
 * **Story 5.10 AC1, AC2, AC3:**
 * - queue: Ausstehende ETB-Aktionen (addEintrag, etc.)
 * - lastSync: Letzte erfolgreiche Synchronisation
 * - Offline-State Tracking mit occurredAt-Preservation
 */

import { isTauri } from '@tauri-apps/api/core';
import { LazyStore } from '@tauri-apps/plugin-store';
import { Store, useStore } from '@tanstack/react-store';

/**
 * Tauri Store Keys fuer Offline Persistence
 */
export const ETB_OFFLINE_STORE_KEYS = {
  /** Ausstehende ETB-Aktionen */
  QUEUE: 'etb.offline.queue',
  /** Letzte erfolgreiche Synchronisation */
  LAST_SYNC: 'etb.offline.lastSync',
} as const;

/**
 * ETB Queue Action Types
 *
 * Erstmal nur 'addEintrag' - weitere koennen spaeter ergaenzt werden.
 */
export type EtbActionType = 'addEintrag';

/**
 * ETB Queue Action
 *
 * Repraesentiert eine ausstehende ETB-Aktion die bei Reconnect synchronisiert wird.
 * KRITISCH: `occurredAt` im payload muss erhalten bleiben (AC3) - nicht mit `timestamp` verwechseln!
 */
export interface EtbQueueAction {
  /** Eindeutige Action-ID (UUID) fuer Deduplication */
  id: string;
  /** Art der Aktion */
  actionType: EtbActionType;
  /** Action-spezifische Daten */
  payload: {
    /** ETB-Text */
    text: string;
    /** ETB-Kategorie - alle Erinnerungs-ETB sind SYSTEM */
    kategorie: 'SYSTEM';
    /** Event-Metadaten */
    metadata: {
      /** Event-Typ (z.B. 'ErinnerungAcknowledged') */
      eventType: string;
      /** Erinnerungs-ID */
      erinnerungId: string;
      /** Weitere Event-spezifische Daten */
      [key: string]: unknown;
    };
    /** KRITISCH: Zeitpunkt des Events (ISO-String) - MUSS erhalten bleiben! */
    occurredAt: string;
  };
  /** Einsatz-ID */
  einsatzId: string;
  /** Queue-Zeitpunkt (ISO-String) fuer Sortierung */
  timestamp: string;
  /** Anzahl der Retry-Versuche */
  retryCount: number;
}

/**
 * ETB Offline Store State Interface
 */
export interface EtbOfflineStoreState {
  /** Queue der ausstehenden ETB-Aktionen */
  queue: EtbQueueAction[];
  /** Zeitpunkt der letzten erfolgreichen Synchronisation (ISO-String) */
  lastSync: string | null;
}

/**
 * Initial State
 */
const initialState: EtbOfflineStoreState = {
  queue: [],
  lastSync: null,
};

/**
 * ETB Offline Store Instance
 */
export const etbOfflineStore = new Store<EtbOfflineStoreState>(initialState);

// ============================================
// Tauri Store Persistence
// ============================================

/**
 * Tauri Store Filename fuer ETB Offline Persistence
 *
 * Separater Store um Isolation von anderen App-Daten zu gewaehrleisten.
 */
const TAURI_STORE_FILENAME = 'etb-offline.json';

/**
 * Singleton LazyStore Instance fuer Tauri Persistence
 */
let tauriStoreInstance: LazyStore | null = null;

/**
 * Gibt die Singleton-Instanz des Tauri LazyStore zurueck
 */
function getTauriStore(): LazyStore | null {
  if (!isTauri()) {
    return null;
  }

  if (!tauriStoreInstance) {
    tauriStoreInstance = new LazyStore(TAURI_STORE_FILENAME, { autoSave: true });
  }
  return tauriStoreInstance;
}

/**
 * Persistiert den aktuellen State in den Tauri Store
 *
 * Wird nach jeder State-aenderung aufgerufen um Datenverlust zu verhindern.
 */
async function persistToTauriStore(): Promise<void> {
  try {
    const store = getTauriStore();
    if (!store) return;

    const state = etbOfflineStore.state;
    await Promise.all([store.set(ETB_OFFLINE_STORE_KEYS.QUEUE, state.queue), store.set(ETB_OFFLINE_STORE_KEYS.LAST_SYNC, state.lastSync)]);
  } catch (error) {
    console.error('[EtbOfflineStore] Failed to persist to Tauri Store:', error);
  }
}

/**
 * Initialisiert den ETB Offline Store aus dem Tauri Store
 *
 * Laedt persistierte Daten bei App-Start um Datenverlust zu verhindern.
 * MUSS beim App-Start aufgerufen werden!
 *
 * @returns Promise wenn Initialisierung abgeschlossen
 */
export async function initEtbOfflineStore(): Promise<void> {
  try {
    const store = getTauriStore();

    if (!store) {
      console.info('[EtbOfflineStore] Running in Browser Mode (No Persistence)');
      return;
    }

    const [queue, lastSync] = await Promise.all([store.get<EtbQueueAction[]>(ETB_OFFLINE_STORE_KEYS.QUEUE), store.get<string | null>(ETB_OFFLINE_STORE_KEYS.LAST_SYNC)]);

    etbOfflineStore.setState(() => ({
      queue: queue ?? [],
      lastSync: lastSync ?? null,
    }));

    console.info('[EtbOfflineStore] Initialized from Tauri Store:', {
      queueCount: etbOfflineStore.state.queue.length,
      lastSync: etbOfflineStore.state.lastSync,
    });
  } catch (error) {
    console.error('[EtbOfflineStore] Failed to initialize from Tauri Store:', error);
  }
}

// ============================================
// Store Actions (Helper Functions)
// ============================================

/**
 * Fuegt eine ETB-Aktion zur Queue hinzu (AC1)
 *
 * Wird aufgerufen wenn eine ETB-Aktion offline ausgefuehrt wird
 * und bei Reconnect synchronisiert werden muss.
 * KRITISCH: `occurredAt` im payload bleibt erhalten (AC3)!
 * Persistiert automatisch in den Tauri Store.
 *
 * @param action - Die zu queueende ETB-Aktion
 * @returns Promise wenn Operation abgeschlossen
 */
export const queueEtbAction = async (action: EtbQueueAction): Promise<void> => {
  const currentState = etbOfflineStore.state;

  // Deduplication: Nicht hinzufuegen wenn Action-ID bereits existiert
  if (currentState.queue.some((a) => a.id === action.id)) {
    return;
  }

  etbOfflineStore.setState((state) => ({
    ...state,
    queue: [...state.queue, action],
  }));

  await persistToTauriStore();
};

/**
 * Entfernt eine verarbeitete Aktion aus der Queue
 *
 * Wird nach erfolgreicher Synchronisation aufgerufen.
 * Persistiert automatisch in den Tauri Store.
 *
 * @param actionId - Die ID der verarbeiteten Aktion
 * @returns Promise wenn Operation abgeschlossen
 */
export const removeFromQueue = async (actionId: string): Promise<void> => {
  etbOfflineStore.setState((state) => ({
    ...state,
    queue: state.queue.filter((a) => a.id !== actionId),
  }));

  await persistToTauriStore();
};

/**
 * Gibt alle gequeueten Aktionen zurueck (sortiert nach timestamp)
 *
 * @returns Array der gequeueten Aktionen
 */
export const getQueuedActions = (): EtbQueueAction[] => {
  return [...etbOfflineStore.state.queue].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};

/**
 * Aktualisiert den retryCount einer Aktion
 *
 * Persistiert automatisch in den Tauri Store.
 *
 * @param actionId - Die ID der Aktion
 * @param newRetryCount - Der neue Retry-Count
 * @returns Promise wenn Operation abgeschlossen
 */
export const updateRetryCount = async (actionId: string, newRetryCount: number): Promise<void> => {
  etbOfflineStore.setState((state) => ({
    ...state,
    queue: state.queue.map((a) => (a.id === actionId ? { ...a, retryCount: newRetryCount } : a)),
  }));

  await persistToTauriStore();
};

/**
 * Setzt den Zeitpunkt der letzten erfolgreichen Synchronisation
 *
 * Persistiert automatisch in den Tauri Store.
 *
 * @param timestamp - ISO-String Timestamp oder null
 * @returns Promise wenn Operation abgeschlossen
 */
export const setEtbLastSync = async (timestamp: string | null): Promise<void> => {
  etbOfflineStore.setState((state) => ({
    ...state,
    lastSync: timestamp,
  }));

  await persistToTauriStore();
};

/**
 * Setzt den ETB Offline Store komplett zurueck
 *
 * Persistiert automatisch in den Tauri Store (loescht alle Daten).
 *
 * @returns Promise wenn Operation abgeschlossen
 */
export const resetEtbOfflineStore = async (): Promise<void> => {
  etbOfflineStore.setState(initialState);

  await persistToTauriStore();
};

// ============================================
// React Hooks
// ============================================

/**
 * Hook fuer die Anzahl der ausstehenden ETB-Aktionen
 *
 * @returns Anzahl der Aktionen in der Queue
 */
export const useEtbQueueCount = (): number => {
  return useStore(etbOfflineStore, (state) => state.queue.length);
};

/**
 * Hook fuer den Zeitpunkt der letzten Synchronisation
 *
 * @returns ISO-String Timestamp oder null
 */
export const useEtbLastSync = (): string | null => {
  return useStore(etbOfflineStore, (state) => state.lastSync);
};

/**
 * Hook fuer den kompletten ETB Offline Store State
 *
 * @returns Kompletter ETB Offline Store State
 */
export const useEtbOfflineStoreState = (): EtbOfflineStoreState => {
  return useStore(etbOfflineStore, (state) => state);
};
