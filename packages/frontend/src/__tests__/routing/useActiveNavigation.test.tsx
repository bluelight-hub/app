import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useActiveNavigation, useNavigationUtils } from '@/hooks/useActiveNavigation';
import { RouteDefinition, RouteUtils } from '@/config/routes';
import React from 'react';

// Mock RouteUtils
vi.mock('@/config/routes', () => ({
  RouteUtils: {
    findByPath: vi.fn(),
    getNavigationRoutes: vi.fn(),
  },
}));

const createWrapper = (initialEntries: string[] = ['/admin/users']) => {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
};

describe('useActiveNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isExactActive', () => {
    it('should return true for exact path match', () => {
      const wrapper = createWrapper(['/admin/users']);
      const { result } = renderHook(() => useActiveNavigation(), { wrapper });

      expect(result.current.isExactActive('/admin/users')).toBe(true);
      expect(result.current.isExactActive('/admin')).toBe(false);
    });
  });

  describe('isActive', () => {
    it('should return true for exact path match', () => {
      const wrapper = createWrapper(['/admin/users']);
      const { result } = renderHook(() => useActiveNavigation(), { wrapper });

      expect(result.current.isActive('/admin/users')).toBe(true);
    });

    it('should return true for parent path', () => {
      const wrapper = createWrapper(['/admin/users/details']);
      const { result } = renderHook(() => useActiveNavigation(), { wrapper });

      expect(result.current.isActive('/admin')).toBe(true);
      expect(result.current.isActive('/admin/users')).toBe(true);
    });

    it('should return false for unrelated paths', () => {
      const wrapper = createWrapper(['/admin/users']);
      const { result } = renderHook(() => useActiveNavigation(), { wrapper });

      expect(result.current.isActive('/admin/settings')).toBe(false);
      expect(result.current.isActive('/app')).toBe(false);
    });

    it('should handle trailing slashes correctly', () => {
      const wrapper = createWrapper(['/admin/users/']);
      const { result } = renderHook(() => useActiveNavigation(), { wrapper });

      expect(result.current.isActive('/admin')).toBe(true);
      expect(result.current.isActive('/admin/')).toBe(true);
    });

    it('should prevent false positives for similar paths', () => {
      const wrapper = createWrapper(['/admin']);
      const { result } = renderHook(() => useActiveNavigation(), { wrapper });

      // Should not match /administrator
      expect(result.current.isActive('/adminis')).toBe(false);
    });
  });

  describe('isActiveOrChild', () => {
    it('should return true for exact match', () => {
      const wrapper = createWrapper(['/admin/users']);
      const { result } = renderHook(() => useActiveNavigation(), { wrapper });

      expect(result.current.isActiveOrChild('/admin/users')).toBe(true);
    });

    it('should return true for child routes', () => {
      const wrapper = createWrapper(['/admin/users/details']);
      const { result } = renderHook(() => useActiveNavigation(), { wrapper });

      expect(result.current.isActiveOrChild('/admin')).toBe(true);
      expect(result.current.isActiveOrChild('/admin/users')).toBe(true);
    });
  });

  describe('getLinkClasses', () => {
    it('should return base classes for inactive links', () => {
      const wrapper = createWrapper(['/admin/users']);
      const { result } = renderHook(() => useActiveNavigation(), { wrapper });

      const classes = result.current.getLinkClasses('/admin/settings', 'nav-link');
      expect(classes).toBe('nav-link');
    });

    it('should return base and active classes for active links', () => {
      const wrapper = createWrapper(['/admin/users']);
      const { result } = renderHook(() => useActiveNavigation(), { wrapper });

      const classes = result.current.getLinkClasses('/admin/users', 'nav-link', 'nav-active');
      expect(classes).toBe('nav-link nav-active');
    });

    it('should handle empty base classes', () => {
      const wrapper = createWrapper(['/admin/users']);
      const { result } = renderHook(() => useActiveNavigation(), { wrapper });

      const classes = result.current.getLinkClasses('/admin/users', '', 'active');
      expect(classes).toBe('active');
    });
  });

  describe('activeRoute', () => {
    it('should return the current route when found', () => {
      const mockRoute = {
        id: 'admin.users',
        path: '/admin/users',
        title: 'Users',
      };

      (RouteUtils.findByPath as Mock).mockReturnValue(mockRoute);

      const wrapper = createWrapper(['/admin/users']);
      const { result } = renderHook(() => useActiveNavigation(), { wrapper });

      expect(result.current.activeRoute).toEqual(mockRoute);
      expect(RouteUtils.findByPath).toHaveBeenCalledWith('/admin/users');
    });

    it('should return null when route not found', () => {
      (RouteUtils.findByPath as jest.Mock).mockReturnValue(null);

      const wrapper = createWrapper(['/unknown-path']);
      const { result } = renderHook(() => useActiveNavigation(), { wrapper });

      expect(result.current.activeRoute).toBeNull();
    });
  });

  describe('currentPath and searchParams', () => {
    it('should return current path and search params', () => {
      const wrapper = createWrapper(['/admin/users?page=2&filter=active']);
      const { result } = renderHook(() => useActiveNavigation(), { wrapper });

      expect(result.current.currentPath).toBe('/admin/users');
      expect(result.current.searchParams.get('page')).toBe('2');
      expect(result.current.searchParams.get('filter')).toBe('active');
    });
  });
});

