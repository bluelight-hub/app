import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { RouteDefinition, RouteUtils, AdminRole } from '@/config/routes';
import { AuthGuardUtils, AuthorizationResult } from '@/utils/authGuards';

/**
 * Hook für Autorisierungsprüfungen
 * Bietet umfassende Funktionen zur Prüfung von Benutzerberechtigungen
 */
export const useAuthorization = () => {
  const { user, isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  // Benutzerrollen als Array
  const userRoles = useMemo(() => {
    if (!user) return [];

    // Annahme: user.role ist ein String, konvertiere zu Array für Konsistenz
    if (typeof user.role === 'string') {
      return [user.role];
    }

    // Falls user.roles als Array existiert
    return (user as any).roles || [user.role];
  }, [user]);

  /**
   * Prüft, ob der Benutzer eine bestimmte Rolle hat
   */
  const hasRequiredRole = useMemo(() => {
    return (allowedRoles: AdminRole[]) => {
      return AuthGuardUtils.hasRequiredRole(userRoles, allowedRoles);
    };
  }, [userRoles]);

  /**
   * Prüft die Berechtigung für eine bestimmte Route
   */
  const checkRouteAuthorization = useMemo(() => {
    return (route: RouteDefinition): AuthorizationResult => {
      return AuthGuardUtils.checkRouteAuthorization(route, userRoles, isAuthenticated);
    };
  }, [userRoles, isAuthenticated]);

  /**
   * Prüft die Berechtigung für die aktuelle Route
   */
  const currentRouteAuthorization = useMemo((): AuthorizationResult | null => {
    const currentRoute = RouteUtils.findByPath(location.pathname);
    if (!currentRoute) {
      return null;
    }

    return checkRouteAuthorization(currentRoute);
  }, [location.pathname, checkRouteAuthorization]);

  /**
   * Gibt alle autorisierten Routen zurück
   */
  const authorizedRoutes = useMemo(() => {
    return AuthGuardUtils.filterAuthorizedRoutes(
      RouteUtils.getNavigationRoutes(),
      userRoles,
      isAuthenticated,
    );
  }, [userRoles, isAuthenticated]);

  /**
   * Prüft, ob der Benutzer Zugriff auf eine bestimmte URL hat
   */
  const canAccessPath = useMemo(() => {
    return (path: string): boolean => {
      const route = RouteUtils.findByPath(path);
      if (!route) return false;

      const result = checkRouteAuthorization(route);
      return result.authorized;
    };
  }, [checkRouteAuthorization]);

  /**
   * Gibt die höchste Rolle des Benutzers zurück
   */
  const highestRole = useMemo(() => {
    return AuthGuardUtils.getHighestRole(userRoles);
  }, [userRoles]);

  /**
   * Prüft, ob der Benutzer Admin-Rechte hat
   */
  const isAdminUser = useMemo(() => {
    return AuthGuardUtils.isAdminUser(userRoles);
  }, [userRoles]);

  /**
   * Prüft, ob der Benutzer Support-Rechte hat
   */
  const isSupportUser = useMemo(() => {
    return AuthGuardUtils.isSupportUser(userRoles);
  }, [userRoles]);

  /**
   * Prüft, ob eine Rolle höher als eine andere ist
   */
  const isRoleHigherThan = useMemo(() => {
    return (compareRole: AdminRole): boolean => {
      if (!highestRole) return false;
      return AuthGuardUtils.isRoleHigherThan(highestRole, compareRole);
    };
  }, [highestRole]);

  /**
   * Generiert eine Beschreibung der erforderlichen Rollen für eine Route
   */
  const getRouteRequirementsDescription = useMemo(() => {
    return (route: RouteDefinition): string => {
      if (!route.allowedRoles || route.allowedRoles.length === 0) {
        if (route.requiresAdmin) {
          return 'Admin-Berechtigungen erforderlich';
        }
        if (route.requiresAuth) {
          return 'Anmeldung erforderlich';
        }
        return 'Keine besonderen Berechtigungen erforderlich';
      }

      return AuthGuardUtils.getRequiredRolesDescription(route.allowedRoles);
    };
  }, []);

  return {
    // Basis-Informationen
    user,
    userRoles,
    isAuthenticated,
    highestRole,

    // Rollenprüfungen
    hasRole,
    hasRequiredRole,
    isAdmin: isAdminUser,
    isSupport: isSupportUser,
    isRoleHigherThan,

    // Route-Autorisierung
    checkRouteAuthorization,
    currentRouteAuthorization,
    canAccessPath,
    authorizedRoutes,
    getRouteRequirementsDescription,

    // Utility-Funktionen
    canAccess: (allowedRoles: AdminRole[]) => hasRequiredRole(allowedRoles),
    canAccessRoute: (route: RouteDefinition) => checkRouteAuthorization(route).authorized,
  };
};

/**
 * Hook für route-spezifische Autorisierung
 * Vereinfachter Hook für die Prüfung einer bestimmten Route
 */
export const useRouteAuthorization = (routeId?: string) => {
  const authorization = useAuthorization();
  const location = useLocation();

  const route = useMemo(() => {
    if (routeId) {
      return RouteUtils.findById(routeId);
    }
    return RouteUtils.findByPath(location.pathname);
  }, [routeId, location.pathname]);

  const result = useMemo(() => {
    if (!route) {
      return {
        authorized: false,
        reason: 'Route not found',
        route: null,
      };
    }

    const authResult = authorization.checkRouteAuthorization(route);
    return {
      ...authResult,
      route,
    };
  }, [route, authorization]);

  return result;
};

export default useAuthorization;
