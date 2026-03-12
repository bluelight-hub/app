import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IndexPage } from '../index.page';

const mockNavigate = vi.fn();
const mockOpenAdminWindow = vi.fn().mockResolvedValue(undefined);
const mockUseCurrentUser = vi.fn();
const mockUseLogout = vi.fn();
const mockUseActiveServer = vi.fn();

vi.mock('@/features/auth', () => ({
  isAdmin: (role?: string) => role === 'ADMIN' || role === 'SUPER_ADMIN',
  useCurrentUser: () => mockUseCurrentUser(),
  useLogout: () => mockUseLogout(),
}));

vi.mock('@/features/auth/ui', () => ({
  SessionContextCard: ({ onAdminAction }: { onAdminAction?: () => void | Promise<void> }) => (
    <div data-testid="session-context-card">
      {onAdminAction ? (
        <button type="button" onClick={onAdminAction}>
          Session CTA
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock('@/features/einsatz/ui/organisms/EinsatzDashboard', () => ({
  EinsatzDashboard: () => <div data-testid="einsatz-dashboard">Dashboard</div>,
}));

vi.mock('@/features/server/hooks', () => ({
  useActiveServer: () => mockUseActiveServer(),
}));

vi.mock('@/shared/ui/atoms/button.atom', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
}));

vi.mock('@/shared/ui/atoms/heading.atom', () => ({
  Heading: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
}));

vi.mock('@/shared/ui/atoms/spinner.atom', () => ({
  Spinner: () => <div>Lädt...</div>,
}));

vi.mock('@/shared/ui/atoms/text.atom', () => ({
  Text: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

vi.mock('@/shared/ui/molecules/color-mode-menu.molecule', () => ({
  ColorModeMenu: () => <div data-testid="color-mode-menu">Color Mode</div>,
}));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
  }),
}));

vi.mock('@/services/windowService', () => ({
  openAdminWindow: () => mockOpenAdminWindow(),
}));

describe('IndexPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseCurrentUser.mockReturnValue({
      isLoading: false,
      user: { username: 'einsatzleitung', role: 'ADMIN' },
      adminSessionStatus: 'unauthenticated',
      adminStatus: { adminSetupAvailable: false },
    });
    mockUseLogout.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    });
    mockUseActiveServer.mockReturnValue({ name: 'Leitstelle Nord' });
  });

  it('zeigt keine separaten Footer-Admin-Aktionen mehr und delegiert die Aktion an die Sitzungskarte', async () => {
    render(<IndexPage />);

    expect(screen.queryByText(/Sie arbeiten wieder im authentifizierten Bereich/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Admin-Bereich/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Admin-Setup/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Session CTA/i }));

    await waitFor(() => {
      expect(mockOpenAdminWindow).toHaveBeenCalledTimes(1);
    });
  });
});
