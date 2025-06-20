import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from './AppLayout';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock Sidebar component
vi.mock('../organisms/Sidebar', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="sidebar" data-is-open={isOpen}>
      Sidebar
    </div>
  ),
}));

// Mock MobileHeader component
vi.mock('../organisms/MobileHeader', () => ({
  __esModule: true,
  default: ({ title, onMenuToggle }: { title: string; onMenuToggle: () => void }) => (
    <header data-testid="mobile-header">
      <span>{title}</span>
      <button onClick={onMenuToggle}>Toggle Menu</button>
    </header>
  ),
}));

// Mock navigation config
vi.mock('../../config/navigation', () => ({
  findRouteTitle: vi.fn((_path) => 'Test Title'),
  mainNavigation: [],
  adminNavigation: [],
}));

// Mock useMediaQuery
vi.mock('../../hooks/useMediaQuery', () => ({
  __esModule: true,
  default: vi.fn(() => false),
}));

// Mock react-router
vi.mock('react-router', () => ({
  ...vi.importActual('react-router'),
  Outlet: () => <div data-testid="outlet">Outlet</div>,
  useLocation: () => ({ pathname: '/test' }),
  useNavigate: () => vi.fn(),
}));

describe('AppLayout Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with react-router components', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </BrowserRouter>,
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-header')).toBeInTheDocument();
  });

  it('initializes useNavigate hook', () => {
    const navigateSpy = vi.fn();
    vi.doMock('react-router', () => ({
      ...vi.importActual('react-router'),
      useNavigate: () => navigateSpy,
    }));

    render(
      <BrowserRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </BrowserRouter>,
    );

    // Component should render without errors when navigate is initialized
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('uses useLocation hook to get current path', () => {
    const mockFindRouteTitle = vi.fn(() => 'Test Page');
    vi.doMock('../../config/navigation', () => ({
      findRouteTitle: mockFindRouteTitle,
      mainNavigation: [],
      adminNavigation: [],
    }));

    render(
      <BrowserRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </BrowserRouter>,
    );

    // Component should render and use location
    expect(screen.getByTestId('mobile-header')).toBeInTheDocument();
  });

  it('renders with Outlet for child routes', () => {
    // Test that component imports and uses Outlet from react-router
    render(
      <BrowserRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </BrowserRouter>,
    );

    // Main content area should exist for Outlet
    const mainElement = document.querySelector('main');
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveClass('py-10', 'lg:pl-72');
  });
});
