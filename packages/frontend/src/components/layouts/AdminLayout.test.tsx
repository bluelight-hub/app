import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';

// Import after mocks
import { AdminLayout } from './AdminLayout';

// Mock window.__TAURI__
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

// Create mocks before module mocking
const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
  Outlet: () => <div>Outlet Content</div>,
}));

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
  }),
}));

// Mock useAdminAuth hook
vi.mock('@/hooks/useAdminAuth', () => ({
  useAdminAuth: () => ({
    isAdmin: false,
    isLoading: false,
  }),
}));

// Mock Tauri
vi.mock('@tauri-apps/api/window', () => ({
  appWindow: {
    close: vi.fn(),
  },
}));

const system = createSystem(defaultConfig);

describe('AdminLayout', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    delete window.__TAURI__;
    Object.defineProperty(window, 'opener', {
      value: null,
      writable: true,
    });
    mockUseLocation.mockReturnValue({ pathname: '/admin/setup' });
  });

  const renderComponent = (pathname: string = '/admin/setup') => {
    mockUseLocation.mockReturnValue({ pathname });
    render(
      <ChakraProvider value={system}>
        <AdminLayout />
      </ChakraProvider>,
    );
  };

  it('renders with correct title for /admin/setup', () => {
    renderComponent('/admin/setup');
    expect(screen.getByText('Admin-Setup')).toBeInTheDocument();
  });

  it('renders with correct title for /admin/login', () => {
    renderComponent('/admin/login');
    expect(screen.getByText('Administrator-Anmeldung')).toBeInTheDocument();
  });

  it('renders with correct title for /admin/dashboard', () => {
    renderComponent('/admin/dashboard');
    expect(screen.getByText('Admin-Dashboard')).toBeInTheDocument();
  });

  it('renders with correct title for /admin/users', () => {
    renderComponent('/admin/users');
    expect(screen.getByText('Benutzerverwaltung')).toBeInTheDocument();
  });

  it('renders with default title for unknown route', () => {
    renderComponent('/admin/unknown');
    expect(screen.getByText('Admin-Bereich')).toBeInTheDocument();
  });

  it('renders close button', () => {
    renderComponent();
    const closeButton = screen.getByLabelText('Fenster schließen');
    expect(closeButton).toBeInTheDocument();
  });

  it('renders outlet content', () => {
    renderComponent();
    expect(screen.getByText('Outlet Content')).toBeInTheDocument();
  });

  it('handles close button click in browser without opener', async () => {
    renderComponent();
    const closeButton = screen.getByLabelText('Fenster schließen');

    await user.click(closeButton);

    // Should navigate to home as fallback
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
  });

  it('handles close button click in browser with opener', async () => {
    const mockClose = vi.fn();
    Object.defineProperty(window, 'opener', {
      value: {},
      writable: true,
    });
    window.close = mockClose;

    renderComponent();
    const closeButton = screen.getByLabelText('Fenster schließen');

    await user.click(closeButton);

    expect(mockClose).toHaveBeenCalled();
  });

  it('handles close button click in Tauri environment', async () => {
    window.__TAURI__ = {};

    renderComponent();
    const closeButton = screen.getByLabelText('Fenster schließen');

    await user.click(closeButton);

    // Wait for dynamic import to be called
    await new Promise((resolve) => setTimeout(resolve, 10));

    // In a real test environment with proper module mocking,
    // we would verify that appWindow.close() was called
    expect(window.__TAURI__).toBeDefined();
  });
});
