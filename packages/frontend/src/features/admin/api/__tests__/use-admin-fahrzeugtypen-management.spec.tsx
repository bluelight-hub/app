import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateFahrzeugtypDto, FahrzeugtypDto, UpdateFahrzeugtypDto } from '@/features/admin/api';
import { ADMIN_QUERY_KEYS } from '../queries';
import { useAdminFahrzeugtypenManagement } from '../use-admin-fahrzeugtypen-management';

const { mockFindAll, mockCreate, mockUpdate, mockDeactivate } = vi.hoisted(() => ({
  mockFindAll: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDeactivate: vi.fn(),
}));

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock('@/shared/api/api', () => ({
  api: {
    adminKraefteFahrzeugtypen: () => ({
      adminFahrzeugtypenControllerFindAllVAlpha: mockFindAll,
      adminFahrzeugtypenControllerCreateVAlpha: mockCreate,
      adminFahrzeugtypenControllerUpdateVAlpha: mockUpdate,
      adminFahrzeugtypenControllerDeactivateVAlpha: mockDeactivate,
    }),
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useAdminFahrzeugtypenManagement', () => {
  let queryClient: QueryClient;

  const baseFahrzeugtypen: FahrzeugtypDto[] = [
    {
      id: 'fz-1',
      code: 'RTW',
      bezeichnung: 'Rettungswagen',
      kategorie: 'RETTUNGSDIENST',
      sollbesatzung: { fahrer: 1, sanitaeter: 2 },
      istAktiv: true,
      sortOrder: 1,
      createdAt: new Date('2025-01-01T10:00:00.000Z'),
      updatedAt: new Date('2025-01-01T10:00:00.000Z'),
      createdBy: 'admin-1',
      updatedBy: 'admin-1',
    },
    {
      id: 'fz-2',
      code: 'NEF',
      bezeichnung: 'Notarzteinsatzfahrzeug',
      kategorie: 'RETTUNGSDIENST',
      sollbesatzung: { fahrer: 1, notarzt: 1 },
      istAktiv: true,
      sortOrder: 2,
      createdAt: new Date('2025-01-01T10:00:00.000Z'),
      updatedAt: new Date('2025-01-01T10:00:00.000Z'),
      createdBy: 'admin-1',
      updatedBy: 'admin-1',
    },
  ];

  const createWrapper = () => {
    return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockFindAll.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockDeactivate.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();

    mockFindAll.mockResolvedValue({ data: baseFahrzeugtypen });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('verwendet korrekten Query-Key für Fahrzeugtypen', () => {
    expect(ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.all()).toEqual(['admin', 'kraefte', 'fahrzeugtypen']);
    expect(ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.list()).toEqual(['admin', 'kraefte', 'fahrzeugtypen', 'list']);
    expect(ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.detail('fz-1')).toEqual(['admin', 'kraefte', 'fahrzeugtypen', 'detail', 'fz-1']);
  });

  it('lädt Fahrzeugtypen und extrahiert response.data', async () => {
    const { result } = renderHook(() => useAdminFahrzeugtypenManagement(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFindAll).toHaveBeenCalledWith({ istAktiv: undefined });
    expect(result.current.fahrzeugtypen).toEqual(baseFahrzeugtypen);
  });

  it('invalidiert Fahrzeugtypen-Queries nach Create, Update und Deactivate', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const createdPayload: CreateFahrzeugtypDto = {
      code: 'KTW',
      bezeichnung: 'Krankentransportwagen',
      kategorie: 'TRANSPORT',
    };

    mockCreate.mockResolvedValue({
      data: {
        ...baseFahrzeugtypen[0],
        id: 'fz-3',
        code: 'KTW',
        bezeichnung: 'Krankentransportwagen',
        kategorie: 'TRANSPORT',
      },
    });

    mockUpdate.mockResolvedValue({
      data: {
        ...baseFahrzeugtypen[0],
        bezeichnung: 'Rettungswagen (neu)',
      },
    });

    mockDeactivate.mockResolvedValue({
      data: {
        ...baseFahrzeugtypen[0],
        istAktiv: false,
      },
    });

    const { result } = renderHook(() => useAdminFahrzeugtypenManagement(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.createFahrzeugtyp(createdPayload);
    });

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());

    act(() => {
      result.current.updateFahrzeugtyp({
        id: 'fz-1',
        data: { bezeichnung: 'Rettungswagen (neu)' },
      });
    });

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());

    act(() => {
      result.current.deactivateFahrzeugtyp('fz-1');
    });

    await waitFor(() => expect(mockDeactivate).toHaveBeenCalled());

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.all(),
        exact: false,
      });
    });
  });

  it('bereinigt Sollbesatzung vor API-Calls (leer/null/NaN/Dezimalwerte)', async () => {
    mockCreate.mockResolvedValue({
      data: {
        ...baseFahrzeugtypen[0],
        id: 'fz-3',
      },
    });

    mockUpdate.mockResolvedValue({
      data: {
        ...baseFahrzeugtypen[0],
      },
    });

    const { result } = renderHook(() => useAdminFahrzeugtypenManagement(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.createFahrzeugtyp({
        code: 'KTW',
        bezeichnung: 'Krankentransportwagen',
        kategorie: 'TRANSPORT',
        sollbesatzung: {
          fahrer: 1,
          notarzt: '' as unknown as number,
          funktrupp: 1.5 as unknown as number,
          helfer: null as unknown as number,
        },
      });
    });

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        createFahrzeugtypDto: expect.objectContaining({
          sollbesatzung: {
            fahrer: 1,
          },
        }),
      }),
    );

    act(() => {
      result.current.updateFahrzeugtyp({
        id: 'fz-1',
        data: {
          sollbesatzung: {
            fahrer: 2,
            notarzt: 'NaN' as unknown as number,
          },
        },
      });
    });

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        id: 'fz-1',
        updateFahrzeugtypDto: {
          sollbesatzung: {
            fahrer: 2,
          },
        },
      }),
    );

    act(() => {
      result.current.updateFahrzeugtyp({
        id: 'fz-1',
        data: {
          sollbesatzung: {},
        },
      });
    });

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        id: 'fz-1',
        updateFahrzeugtypDto: {
          sollbesatzung: {},
        },
      }),
    );
  });

  it('führt bei Update ein Optimistic Update aus und rollt bei Fehler zurück', async () => {
    queryClient.setQueryData(ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.list(), baseFahrzeugtypen);

    let rejectUpdatePromise: ((reason?: unknown) => void) | null = null;
    mockUpdate.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectUpdatePromise = reject;
        }),
    );

    const { result } = renderHook(() => useAdminFahrzeugtypenManagement(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updatePayload: UpdateFahrzeugtypDto = { bezeichnung: 'RTW Neu' };

    act(() => {
      result.current.updateFahrzeugtyp({ id: 'fz-1', data: updatePayload });
    });

    await waitFor(() => {
      const optimisticData = queryClient.getQueryData<FahrzeugtypDto[]>(ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.list());
      expect(optimisticData?.find((item) => item.id === 'fz-1')?.bezeichnung).toBe('RTW Neu');
    });

    await act(async () => {
      rejectUpdatePromise?.(new Error('Update fehlgeschlagen'));
    });

    await waitFor(() => {
      const rolledBackData = queryClient.getQueryData<FahrzeugtypDto[]>(ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.list());
      expect(rolledBackData).toEqual(baseFahrzeugtypen);
    });
  });

  it('setzt bei Deactivate im Optimistic Update istAktiv auf false', async () => {
    queryClient.setQueryData(ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.list(), baseFahrzeugtypen);

    let resolveDeactivatePromise: ((value: { data: FahrzeugtypDto }) => void) | null = null;
    mockDeactivate.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDeactivatePromise = resolve;
        }),
    );

    const { result } = renderHook(() => useAdminFahrzeugtypenManagement(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.deactivateFahrzeugtyp('fz-1');
    });

    await waitFor(() => {
      const optimisticData = queryClient.getQueryData<FahrzeugtypDto[]>(ADMIN_QUERY_KEYS.kraefte.fahrzeugtypen.list());
      expect(optimisticData?.find((item) => item.id === 'fz-1')?.istAktiv).toBe(false);
    });

    await act(async () => {
      resolveDeactivatePromise?.({
        data: {
          ...baseFahrzeugtypen[0],
          istAktiv: false,
        },
      });
    });

    await waitFor(() => expect(mockDeactivate).toHaveBeenCalledWith({ id: 'fz-1' }));
  });
});
