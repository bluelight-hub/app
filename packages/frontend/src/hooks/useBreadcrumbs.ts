import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { RouteUtils } from '@/config/routes';
import { useAuthorization } from './useAuthorization';

export interface BreadcrumbItem {
  label: string;
  path: string;
  clickable: boolean;
  current?: boolean;
  authorized?: boolean;
}

/**
 * Hook für die Generierung von Breadcrumbs
 * Bietet erweiterte Funktionen für die Breadcrumb-Verwaltung
 */
export const useBreadcrumbs = () => {
  const location = useLocation();
  const { canAccessPath } = useAuthorization();

  // Automatisch generierte Breadcrumbs für die aktuelle Route
  const autoBreadcrumbs = useMemo((): BreadcrumbItem[] => {
    const items = RouteUtils.generateBreadcrumbs(location.pathname);

    return items.map((item, index, array) => ({
      ...item,
      current: index === array.length - 1,
      authorized: canAccessPath(item.path),
    }));
  }, [location.pathname, canAccessPath]);

  // Erstelle custom Breadcrumbs
  const createBreadcrumbs = useMemo(() => {
    return (
      customPaths: Array<{ label: string; path: string; clickable?: boolean }>,
    ): BreadcrumbItem[] => {
      return customPaths.map((item, index, array) => ({
        label: item.label,
        path: item.path,
        clickable: item.clickable ?? true,
        current: index === array.length - 1,
        authorized: canAccessPath(item.path),
      }));
    };
  }, [canAccessPath]);

  // Füge einen Breadcrumb hinzu
  const addBreadcrumb = useMemo(() => {
    return (
      currentBreadcrumbs: BreadcrumbItem[],
      newItem: { label: string; path: string; clickable?: boolean },
    ): BreadcrumbItem[] => {
      // Setze alle bestehenden Items auf nicht-current
      const updated = currentBreadcrumbs.map((item) => ({
        ...item,
        current: false,
      }));

      // Füge neues Item hinzu
      return [
        ...updated,
        {
          label: newItem.label,
          path: newItem.path,
          clickable: newItem.clickable ?? true,
          current: true,
          authorized: canAccessPath(newItem.path),
        },
      ];
    };
  }, [canAccessPath]);

  // Entferne Breadcrumbs ab einem bestimmten Index
  const truncateBreadcrumbs = useMemo(() => {
    return (breadcrumbs: BreadcrumbItem[], fromIndex: number): BreadcrumbItem[] => {
      const truncated = breadcrumbs.slice(0, fromIndex + 1);

      // Setze das letzte Item auf current
      if (truncated.length > 0) {
        truncated[truncated.length - 1].current = true;
      }

      return truncated;
    };
  }, []);

  // Filtere nur autorisierte Breadcrumbs
  const getAuthorizedBreadcrumbs = useMemo(() => {
    return (breadcrumbs: BreadcrumbItem[]): BreadcrumbItem[] => {
      return breadcrumbs.filter((item) => item.authorized !== false);
    };
  }, []);

  // Hilfsfunktion: Erstelle Breadcrumbs für Admin-Bereich
  const createAdminBreadcrumbs = useMemo(() => {
    return (currentPath: string = location.pathname): BreadcrumbItem[] => {
      const baseBreadcrumbs: BreadcrumbItem[] = [
        {
          label: 'Admin Dashboard',
          path: '/admin',
          clickable: true,
          current: currentPath === '/admin',
          authorized: canAccessPath('/admin'),
        },
      ];

      // Füge spezifische Admin-Seiten hinzu
      if (currentPath !== '/admin') {
        const route = RouteUtils.findByPath(currentPath);
        if (route) {
          baseBreadcrumbs.push({
            label: route.title,
            path: route.path,
            clickable: false,
            current: true,
            authorized: canAccessPath(route.path),
          });
        }
      }

      return baseBreadcrumbs;
    };
  }, [location.pathname, canAccessPath]);

  return {
    // Automatische Breadcrumbs
    breadcrumbs: autoBreadcrumbs,

    // Utility-Funktionen
    createBreadcrumbs,
    addBreadcrumb,
    truncateBreadcrumbs,
    getAuthorizedBreadcrumbs,
    createAdminBreadcrumbs,

    // Convenience-Properties
    currentPath: location.pathname,
    isEmpty: autoBreadcrumbs.length === 0,
    hasMultipleItems: autoBreadcrumbs.length > 1,
  };
};

export default useBreadcrumbs;
