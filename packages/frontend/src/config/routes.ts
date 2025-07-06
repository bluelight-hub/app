import { ComponentType, LazyExoticComponent } from 'react';

/**
 * Definition der verfügbaren Admin-Rollen
 */
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  SUPPORT = 'support',
  USER = 'user',
  VIEWER = 'viewer',
}

/**
 * Interface für eine Route-Definition
 */
export interface RouteDefinition {
  /** Eindeutige ID der Route */
  id: string;
  /** URL-Pfad der Route */
  path: string;
  /** React-Komponente für die Route */
  element: LazyExoticComponent<ComponentType<any>> | ComponentType<any>;
  /** Titel der Seite für Breadcrumbs und Navigation */
  title: string;
  /** Beschreibung der Route */
  description?: string;
  /** Erforderliche Rollen für den Zugriff */
  allowedRoles?: AdminRole[];
  /** Ist Authentifizierung erforderlich? */
  requiresAuth?: boolean;
  /** Ist Admin-Zugriff erforderlich? */
  requiresAdmin?: boolean;
  /** Parent-Route ID für hierarchische Navigation */
  parentId?: string;
  /** Icon für die Navigation */
  icon?: string;
  /** Ist die Route in der Navigation sichtbar? */
  showInNavigation?: boolean;
  /** Breadcrumb-Konfiguration */
  breadcrumb?: {
    /** Label für den Breadcrumb */
    label: string;
    /** Soll der Breadcrumb angezeigt werden? */
    show: boolean;
    /** Ist der Breadcrumb klickbar? */
    clickable?: boolean;
  };
  /** Zusätzliche Metadaten */
  metadata?: {
    /** Kategorie der Route */
    category?: string;
    /** Reihenfolge in der Navigation */
    order?: number;
    /** Externe URL (falls die Route extern ist) */
    external?: boolean;
    /** Zusätzliche CSS-Klassen */
    className?: string;
  };
}

/**
 * Zentrale Route-Definitionen für die Admin-Panel
 * Single source-of-truth für alle Routen mit Metadaten
 */
export const ADMIN_ROUTES: RouteDefinition[] = [
  // Dashboard
  {
    id: 'admin.dashboard',
    path: '/admin',
    element: () => import('@/components/pages/admin/dashboard/page'),
    title: 'Admin Dashboard',
    description: 'Überblick über Systemstatistiken und wichtige Kennzahlen',
    requiresAuth: true,
    requiresAdmin: true,
    allowedRoles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT],
    showInNavigation: true,
    icon: 'House',
    breadcrumb: {
      label: 'Dashboard',
      show: true,
      clickable: true,
    },
    metadata: {
      category: 'overview',
      order: 1,
    },
  },

  // User Management
  {
    id: 'admin.users',
    path: '/admin/users',
    element: () => import('@/components/pages/admin/users/page'),
    title: 'Benutzerverwaltung',
    description: 'Verwaltung von Admin-Benutzern und deren Berechtigungen',
    requiresAuth: true,
    requiresAdmin: true,
    allowedRoles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN],
    showInNavigation: true,
    icon: 'Users',
    breadcrumb: {
      label: 'Benutzer',
      show: true,
      clickable: true,
    },
    metadata: {
      category: 'management',
      order: 2,
    },
  },

  // Organization Management
  {
    id: 'admin.organizations',
    path: '/admin/organizations',
    element: () => import('@/components/pages/admin/organizations/page'),
    title: 'Organisationsverwaltung',
    description: 'Verwaltung von Organisationen und deren Einstellungen',
    requiresAuth: true,
    requiresAdmin: true,
    allowedRoles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN],
    showInNavigation: true,
    icon: 'Buildings',
    breadcrumb: {
      label: 'Organisationen',
      show: true,
      clickable: true,
    },
    metadata: {
      category: 'management',
      order: 3,
    },
  },

  // System Management
  {
    id: 'admin.system',
    path: '/admin/system',
    element: () => import('@/components/pages/admin/system/page'),
    title: 'Systemverwaltung',
    description: 'Systemkonfiguration und -einstellungen',
    requiresAuth: true,
    requiresAdmin: true,
    allowedRoles: [AdminRole.SUPER_ADMIN],
    showInNavigation: true,
    icon: 'Gear',
    breadcrumb: {
      label: 'System',
      show: true,
      clickable: true,
    },
    metadata: {
      category: 'system',
      order: 4,
    },
  },

  // Logs & Monitoring
  {
    id: 'admin.logs',
    path: '/admin/logs',
    element: () => import('@/components/pages/admin/logs/page'),
    title: 'Logs & Monitoring',
    description: 'Systemlogs und Überwachung',
    requiresAuth: true,
    requiresAdmin: true,
    allowedRoles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT],
    showInNavigation: true,
    icon: 'FileText',
    breadcrumb: {
      label: 'Logs',
      show: true,
      clickable: true,
    },
    metadata: {
      category: 'monitoring',
      order: 5,
    },
  },

  // Database Tools (Development only)
  {
    id: 'admin.database',
    path: '/admin/database',
    element: () => import('@/components/pages/admin/database/page'),
    title: 'Datenbank-Tools',
    description: 'Datenbankmanagement und -tools (nur Development)',
    requiresAuth: true,
    requiresAdmin: true,
    allowedRoles: [AdminRole.SUPER_ADMIN],
    showInNavigation: true,
    icon: 'Database',
    breadcrumb: {
      label: 'Datenbank',
      show: true,
      clickable: true,
    },
    metadata: {
      category: 'tools',
      order: 6,
    },
  },

  // API Testing
  {
    id: 'admin.api-testing',
    path: '/admin/api-testing',
    element: () => import('@/components/pages/admin/api-testing/page'),
    title: 'API Testing',
    description: 'Interaktive API-Tests und Dokumentation',
    requiresAuth: true,
    requiresAdmin: true,
    allowedRoles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN],
    showInNavigation: true,
    icon: 'Code',
    breadcrumb: {
      label: 'API Testing',
      show: true,
      clickable: true,
    },
    metadata: {
      category: 'tools',
      order: 7,
    },
  },

  // Reports
  {
    id: 'admin.reports',
    path: '/admin/reports',
    element: () => import('@/components/pages/admin/reports/page'),
    title: 'Berichte',
    description: 'Systemreports und Analytics',
    requiresAuth: true,
    requiresAdmin: true,
    allowedRoles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN],
    showInNavigation: true,
    icon: 'ChartBar',
    breadcrumb: {
      label: 'Berichte',
      show: true,
      clickable: true,
    },
    metadata: {
      category: 'analytics',
      order: 8,
    },
  },

  // Settings
  {
    id: 'admin.settings',
    path: '/admin/settings',
    element: () => import('@/components/pages/admin/settings/page'),
    title: 'Einstellungen',
    description: 'Admin-Panel Einstellungen',
    requiresAuth: true,
    requiresAdmin: true,
    allowedRoles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN],
    showInNavigation: true,
    icon: 'Sliders',
    breadcrumb: {
      label: 'Einstellungen',
      show: true,
      clickable: true,
    },
    metadata: {
      category: 'configuration',
      order: 9,
    },
  },
];

