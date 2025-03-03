import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * PrivateRoute Component
 * 
 * Schützt Routen, indem der Authentifizierungsstatus geprüft wird.
 * Nicht authentifizierte Benutzer werden zur Login-Seite umgeleitet.
 */
const PrivateRoute: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Zeige einen Ladeindikator während der Auth-Status geprüft wird
    if (isLoading) {
        return <div className="p-6 text-center">Authentifizierung wird geprüft...</div>;
    }

    // Leite zur Login-Seite um, wenn nicht authentifiziert
    if (!isAuthenticated) {
        // Speichere den aktuellen Pfad, um nach dem Login dorthin zurückzukehren
        return <Navigate to="/login" state={{ from: location.pathname }} />;
    }

    // Wenn authentifiziert, rendere die geschützten Routen
    return <Outlet />;
};

export default PrivateRoute; 