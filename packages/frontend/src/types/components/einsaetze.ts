import type { Einsatz } from '@bluelight-hub/shared/client';
import type { React } from 'react';

/**
 * Props für die EinsaetzeTable-Komponente
 */
export interface EinsaetzeTableProps {
    /**
     * Die anzuzeigenden Einsätze
     */
    einsaetze: Einsatz[];

    /**
     * Loading-State der Tabelle
     */
    loading?: boolean;

    /**
     * Pagination-Konfiguration
     */
    pagination?: {
        current: number;
        pageSize: number;
        total: number;
    };

    /**
     * Callback für Paginierung
     */
    onPageChange?: (page: number, pageSize: number) => void;

    /**
     * Callback für Sortierung
     */
    onSortChange?: (sorter: any) => void;

    /**
     * Callback für Filter-Änderungen
     */
    onFilterChange?: (filters: Record<string, React.Key[] | null>) => void;

    /**
     * Callback für Einsatz-Auswahl
     */
    onEinsatzSelect?: (einsatzId: string) => void;

    /**
     * Ausgewählte Einsätze für Row Selection
     */
    selectedRowKeys?: React.Key[];

    /**
     * Callback für Row Selection Änderungen
     */
    onSelectionChange?: (selectedRowKeys: React.Key[], selectedRows: Einsatz[]) => void;
}