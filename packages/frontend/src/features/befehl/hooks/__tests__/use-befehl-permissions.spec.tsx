/**
 * Unit Tests für useBefehlPermissions Hook
 *
 * Verifiziert:
 * - Berechtigungen basierend auf Einsatz-Rolle
 * - BEFEHLSGEBER kann erstellen und korrigieren
 * - ERSTELLER kann erstellen und korrigieren
 * - EMPFAENGER kann quittieren
 * - BEOBACHTER kann nur einsehen
 * - User ohne Rolle hat keine Berechtigungen
 *
 * Story 5.2 AC8
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBefehlPermissions } from '../use-befehl-permissions';

const { mockGetRollen, mockCurrentUserReturn } = vi.hoisted(() => ({
  mockGetRollen: vi.fn(),
  mockCurrentUserReturn: {
    user: { id: 'current-user', username: 'testuser', role: 'USER' } as { id: string; username: string; role: string } | null | undefined,
    isLoading: false,
  },
}));

vi.mock('@/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared')>();
  return {
    ...actual,
    api: {
      einsatz: () => ({
        einsatzControllerGetRollenVAlpha: mockGetRollen,
      }),
    },
  };
});

vi.mock('@/features/auth', () => ({
  useCurrentUser: () => mockCurrentUserReturn,
}));

// retryDelay auf 0 setzen für schnelle Tests
vi.mock('@/features/einsatz/api/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/einsatz/api/queries')>();
  return {
    ...actual,
    calculateRetryDelay: () => 0,
  };
});

describe('useBefehlPermissions Hook', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockGetRollen.mockReset();
    mockCurrentUserReturn.user = { id: 'current-user', username: 'testuser', role: 'USER' };
    mockCurrentUserReturn.isLoading = false;
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('BEFEHLSGEBER: canCreate=true, canKorrigieren=true, canExport=true, canViewMetriken=true, canQuittieren=false', async () => {
    mockGetRollen.mockResolvedValueOnce({
      data: [{ userId: 'current-user', userName: 'testuser', rolle: 'BEFEHLSGEBER' }],
    });

    const { result } = renderHook(() => useBefehlPermissions('einsatz-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canCreate).toBe(true);
    expect(result.current.canKorrigieren).toBe(true);
    expect(result.current.canExport).toBe(true);
    expect(result.current.canViewMetriken).toBe(true);
    expect(result.current.canQuittieren).toBe(false);
    expect(result.current.canViewAll).toBe(true);
    expect(result.current.isBeobachter).toBe(false);
    expect(result.current.rolle).toBe('BEFEHLSGEBER');
  });

  it('ERSTELLER: canCreate=true, canKorrigieren=true, canExport=true, canViewMetriken=false', async () => {
    mockGetRollen.mockResolvedValueOnce({
      data: [{ userId: 'current-user', userName: 'testuser', rolle: 'ERSTELLER' }],
    });

    const { result } = renderHook(() => useBefehlPermissions('einsatz-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canCreate).toBe(true);
    expect(result.current.canKorrigieren).toBe(true);
    expect(result.current.canExport).toBe(true);
    expect(result.current.canViewMetriken).toBe(false);
    expect(result.current.canQuittieren).toBe(false);
    expect(result.current.canViewAll).toBe(true);
    expect(result.current.isBeobachter).toBe(false);
    expect(result.current.rolle).toBe('ERSTELLER');
  });

  it('EMPFAENGER: canQuittieren=true, canCreate=false, canExport=false, canViewMetriken=false', async () => {
    mockGetRollen.mockResolvedValueOnce({
      data: [{ userId: 'current-user', userName: 'testuser', rolle: 'EMPFAENGER' }],
    });

    const { result } = renderHook(() => useBefehlPermissions('einsatz-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canCreate).toBe(false);
    expect(result.current.canKorrigieren).toBe(false);
    expect(result.current.canExport).toBe(false);
    expect(result.current.canViewMetriken).toBe(false);
    expect(result.current.canQuittieren).toBe(true);
    expect(result.current.canViewAll).toBe(true);
    expect(result.current.isBeobachter).toBe(false);
    expect(result.current.rolle).toBe('EMPFAENGER');
  });

  it('BEOBACHTER: canViewAll=true, isBeobachter=true, canExport=false, canViewMetriken=false', async () => {
    mockGetRollen.mockResolvedValueOnce({
      data: [{ userId: 'current-user', userName: 'testuser', rolle: 'BEOBACHTER' }],
    });

    const { result } = renderHook(() => useBefehlPermissions('einsatz-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canCreate).toBe(false);
    expect(result.current.canKorrigieren).toBe(false);
    expect(result.current.canExport).toBe(false);
    expect(result.current.canViewMetriken).toBe(false);
    expect(result.current.canQuittieren).toBe(false);
    expect(result.current.canViewAll).toBe(true);
    expect(result.current.isBeobachter).toBe(true);
    expect(result.current.rolle).toBe('BEOBACHTER');
  });

  it('User ohne Rolle: keine Berechtigungen', async () => {
    mockGetRollen.mockResolvedValueOnce({
      data: [{ userId: 'other-user', userName: 'anderer', rolle: 'BEFEHLSGEBER' }],
    });

    const { result } = renderHook(() => useBefehlPermissions('einsatz-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canCreate).toBe(false);
    expect(result.current.canKorrigieren).toBe(false);
    expect(result.current.canExport).toBe(false);
    expect(result.current.canViewMetriken).toBe(false);
    expect(result.current.canQuittieren).toBe(false);
    expect(result.current.canViewAll).toBe(false);
    expect(result.current.isBeobachter).toBe(false);
    expect(result.current.rolle).toBeNull();
  });

  it('Leere Rollenliste: keine Berechtigungen', async () => {
    mockGetRollen.mockResolvedValueOnce({ data: [] });

    const { result } = renderHook(() => useBefehlPermissions('einsatz-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canCreate).toBe(false);
    expect(result.current.canExport).toBe(false);
    expect(result.current.canViewMetriken).toBe(false);
    expect(result.current.canViewAll).toBe(false);
    expect(result.current.rolle).toBeNull();
  });

  it('user=null: alle Permissions false und isLoading=true', async () => {
    mockCurrentUserReturn.user = null;
    mockCurrentUserReturn.isLoading = true;
    mockGetRollen.mockResolvedValueOnce({ data: [] });

    const { result } = renderHook(() => useBefehlPermissions('einsatz-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.canCreate).toBe(false);
    expect(result.current.canKorrigieren).toBe(false);
    expect(result.current.canExport).toBe(false);
    expect(result.current.canViewMetriken).toBe(false);
    expect(result.current.canQuittieren).toBe(false);
    expect(result.current.canViewAll).toBe(false);
    expect(result.current.isBeobachter).toBe(false);
    expect(result.current.rolle).toBeNull();
  });

  it('Rollen laden noch: isLoading=true', async () => {
    // User ist geladen, aber Rollen laden noch (mockGetRollen nie resolved)
    mockGetRollen.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useBefehlPermissions('einsatz-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.canCreate).toBe(false);
    expect(result.current.canViewAll).toBe(false);
    expect(result.current.rolle).toBeNull();
  });
});
