import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Alert, Spin } from 'antd';
import { useAuth } from '@/hooks/useAuth';
import { AdminRole, DEFAULT_REDIRECTS } from '@/config/routes';

export interface ProtectedRouteProps {
  /** Erforderliche Rollen für den Zugriff */
  allowedRoles?: AdminRole[];
  /** Ist Admin-Zugriff erforderlich? */
  requiresAdmin?: boolean;
  /** Custom Redirect-Pfad bei fehlendem Zugriff */
  redirectPath?: string;
  /** Custom Redirect-Pfad für nicht authentifizierte Benutzer */
  loginRedirectPath?: string;
  /** Alternative Komponente für nicht autorisierte Benutzer */
  fallbackComponent?: React.ComponentType;
  /** Zeige Fehlermeldung bei fehlendem Zugriff */
  showAccessDenied?: boolean;
  /** Custom Loading-Komponente */
  loadingComponent?: React.ComponentType;
}

/**
 * Erweiterte ProtectedRoute-Komponente mit rollenbasierter Zugriffskontrolle
 *
 * Prüft sowohl Authentifizierung als auch Benutzerrollen und leitet entsprechend weiter.
 * Bietet flexible Konfigurationsmöglichkeiten für verschiedene Sicherheitsanforderungen.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles = [],
  requiresAdmin = false,
  redirectPath = DEFAULT_REDIRECTS.UNAUTHORIZED,
  loginRedirectPath = '/login',
  fallbackComponent: FallbackComponent,
  showAccessDenied = true,
  loadingComponent: LoadingComponent,
}) => {
  const { isAuthenticated, isLoading, hasRole, isAdmin } = useAuth();
  const location = useLocation();

  // Standard Loading-Komponente
  const DefaultLoading = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Spin size="large" />
        <p className="mt-4 text-gray-600">Authentifizierung wird geprüft...</p>
      </div>
    </div>
  );

  // Standard Access Denied-Komponente
  const DefaultAccessDenied = () => (
    <div className="p-6">
      <Alert
        message="Zugriff verweigert"
        description="Sie benötigen entsprechende Berechtigungen, um auf diesen Bereich zuzugreifen."
        type="error"
        showIcon
        className="max-w-lg mx-auto mt-20"
      />
    </div>
  );

  // Zeige Loading-Indikator während der Auth-Status geprüft wird
  if (isLoading) {
    return LoadingComponent ? <LoadingComponent /> : <DefaultLoading />;
  }

  // Leite zur Login-Seite um, wenn nicht authentifiziert
  if (!isAuthenticated) {
    return <Navigate to={loginRedirectPath} state={{ from: location.pathname }} replace />;
  }

  // Prüfe Admin-Berechtigung wenn erforderlich
  if (requiresAdmin && !isAdmin()) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    if (showAccessDenied) {
      return <DefaultAccessDenied />;
    }

    return <Navigate to={redirectPath} replace />;
  }

  // Prüfe spezifische Rollen wenn definiert
  if (allowedRoles.length > 0) {
    const hasRequiredRole = allowedRoles.some((role) => hasRole(role));

    if (!hasRequiredRole) {
      if (FallbackComponent) {
        return <FallbackComponent />;
      }

      if (showAccessDenied) {
        return <DefaultAccessDenied />;
      }

      return <Navigate to={redirectPath} replace />;
    }
  }

  // Wenn alle Prüfungen bestanden, rendere die geschützten Routen
  return <Outlet />;
};

export default ProtectedRoute;