/**
 * Helper-Funktionen für das Arbeiten mit Routen
 */
export class RouteUtils {
  /**
   * Findet eine Route anhand ihrer ID
   */
  static findById(id: string): RouteDefinition | undefined {
    return ADMIN_ROUTES.find((route) => route.id === id);
  }

  /**
   * Findet eine Route anhand des Pfades
   */
  static findByPath(path: string): RouteDefinition | undefined {
    return ADMIN_ROUTES.find((route) => route.path === path);
  }

  /**
   * Gibt alle Routen zurück, die in der Navigation angezeigt werden sollen
   */
  static getNavigationRoutes(): RouteDefinition[] {
    return ADMIN_ROUTES.filter((route) => route.showInNavigation).sort(
      (a, b) => (a.metadata?.order || 0) - (b.metadata?.order || 0),
    );
  }

  /**
   * Prüft, ob ein Benutzer mit den gegebenen Rollen auf eine Route zugreifen kann
   */
  static canAccess(route: RouteDefinition, userRoles: string[]): boolean {
    if (!route.allowedRoles || route.allowedRoles.length === 0) {
      return true;
    }

    return route.allowedRoles.some((role) => userRoles.includes(role));
  }

  /**
   * Generiert Breadcrumbs für einen gegebenen Pfad
   */
  static generateBreadcrumbs(
    currentPath: string,
  ): Array<{ label: string; path: string; clickable: boolean }> {
    const route = this.findByPath(currentPath);
    if (!route?.breadcrumb?.show) {
      return [];
    }

    const breadcrumbs = [];

    // Admin Dashboard als Root
    if (currentPath !== '/admin') {
      breadcrumbs.push({
        label: 'Dashboard',
        path: '/admin',
        clickable: true,
      });
    }

    // Aktuelle Route
    breadcrumbs.push({
      label: route.breadcrumb.label,
      path: route.path,
      clickable: route.breadcrumb.clickable ?? false,
    });

    return breadcrumbs;
  }

  /**
   * Gibt Routen nach Kategorie gruppiert zurück
   */
  static getRoutesByCategory(): Record<string, RouteDefinition[]> {
    const categories: Record<string, RouteDefinition[]> = {};

    ADMIN_ROUTES.forEach((route) => {
      const category = route.metadata?.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(route);
    });

    // Sortiere Routen innerhalb jeder Kategorie
    Object.keys(categories).forEach((category) => {
      categories[category].sort((a, b) => (a.metadata?.order || 0) - (b.metadata?.order || 0));
    });

    return categories;
  }
}

/**
 * Standard-Redirect-Pfade
 */
export const DEFAULT_REDIRECTS = {
  /** Standard-Redirect nach Login */
  AFTER_LOGIN: '/admin',
  /** Standard-Redirect für nicht autorisierte Benutzer */
  UNAUTHORIZED: '/admin',
  /** Standard-Redirect für nicht gefundene Seiten */
  NOT_FOUND: '/admin',
  /** Standard-Redirect für Nicht-Admin-Benutzer */
  NON_ADMIN: '/app',
} as const;
