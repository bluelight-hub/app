import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEinsatzOperations } from '../../hooks/einsatz/useEinsatzQueries';
import { logger } from '../../utils/logger';

/**
 * Guard-Komponente die prüft, ob Einsätze vorhanden sind.
 * Leitet zur Einsatz-Erstellung weiter wenn keine Einsätze existieren.
 */
const EinsatzGuard = () => {
    const location = useLocation();
    const { isLoading, hasDataBeenFetched, hasEinsatz, isError } = useEinsatzOperations();

    // Loading state - zeige Indikator während Daten geladen werden
    if (isLoading || !hasDataBeenFetched) {
        logger.debug('EinsatzGuard: Loading Einsätze data');
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Einsätze werden geladen...</p>
                </div>
            </div>
        );
    }

    // Umleitung zur Erstellung wenn keine Einsätze vorhanden
    const isOnCreatePage = location.pathname === '/app/create-initial-einsatz';
    const shouldRedirectToCreate = !hasEinsatz() && !isOnCreatePage;

    if (shouldRedirectToCreate) {
        logger.info('EinsatzGuard: No Einsätze found, redirecting to create page');
        return <Navigate to="/app/create-initial-einsatz" replace />;
    }

    // Bei Fehlern auch umleiten
    if (isError && !isOnCreatePage) {
        logger.warn('EinsatzGuard: Error fetching Einsätze, redirecting to create page');
        return <Navigate to="/app/create-initial-einsatz" replace />;
    }

    // Zugriff erlauben - entweder Einsätze vorhanden oder bereits auf Create-Seite
    logger.debug('EinsatzGuard: Allowing access to protected content', {
        hasEinsatz: hasEinsatz(),
        isOnCreatePage,
        isError
    });

    return <Outlet />;
};

export default EinsatzGuard;
