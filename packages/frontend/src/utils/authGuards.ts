import { AdminRole, RouteDefinition } from '@/config/routes';

/**
 * Ergebnis einer Autorisierungsprüfung
 */
export interface AuthorizationResult {
  /** Ist der Zugriff erlaubt? */
  authorized: boolean;
  /** Grund für die Verweigerung (falls authorized = false) */
  reason?: string;
  /** Empfohlener Redirect-Pfad */
  redirectPath?: string;
  /** Zusätzliche Informationen */
  metadata?: {
    requiredRoles?: AdminRole[];
    userRoles?: string[];
    isAuthenticated?: boolean;
    isAdmin?: boolean;
  };
}

/**
 * Utility-Klasse für Autorisierungsprüfungen
 */
export class AuthGuardUtils {
  /**
   * Prüft, ob ein Benutzer eine bestimmte Rolle hat
   */
  static hasRequiredRole(userRoles: string[], allowedRoles: AdminRole[]): boolean {
    if (allowedRoles.length === 0) {
      return true;
    }

    return allowedRoles.some((role) => userRoles.includes(role));
  }

  /**
   * Prüft, ob ein Benutzer Admin-Rechte hat
   */
  static isAdminUser(userRoles: string[]): boolean {
    const adminRoles = [AdminRole.SUPER_ADMIN, AdminRole.ADMIN];

    return adminRoles.some((role) => userRoles.includes(role));
  }

  /**
   * Prüft, ob ein Benutzer Support-Rechte hat
   */
  static isSupportUser(userRoles: string[]): boolean {
    const supportRoles = [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT];

    return supportRoles.some((role) => userRoles.includes(role));
  }

  /**
   * Prüft die Berechtigung für eine Route
   */
  static checkRouteAuthorization(
    route: RouteDefinition,
    userRoles: string[],
    isAuthenticated: boolean,
  ): AuthorizationResult {
    // Prüfe Authentifizierung
    if (route.requiresAuth && !isAuthenticated) {
      return {
        authorized: false,
        reason: 'Authentication required',
        redirectPath: '/login',
        metadata: {
          isAuthenticated,
          requiredRoles: route.allowedRoles,
          userRoles,
        },
      };
    }

    // Prüfe Admin-Berechtigung
    if (route.requiresAdmin && !this.isAdminUser(userRoles)) {
      return {
        authorized: false,
        reason: 'Admin privileges required',
        redirectPath: '/app',
        metadata: {
          isAuthenticated,
          isAdmin: this.isAdminUser(userRoles),
          requiredRoles: route.allowedRoles,
          userRoles,
        },
      };
    }

    // Prüfe spezifische Rollen
    if (route.allowedRoles && !this.hasRequiredRole(userRoles, route.allowedRoles)) {
      return {
        authorized: false,
        reason: `Required role not found. Needed: ${route.allowedRoles.join(', ')}`,
        redirectPath: '/admin',
        metadata: {
          isAuthenticated,
          isAdmin: this.isAdminUser(userRoles),
          requiredRoles: route.allowedRoles,
          userRoles,
        },
      };
    }

    // Alles OK
    return {
      authorized: true,
      metadata: {
        isAuthenticated,
        isAdmin: this.isAdminUser(userRoles),
        requiredRoles: route.allowedRoles,
        userRoles,
      },
    };
  }

  /**
   * Filtert Routen basierend auf Benutzerberechtigungen
   */
  static filterAuthorizedRoutes(
    routes: RouteDefinition[],
    userRoles: string[],
    isAuthenticated: boolean,
  ): RouteDefinition[] {
    return routes.filter((route) => {
      const result = this.checkRouteAuthorization(route, userRoles, isAuthenticated);
      return result.authorized;
    });
  }

  /**
   * Ermittelt die höchste Rolle eines Benutzers
   */
  static getHighestRole(userRoles: string[]): AdminRole | null {
    const roleHierarchy = [
      AdminRole.SUPER_ADMIN,
      AdminRole.ADMIN,
      AdminRole.SUPPORT,
      AdminRole.USER,
      AdminRole.VIEWER,
    ];

    for (const role of roleHierarchy) {
      if (userRoles.includes(role)) {
        return role;
      }
    }

    return null;
  }

  /**
   * Prüft, ob eine Rolle höher als eine andere ist
   */
  static isRoleHigherThan(userRole: AdminRole, compareRole: AdminRole): boolean {
    const roleHierarchy = [
      AdminRole.SUPER_ADMIN,
      AdminRole.ADMIN,
      AdminRole.SUPPORT,
      AdminRole.USER,
      AdminRole.VIEWER,
    ];

    const userIndex = roleHierarchy.indexOf(userRole);
    const compareIndex = roleHierarchy.indexOf(compareRole);

    return userIndex < compareIndex; // Niedrigerer Index = höhere Rolle
  }

  /**
   * Generiert eine lesbare Beschreibung für erforderliche Rollen
   */
  static getRequiredRolesDescription(roles: AdminRole[]): string {
    if (roles.length === 0) {
      return 'Keine besonderen Berechtigungen erforderlich';
    }

    if (roles.length === 1) {
      return `Rolle "${roles[0]}" erforderlich`;
    }

    return `Eine der folgenden Rollen erforderlich: ${roles.join(', ')}`;
  }
}

/**
 * Higher-Order Component für rollenbasierte Komponenten-Zugriffskontrolle
 */
export function withRoleGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  _allowedRoles: AdminRole[],
  _fallbackComponent?: React.ComponentType,
) {
  return function GuardedComponent(props: P) {
    // Diese HOC müsste mit useAuth implementiert werden
    // Hier ist nur die Struktur dargestellt

    // const { user, hasRole } = useAuth();
    // const hasAccess = allowedRoles.some(role => hasRole(role));

    // if (!hasAccess) {
    //   return fallbackComponent ? React.createElement(fallbackComponent) : null;
    // }

    return React.createElement(WrappedComponent, props);
  };
}
