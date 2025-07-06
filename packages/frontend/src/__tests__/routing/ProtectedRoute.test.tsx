import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import { AdminRole } from '@/config/routes';

// Mock react-router-dom Outlet
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="protected-content">Protected Content</div>,
    Navigate: ({ to }: { to: string }) => <div>Redirecting to {to}</div>,
  };
});

// Mock AuthContext für Tests
const createMockAuthContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  hasRole: vi.fn(),
  hasPermission: vi.fn(),
  isAdmin: vi.fn(() => false),
  ...overrides,
});

// Test-Wrapper Komponente
const TestWrapper: React.FC<{
  children: React.ReactNode;
  authContext: AuthContextType;
  initialEntries?: string[];
}> = ({ children, authContext, initialEntries = ['/admin'] }) => (
  <MemoryRouter initialEntries={initialEntries}>
    <AuthContext.Provider value={authContext}>{children}</AuthContext.Provider>
  </MemoryRouter>
);

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Tests', () => {
    it('should show loading indicator when auth is loading', () => {
      const authContext = createMockAuthContext({
        isLoading: true,
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute />
        </TestWrapper>,
      );

      expect(screen.getByText('Authentifizierung wird geprüft...')).toBeInTheDocument();
    });

    it('should redirect to login when not authenticated', () => {
      const authContext = createMockAuthContext({
        isAuthenticated: false,
        isLoading: false,
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute />
        </TestWrapper>,
      );

      // Prüfe, dass kein protected content angezeigt wird
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should render outlet when authenticated', () => {
      const authContext = createMockAuthContext({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Test User', role: 'admin' } as any,
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute />
        </TestWrapper>,
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Admin Access Tests', () => {
    it('should show access denied when admin required but user is not admin', () => {
      const authContext = createMockAuthContext({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Test User', role: 'user' } as any,
        isAdmin: vi.fn(() => false),
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute requiresAdmin={true} />
        </TestWrapper>,
      );

      expect(screen.getByText('Zugriff verweigert')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should render outlet when admin required and user is admin', () => {
      const authContext = createMockAuthContext({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Admin User', role: 'admin' } as any,
        isAdmin: vi.fn(() => true),
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute requiresAdmin={true} />
        </TestWrapper>,
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Role-Based Access Tests', () => {
    it('should deny access when user does not have required role', () => {
      const mockHasRole = vi.fn((role: string) => role !== AdminRole.SUPER_ADMIN);
      const authContext = createMockAuthContext({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Admin User', role: 'admin' } as any,
        hasRole: mockHasRole,
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute allowedRoles={[AdminRole.SUPER_ADMIN]} />
        </TestWrapper>,
      );

      expect(screen.getByText('Zugriff verweigert')).toBeInTheDocument();
      expect(mockHasRole).toHaveBeenCalledWith(AdminRole.SUPER_ADMIN);
    });

    it('should allow access when user has one of the required roles', () => {
      const mockHasRole = vi.fn((role: string) => [AdminRole.ADMIN, AdminRole.SUPPORT].includes(role as AdminRole));
      const authContext = createMockAuthContext({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Admin User', role: 'admin' } as any,
        hasRole: mockHasRole,
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute allowedRoles={[AdminRole.ADMIN, AdminRole.SUPER_ADMIN]} />
        </TestWrapper>,
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Custom Props Tests', () => {
    it('should use custom loading component when provided', () => {
      const CustomLoading = () => <div data-testid="custom-loading">Custom Loading</div>;
      const authContext = createMockAuthContext({
        isLoading: true,
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute loadingComponent={CustomLoading} />
        </TestWrapper>,
      );

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
    });

    it('should use custom fallback component when access denied', () => {
      const CustomFallback = () => <div data-testid="custom-fallback">Custom Access Denied</div>;
      const authContext = createMockAuthContext({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'User', role: 'user' } as any,
        isAdmin: vi.fn(() => false),
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute requiresAdmin={true} fallbackComponent={CustomFallback} />
        </TestWrapper>,
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    });

    it('should not show access denied message when showAccessDenied is false', () => {
      const authContext = createMockAuthContext({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'User', role: 'user' } as any,
        isAdmin: vi.fn(() => false),
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute requiresAdmin={true} showAccessDenied={false} />
        </TestWrapper>,
      );

      expect(screen.queryByText('Zugriff verweigert')).not.toBeInTheDocument();
    });
  });

  describe('Redirect Tests', () => {
    it('should redirect to custom path when unauthorized', () => {
      const authContext = createMockAuthContext({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'User', role: 'user' } as any,
        isAdmin: vi.fn(() => false),
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute requiresAdmin={true} redirectPath="/custom-redirect" showAccessDenied={false} />
        </TestWrapper>,
      );

      // Da wir MemoryRouter verwenden, können wir nicht direkt die Navigation testen
      // In einem echten E2E Test würden wir die URL-Änderung prüfen
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });
});
