import { useEffect, useState } from 'react';
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
 * Hook für die Verwaltung der Fahrzeug-Daten
 * 
 * Hinweis: Aktuell gibt es noch keine Fahrzeug-API im Backend.
 * Sobald diese implementiert ist, kann dieser Hook aktualisiert werden,
 * um echte API-Daten zu verwenden.
 */
export const useFahrzeuge = () => {
    // States für Daten, Loading und Error
    const [fahrzeugeData, setFahrzeugeData] = useState({
        data: {
            data: {
                fahrzeugeImEinsatz: [] as FahrzeugMock[]
            }
        },
        isLoading: true,
        error: null as Error | null
    });

    // Laden der Mock-Daten
    useEffect(() => {
        // Simuliere API-Aufruf mit Timeout
        const loadMockData = () => {
            setFahrzeugeData(prev => ({ ...prev, isLoading: true, error: null }));

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

                    setFahrzeugeData({
                        data: {
                            data: {
                                fahrzeugeImEinsatz: mockFahrzeuge
                            }
                        },
                        isLoading: false,
                        error: null
                    });
                } catch (error) {
                    logger.error('Fehler beim Laden der Fahrzeug-Daten:', error);
                    setFahrzeugeData(prev => ({
                        ...prev,
                        isLoading: false,
                        error: error instanceof Error ? error : new Error('Unbekannter Fehler')
                    }));
                }
            }, 300); // 300ms Verzögerung, um Loading-State zu simulieren
        };

        loadMockData();
    }, []);

    // Aktualisieren der Daten
    const refreshFahrzeuge = () => {
        // State zurücksetzen und Mock-Daten neu laden
        setFahrzeugeData(prev => ({ ...prev, isLoading: true, error: null }));

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

                setFahrzeugeData({
                    data: {
                        data: {
                            fahrzeugeImEinsatz: mockFahrzeuge
                        }
                    },
                    isLoading: false,
                    error: null
                });
            } catch (error) {
                logger.error('Fehler beim Aktualisieren der Fahrzeug-Daten:', error);
                setFahrzeugeData(prev => ({
                    ...prev,
                    isLoading: false,
                    error: error instanceof Error ? error : new Error('Unbekannter Fehler')
                }));
            }
        }, 300);
    };

    return {
        fahrzeuge: fahrzeugeData.data,
        isLoading: fahrzeugeData.isLoading,
        error: fahrzeugeData.error,
        refreshFahrzeuge
    };
}; 