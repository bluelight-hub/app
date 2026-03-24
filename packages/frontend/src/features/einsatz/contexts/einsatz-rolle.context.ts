import { createContext, useContext } from 'react';
import type { MeineEinsatzRolleDto } from '@bluelight-hub/shared/client';

/**
 * Kontext fuer die eigene Einsatz-Rolle, bereitgestellt vom SingleEinsatzLayout.
 *
 * Vermeidet redundante Loading-States in Child-Routes und EinsatzRolleGate,
 * da die Daten bereits im Layout geladen werden. TanStack Query dedupliziert
 * zwar Netzwerk-Calls, aber jede unabhaengige Hook-Instanz durchlaeuft
 * ihren eigenen isLoading-Zyklus beim Mount -- was zu Flicker fuehrt.
 */

export interface EinsatzRolleContextValue {
  /** Rollen-Daten (null solange noch nicht geladen oder Fehler) */
  meineRolle: MeineEinsatzRolleDto | null;
  /** true waehrend der initiale Fetch laeuft */
  isLoading: boolean;
}

const EinsatzRolleContext = createContext<EinsatzRolleContextValue | null>(null);

/**
 * Provider-Komponente -- wird im SingleEinsatzLayout verwendet.
 */
export const EinsatzRolleProvider = EinsatzRolleContext.Provider;

/**
 * Hook zum Lesen der Einsatz-Rolle aus dem Layout-Kontext.
 *
 * Gibt die selbe Datenstruktur zurueck wie `useMyEinsatzRolle`,
 * aber ohne eigenen Loading-Zyklus.
 *
 * @throws Error wenn ausserhalb des EinsatzRolleProvider aufgerufen
 */
export function useEinsatzRolleContext(): EinsatzRolleContextValue {
  const value = useContext(EinsatzRolleContext);
  if (value === null) {
    throw new Error('useEinsatzRolleContext muss innerhalb eines EinsatzRolleProvider verwendet werden.');
  }
  return value;
}
