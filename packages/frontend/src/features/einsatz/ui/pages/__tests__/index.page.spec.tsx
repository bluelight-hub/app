import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IndexPage } from '../index.page';

const mockNavigate = vi.fn();

vi.mock('@/features/auth', () => ({
  useCurrentUser: vi.fn(),
  useLogout: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  })),
  isAdmin: vi.fn(),
}));

vi.mock('@/features/server/hooks', () => ({
  useActiveServer: vi.fn(),
}));

vi.mock('@/features/einsatz/ui/organisms', () => ({
  EinsatzDashboard: () => <div data-testid="einsatz-dashboard" />,
}));

vi.mock('@/features/einsatz/ui/organisms/EinsatzDashboard', () => ({
  EinsatzDashboard: () => <div data-testid="einsatz-dashboard" />,
}));

vi.mock('@/features/server/ui/atoms', () => ({
  ServerNameBadge: ({ name }: { name: string }) => <div data-testid="server-badge">{name}</div>,
}));

vi.mock('@/shared/ui/atoms/heading.atom', () => ({
  Heading: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/shared/ui/atoms/spinner.atom', () => ({
  Spinner: () => <div>Spinner</div>,
}));

vi.mock('@/shared/ui/atoms/text.atom', () => ({
  Text: ({ children, color }: { children: React.ReactNode; color?: string }) => <p data-color={color}>{children}</p>,
}));

vi.mock('@/shared/ui/atoms/button.atom', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock('@/shared/ui/molecules/color-mode-menu.molecule', () => ({
  ColorModeMenu: () => <button type="button">Farbmodus</button>,
}));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
  }),
}));

import { isAdmin, useCurrentUser, useLogout } from '@/features/auth';
import { useActiveServer } from '@/features/server/hooks';

const mockUseCurrentUser = vi.mocked(useCurrentUser);
const mockUseActiveServer = vi.mocked(useActiveServer);
const mockUseLogout = vi.mocked(useLogout);
const mockIsAdmin = vi.mocked(isAdmin);

