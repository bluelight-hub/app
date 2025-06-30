import { useCallback, useMemo, useState } from 'react';
import type { EinsaetzeFilterOptions, EinsaetzeSortOptions } from '../../types/einsaetze';
import { filterEinsaetze } from '../../utils/einsaetze';
import { logger } from '../../utils/logger';
import { paginate, validatePageNumber } from '../../utils/pagination';
import { sortData } from '../../utils/sorting';
import { useCreateEinsatz, useEinsaetze, useEinsatzOperations } from './useEinsatzQueries';

/**
 * Hook für die Einsätze-Übersicht mit Filterung, Sortierung und Paginierung
 */
export const useEinsaetzeUebersicht = () => {
  const [filters, setFilters] = useState<EinsaetzeFilterOptions>({});
  const [sort, setSort] = useState<EinsaetzeSortOptions>({
    field: 'createdAt',
    direction: 'desc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Basis-Hooks verwenden
  const einsaetzeQuery = useEinsaetze();
  const createEinsatzMutation = useCreateEinsatz();
  const { hasEinsatz } = useEinsatzOperations();

  // Gefilterte und sortierte Einsätze
  const processedEinsaetze = useMemo(() => {
    if (!einsaetzeQuery.data) return [];

    logger.debug('Processing Einsätze for overview', {
      total: einsaetzeQuery.data.length,
      filters,
      sort,
    });

    // Filterung
    let filtered = filterEinsaetze(einsaetzeQuery.data, filters);

    // Sortierung mit Utility-Funktion
    if (sort.field) {
      filtered = sortData(filtered, {
        field: sort.field,
        direction: sort.direction,
        customCompare:
          sort.field === 'createdAt' || sort.field === 'updatedAt'
            ? (a, b) => {
                const aDate = new Date(a[sort.field as keyof typeof a] as string);
                const bDate = new Date(b[sort.field as keyof typeof b] as string);
                return aDate.getTime() - bDate.getTime();
              }
            : undefined,
      });
    }

    logger.debug('Processed Einsätze', {
      filtered: filtered.length,
      sorted: true,
    });

    return filtered;
  }, [einsaetzeQuery.data, filters, sort]);

  // Paginierte Daten mit Utility-Funktion
  const paginatedData = useMemo(() => {
    return paginate(processedEinsaetze, currentPage, pageSize);
  }, [processedEinsaetze, currentPage, pageSize]);

  // Filter-Funktionen
  const updateFilters = useCallback((newFilters: Partial<EinsaetzeFilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filtering
    logger.debug('Updated filters', { newFilters });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setCurrentPage(1);
    logger.debug('Cleared all filters');
  }, []);

  // Sortier-Funktionen
  const updateSort = useCallback((newSort: EinsaetzeSortOptions) => {
    setSort(newSort);
    setCurrentPage(1);
    logger.debug('Updated sort', { newSort });
  }, []);

  // Pagination-Funktionen
  const goToPage = useCallback(
    (page: number) => {
      const totalPages = Math.ceil(processedEinsaetze.length / pageSize);
      const validPage = validatePageNumber(page, totalPages);
      setCurrentPage(validPage);
      logger.debug('Changed page', { page: validPage, totalPages });
    },
    [processedEinsaetze.length, pageSize],
  );

  // Statistiken aus paginatedData verwenden
  const stats = useMemo(
    () => ({
      totalEinsaetze: einsaetzeQuery.data?.length ?? 0,
      filteredEinsaetze: processedEinsaetze.length,
      currentPageItems: paginatedData.items.length,
      totalPages: paginatedData.totalPages,
      currentPage: paginatedData.currentPage,
      pageSize: paginatedData.pageSize,
      hasNextPage: paginatedData.hasNextPage,
      hasPreviousPage: paginatedData.hasPreviousPage,
    }),
    [einsaetzeQuery.data, processedEinsaetze.length, paginatedData],
  );

  return {
    // Daten
    einsaetze: paginatedData.items,
    allEinsaetze: processedEinsaetze,

    // Status
    isLoading: einsaetzeQuery.isLoading,
    isError: einsaetzeQuery.isError,
    error: einsaetzeQuery.error,

    // Filter & Sort
    filters,
    sort,
    updateFilters,
    clearFilters,
    updateSort,

    // Pagination
    ...stats,
    goToPage,
    nextPage: () => goToPage(currentPage + 1),
    previousPage: () => goToPage(currentPage - 1),

    // Actions
    createEinsatz: createEinsatzMutation.mutateAsync,
    isCreating: createEinsatzMutation.isPending,
    createError: createEinsatzMutation.error,

    // Utility
    hasEinsatz,
    refetch: einsaetzeQuery.refetch,
  };
};

/**
 * Hook für Einsatz-Suche mit Debouncing
 */
export const useEinsatzSearch = (delay: number = 300) => {
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');

  // Debounce implementation
  const updateSearch = useCallback(
    (text: string) => {
      setSearchText(text);

      const timeoutId = setTimeout(() => {
        setDebouncedSearchText(text);
        logger.debug('Search debounced', { searchText: text });
      }, delay);

      return () => clearTimeout(timeoutId);
    },
    [delay],
  );

  return {
    searchText,
    debouncedSearchText,
    updateSearch,
    clearSearch: () => {
      setSearchText('');
      setDebouncedSearchText('');
    },
  };
};
