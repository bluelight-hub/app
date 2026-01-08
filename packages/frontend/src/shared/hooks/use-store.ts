import { useCallback, useState, useEffect } from 'react';
import { getStoreValue, setStoreValue, deleteStoreKey, initializeStore } from '../lib/store.service';

/**
 * React Hook für sichere Store-Nutzung mit Auto-Sync
 * Synchronisiert Wert mit Tauri Store bei jedem Set-Aufruf.
 *
 * @template T - Typ des gespeicherten Wertes
 * @param key - Store Schlüssel
 * @param defaultValue - Initialwert wenn nicht im Store vorhanden
 * @returns [value, setValue, deleteValue] Tuple mit State und Funktionen
 */
export function useStore<T = unknown>(key: string, defaultValue?: T): [value: T | undefined, setValue: (value: T) => Promise<void>, deleteValue: () => Promise<void>, isLoading: boolean] {
  const [value, setValue] = useState<T | undefined>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial value on mount
  useEffect(() => {
    const loadValue = async () => {
      try {
        await initializeStore();
        const storedValue = await getStoreValue<T>(key, defaultValue);
        setValue(storedValue);
      } catch (error) {
        console.error(`[useStore] Failed to load ${key}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadValue();
  }, [key, defaultValue]);

  // Set value callback with persistent save
  const handleSet = useCallback(
    async (newValue: T) => {
      try {
        setValue(newValue);
        await setStoreValue(key, newValue);
      } catch (error) {
        console.error(`[useStore] Failed to set ${key}:`, error);
        // Rollback on failure
        setValue(value);
        throw error;
      }
    },
    [key, value],
  );

  // Delete value callback
  const handleDelete = useCallback(async () => {
    try {
      setValue(defaultValue);
      await deleteStoreKey(key);
    } catch (error) {
      console.error(`[useStore] Failed to delete ${key}:`, error);
      throw error;
    }
  }, [key, defaultValue]);

  return [value, handleSet, handleDelete, isLoading];
}

/**
 * Hook für multiple Store-Werte mit Batch-Operationen
 * Ideal für komplexe Settings oder Profile.
 *
 * @template T - Typ der gespeicherten Objekt-Properties
 * @param storageKey - Basis-Schlüssel im Store
 * @param defaultValues - Defaults für alle Properties
 * @returns Object mit Werten, Update-Funktionen und Status
 */
export function useStoreObject<T extends Record<string, unknown>>(
  storageKey: string,
  defaultValues: T,
): {
  values: T;
  set: <K extends keyof T>(key: K, value: T[K]) => Promise<void>;
  setAll: (values: Partial<T>) => Promise<void>;
  isLoading: boolean;
} {
  const [values, setValues] = useState<T>(defaultValues);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial values
  useEffect(() => {
    const loadValues = async () => {
      try {
        await initializeStore();
        const storedValues = await getStoreValue<Partial<T>>(storageKey, {});
        setValues({ ...defaultValues, ...storedValues });
      } catch (error) {
        console.error(`[useStoreObject] Failed to load ${storageKey}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadValues();
  }, [storageKey, defaultValues]);

  // Set single property
  const handleSet = useCallback(
    async <K extends keyof T>(key: K, value: T[K]) => {
      try {
        const updatedValues = { ...values, [key]: value };
        setValues(updatedValues);
        await setStoreValue(storageKey, updatedValues);
      } catch (error) {
        console.error(`[useStoreObject] Failed to set ${String(key)}:`, error);
        throw error;
      }
    },
    [values, storageKey],
  );

  // Set multiple properties
  const handleSetAll = useCallback(
    async (newValues: Partial<T>) => {
      try {
        const updatedValues = { ...values, ...newValues };
        setValues(updatedValues);
        await setStoreValue(storageKey, updatedValues);
      } catch (error) {
        console.error(`[useStoreObject] Failed to set all on ${storageKey}:`, error);
        throw error;
      }
    },
    [values, storageKey],
  );

  return {
    values,
    set: handleSet,
    setAll: handleSetAll,
    isLoading,
  };
}
