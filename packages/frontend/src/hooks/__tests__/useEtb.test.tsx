import { api } from '@/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, expect, it, vi } from 'vitest';
import { useCreateEtb, useCreateEtbEintrag, useDeleteEtbEintrag, useEtb, useEtbOperations, useTextbausteine, useUpdateEtbEintrag } from '../useEtb';

// Mock modules
vi.mock('@/api');
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useEtb hooks', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0 },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEtb', () => {
    it('should fetch ETB data for a given einsatzId', async () => {
      const mockEtbData = {
        data: {
          id: 'etb-123',
          einsatzId: 'einsatz-123',
          eintraege: [],
        },
        meta: {},
      };

      vi.mocked(api).etb = vi.fn().mockReturnValue({
        etbControllerGetEtbByEinsatzIdVAlpha: vi.fn().mockResolvedValue(mockEtbData),
      });

      const { result } = renderHook(() => useEtb('einsatz-123', 1, 20), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockEtbData);
      expect(api.etb().etbControllerGetEtbByEinsatzIdVAlpha).toHaveBeenCalledWith({
        einsatzId: 'einsatz-123',
        page: 1,
        limit: 20,
      });
    });

    it('should not fetch when einsatzId is not provided', () => {
      vi.mocked(api).etb = vi.fn().mockReturnValue({
        etbControllerGetEtbByEinsatzIdVAlpha: vi.fn(),
      });

      const { result } = renderHook(() => useEtb(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(api.etb).not.toHaveBeenCalled();
    });
  });

  describe('useTextbausteine', () => {
    it('should fetch Textbausteine data', async () => {
      const mockTextbausteineData = {
        data: [
          { id: '1', kategorie: 'MELDUNG', text: 'Einsatz begonnen' },
          { id: '2', kategorie: 'MASSNAHME', text: 'Brandbekämpfung' },
        ],
        meta: {},
      };

      vi.mocked(api).etb = vi.fn().mockReturnValue({
        etbControllerGetTextbausteineVAlpha: vi.fn().mockResolvedValue(mockTextbausteineData),
      });

      const { result } = renderHook(() => useTextbausteine(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockTextbausteineData);
      expect(api.etb().etbControllerGetTextbausteineVAlpha).toHaveBeenCalled();
    });
  });

  describe('useCreateEtb', () => {
    it('should create a new ETB', async () => {
      const mockResponse = {
        data: {
          id: 'etb-new',
          einsatzId: 'einsatz-123',
          eintraege: [],
        },
        meta: {},
      };

      vi.mocked(api).etb = vi.fn().mockReturnValue({
        etbControllerCreateEtbVAlpha: vi.fn().mockResolvedValue(mockResponse),
      });

      const { result } = renderHook(() => useCreateEtb(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          einsatzId: 'einsatz-123',
          einsatzleiter: 'Max Mustermann',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.etb().etbControllerCreateEtbVAlpha).toHaveBeenCalledWith({
        createEtbDto: {
          einsatzId: 'einsatz-123',
          einsatzleiter: 'Max Mustermann',
        },
      });

      expect(toast.success).toHaveBeenCalledWith('ETB erstellt', {
        description: 'Das Einsatztagebuch wurde erfolgreich erstellt.',
      });
    });
  });

  describe('useCreateEtbEintrag', () => {
    it('should create a new ETB entry', async () => {
      const mockResponse = {
        data: {
          id: 'eintrag-new',
          etb: {
            id: 'etb-123',
            einsatzId: 'einsatz-123',
          },
          zeit: '2024-01-01T10:00:00Z',
          nachricht: 'Test entry',
        },
        meta: {},
      };

      vi.mocked(api).etb = vi.fn().mockReturnValue({
        etbControllerCreateEintragVAlpha: vi.fn().mockResolvedValue(mockResponse),
      });

      const { result } = renderHook(() => useCreateEtbEintrag(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          etbId: 'etb-123',
          data: {
            zeit: '2024-01-01T10:00:00Z',
            absender: 'EL',
            empfaenger: 'Alle',
            nachricht: 'Test entry',
            kategorie: 'MELDUNG',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.etb().etbControllerCreateEintragVAlpha).toHaveBeenCalledWith({
        id: 'etb-123',
        createEtbEintragDto: {
          zeit: '2024-01-01T10:00:00Z',
          absender: 'EL',
          empfaenger: 'Alle',
          nachricht: 'Test entry',
          kategorie: 'MELDUNG',
        },
      });

      expect(toast.success).toHaveBeenCalledWith('Eintrag hinzugefügt', {
        description: 'Der ETB-Eintrag wurde erfolgreich erstellt.',
      });
    });
  });

  describe('useUpdateEtbEintrag', () => {
    it('should update an ETB entry', async () => {
      const mockResponse = {
        data: {
          id: 'eintrag-123',
          etb: {
            id: 'etb-123',
            einsatzId: 'einsatz-123',
          },
          nachricht: 'Updated entry',
        },
        meta: {},
      };

      vi.mocked(api).etb = vi.fn().mockReturnValue({
        etbControllerUpdateEintragVAlpha: vi.fn().mockResolvedValue(mockResponse),
      });

      const { result } = renderHook(() => useUpdateEtbEintrag(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          eintragId: 'eintrag-123',
          data: {
            nachricht: 'Updated entry',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.etb().etbControllerUpdateEintragVAlpha).toHaveBeenCalledWith({
        id: 'eintrag-123',
        updateEtbEintragDto: {
          nachricht: 'Updated entry',
        },
      });

      expect(toast.success).toHaveBeenCalledWith('Eintrag aktualisiert', {
        description: 'Der ETB-Eintrag wurde erfolgreich aktualisiert.',
      });
    });
  });

  describe('useDeleteEtbEintrag', () => {
    it('should delete an ETB entry', async () => {
      vi.mocked(api).etb = vi.fn().mockReturnValue({
        etbControllerDeleteEintragVAlpha: vi.fn().mockResolvedValue(undefined),
      });

      const { result } = renderHook(() => useDeleteEtbEintrag(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          eintragId: 'eintrag-123',
          einsatzId: 'einsatz-123',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.etb().etbControllerDeleteEintragVAlpha).toHaveBeenCalledWith({
        id: 'eintrag-123',
      });

      expect(toast.success).toHaveBeenCalledWith('Eintrag gelöscht', {
        description: 'Der ETB-Eintrag wurde erfolgreich gelöscht.',
      });
    });
  });

  describe('useEtbOperations', () => {
    it('should provide all ETB operations', async () => {
      const mockEtbData = {
        data: {
          id: 'etb-123',
          einsatzId: 'einsatz-123',
          eintraege: [],
        },
        meta: {},
      };

      const mockTextbausteineData = {
        data: [{ id: '1', kategorie: 'MELDUNG', text: 'Test' }],
        meta: {},
      };

      vi.mocked(api).etb = vi.fn().mockReturnValue({
        etbControllerGetEtbByEinsatzIdVAlpha: vi.fn().mockResolvedValue(mockEtbData),
        etbControllerGetTextbausteineVAlpha: vi.fn().mockResolvedValue(mockTextbausteineData),
        etbControllerCreateEtbVAlpha: vi.fn(),
        etbControllerCreateEintragVAlpha: vi.fn(),
        etbControllerUpdateEintragVAlpha: vi.fn(),
        etbControllerDeleteEintragVAlpha: vi.fn(),
      });

      const { result } = renderHook(() => useEtbOperations('einsatz-123'), {
        wrapper: createWrapper(),
      });

      // Check initial loading state
      expect(result.current.isLoadingEtb).toBe(true);
      expect(result.current.isLoadingTextbausteine).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoadingEtb).toBe(false);
        expect(result.current.isLoadingTextbausteine).toBe(false);
      });

      // Check data
      expect(result.current.etb).toEqual(mockEtbData);
      expect(result.current.textbausteine).toEqual(mockTextbausteineData);

      // Check that mutation functions are available
      expect(result.current.createEtb).toBeDefined();
      expect(result.current.createEintrag).toBeDefined();
      expect(result.current.updateEintrag).toBeDefined();
      expect(result.current.deleteEintrag).toBeDefined();

      // Check mutation states
      expect(result.current.isCreatingEtb).toBe(false);
      expect(result.current.isCreatingEintrag).toBe(false);
      expect(result.current.isUpdatingEintrag).toBe(false);
      expect(result.current.isDeletingEintrag).toBe(false);
    });

    it('should handle case when no einsatzId is provided', () => {
      const { result } = renderHook(() => useEtbOperations(), {
        wrapper: createWrapper(),
      });

      expect(result.current.etb).toBeUndefined();
      expect(result.current.isLoadingEtb).toBe(false);
      expect(result.current.etbError).toBeNull();

      // Mutations should still be available
      expect(result.current.createEtb).toBeDefined();
      expect(result.current.createEintrag).toBeDefined();
      expect(result.current.updateEintrag).toBeDefined();
      expect(result.current.deleteEintrag).toBeDefined();
    });
  });
});
