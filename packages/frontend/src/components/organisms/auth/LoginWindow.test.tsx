import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';
import { LoginWindow } from './LoginWindow';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/provider/auth.provider';

// Mock router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock toaster
vi.mock('@/components/ui/toaster.instance', () => ({
  toaster: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock auth store
vi.mock('@/stores/auth.store', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Store } = require('@tanstack/react-store');
  const authStore = new Store({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isAdminAuthenticated: false,
  });

  return {
    authStore,
    authActions: {
      setAuthenticated: vi.fn(),
      checkAuth: vi.fn(() => Promise.reject(new Error('Not authenticated'))),
      logout: vi.fn(() => Promise.resolve()),
    },
  };
});

// Mock API
vi.mock('@/api/api', () => ({
  api: {
    auth: () => ({
      authControllerLogin: vi.fn().mockResolvedValue({}),
      authControllerRegister: vi.fn().mockResolvedValue({}),
      authControllerCheckAuth: vi.fn().mockRejectedValue(new Error('Not authenticated')),
      authControllerLogout: vi.fn().mockResolvedValue({}),
    }),
    userManagement: () => ({
      userManagementControllerFindAllVAlpha: vi.fn().mockResolvedValue({ users: [] }),
    }),
  },
}));

describe('LoginWindow', () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    const system = createSystem(defaultConfig);
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <ChakraProvider value={system}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      </ChakraProvider>
    );

    return render(<LoginWindow />, { wrapper: Wrapper });
  };

  describe('Tab Navigation', () => {
    it('should render both tabs', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /anmelden/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /registrieren/i })).toBeInTheDocument();
      });
    });

    it('should show login tab content by default', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('tabpanel', { name: /anmelden/i })).toBeInTheDocument();
        expect(screen.queryByRole('tabpanel', { name: /registrieren/i })).not.toBeInTheDocument();
      });
    });

    it('should switch to register tab when clicked', async () => {
      renderComponent();

      await waitFor(() => {
        const registerTab = screen.getByRole('tab', { name: /registrieren/i });
        expect(registerTab).toBeInTheDocument();
      });

      const registerTab = screen.getByRole('tab', { name: /registrieren/i });
      await user.click(registerTab);

      await waitFor(() => {
        expect(screen.queryByRole('tabpanel', { name: /anmelden/i })).not.toBeInTheDocument();
        expect(screen.getByRole('tabpanel', { name: /registrieren/i })).toBeInTheDocument();
      });
    });

    it('should switch back to login tab when clicked', async () => {
      renderComponent();

      // Wait for component to be ready
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /registrieren/i })).toBeInTheDocument();
      });

      // Switch to register tab first
      const registerTab = screen.getByRole('tab', { name: /registrieren/i });
      await user.click(registerTab);

      await waitFor(() => {
        expect(screen.getByRole('tabpanel', { name: /registrieren/i })).toBeInTheDocument();
      });

      // Switch back to login tab
      const loginTab = screen.getByRole('tab', { name: /anmelden/i });
      await user.click(loginTab);

      await waitFor(() => {
        expect(screen.getByRole('tabpanel', { name: /anmelden/i })).toBeInTheDocument();
        expect(screen.queryByRole('tabpanel', { name: /registrieren/i })).not.toBeInTheDocument();
      });
    });

    it('should maintain tab state when switching', async () => {
      renderComponent();

      // Wait for component to be ready
      await waitFor(() => {
        const loginTab = screen.getByRole('tab', { name: /anmelden/i });
        const registerTab = screen.getByRole('tab', { name: /registrieren/i });
        expect(loginTab).toBeInTheDocument();
        expect(registerTab).toBeInTheDocument();
      });

      // Verify initial state
      const loginTab = screen.getByRole('tab', { name: /anmelden/i });
      const registerTab = screen.getByRole('tab', { name: /registrieren/i });

      expect(loginTab).toHaveAttribute('aria-selected', 'true');
      expect(registerTab).toHaveAttribute('aria-selected', 'false');

      // Switch to register
      await user.click(registerTab);

      await waitFor(() => {
        expect(loginTab).toHaveAttribute('aria-selected', 'false');
        expect(registerTab).toHaveAttribute('aria-selected', 'true');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for tabs', async () => {
      renderComponent();

      await waitFor(() => {
        const tablist = screen.getByRole('tablist');
        expect(tablist).toBeInTheDocument();
      });

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(2);

      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('aria-controls');
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('should have proper ARIA attributes for tab panels', async () => {
      renderComponent();

      await waitFor(() => {
        const loginPanel = screen.getByRole('tabpanel', { name: /anmelden/i });
        expect(loginPanel).toBeInTheDocument();
      });

      const loginPanel = screen.getByRole('tabpanel', { name: /anmelden/i });
      expect(loginPanel).toHaveAttribute('aria-labelledby');
      expect(loginPanel).toHaveAttribute('id');

      // Switch to register tab
      const registerTab = screen.getByRole('tab', { name: /registrieren/i });
      await user.click(registerTab);

      await waitFor(() => {
        const registerPanel = screen.getByRole('tabpanel', { name: /registrieren/i });
        expect(registerPanel).toBeInTheDocument();
        expect(registerPanel).toHaveAttribute('aria-labelledby');
        expect(registerPanel).toHaveAttribute('id');
      });
    });
  });
});
