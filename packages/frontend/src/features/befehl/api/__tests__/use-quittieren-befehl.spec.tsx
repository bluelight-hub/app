/**
 * Unit Tests für useQuittierenBefehl Hook
 *
 * Verifiziert die Quittierungs-Mutation mit:
 * - Korrekter API-Aufruf
 * - Optimistic Update: Empfänger wird sofort als quittiert markiert
 * - Error Rollback: Cache wird bei Fehler zurückgesetzt
 * - Toast-Notifications bei Success/Error
 * - Offline-Queue bei fehlender Netzwerkverbindung
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useQuittierenBefehl } from '../use-quittieren-befehl';
import { QuittierenBefehlDtoQuittierungArtEnum } from '@bluelight-hub/shared/client';

// Hoisted mocks (vi.mock factories werden an den Dateianfang gehoisted)
const { mockQuittieren, mockToast, mockEnqueue } = vi.hoisted(() => ({
  mockQuittieren: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  mockEnqueue: vi.fn().mockResolvedValue(undefined),
}));

// Mock API
vi.mock('@/shared', () => ({
  api: {
    befehle: () => ({
      befehlControllerQuittierenVAlpha: mockQuittieren,
    }),
  },
}));

vi.mock('@/shared/lib/errors/apiErrorHandler', () => ({
  getApiErrorMessage: vi.fn().mockResolvedValue('Quittierung fehlgeschlagen'),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: mockToast,
}));

// Mock offline queue
vi.mock('../../lib/offline-queue', () => ({
  befehlOfflineQueue: {
    enqueue: (...args: unknown[]) => mockEnqueue(...args),
  },
}));

// Mock queries - calculateRetryDelay auf 0ms setzen für schnelle Tests
vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queries')>();
  return {
    ...actual,
    calculateRetryDelay: () => 0,
  };
});

describe('useQuittierenBefehl', () => {
  let queryClient: QueryClient;
  const einsatzId = 'einsatz-1';
  const befehlId = 'befehl-1';
  const empfaengerId = 'empfaenger-1';

  const createWrapper = () => {
    return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  /** Befehle-Cache mit Test-Daten vorbelegen */
  const seedCache = () => {
    queryClient.setQueryData(
      ['befehl', 'list', einsatzId],
      [
        {
          id: befehlId,
          nummer: '001',
          auftrag: 'Test-Befehl',
          empfaenger: [
            { empfaengerId, quittierungArt: null, quittiertAm: null },
            { empfaengerId: 'other-emp', quittierungArt: null, quittiertAm: null },
          ],
        },
      ],
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should call befehlControllerQuittierenVAlpha correctly', async () => {
    // Given
    mockQuittieren.mockResolvedValue({ data: { id: befehlId } });
    seedCache();

    const { result } = renderHook(() => useQuittierenBefehl(einsatzId), {
      wrapper: createWrapper(),
    });

    // When
    result.current.mutate({
      befehlId,
      empfaengerId,
      quittierungArt: QuittierenBefehlDtoQuittierungArtEnum.Verstanden,
    });

    // Then
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockQuittieren).toHaveBeenCalledWith({
      id: befehlId,
      quittierenBefehlDto: {
        empfaengerId,
        quittierungArt: QuittierenBefehlDtoQuittierungArtEnum.Verstanden,
      },
    });
  });

  it('should optimistically update the empfänger as quittiert in cache', async () => {
    // Given: Mock never resolves -> mutation stays pending, optimistic update remains
    mockQuittieren.mockImplementation(() => new Promise(() => {}));
    seedCache();

    const { result } = renderHook(() => useQuittierenBefehl(einsatzId), {
      wrapper: createWrapper(),
    });

    // When: Trigger mutation and flush microtasks for onMutate
    await act(async () => {
      result.current.mutate({
        befehlId,
        empfaengerId,
        quittierungArt: QuittierenBefehlDtoQuittierungArtEnum.Verstanden,
      });
    });

    // Then: Cache should be updated optimistically
    const cached = queryClient.getQueryData<Array<{ empfaenger: Array<{ empfaengerId: string; quittierungArt: string | null }> }>>(['befehl', 'list', einsatzId]);
    const befehl = cached?.[0];
    const emp = befehl?.empfaenger.find((e) => e.empfaengerId === empfaengerId);
    expect(emp?.quittierungArt).toBe(QuittierenBefehlDtoQuittierungArtEnum.Verstanden);

    // Other empfänger should remain unchanged
    const otherEmp = cached?.[0]?.empfaenger.find((e) => e.empfaengerId === 'other-emp');
    expect(otherEmp?.quittierungArt).toBeNull();
  });

  it('should rollback cache on error', async () => {
    // Given: Mock rejects (retry delay is 0ms via mock, so retries complete quickly)
    // onError restores previousBefehle -> quittierungArt muss wieder null sein
    mockQuittieren.mockRejectedValue(new Error('Server error'));
    seedCache();

    // Spy auf setQueryData um Rollback zu verifizieren
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

    const { result } = renderHook(() => useQuittierenBefehl(einsatzId), {
      wrapper: createWrapper(),
    });

    // When
    result.current.mutate({
      befehlId,
      empfaengerId,
      quittierungArt: QuittierenBefehlDtoQuittierungArtEnum.NichtVerstanden,
    });

    // Then: Wait for all retries to complete
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Verify onError did restore previous data via setQueryData
    // setQueryData wird einmal für Optimistic Update und einmal für Rollback aufgerufen
    const rollbackCalls = setQueryDataSpy.mock.calls.filter(([key]) => JSON.stringify(key) === JSON.stringify(['befehl', 'list', einsatzId]));
    // Mindestens 2 Calls: 1x Optimistic Update, 1x Rollback
    expect(rollbackCalls.length).toBeGreaterThanOrEqual(2);

    // Der letzte setQueryData-Call (Rollback) sollte die Originaldaten enthalten
    const rollbackData = rollbackCalls[rollbackCalls.length - 1][1] as Array<{
      empfaenger: Array<{ empfaengerId: string; quittierungArt: string | null }>;
    }>;
    const emp = rollbackData?.[0]?.empfaenger.find((e) => e.empfaengerId === empfaengerId);
    expect(emp?.quittierungArt).toBeNull();
  });

  it('should show success toast on successful quittierung', async () => {
    // Given
    mockQuittieren.mockResolvedValue({ data: { id: befehlId } });
    seedCache();

    const { result } = renderHook(() => useQuittierenBefehl(einsatzId), {
      wrapper: createWrapper(),
    });

    // When
    result.current.mutate({
      befehlId,
      empfaengerId,
      quittierungArt: QuittierenBefehlDtoQuittierungArtEnum.Verstanden,
    });

    // Then
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockToast.success).toHaveBeenCalledWith('Befehl quittiert');
  });

  it('should show error toast on failed quittierung', async () => {
    // Given
    mockQuittieren.mockRejectedValue(new Error('Server error'));
    seedCache();

    const { result } = renderHook(() => useQuittierenBefehl(einsatzId), {
      wrapper: createWrapper(),
    });

    // When
    result.current.mutate({
      befehlId,
      empfaengerId,
      quittierungArt: QuittierenBefehlDtoQuittierungArtEnum.Verstanden,
    });

    // Then: Wait for retries to complete (calculateRetryDelay mocked to 0ms)
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      'Quittierung fehlgeschlagen',
      expect.objectContaining({
        description: 'Quittierung fehlgeschlagen',
        action: expect.objectContaining({
          label: 'Erneut versuchen',
          onClick: expect.any(Function),
        }),
      }),
    );
  });

  it('should show error toast with retry action on failed quittierung', async () => {
    // Given
    mockQuittieren.mockRejectedValue(new Error('Server error'));
    seedCache();

    const { result } = renderHook(() => useQuittierenBefehl(einsatzId), {
      wrapper: createWrapper(),
    });

    // When
    result.current.mutate({
      befehlId,
      empfaengerId,
      quittierungArt: QuittierenBefehlDtoQuittierungArtEnum.Verstanden,
    });

    // Then
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      'Quittierung fehlgeschlagen',
      expect.objectContaining({
        description: expect.any(String),
        action: expect.objectContaining({
          label: 'Erneut versuchen',
          onClick: expect.any(Function),
        }),
      }),
    );
  });

  it('should enqueue to offline queue when navigator is offline', async () => {
    // Given
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    seedCache();

    const { result } = renderHook(() => useQuittierenBefehl(einsatzId), {
      wrapper: createWrapper(),
    });

    // When
    result.current.mutate({
      befehlId,
      empfaengerId,
      quittierungArt: QuittierenBefehlDtoQuittierungArtEnum.Verstanden,
    });

    // Then: Offline path enqueues and returns fake BefehlDto → mutation succeeds
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockEnqueue).toHaveBeenCalledWith({
      befehlId,
      empfaengerId,
      quittierungArt: QuittierenBefehlDtoQuittierungArtEnum.Verstanden,
    });
    expect(mockToast.info).toHaveBeenCalledWith('Quittierung offline gespeichert – wird gesendet sobald online');
    expect(mockQuittieren).not.toHaveBeenCalled();

    // Cleanup
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });
});
