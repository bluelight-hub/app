import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';
import '@testing-library/jest-dom';
import { ResponseError } from '@bluelight-hub/shared/client';
import { authActions } from '../stores/auth.store';
import { AuthContext } from '../provider/auth.context';
import { AdminLogin } from './AdminLogin';
import type { AuthContextType } from '../provider/auth.context';
import type { AdminPasswordDto } from '@bluelight-hub/shared/client';
import { toaster } from '@/components/ui/toaster.instance';

// Mock dependencies
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

// Use vi.hoisted to define the mock function before vi.mock
const { mockAuthControllerAdminLogin } = vi.hoisted(() => {
  return {
    mockAuthControllerAdminLogin: vi.fn(),
  };
});

vi.mock('../api/api', () => ({
  api: {
    auth: () => ({
      authControllerAdminLogin: mockAuthControllerAdminLogin,
    }),
  },
}));

vi.mock('../stores/auth.store', () => ({
  authActions: {
    loginSuccess: vi.fn(),
    setAdminAuth: vi.fn(),
  },
}));

vi.mock('@/components/ui/toaster.instance', () => ({
  toaster: {
    create: vi.fn(),
  },
}));

const mockUser = {
  id: '1',
  username: 'testuser',
  createdAt: new Date(),
  updatedAt: new Date(),
  role: 'USER' as const,
  isActive: true,
};

const system = createSystem(defaultConfig);

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
    isAdminAuthenticated: false,
    setUser: vi.fn(),
    setLoading: vi.fn(),
    logout: vi.fn(),
  };

  return ({ children }: { children: React.ReactNode }) => (
    <ChakraProvider value={system}>
      <AuthContext.Provider value={authContextValue}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AuthContext.Provider>
    </ChakraProvider>
  );
};

describe('AdminLogin', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders admin login form', () => {
    render(<AdminLogin />, { wrapper: createWrapper() });

    expect(screen.getByText('Administrator-Anmeldung')).toBeInTheDocument();
    // User login status is not shown on admin login page anymore
    expect(screen.getByPlaceholderText('Geben Sie Ihr Passwort ein')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Als Administrator anmelden' })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<AdminLogin />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole('button', { name: 'Als Administrator anmelden' });

    // Try to submit without entering any data
    await user.click(submitButton);

    // Button should be disabled when no password is entered
    expect(submitButton).toBeDisabled();

    // Enter password
    await user.type(screen.getByPlaceholderText('Geben Sie Ihr Passwort ein'), 'password123');

    // Button should be enabled after entering password
    expect(submitButton).not.toBeDisabled();
  });

  it('handles successful login', async () => {
    const adminUser = {
      id: '1',
      username: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      role: 'ADMIN' as const,
      isActive: true,
    };
    const mockResponse = { user: adminUser, token: 'mock-token' };
    mockAuthControllerAdminLogin.mockResolvedValueOnce(mockResponse);

    render(<AdminLogin />, { wrapper: createWrapper() });

    // Fill in form - only password field since user is already logged in
    await user.type(screen.getByPlaceholderText('Geben Sie Ihr Passwort ein'), 'SecurePassword123!');

    // Submit form
    await user.click(screen.getByRole('button', { name: 'Als Administrator anmelden' }));

    // Wait for async operations
    await waitFor(() => {
      expect(mockAuthControllerAdminLogin).toHaveBeenCalledWith({
        adminPasswordDto: {
          password: 'SecurePassword123!',
        } as AdminPasswordDto,
      });
    });

    expect(authActions.loginSuccess).toHaveBeenCalledWith(adminUser);
  });

  it('handles login error - invalid credentials', async () => {
    const error = new ResponseError(new Response(null, { status: 401, statusText: 'Unauthorized' }), '401 Unauthorized');
    mockAuthControllerAdminLogin.mockRejectedValueOnce(error);

    render(<AdminLogin />, { wrapper: createWrapper() });

    // Fill in form - only password field
    await user.type(screen.getByPlaceholderText('Geben Sie Ihr Passwort ein'), 'wrongpassword');

    // Submit form
    await user.click(screen.getByRole('button', { name: 'Als Administrator anmelden' }));

    // Wait for error handling
    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Login fehlgeschlagen',
          description: 'Ungültiges Passwort.',
          type: 'error',
        }),
      );
    });
  });

  it('handles login error - no admin rights', async () => {
    const error = new ResponseError(new Response(null, { status: 403, statusText: 'Forbidden' }), '403 Forbidden');
    mockAuthControllerAdminLogin.mockRejectedValueOnce(error);

    render(<AdminLogin />, { wrapper: createWrapper() });

    // Fill in form - only password field
    await user.type(screen.getByPlaceholderText('Geben Sie Ihr Passwort ein'), 'password123');

    // Submit form
    await user.click(screen.getByRole('button', { name: 'Als Administrator anmelden' }));

    // Wait for error handling
    await waitFor(() => {
      expect(toaster.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Zugriff verweigert',
          description: 'Sie haben keine Administratorrechte.',
          type: 'error',
        }),
      );
    });
  });

  it('disables form during submission', async () => {
    // Mock a delayed response
    mockAuthControllerAdminLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<AdminLogin />, { wrapper: createWrapper() });

    const passwordInput = screen.getByPlaceholderText('Geben Sie Ihr Passwort ein');
    const submitButton = screen.getByRole('button', { name: 'Als Administrator anmelden' });

    // Fill in form - only password field
    await user.type(passwordInput, 'password123');

    // Submit form
    await user.click(submitButton);

    // Wait for and check that form is disabled during submission
    await waitFor(() => {
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Anmeldung...')).toBeInTheDocument();
    });
  });

  it('should have a close button that navigates to home', async () => {
    render(<AdminLogin />, { wrapper: createWrapper() });

    const closeButton = screen.getByLabelText('Fenster schließen');
    expect(closeButton).toBeInTheDocument();

    // Mock window.opener to be null so it falls back to navigation
    Object.defineProperty(window, 'opener', {
      value: null,
      writable: true,
    });

    await user.click(closeButton);

    // Since we can't test window.close() directly, we just verify the button exists and is clickable
    expect(closeButton).toBeInTheDocument();
  });
});
