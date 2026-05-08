import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IStoragePort } from '@/shared/types/storage';
import { DASHBOARD_VIEW_STORAGE_KEY, eigenschutzDashboardViewStore, hydrateDashboardView, resetDashboardViewStoreForTest, setDashboardView } from '../eigenschutz-dashboard-view.store';

const storage: IStoragePort = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

const browserStorage: IStoragePort = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

const tauriStorage: IStoragePort = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

let activeStorage: IStoragePort = storage;

vi.mock('@/shared/services/storage/storage-adapter.factory', () => ({
  getStorageAdapter: () => activeStorage,
}));

describe('eigenschutzDashboardViewStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeStorage = storage;
    resetDashboardViewStoreForTest();
    vi.mocked(storage.getItem).mockResolvedValue(null);
    vi.mocked(storage.setItem).mockResolvedValue();
    vi.mocked(browserStorage.getItem).mockResolvedValue(null);
    vi.mocked(browserStorage.setItem).mockResolvedValue();
    vi.mocked(tauriStorage.getItem).mockResolvedValue(null);
    vi.mocked(tauriStorage.setItem).mockResolvedValue();
  });

  it('startet mit Überblick und unhydriertem Zustand', () => {
    expect(eigenschutzDashboardViewStore.state).toEqual({ view: 'cards', hydrated: false });
  });

  it('hydratisiert einen gespeicherten Fokus-Wert', async () => {
    vi.mocked(storage.getItem).mockResolvedValue('focus');

    await hydrateDashboardView();

    expect(storage.getItem).toHaveBeenCalledWith(DASHBOARD_VIEW_STORAGE_KEY);
    expect(eigenschutzDashboardViewStore.state).toEqual({ view: 'focus', hydrated: true });
  });

  it('fällt bei fehlendem Wert auf Überblick zurück', async () => {
    await hydrateDashboardView();

    expect(eigenschutzDashboardViewStore.state).toEqual({ view: 'cards', hydrated: true });
  });

  it('validiert gespeicherte Werte strikt', async () => {
    vi.mocked(storage.getItem).mockResolvedValue('panel');

    await hydrateDashboardView();

    expect(eigenschutzDashboardViewStore.state.view).toBe('cards');
  });

  it('bleibt bei Lesefehlern bedienbar', async () => {
    vi.mocked(storage.getItem).mockRejectedValue(new Error('storage down'));

    await hydrateDashboardView();

    expect(eigenschutzDashboardViewStore.state).toEqual({ view: 'cards', hydrated: true });
  });

  it('persistiert den Fokus-Wert unter dem versionierten Key', async () => {
    await setDashboardView('focus');

    expect(eigenschutzDashboardViewStore.state.view).toBe('focus');
    expect(storage.setItem).toHaveBeenCalledWith(DASHBOARD_VIEW_STORAGE_KEY, 'focus');
  });

  it('setzt von Fokus zurück auf Überblick', async () => {
    await setDashboardView('focus');
    await setDashboardView('cards');

    expect(eigenschutzDashboardViewStore.state.view).toBe('cards');
    expect(storage.setItem).toHaveBeenLastCalledWith(DASHBOARD_VIEW_STORAGE_KEY, 'cards');
  });

  it('blockiert die UI bei Schreibfehlern nicht', async () => {
    vi.mocked(storage.setItem).mockRejectedValue(new Error('readonly'));

    await setDashboardView('focus');

    expect(eigenschutzDashboardViewStore.state.view).toBe('focus');
  });

  it('überschreibt eine lokale Nutzerwahl nicht durch spät auflösende Hydration', async () => {
    const deferred = createDeferred<string | null>();
    vi.mocked(storage.getItem).mockReturnValue(deferred.promise);

    const hydration = hydrateDashboardView();
    await setDashboardView('focus');
    deferred.resolve('cards');
    await hydration;

    expect(eigenschutzDashboardViewStore.state).toEqual({ view: 'focus', hydrated: true });
  });

  it('persistiert bei schnellem Umschalten nur den neuesten Wert', async () => {
    const focusWrite = setDashboardView('focus');
    const cardsWrite = setDashboardView('cards');

    await Promise.all([focusWrite, cardsWrite]);

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith(DASHBOARD_VIEW_STORAGE_KEY, 'cards');
    expect(eigenschutzDashboardViewStore.state.view).toBe('cards');
  });

  it('hydratisiert über den Browser-Storage-Adapter-Mock', async () => {
    activeStorage = browserStorage;
    vi.mocked(browserStorage.getItem).mockResolvedValue('focus');

    await hydrateDashboardView();

    expect(browserStorage.getItem).toHaveBeenCalledWith(DASHBOARD_VIEW_STORAGE_KEY);
    expect(eigenschutzDashboardViewStore.state.view).toBe('focus');
  });

  it('persistiert über den Tauri-Adapter-Mock', async () => {
    activeStorage = tauriStorage;

    await setDashboardView('focus');

    expect(tauriStorage.setItem).toHaveBeenCalledWith(DASHBOARD_VIEW_STORAGE_KEY, 'focus');
  });

  it('isoliert Test-Resets', async () => {
    await setDashboardView('focus');

    resetDashboardViewStoreForTest();

    expect(eigenschutzDashboardViewStore.state).toEqual({ view: 'cards', hydrated: false });
  });
});

function createDeferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
