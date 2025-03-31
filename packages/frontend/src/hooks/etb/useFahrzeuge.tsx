import { useState } from 'react';

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
 * Später kann dieser Hook durch einen API-Client ersetzt werden
 */
export const useFahrzeuge = () => {
    // Mock-Daten
    const [fahrzeugeData] = useState({
        data: {
            data: {
                fahrzeugeImEinsatz: [
                    { optaFunktion: 'RTW', fullOpta: 'RTW-1', id: '1' },
                    { optaFunktion: 'RTW', fullOpta: 'RTW-2', id: '2' },
                    { optaFunktion: 'NEF', fullOpta: 'NEF-1', id: '3' },
                    { optaFunktion: 'KTW', fullOpta: 'KTW-1', id: '4' },
                ] as FahrzeugMock[]
            }
        }
    });

    return {
        fahrzeuge: fahrzeugeData,
        isLoading: false,
        isError: false
    };
}; 