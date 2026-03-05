import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseCurrentUser = vi.fn();
const mockSetRedirectAfterLogin = vi.fn();
const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();
const mockIsTauri = vi.fn();
const mockIsInAdminWindow = vi.fn();
const mockCloseWindow = vi.fn();

vi.mock('@/features/auth', () => ({
  useCurrentUser: (...args: unknown[]) => mockUseCurrentUser(...args),
}));

vi.mock('@/features/auth/stores/auth.store', () => ({
  setRedirectAfterLogin: (...args: unknown[]) => mockSetRedirectAfterLogin(...args),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Outlet: () => <div data-testid="admin-outlet">outlet</div>,
  useLocation: (...args: unknown[]) => mockUseLocation(...args),
  useMatchRoute: () => () => false,
  useNavigate: () => mockNavigate,
  useRouterState: () => ({
    matches: [{ meta: [{ title: 'Admin-Bereich' }] }],
  }),
}));

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: (...args: unknown[]) => mockIsTauri(...args),
}));

vi.mock('@/services/windowService', () => ({
  isInAdminWindow: (...args: unknown[]) => mockIsInAdminWindow(...args),
}));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
  getCurrentWebviewWindow: () => ({
    close: (...args: unknown[]) => mockCloseWindow(...args),
  }),
}));

vi.mock('@/shared/ui/atoms/close-button.atom', () => ({
  CloseButton: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      close
    </button>
  ),
}));

vi.mock('@/shared/ui/atoms/container.atom', () => ({
  Container: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/atoms/heading.atom', () => ({
  Heading: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
}));

vi.mock('@/shared/ui/atoms/icon-button.atom', () => ({
  IconButton: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock('@/shared/ui/atoms/spinner.atom', () => ({
  Spinner: () => <div data-testid="admin-spinner">spinner</div>,
}));

import { AdminLayout } from '../AdminLayout';

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue({ pathname: '/admin/dashboard' });
    mockIsTauri.mockReturnValue(false);
    mockIsInAdminWindow.mockResolvedValue(false);
    mockCloseWindow.mockResolvedValue(undefined);
    window.history.pushState({}, '', '/admin/dashboard?tab=users#section');
  });

  it('führt im pending Status keinen Redirect aus', () => {
    mockUseCurrentUser.mockReturnValue({
      user: null,
      authStatus: 'pending',
      adminSessionStatus: 'pending',
    });

    render(<AdminLayout />);

    expect(screen.getByTestId('admin-spinner')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('redirectet eingeloggte User ohne Admin-Session zu /admin-login mit Redirect-Ziel', async () => {
    mockUseCurrentUser.mockReturnValue({
      user: { id: 'user-1' },
      authStatus: 'authenticated',
      adminSessionStatus: 'unauthenticated',
    });

    render(<AdminLayout />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/admin-login',
        search: {
          redirect: '/admin/dashboard?tab=users#section',
        },
        replace: true,
      });
    });

    expect(mockSetRedirectAfterLogin).toHaveBeenCalledWith('/admin/dashboard?tab=users#section');
  });

  it('redirectet anonyme User zu /auth mit Redirect-Ziel', async () => {
    mockUseCurrentUser.mockReturnValue({
      user: null,
      authStatus: 'unauthenticated',
      adminSessionStatus: 'unauthenticated',
    });

    render(<AdminLayout />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/auth',
        search: {
          redirect: '/admin/dashboard?tab=users#section',
        },
        replace: true,
      });
    });
  });

  it('überspringt Redirects auf der Setup-Route', async () => {
    mockUseLocation.mockReturnValue({ pathname: '/admin/setup' });
    window.history.pushState({}, '', '/admin/setup?step=1');

    mockUseCurrentUser.mockReturnValue({
      user: { id: 'user-1' },
      authStatus: 'authenticated',
      adminSessionStatus: 'unauthenticated',
    });

    render(<AdminLayout />);

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    expect(mockSetRedirectAfterLogin).not.toHaveBeenCalled();
  });

  it('schließt im Tauri-Adminfenster ohne Session das Fenster statt zu navigieren', async () => {
    mockIsTauri.mockReturnValue(true);
    mockIsInAdminWindow.mockResolvedValue(true);

    mockUseCurrentUser.mockReturnValue({
      user: { id: 'user-1' },
      authStatus: 'authenticated',
      adminSessionStatus: 'unauthenticated',
    });

    render(<AdminLayout />);

    await waitFor(() => {
      expect(mockCloseWindow).toHaveBeenCalledTimes(1);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
