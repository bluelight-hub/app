import React from 'react';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import { RouteUtils } from '@/config/routes';

// Mock RouteUtils
vi.mock('@/config/routes', () => ({
  RouteUtils: {
    generateBreadcrumbs: vi.fn(),
  },
}));

// Mock useAuthorization Hook
vi.mock('@/hooks/useAuthorization', () => ({
  useAuthorization: () => ({
    canAccessPath: vi.fn((path: string) => path !== '/admin/restricted'),
  }),
}));

const mockAuthContext: AuthContextType = {
  user: {
    id: '1',
    roles: ['ADMIN'],
    email: '',
    permissions: [],
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  hasRole: vi.fn(),
  hasPermission: vi.fn(),
  isAdmin: vi.fn(() => true),
};

const TestWrapper: React.FC<{
  children: React.ReactNode;
  initialEntries?: string[];
}> = ({ children, initialEntries = ['/admin/users'] }) => (
  <MemoryRouter initialEntries={initialEntries}>
    <AuthContext.Provider value={mockAuthContext}>{children}</AuthContext.Provider>
  </MemoryRouter>
);

describe('Breadcrumbs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render breadcrumbs based on current route', () => {
    const mockBreadcrumbs = [
      { label: 'Dashboard', path: '/admin', clickable: true },
      { label: 'Users', path: '/admin/users', clickable: false },
    ];

    (RouteUtils.generateBreadcrumbs as Mock).mockReturnValue(mockBreadcrumbs);

    render(
      <TestWrapper>
        <Breadcrumbs />
      </TestWrapper>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('should render custom breadcrumb items when provided', () => {
    const customItems = [
      { label: 'Custom Home', path: '/custom', clickable: true, current: false },
      { label: 'Custom Page', path: '/custom/page', clickable: false, current: true },
    ];

    render(
      <TestWrapper>
        <Breadcrumbs customItems={customItems} />
      </TestWrapper>,
    );

    expect(screen.getByText('Custom Home')).toBeInTheDocument();
    expect(screen.getByText('Custom Page')).toBeInTheDocument();
  });

  it('should show home icon when showHomeIcon is true', () => {
    const mockBreadcrumbs = [{ label: 'Dashboard', path: '/admin', clickable: true }];

    (RouteUtils.generateBreadcrumbs as Mock).mockReturnValue(mockBreadcrumbs);

    render(
      <TestWrapper>
        <Breadcrumbs showHomeIcon={true} />
      </TestWrapper>,
    );

    // Prüfe, dass ein Icon-Element existiert (Ant Design rendert Icons als spans)
    const iconElements = document.querySelectorAll('.anticon');
    expect(iconElements.length).toBeGreaterThan(0);
  });

  it('should limit displayed items when maxItems is set', () => {
    const longBreadcrumbs = [
      { label: 'Home', path: '/', clickable: true },
      { label: 'Admin', path: '/admin', clickable: true },
      { label: 'Users', path: '/admin/users', clickable: true },
      { label: 'Details', path: '/admin/users/details', clickable: true },
      { label: 'Edit', path: '/admin/users/details/edit', clickable: false },
    ];

    (RouteUtils.generateBreadcrumbs as jest.Mock).mockReturnValue(longBreadcrumbs);

    render(
      <TestWrapper>
        <Breadcrumbs maxItems={3} />
      </TestWrapper>,
    );

    // Sollte ellipsis (...) anzeigen wenn Items begrenzt werden
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('should render non-clickable items as spans', () => {
    const mockBreadcrumbs = [
      { label: 'Dashboard', path: '/admin', clickable: true },
      { label: 'Current Page', path: '/admin/current', clickable: false },
    ];

    (RouteUtils.generateBreadcrumbs as Mock).mockReturnValue(mockBreadcrumbs);

    render(
      <TestWrapper>
        <Breadcrumbs />
      </TestWrapper>,
    );

    // Dashboard sollte als Link sein
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink.getAttribute('href')).toBe('/admin');

    // Current Page sollte kein Link sein
    expect(screen.queryByRole('link', { name: /current page/i })).not.toBeInTheDocument();
    expect(screen.getByText('Current Page')).toBeInTheDocument();
  });

  it('should show disabled state for restricted routes', () => {
    const mockBreadcrumbs = [
      { label: 'Dashboard', path: '/admin', clickable: true },
      { label: 'Restricted', path: '/admin/restricted', clickable: true },
    ];

    (RouteUtils.generateBreadcrumbs as Mock).mockReturnValue(mockBreadcrumbs);

    render(
      <TestWrapper>
        <Breadcrumbs />
      </TestWrapper>,
    );

    // Dashboard sollte zugänglich sein
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();

    // Restricted sollte als span gerendert werden (nicht zugänglich)
    expect(screen.queryByRole('link', { name: /restricted/i })).not.toBeInTheDocument();
    expect(screen.getByText('Restricted')).toBeInTheDocument();
  });

  it('should return null when no breadcrumb items exist', () => {
    (RouteUtils.generateBreadcrumbs as jest.Mock).mockReturnValue([]);

    const { container } = render(
      <TestWrapper>
        <Breadcrumbs />
      </TestWrapper>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should handle custom separator', () => {
    const mockBreadcrumbs = [
      { label: 'Dashboard', path: '/admin', clickable: true },
      { label: 'Users', path: '/admin/users', clickable: false },
    ];

    (RouteUtils.generateBreadcrumbs as Mock).mockReturnValue(mockBreadcrumbs);

    render(
      <TestWrapper>
        <Breadcrumbs separator=">" />
      </TestWrapper>,
    );

    // Ant Design Breadcrumb sollte den custom Separator verwenden
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('should call onItemClick when breadcrumb is clicked', () => {
    const mockOnItemClick = vi.fn();
    const mockBreadcrumbs = [{ label: 'Dashboard', path: '/admin', clickable: true }];

    (RouteUtils.generateBreadcrumbs as Mock).mockReturnValue(mockBreadcrumbs);

    render(
      <TestWrapper>
        <Breadcrumbs onItemClick={mockOnItemClick} />
      </TestWrapper>,
    );

    // Finde den Link durch Text
    const dashboardLink = screen.getByText('Dashboard');
    dashboardLink.click();

    expect(mockOnItemClick).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Dashboard',
        path: '/admin',
        clickable: true,
      }),
    );
  });
});
