import { createContext, useContext } from 'react';

/**
 * Story 6.2 - Dashboard Modi für Layout-Varianten.
 *
 * - standard: Normales 2-Spalten Grid (768px+)
 * - fullscreen: 3-Spalten, große Schrift für Beamer (3m lesbar)
 * - compact: Kompakte Darstellung für Tablets
 */
export type DashboardMode = 'standard' | 'fullscreen' | 'compact';

const DashboardModeContext = createContext<DashboardMode>('standard');

/**
 * Hook zum Lesen des aktuellen Dashboard-Modus.
 *
 * Wird von Child-Komponenten (StaerkeCard, FahrzeugCard, RollenKarte)
 * verwendet um Mode-spezifische Styles anzuwenden.
 */
export const useDashboardMode = () => useContext(DashboardModeContext);

export const DashboardModeProvider = DashboardModeContext.Provider;
