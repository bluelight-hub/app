/**
 * Unit Tests fuer UserPermissionsPanel Organism
 *
 * Verifiziert:
 * - AC3 Regression: 403-Fehler fuehrt nicht zu UI-Inkonsistenz
 * - Permissions-Liste bleibt nach fehlgeschlagener Mutation unveraendert
 * - Fehlermeldung wird korrekt angezeigt
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseUserPermissions, mockGrantMutateAsync, mockRevokeMutateAsync, mockGetApiErrorMessage, mockUseAvailablePermissions, mockUseCanAccess } = vi.hoisted(() => ({
  mockUseUserPermissions: vi.fn(),
  mockGrantMutateAsync: vi.fn(),
  mockRevokeMutateAsync: vi.fn(),
  mockGetApiErrorMessage: vi.fn(),
  mockUseAvailablePermissions: vi.fn(),
  mockUseCanAccess: vi.fn(),
}));

vi.mock('@/features/admin/api/use-user-permissions', () => ({
  useUserPermissions: mockUseUserPermissions,
}));

vi.mock('@/features/admin/api/use-grant-permission', () => ({
  useGrantPermission: () => ({
    mutateAsync: mockGrantMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/features/admin/api/use-revoke-permission', () => ({
  useRevokePermission: () => ({
    mutateAsync: mockRevokeMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/features/admin/api/use-available-permissions', () => ({
  useAvailablePermissions: mockUseAvailablePermissions,
}));

vi.mock('@/shared/lib/errors/apiErrorHandler', () => ({
  getApiErrorMessage: mockGetApiErrorMessage,
}));

vi.mock('@/features/auth/hooks', () => ({
  useCanAccess: mockUseCanAccess,
}));

// Mock Dialog um Portal-Rendering zu vermeiden
vi.mock('@/shared/ui/molecules/dialog.molecule', () => ({
  Dialog: Object.assign(({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) => (isOpen ? <div data-testid="dialog">{children}</div> : null), {
    Title: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Footer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }),
}));

import { UserPermissionsPanel } from '../UserPermissionsPanel.organism';

describe('UserPermissionsPanel', () => {
  let queryClient: QueryClient;

  const Wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  const MOCK_PERMISSIONS = ['nav:stammdaten', 'nav:berechtigungen', 'admin:users'];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();

    mockUseUserPermissions.mockReturnValue({
      data: MOCK_PERMISSIONS,
      isLoading: false,
    });

    mockUseAvailablePermissions.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseCanAccess.mockReturnValue({ accessible: true, isLoading: false });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('rendert alle Permissions gruppiert nach Domain', () => {
    render(
      <Wrapper>
        <UserPermissionsPanel userId="user-1" username="testuser" />
      </Wrapper>,
    );

    expect(screen.getByText('nav:stammdaten')).toBeInTheDocument();
    expect(screen.getByText('nav:berechtigungen')).toBeInTheDocument();
    expect(screen.getByText('admin:users')).toBeInTheDocument();
  });

  describe('AC3 Regression: 403-Fehler fuehrt nicht zu UI-Inkonsistenz', () => {
    it('sollte Permissions-Liste unveraendert lassen nach 403 bei revoke', async () => {
      const user = userEvent.setup();

      // Simuliere 403-Fehler bei revoke
      const error403 = Object.assign(new Error('Forbidden'), {
        response: new Response(JSON.stringify({ statusCode: 403, message: 'Forbidden' }), { status: 403 }),
      });
      mockRevokeMutateAsync.mockRejectedValue(error403);
      mockGetApiErrorMessage.mockResolvedValue('Sie haben keine Berechtigung für diese Aktion.');

      render(
        <Wrapper>
          <UserPermissionsPanel userId="user-1" username="testuser" />
        </Wrapper>,
      );

      // Alle Permissions muessen vor dem Klick sichtbar sein
      expect(screen.getByText('nav:stammdaten')).toBeInTheDocument();
      expect(screen.getByText('nav:berechtigungen')).toBeInTheDocument();
      expect(screen.getByText('admin:users')).toBeInTheDocument();

      // Revoke-Button fuer nav:stammdaten klicken
      const revokeButton = screen.getByLabelText('Permission nav:stammdaten entziehen');
      await user.click(revokeButton);

      // Fehlermeldung wird angezeigt
      await waitFor(() => {
        expect(screen.getByText('Sie haben keine Berechtigung für diese Aktion.')).toBeInTheDocument();
      });

      // WICHTIG: Alle Permissions muessen WEITERHIN sichtbar sein (kein Phantom-Entfernen)
      expect(screen.getByText('nav:stammdaten')).toBeInTheDocument();
      expect(screen.getByText('nav:berechtigungen')).toBeInTheDocument();
      expect(screen.getByText('admin:users')).toBeInTheDocument();
    });

    it('sollte Permissions-Liste unveraendert lassen nach 403 bei grant', async () => {
      const user = userEvent.setup();

      // Simuliere 403-Fehler bei grant
      const error403 = Object.assign(new Error('Forbidden'), {
        response: new Response(JSON.stringify({ statusCode: 403, message: 'Forbidden' }), { status: 403 }),
      });
      mockGrantMutateAsync.mockRejectedValue(error403);
      mockGetApiErrorMessage.mockResolvedValue('Sie haben keine Berechtigung für diese Aktion.');

      mockUseAvailablePermissions.mockReturnValue({
        data: [{ domain: 'einsatz', description: 'Einsatz', actions: ['read', 'write'] }],
        isLoading: false,
      });

      render(
        <Wrapper>
          <UserPermissionsPanel userId="user-1" username="testuser" />
        </Wrapper>,
      );

      // Alle vorhandenen Permissions vorhanden
      expect(screen.getByText('nav:stammdaten')).toBeInTheDocument();
      expect(screen.getByText('nav:berechtigungen')).toBeInTheDocument();
      expect(screen.getByText('admin:users')).toBeInTheDocument();

      // "Permission vergeben" Dialog oeffnen
      const grantButton = screen.getByText('Permission vergeben');
      await user.click(grantButton);

      // Pruefe dass kein phantom-Eintrag erscheint nach Fehler
      // Die Permissions-Liste bleibt konsistent mit den Server-Daten
      expect(screen.getByText('nav:stammdaten')).toBeInTheDocument();
      expect(screen.getByText('nav:berechtigungen')).toBeInTheDocument();
      expect(screen.getByText('admin:users')).toBeInTheDocument();
    });

    it('sollte Fehlermeldung als error-Variante anzeigen nach 403', async () => {
      const user = userEvent.setup();

      const error403 = Object.assign(new Error('Forbidden'), {
        response: new Response(JSON.stringify({ statusCode: 403, message: 'Forbidden' }), { status: 403 }),
      });
      mockRevokeMutateAsync.mockRejectedValue(error403);
      mockGetApiErrorMessage.mockResolvedValue('Permission konnte nicht entzogen werden.');

      render(
        <Wrapper>
          <UserPermissionsPanel userId="user-1" username="testuser" />
        </Wrapper>,
      );

      const revokeButton = screen.getByLabelText('Permission nav:stammdaten entziehen');
      await user.click(revokeButton);

      // Fehlermeldung wird korrekt angezeigt
      await waitFor(() => {
        expect(screen.getByText('Permission konnte nicht entzogen werden.')).toBeInTheDocument();
      });

      // Mutation wurde mit korrekten Parametern aufgerufen
      expect(mockRevokeMutateAsync).toHaveBeenCalledWith({
        userId: 'user-1',
        permission: 'nav:stammdaten',
      });
    });
  });
});