describe('IndexPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('zeigt den Ladezustand inline und semantisch', () => {
    mockUseCurrentUser.mockReturnValue({
      isLoading: true,
    } as ReturnType<typeof useCurrentUser>);
    mockUseActiveServer.mockReturnValue({ id: 'server-1', name: 'Zentrale Ost', url: 'https://example.com' });
    mockIsAdmin.mockReturnValue(false);
    mockUseLogout.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });

    render(<IndexPage />);

    expect(screen.getByText('Authentifizierung wird geladen...')).toBeInTheDocument();
    expect(screen.getByText('Spinner')).toBeInTheDocument();
  });

  it('leitet auf /auth weiter, wenn kein User vorhanden ist', () => {
    mockUseCurrentUser.mockReturnValue({
      isLoading: false,
      user: null,
    } as ReturnType<typeof useCurrentUser>);
    mockUseActiveServer.mockReturnValue({ id: 'server-1', name: 'Zentrale Ost', url: 'https://example.com' });
    mockIsAdmin.mockReturnValue(false);
    mockUseLogout.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });

    render(<IndexPage />);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/auth',
    });
  });

  it('zeigt den Admin-Bereich gut sichtbar im Kopfbereich für Adminen', () => {
    mockUseCurrentUser.mockReturnValue({
      isLoading: false,
      user: {
        id: 'user-admin',
        username: 'anna',
        role: 'ADMIN',
      },
      authContext: {
        roleLabel: 'Administrator',
        permissionLevelLabel: 'Operativer Zugriff aktiv',
        permissionHint: 'Verwaltungsfunktionen benötigen eine zusätzliche Administrator-Anmeldung.',
        primaryActionLabel: 'Einsatz auswählen oder neu anlegen',
        nextActionLabel: 'Arbeiten Sie operativ weiter oder öffnen Sie den Admin-Login für Verwaltungsaufgaben.',
        restrictedActionLabel: 'Admin-Bereich',
        restrictedActionHint: 'Für Verwaltungsfunktionen zuerst den Admin-Login öffnen.',
      },
      adminStatus: { adminSetupAvailable: false },
    } as ReturnType<typeof useCurrentUser>);
    mockUseActiveServer.mockReturnValue({ id: 'server-1', name: 'Zentrale Ost', url: 'https://example.com' });
    mockUseLogout.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    mockIsAdmin.mockReturnValue(true);

    render(<IndexPage />);

    expect(screen.getByRole('heading', { name: 'Willkommen bei BlueLight Hub' })).toBeInTheDocument();
    expect(screen.getByText('Sie sind angemeldet als: anna')).toBeInTheDocument();
    expect(screen.getByTestId('einsatz-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('server-badge')).toHaveTextContent('Zentrale Ost');
    expect(screen.getByRole('button', { name: 'Admin-Bereich' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abmelden' })).toBeInTheDocument();
  });

  it('zeigt für reguläre Nutzer keinen zusätzlichen Admin-Button', () => {
    mockUseCurrentUser.mockReturnValue({
      isLoading: false,
      user: {
        id: 'user-reader',
        username: 'bjoern',
        role: 'USER',
      },
      authContext: {
        roleLabel: 'Einsatzkraft',
        permissionLevelLabel: 'Operativer Zugriff',
        permissionHint: 'Dieses Konto kann Einsätze öffnen und neue Einsätze anlegen.',
        primaryActionLabel: 'Einsatz auswählen oder neu anlegen',
        nextActionLabel: 'Öffnen Sie einen bestehenden Einsatz oder legen Sie direkt einen neuen Einsatz an.',
        restrictedActionLabel: 'Verwaltungsfunktionen',
        restrictedActionHint: 'Verwaltungsfunktionen sind für dieses Konto nicht freigegeben.',
      },
    } as ReturnType<typeof useCurrentUser>);
    mockUseActiveServer.mockReturnValue({ id: 'server-1', name: 'Zentrale West', url: 'https://example.com' });
    mockUseLogout.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    mockIsAdmin.mockReturnValue(false);

    render(<IndexPage />);

    expect(screen.getByText('Sie sind angemeldet als: bjoern')).toBeInTheDocument();
    expect(screen.getByTestId('einsatz-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('server-badge')).toHaveTextContent('Zentrale West');
    expect(screen.queryByRole('button', { name: 'Admin-Bereich' })).not.toBeInTheDocument();
  });

  it('zeigt Admin-Setup ebenfalls im Kopfbereich', () => {
    mockUseCurrentUser.mockReturnValue({
      isLoading: false,
      user: {
        id: 'user-admin',
        username: 'anna',
        role: 'ADMIN',
      },
      authContext: {
        roleLabel: 'Administrator',
        permissionLevelLabel: 'Verwaltungszugriff aktiv',
        permissionHint: 'Dieses Konto kann operative Arbeit und Verwaltungsaufgaben ausführen.',
        primaryActionLabel: 'Einsatz auswählen oder neu anlegen',
        nextActionLabel: 'Öffnen Sie einen Einsatz im Dashboard oder wechseln Sie bei Bedarf in den Admin-Bereich.',
      },
      adminStatus: { adminSetupAvailable: true },
    } as ReturnType<typeof useCurrentUser>);
    mockUseActiveServer.mockReturnValue({ id: 'server-1', name: 'Zentrale Ost', url: 'https://example.com' });
    mockUseLogout.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    mockIsAdmin.mockReturnValue(true);

    render(<IndexPage />);

    expect(screen.getByRole('button', { name: 'Admin-Setup' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Admin-Bereich' })).not.toBeInTheDocument();
  });

  it('rendert den operativen Arbeitsbereich auch dann, wenn der Hook nur den Nutzer liefert', () => {
    mockUseCurrentUser.mockReturnValue({
      isLoading: false,
      isAdminAuthenticated: false,
      user: {
        id: 'user-reader',
        username: 'charlie',
        role: 'USER',
      },
    } as ReturnType<typeof useCurrentUser>);
    mockUseActiveServer.mockReturnValue({ id: 'server-1', name: 'Zentrale Nord', url: 'https://example.com' });
    mockUseLogout.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    mockIsAdmin.mockReturnValue(false);

    render(<IndexPage />);

    expect(screen.getByText('Sie sind angemeldet als: charlie')).toBeInTheDocument();
    expect(screen.getByTestId('einsatz-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('server-badge')).toHaveTextContent('Zentrale Nord');
  });
});
