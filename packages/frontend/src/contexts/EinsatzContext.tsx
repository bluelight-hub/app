import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Einsatz } from '@bluelight-hub/shared/client';
import { logger } from '../utils/logger';

interface EinsatzContextType {
    selectedEinsatz: Einsatz | null;
    selectEinsatz: (einsatz: Einsatz) => void;
    clearSelectedEinsatz: () => void;
    isEinsatzSelected: boolean;
}

const EinsatzContext = createContext<EinsatzContextType | null>(null);

interface EinsatzProviderProps {
    children: ReactNode;
}

export const EinsatzProvider: React.FC<EinsatzProviderProps> = ({ children }) => {
    const [selectedEinsatz, setSelectedEinsatz] = useState<Einsatz | null>(null);

    // Lade den gespeicherten Einsatz beim Start
    useEffect(() => {
        const savedEinsatzId = localStorage.getItem('selectedEinsatzId');
        const savedEinsatzName = localStorage.getItem('selectedEinsatzName');
        
        if (savedEinsatzId && savedEinsatzName) {
            // Erstelle ein minimales Einsatz-Objekt aus den gespeicherten Daten
            // In einer echten App würde man hier den vollständigen Einsatz laden
            setSelectedEinsatz({
                id: savedEinsatzId,
                name: savedEinsatzName,
                beschreibung: '',
                createdAt: new Date(),
                updatedAt: new Date()
            } as Einsatz);
            
            logger.debug('Loaded selected Einsatz from localStorage', { 
                id: savedEinsatzId, 
                name: savedEinsatzName 
            });
        }
    }, []);

    const selectEinsatz = (einsatz: Einsatz) => {
        setSelectedEinsatz(einsatz);
        localStorage.setItem('selectedEinsatzId', einsatz.id);
        localStorage.setItem('selectedEinsatzName', einsatz.name);
        logger.info('Einsatz selected', { id: einsatz.id, name: einsatz.name });
    };

    const clearSelectedEinsatz = () => {
        setSelectedEinsatz(null);
        localStorage.removeItem('selectedEinsatzId');
        localStorage.removeItem('selectedEinsatzName');
        logger.info('Selected Einsatz cleared');
    };

    return (
        <EinsatzContext.Provider
            value={{
                selectedEinsatz,
                selectEinsatz,
                clearSelectedEinsatz,
                isEinsatzSelected: !!selectedEinsatz
            }}
        >
            {children}
        </EinsatzContext.Provider>
    );
};

export const useEinsatzContext = () => {
    const context = useContext(EinsatzContext);
    if (!context) {
        throw new Error('useEinsatzContext must be used within an EinsatzProvider');
    }
    return context;
};

export default EinsatzContext;