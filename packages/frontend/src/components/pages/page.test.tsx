import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import IndexPage from './page';

// Mock for useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock for useAuth
const mockAuth = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
  hasRole: vi.fn(),
  hasPermission: vi.fn(),
  isAdmin: vi.fn(),
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

describe('IndexPage', () => {
  // Reset mocks before each test
  beforeEach(() => {
    mockNavigate.mockReset();
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = true;
  });

  // Test loading state
  test('shows loading state while checking authentication', () => {
    render(
      <BrowserRouter>
        <IndexPage />
      </BrowserRouter>,
    );

    expect(screen.getByText('Lädt...')).toBeInTheDocument();
  });

  // Test redirect to login when not authenticated
  test('redirects to login when not authenticated', async () => {
    mockAuth.isLoading = false;
    mockAuth.isAuthenticated = false;

    render(
      <BrowserRouter>
        <IndexPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  // Test redirect to app when authenticated
  test('redirects to app when authenticated', async () => {
    mockAuth.isLoading = false;
    mockAuth.isAuthenticated = true;

    render(
      <BrowserRouter>
        <IndexPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });
  });
});
