import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '../../utils/logger';

/**
 * Interface für Fahrzeug-Objekte
 */
export interface FahrzeugMock {
  optaFunktion: string;
  fullOpta: string;
  id: string;
}

/**
 * Query keys für die Fahrzeug-Abfragen
 */
const FAHRZEUGE_KEYS = {
  all: ['fahrzeuge'] as const,
  list: () => [...FAHRZEUGE_KEYS.all, 'list'] as const,
};

/**
 * Mock-Funktion zum Abrufen der Fahrzeug-Daten
 *
 * Simuliert einen API-Aufruf mit Zeitverzögerung
 */
const fetchFahrzeugeMock = (): Promise<{ fahrzeugeImEinsatz: FahrzeugMock[] }> => {
  return new Promise((resolve, reject) => {
    // Simuliere Netzwerkverzögerung
    setTimeout(() => {
      try {
        // Mock-Daten
        const mockFahrzeuge: FahrzeugMock[] = [
          { optaFunktion: 'RTW', fullOpta: 'RTW-1', id: '1' },
          { optaFunktion: 'RTW', fullOpta: 'RTW-2', id: '2' },
          { optaFunktion: 'NEF', fullOpta: 'NEF-1', id: '3' },
          { optaFunktion: 'KTW', fullOpta: 'KTW-1', id: '4' },
        ];

        resolve({ fahrzeugeImEinsatz: mockFahrzeuge });
      } catch (error) {
        logger.error('Fehler beim Laden der Fahrzeug-Daten:', error);
        reject(error instanceof Error ? error : new Error('Unbekannter Fehler'));
      }
    }, 300);
  });
};

/**
 * Hook für die Verwaltung der Fahrzeug-Daten
 *
 * Hinweis: Aktuell gibt es noch keine Fahrzeug-API im Backend.
 * Sobald diese implementiert ist, kann dieser Hook aktualisiert werden,
 * um echte API-Daten zu verwenden.
 */
export const useFahrzeuge = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: FAHRZEUGE_KEYS.list(),
    queryFn: async () => {
      try {
        return await fetchFahrzeugeMock();
      } catch (err) {
        logger.error('Fehler beim Abrufen der Fahrzeug-Daten:', err);
        throw err;
      }
    },
    staleTime: 60000, // 1 Minute
  });

  // Aktualisieren der Daten
  const refreshFahrzeuge = () => {
    queryClient.invalidateQueries({ queryKey: FAHRZEUGE_KEYS.list() });
  };

  return {
    fahrzeuge: { data: { fahrzeugeImEinsatz: data?.fahrzeugeImEinsatz || [] } },
    isLoading,
    error,
    refreshFahrzeuge,
  };
};
