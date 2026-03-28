import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EinsatzDashboard } from '../EinsatzDashboard';

const mockNavigate = vi.fn();
const mockRefetch = vi.fn();
const mockSetActiveEinsatz = vi.fn();
const mockArchiveMutateAsync = vi.fn();

vi.mock('@/features/auth', () => ({
  useCurrentUser: vi.fn(),
  getAuthContextSummary: vi.fn((role: string) => ({
    roleLabel: role,
    permissionLevelLabel: 'Operativer Zugriff',
    permissionHint: 'Dieses Konto kann Einsätze öffnen und neue Einsätze anlegen.',
    primaryActionLabel: 'Einsatz auswählen oder neu anlegen',
    nextActionLabel: 'Öffnen Sie einen bestehenden Einsatz oder legen Sie direkt einen neuen Einsatz an.',
    restrictedActionLabel: 'Verwaltungsfunktionen',
    restrictedActionHint: 'Verwaltungsfunktionen sind für dieses Konto nicht freigegeben.',
    capabilities: {
      canOpenEinsatz: true,
      canCreateEinsatz: true,
    },
  })),
}));

vi.mock('@/features/operative-roles', () => ({
  useOperativeRole: vi.fn(() => ({
    role: 'FUEHRUNGSKRAFT',
    isFuehrungskraft: true,
    isEinsatzkraft: false,
    isExterne: false,
    canAccessEinsatzList: true,
    canOpenEinsatz: true,
    canCreateEinsatz: true,
    canArchiveEinsatz: true,
  })),
}));

vi.mock('@/features/einsatz', () => ({
  useActiveEinsaetzeWithCounts: vi.fn(),
  useEinsatzStatusCounts: vi.fn(),
  useActiveEinsatz: vi.fn(),
  useArchiveEinsatz: vi.fn(),
  useEinsaetzeInfiniteQuery: vi.fn(),
}));

vi.mock('@/features/einsatz/ui/molecules/EinsatzListItem', () => ({
  EinsatzListItem: ({ einsatz }: { einsatz: { nummer: string; alarmstichwort: string } }) => (
    <div>
      <span>{einsatz.nummer}</span>
      <span>{einsatz.alarmstichwort}</span>
    </div>
  ),
}));

vi.mock('@/features/einsatz/ui/organisms/EinsatzCreateForm', () => ({
  EinsatzCreateForm: ({ isOpen, onSuccess }: { isOpen: boolean; onSuccess?: (einsatzId: string) => void | Promise<void> }) =>
    isOpen ? (
      <button type="button" onClick={() => void onSuccess?.('einsatz-neu')}>
        Mock Einsatz erfolgreich erstellt
      </button>
    ) : null,
}));

vi.mock('@/shared', () => ({
  EinsatzControllerFindAllVAlphaOrderByEnum: {
    CreatedAt: 'createdAt',
    UpdatedAt: 'updatedAt',
    Alarmstichwort: 'alarmstichwort',
    Status: 'status',
    Name: 'name',
  },
  EinsatzControllerFindAllVAlphaStatusEnum: {
    Archiviert: 'ARCHIVIERT',
    Angelegt: 'ANGELEGT',
    InBearbeitung: 'IN_BEARBEITUNG',
    Abgeschlossen: 'ABGESCHLOSSEN',
  },
  EinsatzControllerFindAllVAlphaOrderDirectionEnum: {
    Desc: 'desc',
    Asc: 'asc',
  },
  EinsatzResponseDtoStatusEnum: {
    Archiviert: 'ARCHIVIERT',
    Angelegt: 'ANGELEGT',
    InBearbeitung: 'IN_BEARBEITUNG',
    Abgeschlossen: 'ABGESCHLOSSEN',
  },
  EinsatzListItemDtoStatusEnum: {
    Archiviert: 'ARCHIVIERT',
    Angelegt: 'ANGELEGT',
    InBearbeitung: 'IN_BEARBEITUNG',
    Abgeschlossen: 'ABGESCHLOSSEN',
  },
}));

vi.mock('@/shared/ui/atoms/button.atom', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock('@/shared/ui/molecules/search-input.molecule', () => ({
  SearchInput: () => <input aria-label="Einsätze durchsuchen" />,
}));

vi.mock('@/shared/ui/organisms/dashboard/FilterPanel', () => ({
  FilterPanel: () => <div data-testid="filter-panel" />,
}));

vi.mock('@/shared/ui/organisms/dashboard/MobileFilterDialog', () => ({
  MobileFilterDialog: () => null,
}));

vi.mock('@/shared/ui/organisms/dashboard/MobileStatusBar', () => ({
  MobileStatusBar: () => null,
}));

vi.mock('@/shared/ui/organisms/dashboard/StatusCard', () => ({
  StatusCard: ({ label, value }: { label: string; value: number }) => (
    <div>
      {label}: {value}
    </div>
  ),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
  useNavigate: () => mockNavigate,
}));

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}));

import { useActiveEinsaetzeWithCounts, useActiveEinsatz, useArchiveEinsatz, useEinsatzStatusCounts, useEinsaetzeInfiniteQuery } from '@/features/einsatz';
import { useCurrentUser } from '@/features/auth';

