import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import { AdminRole } from '@/config/routes';

// Mock AuthContext für Tests
const createMockAuthContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
  hasRole: jest.fn(),
  hasPermission: jest.fn(),
  isAdmin: jest.fn(() => false),
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

// Mock Outlet Component
const MockOutlet = () => <div data-testid="protected-content">Protected Content</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
          <ProtectedRoute>
            <MockOutlet />
          </ProtectedRoute>
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
        isAdmin: jest.fn(() => false),
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute requiresAdmin={true}>
            <MockOutlet />
          </ProtectedRoute>
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
        isAdmin: jest.fn(() => true),
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute requiresAdmin={true}>
            <MockOutlet />
          </ProtectedRoute>
        </TestWrapper>,
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Role-Based Access Tests', () => {
    it('should deny access when user does not have required role', () => {
      const mockHasRole = jest.fn((role: string) => role !== AdminRole.SUPER_ADMIN);
      const authContext = createMockAuthContext({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Admin User', role: 'admin' } as any,
        hasRole: mockHasRole,
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute allowedRoles={[AdminRole.SUPER_ADMIN]}>
            <MockOutlet />
          </ProtectedRoute>
        </TestWrapper>,
      );

      expect(screen.getByText('Zugriff verweigert')).toBeInTheDocument();
      expect(mockHasRole).toHaveBeenCalledWith(AdminRole.SUPER_ADMIN);
    });

    it('should allow access when user has one of the required roles', () => {
      const mockHasRole = jest.fn((role: string) => [AdminRole.ADMIN, AdminRole.SUPPORT].includes(role as AdminRole));
      const authContext = createMockAuthContext({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'Admin User', role: 'admin' } as any,
        hasRole: mockHasRole,
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute allowedRoles={[AdminRole.ADMIN, AdminRole.SUPER_ADMIN]}>
            <MockOutlet />
          </ProtectedRoute>
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
          <ProtectedRoute loadingComponent={CustomLoading}>
            <MockOutlet />
          </ProtectedRoute>
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
        isAdmin: jest.fn(() => false),
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute requiresAdmin={true} fallbackComponent={CustomFallback}>
            <MockOutlet />
          </ProtectedRoute>
        </TestWrapper>,
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    });

    it('should not show access denied message when showAccessDenied is false', () => {
      const authContext = createMockAuthContext({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', name: 'User', role: 'user' } as any,
        isAdmin: jest.fn(() => false),
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute requiresAdmin={true} showAccessDenied={false}>
            <MockOutlet />
          </ProtectedRoute>
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
        isAdmin: jest.fn(() => false),
      });

      render(
        <TestWrapper authContext={authContext}>
          <ProtectedRoute requiresAdmin={true} redirectPath="/custom-redirect" showAccessDenied={false}>
            <MockOutlet />
          </ProtectedRoute>
        </TestWrapper>,
      );

      // Da wir MemoryRouter verwenden, können wir nicht direkt die Navigation testen
      // In einem echten E2E Test würden wir die URL-Änderung prüfen
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });
});
