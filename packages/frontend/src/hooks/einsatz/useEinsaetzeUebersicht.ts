import { useCallback, useMemo, useState } from 'react';
import type { EinsaetzeFilterOptions, EinsaetzeSortOptions } from '../../types/einsaetze';
import { filterEinsaetze } from '../../utils/einsaetze';
import { logger } from '../../utils/logger';
import { useCreateEinsatz, useEinsaetze, useEinsatzOperations } from './useEinsatzQueries';

/**
 * Hook für die Einsätze-Übersicht mit Filterung, Sortierung und Paginierung
 */
export const useEinsaetzeUebersicht = () => {
    const [filters, setFilters] = useState<EinsaetzeFilterOptions>({});
    const [sort, setSort] = useState<EinsaetzeSortOptions>({
        field: 'createdAt',
        direction: 'desc'
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
            sort
        });

        // Filterung
        let filtered = filterEinsaetze(einsaetzeQuery.data, filters);

        // Sortierung
        filtered = [...filtered].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sort.field) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'createdAt':
                    aValue = new Date(a.createdAt);
                    bValue = new Date(b.createdAt);
                    break;
                case 'updatedAt':
                    aValue = new Date(a.updatedAt);
                    bValue = new Date(b.updatedAt);
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        logger.debug('Processed Einsätze', {
            filtered: filtered.length,
            sorted: true
        });

        return filtered;
    }, [einsaetzeQuery.data, filters, sort]);

    // Paginierte Daten
    const paginatedEinsaetze = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return processedEinsaetze.slice(startIndex, endIndex);
    }, [processedEinsaetze, currentPage, pageSize]);

    // Filter-Funktionen
    const updateFilters = useCallback((newFilters: Partial<EinsaetzeFilterOptions>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
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
    const goToPage = useCallback((page: number) => {
        const maxPage = Math.ceil(processedEinsaetze.length / pageSize);
        const validPage = Math.max(1, Math.min(page, maxPage));
        setCurrentPage(validPage);
        logger.debug('Changed page', { page: validPage, maxPage });
    }, [processedEinsaetze.length, pageSize]);

    // Statistiken
    const stats = useMemo(() => ({
        totalEinsaetze: einsaetzeQuery.data?.length ?? 0,
        filteredEinsaetze: processedEinsaetze.length,
        currentPageItems: paginatedEinsaetze.length,
        totalPages: Math.ceil(processedEinsaetze.length / pageSize),
        currentPage,
        pageSize,
        hasNextPage: currentPage < Math.ceil(processedEinsaetze.length / pageSize),
        hasPreviousPage: currentPage > 1
    }), [einsaetzeQuery.data, processedEinsaetze.length, paginatedEinsaetze.length, currentPage, pageSize]);

    return {
        // Daten
        einsaetze: paginatedEinsaetze,
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
        refetch: einsaetzeQuery.refetch
    };
};

/**
 * Hook für Einsatz-Suche mit Debouncing
 */
export const useEinsatzSearch = (delay: number = 300) => {
    const [searchText, setSearchText] = useState('');
    const [debouncedSearchText, setDebouncedSearchText] = useState('');

    // Debounce implementation
    const updateSearch = useCallback((text: string) => {
        setSearchText(text);

        const timeoutId = setTimeout(() => {
            setDebouncedSearchText(text);
            logger.debug('Search debounced', { searchText: text });
        }, delay);

        return () => clearTimeout(timeoutId);
    }, [delay]);

    return {
        searchText,
        debouncedSearchText,
        updateSearch,
        clearSearch: () => {
            setSearchText('');
            setDebouncedSearchText('');
        }
    };
}; 