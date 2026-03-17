import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseCurrentUser = vi.fn();
const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();
const mockSetRedirectAfterLogin = vi.fn();

vi.mock('@/features/auth', () => ({
  useCurrentUser: (...args: unknown[]) => mockUseCurrentUser(...args),
}));

vi.mock('@/features/auth/stores/auth.store', () => ({
  setRedirectAfterLogin: (...args: unknown[]) => mockSetRedirectAfterLogin(...args),
}));

vi.mock('@/features/auth/ui', () => ({
  AuthLoading: () => (
    <div role="status" aria-live="polite">
      Authentifizierung wird geladen...
    </div>
  ),
}));

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div data-testid="guard-outlet">outlet</div>,
  useRouter: () => ({
    navigate: mockNavigate,
  }),
  useLocation: (...args: unknown[]) => mockUseLocation(...args),
}));

import { AppGuard } from '../app-guard';

describe('AppGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue({ pathname: '/app/einsatz/42' });
    window.history.pushState({}, '', '/app/einsatz/42?tab=lagekarte#karte');
  });

  it('redirectet nicht im pending Status', () => {
    mockUseCurrentUser.mockReturnValue({
      authStatus: 'pending',
      user: undefined,
    });

    render(<AppGuard />);

    expect(screen.getByRole('status')).toHaveTextContent('Authentifizierung wird geladen...');
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockSetRedirectAfterLogin).not.toHaveBeenCalled();
  });

  it('redirectet bei unauthenticated zu /auth und übergibt das Ziel', async () => {
    mockUseCurrentUser.mockReturnValue({
      authStatus: 'unauthenticated',
      user: null,
    });

    render(<AppGuard />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/auth',
        search: {
          redirect: '/app/einsatz/42?tab=lagekarte#karte',
        },
        replace: true,
      });
    });

    expect(mockSetRedirectAfterLogin).toHaveBeenCalledWith('/app/einsatz/42?tab=lagekarte#karte');
    expect(screen.getByRole('status')).toHaveTextContent('Authentifizierung wird geladen...');
  });

  it('rendert Outlet für authentifizierte Nutzer', () => {
    mockUseCurrentUser.mockReturnValue({
      authStatus: 'authenticated',
      user: {
        id: 'user-1',
      },
    });

    render(<AppGuard />);

    expect(screen.getByTestId('guard-outlet')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
