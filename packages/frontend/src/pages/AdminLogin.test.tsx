import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authActions } from '../stores/auth.store';
import { AuthContext } from '../provider/auth.context';
import { AdminLogin } from './AdminLogin';
import type { AuthContextType } from '../provider/auth.context';

// Mock dependencies
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../api/api', () => ({
  BackendApi: vi.fn().mockImplementation(() => ({
    auth: () => ({
      authControllerAdminLogin: vi.fn(),
    }),
  })),
}));

vi.mock('../stores/auth.store', () => ({
  authActions: {
    loginSuccess: vi.fn(),
  },
}));

vi.mock('@/components/ui/toaster.instance', () => ({
  toaster: {
    create: vi.fn(),
  },
}));

const mockUser = { id: '1', username: 'testuser', createdAt: new Date().toISOString() };

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const authContextValue: AuthContextType = {
    user: mockUser,
    isLoading: false,
    setUser: vi.fn(),
    setLoading: vi.fn(),
    logout: vi.fn(),
  };

  return ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={authContextValue}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AuthContext.Provider>
  );
};

describe('AdminLogin', () => {
  const user = userEvent.setup();
  let mockAuthControllerAdminLogin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    const { BackendApi } = vi.mocked(await import('../api/api'));
    mockAuthControllerAdminLogin = vi.fn();
    (BackendApi as any).mockImplementation(() => ({
      auth: () => ({
        authControllerAdminLogin: mockAuthControllerAdminLogin,
      }),
    }));
  });

  it('renders admin login form', () => {
    render(<AdminLogin />, { wrapper: createWrapper() });

    expect(screen.getByText('Admin-Bereich')).toBeInTheDocument();
    expect(screen.getByText(/angemeldet als: testuser/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Passwort')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /als admin anmelden/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<AdminLogin />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole('button', { name: /als admin anmelden/i });

    // Try to submit without entering any data
    await user.click(submitButton);

    // Button should be disabled
    expect(submitButton).toBeDisabled();

    // Enter username only
    await user.type(screen.getByLabelText('Benutzername'), 'admin');

    // Button should still be disabled (password missing)
    expect(submitButton).toBeDisabled();

    // Clear and enter password only
    await user.clear(screen.getByLabelText('Benutzername'));
    await user.type(screen.getByLabelText('Passwort'), 'password123');

    // Button should still be disabled (username missing)
    expect(submitButton).toBeDisabled();
  });

  it('handles successful login', async () => {
    const adminUser = { id: '1', username: 'admin', createdAt: new Date().toISOString() };
    const mockResponse = { user: adminUser, token: 'mock-token' };
    mockAuthControllerAdminLogin.mockResolvedValueOnce(mockResponse);

    render(<AdminLogin />, { wrapper: createWrapper() });

    // Fill in form
    await user.type(screen.getByLabelText('Benutzername'), 'admin');
    await user.type(screen.getByLabelText('Passwort'), 'SecurePassword123!');

    // Submit form
    await user.click(screen.getByRole('button', { name: /als admin anmelden/i }));

    // Wait for async operations
    await waitFor(() => {
      expect(mockAuthControllerAdminLogin).toHaveBeenCalledWith({
        adminLoginDto: {
          username: 'admin',
          password: 'SecurePassword123!',
        } as AdminLoginDto,
      });
    });

    expect(authActions.loginSuccess).toHaveBeenCalledWith(adminUser);
  });

  it('handles login error - invalid credentials', async () => {
    const error = new Error('401 Unauthorized');
    (error as any).status = 401;
    mockAuthControllerAdminLogin.mockRejectedValueOnce(error);

    render(<AdminLogin />, { wrapper: createWrapper() });

    // Fill in form
    await user.type(screen.getByLabelText('Benutzername'), 'admin');
    await user.type(screen.getByLabelText('Passwort'), 'wrongpassword');

    // Submit form
    await user.click(screen.getByRole('button', { name: /als admin anmelden/i }));

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/ungültiger benutzername oder passwort/i)).toBeInTheDocument();
    });
  });

  it('handles login error - no admin rights', async () => {
    const error = new Error('403 Forbidden');
    (error as any).status = 403;
    mockAuthControllerAdminLogin.mockRejectedValueOnce(error);

    render(<AdminLogin />, { wrapper: createWrapper() });

    // Fill in form
    await user.type(screen.getByLabelText('Benutzername'), 'regularuser');
    await user.type(screen.getByLabelText('Passwort'), 'password123');

    // Submit form
    await user.click(screen.getByRole('button', { name: /als admin anmelden/i }));

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/sie haben keine administratorrechte/i)).toBeInTheDocument();
    });
  });

  it('disables form during submission', async () => {
    // Mock a delayed response
    mockAuthControllerAdminLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<AdminLogin />, { wrapper: createWrapper() });

    const usernameInput = screen.getByLabelText('Benutzername');
    const passwordInput = screen.getByLabelText('Passwort');
    const submitButton = screen.getByRole('button', { name: /als admin anmelden/i });

    // Fill in form
    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'password123');

    // Submit form
    await user.click(submitButton);

    // Check that form is disabled during submission
    expect(usernameInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/melde an.../i)).toBeInTheDocument();
  });
});
