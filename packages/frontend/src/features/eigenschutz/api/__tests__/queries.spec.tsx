import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetHealth = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      eigenschutzHealthControllerGetHealthVAlpha: mockGetHealth,
    }),
  },
}));

import { EIGENSCHUTZ_QUERY_KEYS, useEigenschutzHealth } from '../queries';

function makeWrapper(opts?: { retry?: number | boolean | ((count: number, err: unknown) => boolean) }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: opts?.retry ?? false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

describe('EIGENSCHUTZ_QUERY_KEYS', () => {
  it('baut hierarchische Keys pro Einsatz', () => {
    expect(EIGENSCHUTZ_QUERY_KEYS.all('e-1')).toEqual(['eigenschutz', 'e-1']);
    expect(EIGENSCHUTZ_QUERY_KEYS.health('e-1')).toEqual(['eigenschutz', 'e-1', 'health']);
    expect(EIGENSCHUTZ_QUERY_KEYS.health('e-1')).toEqual(EIGENSCHUTZ_QUERY_KEYS.health('e-1'));
  });
});

describe('useEigenschutzHealth (Story 1.6 AC5 + AC8)', () => {
  beforeEach(() => {
    mockGetHealth.mockReset();
  });

  it('ist deaktiviert bei leerer einsatzId', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useEigenschutzHealth(''), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetHealth).not.toHaveBeenCalled();
  });

  it('entpackt die `data`-Property des Wrapped-Response', async () => {
    mockGetHealth.mockResolvedValueOnce({ data: { status: 'ready' }, meta: {} });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useEigenschutzHealth('e-42'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ status: 'ready' }));
    expect(mockGetHealth).toHaveBeenCalledWith({ einsatzId: 'e-42' });
  });

  it('trägt meta.silentError für die Plattform-Toast-Suppression (AC8)', async () => {
    mockGetHealth.mockResolvedValueOnce({ data: { status: 'ready' }, meta: {} });
    const { client, wrapper } = makeWrapper();
    renderHook(() => useEigenschutzHealth('e-99'), { wrapper });

    await waitFor(() => {
      const cached = client.getQueryCache().find({ queryKey: EIGENSCHUTZ_QUERY_KEYS.health('e-99') });
      expect(cached?.meta?.silentError).toBe(true);
    });
  });

  describe('retry-Policy', () => {
    // Die Retry-Strategie wird direkt aus der QueryCache-Konfiguration
    // gelesen und isoliert geprüft. Ein End-to-End-Durchlauf mit
    // tatsächlichen Retries würde dank exponentieller Backoffs lange
    // laufen und beim Testen zu Flakes führen.
    async function readRetryFn(): Promise<(failureCount: number, error: unknown) => boolean> {
      mockGetHealth.mockResolvedValueOnce({ data: { status: 'ready' }, meta: {} });
      const { client, wrapper } = makeWrapper();
      renderHook(() => useEigenschutzHealth('e-retry'), { wrapper });

      await waitFor(() => {
        const cached = client.getQueryCache().find({ queryKey: EIGENSCHUTZ_QUERY_KEYS.health('e-retry') });
        expect(cached).toBeDefined();
      });
      const query = client.getQueryCache().find({ queryKey: EIGENSCHUTZ_QUERY_KEYS.health('e-retry') });
      const retryOption = query?.options.retry;
      if (typeof retryOption !== 'function') {
        throw new Error('retry muss für diese Query eine Funktion sein');
      }
      return retryOption as (failureCount: number, error: unknown) => boolean;
    }

    it('retriet maximal 2× bei Nicht-403-Fehlern (failureCount < 2)', async () => {
      const retry = await readRetryFn();
      expect(retry(0, { response: { status: 500 } })).toBe(true);
      expect(retry(1, { response: { status: 500 } })).toBe(true);
      expect(retry(2, { response: { status: 500 } })).toBe(false);
    });

    it('retriet NICHT bei 403 (permanente Autorisierung fehlt, Zero-Toast-Route übernimmt)', async () => {
      const retry = await readRetryFn();
      expect(retry(0, { response: { status: 403 } })).toBe(false);
      expect(retry(5, { response: { status: 403 } })).toBe(false);
    });
  });
});