const mockedUseActiveEinsaetzeWithCounts = vi.mocked(useActiveEinsaetzeWithCounts);
const mockedUseEinsatzStatusCounts = vi.mocked(useEinsatzStatusCounts);
const mockedUseActiveEinsatz = vi.mocked(useActiveEinsatz);
const mockedUseArchiveEinsatz = vi.mocked(useArchiveEinsatz);
const mockedUseCurrentUser = vi.mocked(useCurrentUser);
const mockedUseEinsaetzeInfiniteQuery = vi.mocked(useEinsaetzeInfiniteQuery);

describe('EinsatzDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseActiveEinsaetzeWithCounts.mockReturnValue({
      data: [
        {
          id: 'einsatz-42',
          nummer: 'E-42',
          alarmstichwort: 'Wohnhausbrand',
          status: 'ANGELEGT',
          createdAt: new Date('2026-03-17T10:00:00.000Z'),
          einsatzort: null,
          etbEintraegeCount: 2,
          poisCount: 1,
        },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as ReturnType<typeof useActiveEinsaetzeWithCounts>);

    mockedUseEinsatzStatusCounts.mockReturnValue({
      total: 1,
      counts: {
        angelegt: 1,
        inBearbeitung: 0,
        abgeschlossen: 0,
        archiviert: 0,
      },
    });

    mockedUseEinsaetzeInfiniteQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as ReturnType<typeof useEinsaetzeInfiniteQuery>);

    mockSetActiveEinsatz.mockResolvedValue(undefined);
    mockArchiveMutateAsync.mockResolvedValue(undefined);
    mockedUseActiveEinsatz.mockReturnValue({
      setActiveEinsatz: mockSetActiveEinsatz,
    } as ReturnType<typeof useActiveEinsatz>);
    mockedUseArchiveEinsatz.mockReturnValue({
      mutateAsync: mockArchiveMutateAsync,
      isPending: false,
      variables: undefined,
    } as ReturnType<typeof useArchiveEinsatz>);

    mockedUseCurrentUser.mockReturnValue({
      user: { id: 'user-1', role: 'USER' },
      isAdminAuthenticated: false,
      authContext: {
        roleLabel: 'Einsatzkraft',
        permissionLevelLabel: 'Operativer Zugriff',
        permissionHint: 'Dieses Konto kann Einsätze öffnen und neue Einsätze anlegen.',
        primaryActionLabel: 'Einsatz auswählen oder neu anlegen',
        nextActionLabel: 'Öffnen Sie einen bestehenden Einsatz oder legen Sie direkt einen neuen Einsatz an.',
        restrictedActionLabel: 'Verwaltungsfunktionen',
        restrictedActionHint: 'Verwaltungsfunktionen sind für dieses Konto nicht freigegeben.',
        capabilities: {
          canOpenEinsatz: true,
          canCreateEinsatz: true,
        },
      },
    } as ReturnType<typeof useCurrentUser>);
  });

  it('öffnet einen ausgewählten Einsatz über den Active-Store und navigiert in den kanonischen Workspace-Pfad', async () => {
    const user = userEvent.setup();

    render(<EinsatzDashboard />);

    await user.click(screen.getByRole('button', { name: /einsatz e-42 öffnen/i }));

    expect(mockSetActiveEinsatz).toHaveBeenCalledWith('einsatz-42');
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId',
      params: { einsatzId: 'einsatz-42' },
    });
  });

  it('öffnet einen neu angelegten Einsatz direkt im kanonischen Workspace-Pfad', async () => {
    const user = userEvent.setup();

    render(<EinsatzDashboard />);

    await user.click(screen.getByRole('button', { name: /neuer einsatz/i }));
    await user.click(screen.getByRole('button', { name: /mock einsatz erfolgreich erstellt/i }));

    expect(mockSetActiveEinsatz).toHaveBeenCalledWith('einsatz-neu');
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId',
      params: { einsatzId: 'einsatz-neu' },
    });
  });

  it('steuert Öffnen und Anlegen über zentrale Capabilities und zeigt den nächsten Hinweis an', () => {
    mockedUseCurrentUser.mockReturnValue({
      user: { id: 'user-2', role: 'GUEST' },
      isAdminAuthenticated: false,
      authContext: {
        roleLabel: 'Gast',
        permissionLevelLabel: 'Zugriff eingeschränkt',
        permissionHint: 'Diese Rolle hat keinen operativen Zugriff.',
        primaryActionLabel: 'Kontext prüfen',
        nextActionLabel: 'Wenden Sie sich an die Einsatzleitung.',
        restrictedActionLabel: 'Verwaltungsfunktionen',
        restrictedActionHint: 'Verwaltungsfunktionen sind für dieses Konto nicht freigegeben.',
        capabilities: {
          canOpenEinsatz: false,
          canCreateEinsatz: false,
        },
      },
    } as ReturnType<typeof useCurrentUser>);

    render(<EinsatzDashboard />);

    expect(screen.getByRole('button', { name: /neuer einsatz/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /einsatz e-42 öffnen/i })).toBeDisabled();
    expect(screen.getByText(/verwaltungsfunktionen sind für dieses konto nicht freigegeben/i)).toBeInTheDocument();
  });
});
