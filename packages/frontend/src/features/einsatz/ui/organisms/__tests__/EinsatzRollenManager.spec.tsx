/**
 * Unit Tests für EinsatzRollenManager Organism
 *
 * Verifiziert:
 * - Rendering mit Rollen-Daten
 * - Loading-State
 * - Error-State
 * - Leerzustand (keine Rollen)
 * - Speichern-Button Disable-State
 * - User-Entfernen aktiviert Speichern
 *
 * Story 5.2 AC7
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EinsatzRollenManager } from '../EinsatzRollenManager.organism';

const { mockGetRollen, mockUpdateRollen, mockGetUsers, mockToast } = vi.hoisted(() => ({
  mockGetRollen: vi.fn(),
  mockUpdateRollen: vi.fn(),
  mockGetUsers: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared')>();
  return {
    ...actual,
    api: {
      einsatz: () => ({
        einsatzControllerGetRollenVAlpha: mockGetRollen,
        einsatzControllerUpdateRollenVAlpha: mockUpdateRollen,
      }),
      users: () => ({
        userControllerFindAllBasicVAlpha: mockGetUsers,
      }),
    },
  };
});

vi.mock('sonner', () => ({
  toast: mockToast,
}));

// retryDelay auf 0 setzen für schnelle Tests
vi.mock('@/features/einsatz/api/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/einsatz/api/queries')>();
  return {
    ...actual,
    calculateRetryDelay: () => 0,
  };
});

// Mock server store für useUsers
vi.mock('@/features/server/stores/server.store', () => ({
  serverStore: {
    subscribe: vi.fn(() => vi.fn()),
    getState: () => ({ isHydrated: true, activeServerId: 'server-1' }),
  },
}));

describe('EinsatzRollenManager', () => {
  let queryClient: QueryClient;

  const Wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  const mockRollen = [
    { userId: 'user-1', userName: 'Max Mustermann', rolle: 'BEFEHLSGEBER' },
    { userId: 'user-2', userName: 'Erika Musterfrau', rolle: 'EMPFAENGER' },
  ];

  const mockUsers = {
    data: [
      { id: 'user-1', username: 'Max Mustermann' },
      { id: 'user-2', username: 'Erika Musterfrau' },
      { id: 'user-3', username: 'Hans Schmidt' },
    ],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    mockGetRollen.mockReset();
    mockUpdateRollen.mockReset();
    mockGetUsers.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
    mockGetUsers.mockResolvedValue(mockUsers);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('zeigt Loading-State beim Laden', () => {
    mockGetRollen.mockReturnValue(new Promise(() => {}));

    render(
      <Wrapper>
        <EinsatzRollenManager einsatzId="einsatz-1" />
      </Wrapper>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Rollen werden geladen...')).toBeInTheDocument();
  });

  it('zeigt Error-State bei Fehler', async () => {
    mockGetRollen.mockRejectedValue(new Error('Netzwerkfehler'));

    render(
      <Wrapper>
        <EinsatzRollenManager einsatzId="einsatz-1" />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Fehler beim Laden der Rollen')).toBeInTheDocument();
  });

  it('rendert Rollen-Tabelle mit Daten', async () => {
    mockGetRollen.mockResolvedValueOnce({ data: mockRollen });

    render(
      <Wrapper>
        <EinsatzRollenManager einsatzId="einsatz-1" />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    });
    expect(screen.getByText('Erika Musterfrau')).toBeInTheDocument();
    expect(screen.getByText('Rollen verwalten')).toBeInTheDocument();
  });

  it('zeigt Leerzustand wenn keine Rollen zugewiesen', async () => {
    mockGetRollen.mockResolvedValueOnce({ data: [] });

    render(
      <Wrapper>
        <EinsatzRollenManager einsatzId="einsatz-1" />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Keine Rollen zugewiesen. Fügen Sie Benutzer hinzu.')).toBeInTheDocument();
    });
  });

  it('Speichern-Button ist disabled ohne Änderungen', async () => {
    mockGetRollen.mockResolvedValueOnce({ data: mockRollen });

    render(
      <Wrapper>
        <EinsatzRollenManager einsatzId="einsatz-1" />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    });

    const saveButton = screen.getByLabelText('Alle Rollenzuweisungen speichern');
    expect(saveButton).toBeDisabled();
  });

  it('Entfernen-Buttons sind vorhanden', async () => {
    mockGetRollen.mockResolvedValueOnce({ data: mockRollen });

    render(
      <Wrapper>
        <EinsatzRollenManager einsatzId="einsatz-1" />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Max Mustermann entfernen')).toBeInTheDocument();
    expect(screen.getByLabelText('Erika Musterfrau entfernen')).toBeInTheDocument();
  });

  it('aktiviert Speichern-Button nach Entfernen eines Users', async () => {
    mockGetRollen.mockResolvedValueOnce({ data: mockRollen });
    const user = userEvent.setup();

    render(
      <Wrapper>
        <EinsatzRollenManager einsatzId="einsatz-1" />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Max Mustermann entfernen'));

    const saveButton = screen.getByLabelText('Alle Rollenzuweisungen speichern');
    expect(saveButton).not.toBeDisabled();
  });

  it('zeigt "Benutzer hinzufügen" Button', async () => {
    mockGetRollen.mockResolvedValueOnce({ data: mockRollen });

    render(
      <Wrapper>
        <EinsatzRollenManager einsatzId="einsatz-1" />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Benutzer zur Rollenzuweisung hinzufügen')).toBeInTheDocument();
  });
});
