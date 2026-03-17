import { getStorageAdapter } from '@/shared/services/storage/storage-adapter.factory';

const LEGACY_STORAGE_KEY = 'activeEinsatzId';
const ACTIVE_EINSATZ_SCOPE_FALLBACK = 'unscoped';

export interface ActiveEinsatzStorageScope {
  serverId: string;
  userId: string;
  role: string;
}

function getActiveEinsatzStorageKey(scope?: ActiveEinsatzStorageScope | null): string {
  return `bluelight:server:${scope?.serverId ?? ACTIVE_EINSATZ_SCOPE_FALLBACK}:user:${scope?.userId ?? ACTIVE_EINSATZ_SCOPE_FALLBACK}:role:${scope?.role ?? ACTIVE_EINSATZ_SCOPE_FALLBACK}:feature:einsatz:active`;
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined';
}

function createWebStoragePayload(value: string): string {
  return JSON.stringify({
    data: value,
    storageType: 'insecure',
  });
}

function extractStoredValue(rawValue: string | null): string | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as { data?: string };
    return typeof parsed.data === 'string' ? parsed.data : null;
  } catch {
    return rawValue;
  }
}

function dispatchSameTabStorageSync(storageKey: string, einsatzId: string | null): void {
  if (!isBrowserRuntime()) {
    return;
  }

  let event: StorageEvent;

  try {
    event = new StorageEvent('storage', {
      key: storageKey,
      newValue: einsatzId,
    });
  } catch {
    event = new Event('storage') as StorageEvent;
    Object.defineProperties(event, {
      key: { value: storageKey },
      newValue: { value: einsatzId },
    });
  }

  window.dispatchEvent(event);
}

async function migrateLegacyStoredActiveEinsatzId(): Promise<string | null> {
  if (!isBrowserRuntime()) {
    return null;
  }

  const legacyStoredId = window.localStorage.getItem(LEGACY_STORAGE_KEY);

  if (!legacyStoredId) {
    return null;
  }

  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    console.info('Removed legacy unscoped active Einsatz ID during scoped storage migration');
    return null;
  } catch (error) {
    console.error('Failed to clear legacy active Einsatz ID:', error);
    return null;
  }
}

export async function saveActiveEinsatzId(id: string | null, scope?: ActiveEinsatzStorageScope | null): Promise<void> {
  if (!scope) {
    return;
  }

  const storageKey = getActiveEinsatzStorageKey(scope);

  try {
    const adapter = getStorageAdapter();

    if (id === null) {
      await adapter.removeItem(storageKey);
    } else {
      await adapter.setItem(storageKey, id);
    }

    dispatchSameTabStorageSync(storageKey, id);
  } catch (error) {
    console.error('Failed to persist active Einsatz ID:', error);
  }
}

export async function loadActiveEinsatzId(scope?: ActiveEinsatzStorageScope | null): Promise<string | null> {
  if (!scope) {
    return null;
  }

  const storageKey = getActiveEinsatzStorageKey(scope);

  try {
    const adapter = getStorageAdapter();
    const storedId = await adapter.getItem(storageKey);

    if (storedId) {
      return storedId;
    }

    return await migrateLegacyStoredActiveEinsatzId();
  } catch (error) {
    console.error('Failed to load active Einsatz ID:', error);
    return null;
  }
}

export async function clearActiveEinsatz(scope?: ActiveEinsatzStorageScope | null): Promise<void> {
  await saveActiveEinsatzId(null, scope);
}

export function subscribeToStorageChanges(scope: ActiveEinsatzStorageScope, callback: (einsatzId: string | null) => void): () => void {
  if (!isBrowserRuntime()) {
    return () => undefined;
  }

  const scopedStorageKey = getActiveEinsatzStorageKey(scope);

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key !== scopedStorageKey) {
      return;
    }

    callback(extractStoredValue(event.newValue));
  };

  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}

export async function rehydrateActiveEinsatz(
  scope: ActiveEinsatzStorageScope,
  idOrCallback?: string | ((id: string) => Promise<boolean>),
  validateCallback?: (id: string) => Promise<boolean>,
): Promise<string | null> {
  let storedId: string | null;
  let validationFn: ((id: string) => Promise<boolean>) | undefined;

  if (typeof idOrCallback === 'string') {
    storedId = idOrCallback;
    validationFn = validateCallback;
  } else {
    storedId = await loadActiveEinsatzId(scope);
    validationFn = idOrCallback;
  }

  if (!storedId) {
    return null;
  }

  if (validationFn) {
    try {
      const isValid = await validationFn(storedId);
      if (!isValid) {
        if (typeof idOrCallback !== 'string') {
          await clearActiveEinsatz(scope);
        }
        return null;
      }
    } catch (error) {
      console.error('Failed to validate stored Einsatz ID:', error);
      return storedId;
    }
  }

  return storedId;
}

export function isLocalStorageAvailable(): boolean {
  if (!isBrowserRuntime()) {
    return false;
  }

  try {
    const testKey = '__localStorage_test__';
    window.localStorage.setItem(testKey, createWebStoragePayload('test'));
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function migrateOldStorageFormat(): void {
  if (!isBrowserRuntime()) {
    return;
  }

  try {
    const oldKeys = ['selectedEinsatz', 'currentEinsatz', 'einsatz_active'];

    for (const oldKey of oldKeys) {
      const oldValue = window.localStorage.getItem(oldKey);
      if (oldValue) {
        window.localStorage.removeItem(oldKey);
        console.info(`Removed legacy active Einsatz key "${oldKey}" during scoped storage migration`);
      }
    }
  } catch (error) {
    console.error('Failed to migrate old storage format:', error);
  }
}
