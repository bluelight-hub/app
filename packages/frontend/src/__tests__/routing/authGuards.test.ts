import { describe, it, expect, vi } from 'vitest';
import { AuthGuardUtils } from '@/utils/authGuards';
import { AdminRole, RouteDefinition } from '@/config/routes';

// Mock Route Definitions für Tests
const mockRoutes: RouteDefinition[] = [
  {
    id: 'admin.dashboard',
    path: '/admin',
    element: vi.fn() as any,
    title: 'Dashboard',
    requiresAuth: true,
    requiresAdmin: true,
    allowedRoles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN],
    showInNavigation: true,
  },
  {
    id: 'admin.users',
    path: '/admin/users',
    element: vi.fn() as any,
    title: 'Users',
    requiresAuth: true,
    allowedRoles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN],
    showInNavigation: true,
  },
  {
    id: 'admin.support',
    path: '/admin/support',
    element: vi.fn() as any,
    title: 'Support',
    requiresAuth: true,
    allowedRoles: [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT],
    showInNavigation: true,
  },
  {
    id: 'public.home',
    path: '/',
    element: vi.fn() as any,
    title: 'Home',
    requiresAuth: false,
    showInNavigation: false,
  },
];

describe('AuthGuardUtils', () => {
  describe('hasRequiredRole', () => {
    it('should return true when user has required role', () => {
      const userRoles = [AdminRole.ADMIN, AdminRole.USER];
      const allowedRoles = [AdminRole.ADMIN, AdminRole.SUPER_ADMIN];

      const result = AuthGuardUtils.hasRequiredRole(userRoles, allowedRoles);
      expect(result).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      const userRoles = [AdminRole.USER, AdminRole.VIEWER];
      const allowedRoles = [AdminRole.ADMIN, AdminRole.SUPER_ADMIN];

      const result = AuthGuardUtils.hasRequiredRole(userRoles, allowedRoles);
      expect(result).toBe(false);
    });

    it('should return true when no roles are required', () => {
      const userRoles = [AdminRole.USER];
      const allowedRoles: AdminRole[] = [];

      const result = AuthGuardUtils.hasRequiredRole(userRoles, allowedRoles);
      expect(result).toBe(true);
    });
  });

  describe('isAdminUser', () => {
    it('should return true for super admin', () => {
      const userRoles = [AdminRole.SUPER_ADMIN];
      const result = AuthGuardUtils.isAdminUser(userRoles);
      expect(result).toBe(true);
    });

    it('should return true for admin', () => {
      const userRoles = [AdminRole.ADMIN];
      const result = AuthGuardUtils.isAdminUser(userRoles);
      expect(result).toBe(true);
    });

    it('should return false for support user', () => {
      const userRoles = [AdminRole.SUPPORT];
      const result = AuthGuardUtils.isAdminUser(userRoles);
      expect(result).toBe(false);
    });

    it('should return false for regular user', () => {
      const userRoles = [AdminRole.USER];
      const result = AuthGuardUtils.isAdminUser(userRoles);
      expect(result).toBe(false);
    });
  });

  describe('isSupportUser', () => {
    it('should return true for super admin', () => {
      const userRoles = [AdminRole.SUPER_ADMIN];
      const result = AuthGuardUtils.isSupportUser(userRoles);
      expect(result).toBe(true);
    });

    it('should return true for admin', () => {
      const userRoles = [AdminRole.ADMIN];
      const result = AuthGuardUtils.isSupportUser(userRoles);
      expect(result).toBe(true);
    });

    it('should return true for support user', () => {
      const userRoles = [AdminRole.SUPPORT];
      const result = AuthGuardUtils.isSupportUser(userRoles);
      expect(result).toBe(true);
    });

    it('should return false for regular user', () => {
      const userRoles = [AdminRole.USER];
      const result = AuthGuardUtils.isSupportUser(userRoles);
      expect(result).toBe(false);
    });
  });

  describe('checkRouteAuthorization', () => {
    it('should deny access when authentication required but user not authenticated', () => {
      const route = mockRoutes[0]; // Admin dashboard
      const userRoles = [AdminRole.ADMIN];
      const isAuthenticated = false;

      const result = AuthGuardUtils.checkRouteAuthorization(route, userRoles, isAuthenticated);

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('Authentication required');
      expect(result.redirectPath).toBe('/login');
    });

    it('should deny access when admin required but user is not admin', () => {
      const route = mockRoutes[0]; // Admin dashboard
      const userRoles = [AdminRole.USER];
      const isAuthenticated = true;

      const result = AuthGuardUtils.checkRouteAuthorization(route, userRoles, isAuthenticated);

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('Admin privileges required');
      expect(result.redirectPath).toBe('/app');
    });

    it('should deny access when user does not have required role', () => {
      const route = mockRoutes[1]; // Users page
      const userRoles = [AdminRole.SUPPORT]; // Support cannot access users
      const isAuthenticated = true;

      const result = AuthGuardUtils.checkRouteAuthorization(route, userRoles, isAuthenticated);

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('Required role not found');
    });

    it('should allow access when all requirements are met', () => {
      const route = mockRoutes[2]; // Support page
      const userRoles = [AdminRole.SUPPORT];
      const isAuthenticated = true;

      const result = AuthGuardUtils.checkRouteAuthorization(route, userRoles, isAuthenticated);

      expect(result.authorized).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow access to public routes', () => {
      const route = mockRoutes[3]; // Public home
      const userRoles: string[] = [];
      const isAuthenticated = false;

      const result = AuthGuardUtils.checkRouteAuthorization(route, userRoles, isAuthenticated);

      expect(result.authorized).toBe(true);
    });
  });

  describe('filterAuthorizedRoutes', () => {
    it('should filter routes based on user permissions', () => {
      const userRoles = [AdminRole.SUPPORT];
      const isAuthenticated = true;

      const authorizedRoutes = AuthGuardUtils.filterAuthorizedRoutes(
        mockRoutes,
        userRoles,
        isAuthenticated,
      );

      // Support user should only see support page and public routes
      expect(authorizedRoutes).toHaveLength(2);
      expect(authorizedRoutes.map((r) => r.id)).toContain('admin.support');
      expect(authorizedRoutes.map((r) => r.id)).toContain('public.home');
    });

    it('should return all routes for super admin', () => {
      const userRoles = [AdminRole.SUPER_ADMIN];
      const isAuthenticated = true;

      const authorizedRoutes = AuthGuardUtils.filterAuthorizedRoutes(
        mockRoutes,
        userRoles,
        isAuthenticated,
      );

      expect(authorizedRoutes).toHaveLength(4);
    });

    it('should return only public routes for unauthenticated user', () => {
      const userRoles: string[] = [];
      const isAuthenticated = false;

      const authorizedRoutes = AuthGuardUtils.filterAuthorizedRoutes(
        mockRoutes,
        userRoles,
        isAuthenticated,
      );

      expect(authorizedRoutes).toHaveLength(1);
      expect(authorizedRoutes[0].id).toBe('public.home');
    });
  });

  describe('getHighestRole', () => {
    it('should return highest role in hierarchy', () => {
      const userRoles = [AdminRole.USER, AdminRole.ADMIN, AdminRole.SUPPORT];
      const result = AuthGuardUtils.getHighestRole(userRoles);
      expect(result).toBe(AdminRole.ADMIN);
    });

    it('should return super admin when present', () => {
      const userRoles = [AdminRole.VIEWER, AdminRole.SUPER_ADMIN, AdminRole.USER];
      const result = AuthGuardUtils.getHighestRole(userRoles);
      expect(result).toBe(AdminRole.SUPER_ADMIN);
    });

    it('should return null when no roles present', () => {
      const userRoles: string[] = [];
      const result = AuthGuardUtils.getHighestRole(userRoles);
      expect(result).toBe(null);
    });
  });

  describe('isRoleHigherThan', () => {
    it('should return true when first role is higher', () => {
      const result = AuthGuardUtils.isRoleHigherThan(AdminRole.ADMIN, AdminRole.SUPPORT);
      expect(result).toBe(true);
    });

    it('should return false when first role is lower', () => {
      const result = AuthGuardUtils.isRoleHigherThan(AdminRole.USER, AdminRole.ADMIN);
      expect(result).toBe(false);
    });

    it('should return false when roles are equal', () => {
      const result = AuthGuardUtils.isRoleHigherThan(AdminRole.ADMIN, AdminRole.ADMIN);
      expect(result).toBe(false);
    });
  });

  describe('getRequiredRolesDescription', () => {
    it('should return appropriate message for no roles', () => {
      const result = AuthGuardUtils.getRequiredRolesDescription([]);
      expect(result).toBe('Keine besonderen Berechtigungen erforderlich');
    });

    it('should return appropriate message for single role', () => {
      const result = AuthGuardUtils.getRequiredRolesDescription([AdminRole.ADMIN]);
      expect(result).toBe('Rolle "admin" erforderlich');
    });

    it('should return appropriate message for multiple roles', () => {
      const result = AuthGuardUtils.getRequiredRolesDescription([
        AdminRole.ADMIN,
        AdminRole.SUPER_ADMIN,
      ]);
      expect(result).toContain('Eine der folgenden Rollen erforderlich');
      expect(result).toContain('admin');
      expect(result).toContain('super_admin');
    });
  });
});
