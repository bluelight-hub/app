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
    const savedEinsatzData = localStorage.getItem('selectedEinsatz');

    if (savedEinsatzData) {
      try {
        const einsatz = JSON.parse(savedEinsatzData);
        // Konvertiere Datum-Strings zurück zu Date-Objekten
        setSelectedEinsatz({
          ...einsatz,
          createdAt: new Date(einsatz.createdAt),
          updatedAt: new Date(einsatz.updatedAt),
        });

        logger.debug('Loaded selected Einsatz from localStorage', {
          id: einsatz.id,
          name: einsatz.name,
        });
      } catch (error) {
        logger.error('Failed to parse saved Einsatz', error);
        localStorage.removeItem('selectedEinsatz');
        // Fallback auf alte Methode für Abwärtskompatibilität
        const savedEinsatzId = localStorage.getItem('selectedEinsatzId');
        const savedEinsatzName = localStorage.getItem('selectedEinsatzName');

        if (savedEinsatzId && savedEinsatzName) {
          logger.warn('Using legacy localStorage format, please re-select Einsatz');
          // Aufräumen der alten Keys
          localStorage.removeItem('selectedEinsatzId');
          localStorage.removeItem('selectedEinsatzName');
        }
      }
    }
  }, []);

  const selectEinsatz = (einsatz: Einsatz) => {
    setSelectedEinsatz(einsatz);
    // Speichere den vollständigen Einsatz
    try {
      localStorage.setItem('selectedEinsatz', JSON.stringify(einsatz));
      // Behalte die alten Keys für Abwärtskompatibilität (können später entfernt werden)
      localStorage.setItem('selectedEinsatzId', einsatz.id);
      localStorage.setItem('selectedEinsatzName', einsatz.name);
      logger.info('Einsatz selected', { id: einsatz.id, name: einsatz.name });
    } catch (error) {
      logger.error('Failed to save Einsatz to localStorage', error);
    }
  };

  const clearSelectedEinsatz = () => {
    setSelectedEinsatz(null);
    localStorage.removeItem('selectedEinsatz');
    // Entferne auch die alten Keys
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
        isEinsatzSelected: !!selectedEinsatz,
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
