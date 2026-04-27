import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findAllMock = vi.fn();

vi.mock('@/shared', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/shared');
  return {
    ...actual,
    api: {
      einsatzEinheiten: () => ({
        einsatzEinheitenControllerFindAllVAlpha: findAllMock,
      }),
    },
  };
});

import { useAktiveEinsatzEinheit } from '../use-aktive-einsatz-einheit';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  });

const EINSATZ_ID = 'einsatz-1';
const EINHEIT_A = { id: 'einheit-a', name: '1. Sangruppe' };
const EINHEIT_B = { id: 'einheit-b', name: '2. Sangruppe' };

describe('useAktiveEinsatzEinheit (Story 2.7 AC9)', () => {
  beforeEach(() => {
    findAllMock.mockReset();
    findAllMock.mockResolvedValue({ data: [EINHEIT_A, EINHEIT_B] });
    window.localStorage.clear();
  });

  it('initialisiert mit null, wenn keine Auswahl persistiert ist', async () => {
    const { result } = renderHook(() => useAktiveEinsatzEinheit(EINSATZ_ID), { wrapper: wrapper(makeClient()) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.einheitId).toBeNull();
    expect(result.current.einheitName).toBeNull();
    expect(result.current.einheiten).toHaveLength(2);
  });

  it('persistiert Auswahl in localStorage', async () => {
    const { result } = renderHook(() => useAktiveEinsatzEinheit(EINSATZ_ID), { wrapper: wrapper(makeClient()) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setAktiveEinheit(EINHEIT_A.id));

    expect(result.current.einheitId).toBe(EINHEIT_A.id);
    expect(result.current.einheitName).toBe('1. Sangruppe');
    expect(window.localStorage.getItem(`eigenschutz:aktive-einheit:${EINSATZ_ID}`)).toBe(EINHEIT_A.id);
  });

  it('lädt persistierte Auswahl beim erneuten Mount', async () => {
    window.localStorage.setItem(`eigenschutz:aktive-einheit:${EINSATZ_ID}`, EINHEIT_B.id);

    const { result } = renderHook(() => useAktiveEinsatzEinheit(EINSATZ_ID), { wrapper: wrapper(makeClient()) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.einheitId).toBe(EINHEIT_B.id);
    expect(result.current.einheitName).toBe('2. Sangruppe');
  });

  it('setzt Auswahl auf null zurück, wenn die persistierte Einheit nicht mehr in der Liste ist', async () => {
    window.localStorage.setItem(`eigenschutz:aktive-einheit:${EINSATZ_ID}`, 'einheit-removed');

    const { result } = renderHook(() => useAktiveEinsatzEinheit(EINSATZ_ID), { wrapper: wrapper(makeClient()) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.einheitId).toBeNull());

    expect(window.localStorage.getItem(`eigenschutz:aktive-einheit:${EINSATZ_ID}`)).toBeNull();
  });

  it('setAktiveEinheit(null) entfernt die Auswahl aus localStorage', async () => {
    const { result } = renderHook(() => useAktiveEinsatzEinheit(EINSATZ_ID), { wrapper: wrapper(makeClient()) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setAktiveEinheit(EINHEIT_A.id));
    act(() => result.current.setAktiveEinheit(null));

    expect(result.current.einheitId).toBeNull();
    expect(window.localStorage.getItem(`eigenschutz:aktive-einheit:${EINSATZ_ID}`)).toBeNull();
  });
});
