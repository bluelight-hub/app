import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { RouteDefinition, RouteUtils } from '@/config/routes';

export interface NavigationState {
  /** Aktuell aktive Route */
  activeRoute: RouteDefinition | null;
  /** Ist ein bestimmter Pfad aktiv? */
  isActive: (path: string) => boolean;
  /** Ist eine Route exakt aktiv? */
  isExactActive: (path: string) => boolean;
  /** Ist eine Route oder eine ihrer Unterrouten aktiv? */
  isActiveOrChild: (path: string) => boolean;
  /** CSS-Klassen für einen Link basierend auf seinem Aktivitätsstatus */
  getLinkClasses: (path: string, baseClasses?: string, activeClasses?: string) => string;
  /** Aktuelle URL-Parameter */
  currentPath: string;
  /** Query-Parameter der aktuellen Route */
  searchParams: URLSearchParams;
}

/**
 * Hook für Active Navigation Management
 * Bietet umfassende Funktionen zur Bestimmung des Aktivitätsstatus von Navigationslinks
 */
export const useActiveNavigation = (): NavigationState => {
  const location = useLocation();

  // Finde die aktuelle Route
  const activeRoute = useMemo(() => {
    return RouteUtils.findByPath(location.pathname);
  }, [location.pathname]);

  // Prüfe ob ein Pfad exakt aktiv ist
  const isExactActive = useMemo(() => {
    return (path: string): boolean => {
      return location.pathname === path;
    };
  }, [location.pathname]);

  // Prüfe ob ein Pfad aktiv ist (inkl. Unterrouten)
  const isActive = useMemo(() => {
    return (path: string): boolean => {
      // Exakte Übereinstimmung
      if (location.pathname === path) {
        return true;
      }

      // Prüfe ob aktueller Pfad mit dem gegebenen Pfad beginnt
      // Aber verhindere falsche Matches (z.B. /admin sollte nicht für /administrator aktiv sein)
      const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
      const normalizedCurrent = location.pathname.endsWith('/')
        ? location.pathname.slice(0, -1)
        : location.pathname;

      return normalizedCurrent.startsWith(normalizedPath + '/');
    };
  }, [location.pathname]);

  // Prüfe ob ein Pfad oder seine Unterrouten aktiv sind
  const isActiveOrChild = useMemo(() => {
    return (path: string): boolean => {
      return isActive(path) || isExactActive(path);
    };
  }, [isActive, isExactActive]);

  // Generiere CSS-Klassen für Links
  const getLinkClasses = useMemo(() => {
    return (path: string, baseClasses: string = '', activeClasses: string = 'active'): string => {
      const classes = [baseClasses];

      if (isActiveOrChild(path)) {
        classes.push(activeClasses);
      }

      return classes.filter(Boolean).join(' ');
    };
  }, [isActiveOrChild]);

  // Parse URL-Parameter
  const searchParams = useMemo(() => {
    return new URLSearchParams(location.search);
  }, [location.search]);

  return {
    activeRoute,
    isActive,
    isExactActive,
    isActiveOrChild,
    getLinkClasses,
    currentPath: location.pathname,
    searchParams,
  };
};

/**
 * Hook für erweiterte Navigation-Utilities
 */
export const useNavigationUtils = () => {
  const location = useLocation();
  const navigation = useActiveNavigation();

  // Prüfe ob eine Route als Parent der aktuellen Route fungiert
  const isParentRoute = useMemo(() => {
    return (parentPath: string): boolean => {
      const currentSegments = location.pathname.split('/').filter(Boolean);
      const parentSegments = parentPath.split('/').filter(Boolean);

      if (parentSegments.length >= currentSegments.length) {
        return false;
      }

      return parentSegments.every((segment, index) => segment === currentSegments[index]);
    };
  }, [location.pathname]);

  // Erstelle Navigation-Breadcrumb basierend auf der URL-Struktur
  const getPathSegments = useMemo(() => {
    return (): Array<{ path: string; label: string; isActive: boolean }> => {
      const segments = location.pathname.split('/').filter(Boolean);
      const result = [];

      // Root segment
      result.push({
        path: '/',
        label: 'Home',
        isActive: location.pathname === '/',
      });

      // Baue jeden Segment-Pfad auf
      let currentPath = '';
      segments.forEach((segment, _index) => {
        currentPath += `/${segment}`;
        const route = RouteUtils.findByPath(currentPath);

        result.push({
          path: currentPath,
          label: route?.title || segment,
          isActive: navigation.isExactActive(currentPath),
        });
      });

      return result;
    };
  }, [location.pathname, navigation]);

  // Finde alle Child-Routen der aktuellen Route
  const getChildRoutes = useMemo(() => {
    return (parentPath: string = location.pathname): RouteDefinition[] => {
      return RouteUtils.getNavigationRoutes().filter((route) => {
        // Prüfe ob die Route ein Child der Parent-Route ist
        return (
          route.path.startsWith(parentPath + '/') &&
          route.path !== parentPath &&
          route.showInNavigation
        );
      });
    };
  }, [location.pathname]);

  // Finde die Parent-Route der aktuellen Route
  const getParentRoute = useMemo(() => {
    return (): RouteDefinition | null => {
      const currentPath = location.pathname;
      const segments = currentPath.split('/').filter(Boolean);

      // Entferne das letzte Segment um den Parent-Pfad zu finden
      if (segments.length <= 1) return null;

      const parentPath = '/' + segments.slice(0, -1).join('/');
      return RouteUtils.findByPath(parentPath);
    };
  }, [location.pathname]);

  // Prüfe Navigation-Tiefe
  const getNavigationDepth = useMemo(() => {
    return (): number => {
      return location.pathname.split('/').filter(Boolean).length;
    };
  }, [location.pathname]);

  return {
    ...navigation,
    isParentRoute,
    getPathSegments,
    getChildRoutes,
    getParentRoute,
    getNavigationDepth,
  };
};

export default useActiveNavigation;
