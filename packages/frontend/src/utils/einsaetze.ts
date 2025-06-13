import type { Einsatz } from '@bluelight-hub/shared/client/models';
import type { EinsaetzeFilterOptions } from '../types/einsaetze';

/**
 * Filtert Einsätze basierend auf den gegebenen Filter-Optionen
 */
export const filterEinsaetze = (
    einsaetze: Einsatz[],
    filters: EinsaetzeFilterOptions
): Einsatz[] => {
    return einsaetze.filter(einsatz => {
        // Suchtext-Filter
        if (filters.searchText) {
            const searchLower = filters.searchText.toLowerCase();
            const nameMatch = einsatz.name.toLowerCase().includes(searchLower);
            const descriptionMatch = einsatz.beschreibung?.toLowerCase().includes(searchLower) ?? false;

            if (!nameMatch && !descriptionMatch) {
                return false;
            }
        }

        // Zeitraum-Filter
        if (filters.dateRange) {
            const einsatzDate = new Date(einsatz.createdAt);
            if (einsatzDate < filters.dateRange.start || einsatzDate > filters.dateRange.end) {
                return false;
            }
        }

        // Archiv-Filter (vorerst alle als aktiv behandeln)
        // TODO: Implementiere Archiv-Status wenn verfügbar
        if (filters.showArchived === false) {
            // Alle Einsätze als aktiv behandeln
            return true;
        }

        return true;
    });
};

/**
 * Formatiert ein Datum für die Anzeige
 */
export const formatDate = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Erstellt einen Debounce-Hook für Search-Inputs
 */
export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}; 