describe('useNavigationUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isParentRoute', () => {
    it('should return true for parent routes', () => {
      const wrapper = createWrapper(['/admin/users/details']);
      const { result } = renderHook(() => useNavigationUtils(), { wrapper });

      expect(result.current.isParentRoute('/admin')).toBe(true);
      expect(result.current.isParentRoute('/admin/users')).toBe(true);
    });

    it('should return false for non-parent routes', () => {
      const wrapper = createWrapper(['/admin/users']);
      const { result } = renderHook(() => useNavigationUtils(), { wrapper });

      expect(result.current.isParentRoute('/admin/settings')).toBe(false);
      expect(result.current.isParentRoute('/admin/users/details')).toBe(false); // Same or longer
    });
  });

  describe('getPathSegments', () => {
    it('should generate path segments correctly', () => {
      (RouteUtils.findByPath as Mock).mockImplementation((path: string) => {
        const routes: Record<string, Partial<RouteDefinition>> = {
          '/admin': { title: 'Admin Dashboard' },
          '/admin/users': { title: 'User Management' },
        };
        return routes[path] || null;
      });

      const wrapper = createWrapper(['/admin/users']);
      const { result } = renderHook(() => useNavigationUtils(), { wrapper });

      const segments = result.current.getPathSegments();

      expect(segments).toEqual([
        { path: '/', label: 'Home', isActive: false },
        { path: '/admin', label: 'Admin Dashboard', isActive: false },
        { path: '/admin/users', label: 'User Management', isActive: true },
      ]);
    });

    it('should use segment name when route not found', () => {
      (RouteUtils.findByPath as jest.Mock).mockReturnValue(null);

      const wrapper = createWrapper(['/admin/unknown']);
      const { result } = renderHook(() => useNavigationUtils(), { wrapper });

      const segments = result.current.getPathSegments();

      expect(segments).toEqual([
        { path: '/', label: 'Home', isActive: false },
        { path: '/admin', label: 'admin', isActive: false },
        { path: '/admin/unknown', label: 'unknown', isActive: true },
      ]);
    });
  });

  describe('getChildRoutes', () => {
    it('should return child routes for given parent path', () => {
      const mockRoutes = [
        { path: '/admin/users', showInNavigation: true, title: 'Users' },
        { path: '/admin/settings', showInNavigation: true, title: 'Settings' },
        { path: '/admin/users/details', showInNavigation: true, title: 'User Details' },
        { path: '/app/dashboard', showInNavigation: true, title: 'App Dashboard' },
      ];

      (RouteUtils.getNavigationRoutes as Mock).mockReturnValue(mockRoutes);

      const wrapper = createWrapper(['/admin']);
      const { result } = renderHook(() => useNavigationUtils(), { wrapper });

      const childRoutes = result.current.getChildRoutes('/admin');

      expect(childRoutes).toHaveLength(3); // /admin/users, /admin/settings, /admin/users/details
      expect(childRoutes.map((r) => r.path)).toEqual(['/admin/users', '/admin/settings', '/admin/users/details']);
    });
  });

  describe('getParentRoute', () => {
    it('should return parent route', () => {
      const mockRoute = { path: '/admin/users', title: 'Users' };
      (RouteUtils.findByPath as Mock).mockImplementation((path: string) =>
        path === '/admin/users' ? mockRoute : null,
      );

      const wrapper = createWrapper(['/admin/users/details']);
      const { result } = renderHook(() => useNavigationUtils(), { wrapper });

      const parentRoute = result.current.getParentRoute();
      expect(parentRoute).toEqual(mockRoute);
    });

    it('should return null for root level routes', () => {
      const wrapper = createWrapper(['/admin']);
      const { result } = renderHook(() => useNavigationUtils(), { wrapper });

      const parentRoute = result.current.getParentRoute();
      expect(parentRoute).toBeNull();
    });
  });

  describe('getNavigationDepth', () => {
    it('should return correct navigation depth', () => {
      const wrapper = createWrapper(['/admin/users/details/edit']);
      const { result } = renderHook(() => useNavigationUtils(), { wrapper });

      expect(result.current.getNavigationDepth()).toBe(4);
    });

    it('should return 0 for root path', () => {
      const wrapper = createWrapper(['/']);
      const { result } = renderHook(() => useNavigationUtils(), { wrapper });

      expect(result.current.getNavigationDepth()).toBe(0);
    });
  });
});
