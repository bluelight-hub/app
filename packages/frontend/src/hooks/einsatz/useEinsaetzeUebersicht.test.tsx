import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useEinsaetzeUebersicht, useEinsatzSearch } from './useEinsaetzeUebersicht';
import type { Einsatz } from '@bluelight-hub/shared/client/models';

// Mock dependencies
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./useEinsatzQueries', () => ({
  useEinsaetze: vi.fn(),
  useCreateEinsatz: vi.fn(),
  useEinsatzOperations: vi.fn(),
}));

vi.mock('../../utils/einsaetze', () => ({
  filterEinsaetze: vi.fn((einsaetze, filters) => {
    if (!filters || Object.keys(filters).length === 0) return einsaetze;

    return einsaetze.filter((e: any) => {
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        return (
          e.name.toLowerCase().includes(searchLower) || (e.beschreibung?.toLowerCase().includes(searchLower) ?? false)
        );
      }
      return true;
    });
  }),
}));

import { useEinsaetze, useCreateEinsatz, useEinsatzOperations } from './useEinsatzQueries';
import { filterEinsaetze } from '../../utils/einsaetze';

describe('useEinsaetzeUebersicht', () => {
  const mockEinsaetze: Einsatz[] = [
    {
      id: '1',
      name: 'Einsatz A',
      beschreibung: 'Beschreibung A',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      userId: 'user1',
      user: {
        id: 'user1',
        email: 'test@example.com',
        username: 'testuser',
        profile: { firstName: 'Test', lastName: 'User' },
      },
    },
    {
      id: '2',
      name: 'Einsatz B',
      beschreibung: 'Beschreibung B',
      createdAt: new Date('2024-01-02T10:00:00Z'),
      updatedAt: new Date('2024-01-02T10:00:00Z'),
      userId: 'user1',
      user: {
        id: 'user1',
        email: 'test@example.com',
        username: 'testuser',
        profile: { firstName: 'Test', lastName: 'User' },
      },
    },
    {
      id: '3',
      name: 'Einsatz C',
      beschreibung: 'Beschreibung C',
      createdAt: new Date('2024-01-03T10:00:00Z'),
      updatedAt: new Date('2024-01-03T10:00:00Z'),
      userId: 'user1',
      user: {
        id: 'user1',
        email: 'test@example.com',
        username: 'testuser',
        profile: { firstName: 'Test', lastName: 'User' },
      },
    },
  ];

  // Generate more mock data for pagination tests
  const manyEinsaetze = Array.from({ length: 50 }, (_, i) => {
    // Create valid dates spreading across multiple months
    const baseDate = new Date('2024-01-01T10:00:00Z');
    const createdAt = new Date(baseDate);
    createdAt.setDate(createdAt.getDate() + i);

    return {
      id: `${i + 1}`,
      name: `Einsatz ${i + 1}`,
      beschreibung: `Beschreibung ${i + 1}`,
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
      userId: 'user1',
      user: {
        id: 'user1',
        email: 'test@example.com',
        username: 'testuser',
        profile: { firstName: 'Test', lastName: 'User' },
      },
    };
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();

    // Default mocks
    (useEinsaetze as any).mockReturnValue({
      data: mockEinsaetze,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    (useCreateEinsatz as any).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    });

    (useEinsatzOperations as any).mockReturnValue({
      hasEinsatz: vi.fn().mockReturnValue(false),
    });
  });

  describe('data processing', () => {
    it('should return all einsaetze when no filters applied', () => {
      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      expect(result.current.allEinsaetze).toHaveLength(3);
      expect(result.current.einsaetze).toHaveLength(3);
    });

    it('should handle loading state', () => {
      (useEinsaetze as any).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.einsaetze).toHaveLength(0);
    });

    it('should handle error state', () => {
      const mockError = new Error('Failed to fetch');
      (useEinsaetze as any).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: mockError,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mockError);
    });
  });

  describe('filtering', () => {
    it('should apply filters', () => {
      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      act(() => {
        result.current.updateFilters({ searchText: 'Einsatz A' });
      });

      expect(result.current.filters.searchText).toBe('Einsatz A');
      expect(filterEinsaetze).toHaveBeenCalledWith(mockEinsaetze, { searchText: 'Einsatz A' });
    });

    it('should clear filters', () => {
      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      act(() => {
        result.current.updateFilters({ searchText: 'test' });
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({});
    });

    it('should reset to first page when filtering', () => {
      (useEinsaetze as any).mockReturnValue({
        data: manyEinsaetze,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      // Go to page 2
      act(() => {
        result.current.goToPage(2);
      });

      expect(result.current.currentPage).toBe(2);

      // Apply filter
      act(() => {
        result.current.updateFilters({ searchText: 'test' });
      });

      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('sorting', () => {
    it('should sort by name ascending', () => {
      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      act(() => {
        result.current.updateSort({ field: 'name', direction: 'asc' });
      });

      expect(result.current.einsaetze[0].name).toBe('Einsatz A');
      expect(result.current.einsaetze[2].name).toBe('Einsatz C');
    });

    it('should sort by name descending', () => {
      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      act(() => {
        result.current.updateSort({ field: 'name', direction: 'desc' });
      });

      expect(result.current.einsaetze[0].name).toBe('Einsatz C');
      expect(result.current.einsaetze[2].name).toBe('Einsatz A');
    });

    it('should sort by createdAt', () => {
      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      act(() => {
        result.current.updateSort({ field: 'createdAt', direction: 'asc' });
      });

      expect(result.current.einsaetze[0].id).toBe('1');
      expect(result.current.einsaetze[2].id).toBe('3');
    });

    it('should default to createdAt desc', () => {
      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      expect(result.current.sort).toEqual({ field: 'createdAt', direction: 'desc' });
      expect(result.current.einsaetze[0].id).toBe('3');
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      (useEinsaetze as any).mockReturnValue({
        data: manyEinsaetze,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('should paginate data with 20 items per page', () => {
      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      expect(result.current.einsaetze).toHaveLength(20);
      expect(result.current.totalPages).toBe(3);
      expect(result.current.pageSize).toBe(20);
    });

    it('should navigate to next page', () => {
      (useEinsaetze as any).mockReturnValue({
        data: manyEinsaetze,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      // Die Standardsortierung ist createdAt desc, daher beginnt die erste Seite bei ID 50
      expect(result.current.einsaetze[0].id).toBe('50'); // Neueste zuerst
      expect(result.current.einsaetze[19].id).toBe('31'); // Letztes Element auf Seite 1

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.currentPage).toBe(2);
      // Seite 2 sollte Elemente 30-11 haben (bei desc Sortierung)
      expect(result.current.einsaetze[0].id).toBe('30'); // Erstes Element auf Seite 2
      expect(result.current.einsaetze[19].id).toBe('11'); // Letztes Element auf Seite 2
    });

    it('should navigate to previous page', () => {
      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      act(() => {
        result.current.goToPage(2);
      });

      act(() => {
        result.current.previousPage();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it('should handle page boundaries', () => {
      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      // Try to go before first page
      act(() => {
        result.current.goToPage(0);
      });
      expect(result.current.currentPage).toBe(1);

      // Try to go after last page
      act(() => {
        result.current.goToPage(10);
      });
      expect(result.current.currentPage).toBe(3);
    });

    it('should provide correct pagination stats', () => {
      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      expect(result.current.totalEinsaetze).toBe(50);
      expect(result.current.filteredEinsaetze).toBe(50);
      expect(result.current.currentPageItems).toBe(20);
      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.hasPreviousPage).toBe(false);

      act(() => {
        result.current.goToPage(3);
      });

      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.hasPreviousPage).toBe(true);
      expect(result.current.currentPageItems).toBe(10); // Last page has only 10 items
    });
  });

  describe('actions', () => {
    it('should expose createEinsatz mutation', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'new' });
      (useCreateEinsatz as any).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: null,
      });

      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      await act(async () => {
        await result.current.createEinsatz({ name: 'New Einsatz' } as any);
      });

      expect(mockMutateAsync).toHaveBeenCalledWith({ name: 'New Einsatz' });
    });

    it('should expose create loading state', () => {
      (useCreateEinsatz as any).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
        error: null,
      });

      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      expect(result.current.isCreating).toBe(true);
    });

    it('should expose create error state', () => {
      const mockError = new Error('Create failed');
      (useCreateEinsatz as any).mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
        error: mockError,
      });

      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      expect(result.current.createError).toBe(mockError);
    });

    it('should expose refetch function', () => {
      const mockRefetch = vi.fn();
      (useEinsaetze as any).mockReturnValue({
        data: mockEinsaetze,
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useEinsaetzeUebersicht(), { wrapper });

      result.current.refetch();

      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});

describe('useEinsatzSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should debounce search text', async () => {
    const { result } = renderHook(() => useEinsatzSearch(300));

    act(() => {
      result.current.updateSearch('test');
    });

    expect(result.current.searchText).toBe('test');
    expect(result.current.debouncedSearchText).toBe('');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedSearchText).toBe('test');
  });

  it('should clear search', () => {
    const { result } = renderHook(() => useEinsatzSearch());

    act(() => {
      result.current.updateSearch('test');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchText).toBe('');
    expect(result.current.debouncedSearchText).toBe('');
  });

  it('should use custom delay', () => {
    const { result } = renderHook(() => useEinsatzSearch(500));

    act(() => {
      result.current.updateSearch('test');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedSearchText).toBe('');

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.debouncedSearchText).toBe('test');
  });
});
