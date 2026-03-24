/**
 * Unit Tests fuer AdminIntegrationOverview Page
 *
 * Verifiziert:
 * - Loading Skeleton waehrend Laden
 * - Grid-Layout mit mehreren Karten bei geladenen Daten
 * - Fehler-State mit Retry-Button
 * - useCanAccess Guard verhindert Zugriff ohne Berechtigung
 * - Empty State bei keinen Integrationen
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseCanAccess, mockUseIntegrationOverview, mockUseIntegrationWebSocket, mockNavigate } = vi.hoisted(() => ({
  mockUseCanAccess: vi.fn(),
  mockUseIntegrationOverview: vi.fn(),
  mockUseIntegrationWebSocket: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/features/auth/hooks/use-can-access', () => ({
  useCanAccess: mockUseCanAccess,
}));

vi.mock('@/features/admin/api/use-integration-overview', () => ({
  useIntegrationOverview: mockUseIntegrationOverview,
}));

vi.mock('@/features/admin/hooks/use-integration-websocket', () => ({
  useIntegrationWebSocket: mockUseIntegrationWebSocket,
}));

import { AdminIntegrationOverview } from '../AdminIntegrationOverview';

describe('AdminIntegrationOverview', () => {
  let queryClient: QueryClient;

  const Wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  const MOCK_INTEGRATIONS = [
    {
      serviceKey: 'hiorg-server',
      displayName: 'HiOrg-Server',
      status: 'verbunden',
      statusLabel: 'Verbunden',
      circuitBreakerState: 'CLOSED',
      failureCount: 0,
      errorRate: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastTestedAt: null,
      hasCredentials: true,
      isActive: true,
      suggestedAction: null,
    },
    {
      serviceKey: 'divera',
      displayName: 'DIVERA 24/7',
      status: 'unterbrochen',
      statusLabel: 'Unterbrochen',
      circuitBreakerState: 'OPEN',
      failureCount: 3,
      errorRate: 25,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastTestedAt: null,
      hasCredentials: true,
      isActive: true,
      suggestedAction: 'Verbindung prüfen',
    },
    {
      serviceKey: 'alarm-server',
      displayName: 'Alarm-Server',
      status: 'nicht_konfiguriert',
      statusLabel: 'Nicht konfiguriert',
      circuitBreakerState: 'CLOSED',
      failureCount: 0,
      errorRate: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastTestedAt: null,
      hasCredentials: false,
      isActive: false,
      suggestedAction: 'Konfigurieren',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();

    // Defaults: Zugriff erlaubt, Daten geladen, WebSocket verbunden
    mockUseCanAccess.mockReturnValue({ accessible: true, isLoading: false });
    mockUseIntegrationOverview.mockReturnValue({
      data: { integrations: MOCK_INTEGRATIONS },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      dataUpdatedAt: Date.now(),
    });
    mockUseIntegrationWebSocket.mockReturnValue({ isConnected: true });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Loading State', () => {
    it('zeigt Skeleton waehrend Access-Check geladen wird', () => {
      // Given: Access-Check laeuft noch
      mockUseCanAccess.mockReturnValue({ accessible: false, isLoading: true });

      // When: Seite gerendert
      render(
        <Wrapper>
          <AdminIntegrationOverview />
        </Wrapper>,
      );

      // Then: Skeleton-Elemente sichtbar (animate-pulse Klasse)
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('zeigt Skeleton waehrend Daten geladen werden', () => {
      // Given: Daten werden geladen
      mockUseIntegrationOverview.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: 0,
      });

      // When: Seite gerendert
      render(
        <Wrapper>
          <AdminIntegrationOverview />
        </Wrapper>,
      );

      // Then: Heading sichtbar + Skeletons
      expect(screen.getByText('Externe Integrationen')).toBeInTheDocument();
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Grid-Layout mit Daten', () => {
    it('rendert mehrere Integrations-Karten im Grid', () => {
      // Given: Default-Mocks mit 3 Integrationen

      // When: Seite gerendert
      render(
        <Wrapper>
          <AdminIntegrationOverview />
        </Wrapper>,
      );

      // Then: Alle 3 Karten sichtbar
      expect(screen.getByText('HiOrg-Server')).toBeInTheDocument();
      expect(screen.getByText('DIVERA 24/7')).toBeInTheDocument();
      expect(screen.getByText('Alarm-Server')).toBeInTheDocument();
    });

    it('zeigt Heading "Externe Integrationen"', () => {
      // Given: Daten geladen

      // When: Seite gerendert
      render(
        <Wrapper>
          <AdminIntegrationOverview />
        </Wrapper>,
      );

      // Then: Heading sichtbar
      expect(screen.getByText('Externe Integrationen')).toBeInTheDocument();
    });

    it('rendert IntegrationStatusCards mit korrekten Rollen', () => {
      // Given: Default-Mocks

      // When: Seite gerendert
      render(
        <Wrapper>
          <AdminIntegrationOverview />
        </Wrapper>,
      );

      // Then: Karten als group-Elemente gerendert
      const groups = screen.getAllByRole('region');
      expect(groups).toHaveLength(3);
    });
  });

  describe('Fehler-State', () => {
    it('zeigt Fehlermeldung bei API-Fehler', () => {
      // Given: API-Fehler
      mockUseIntegrationOverview.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network timeout'),
        refetch: vi.fn(),
        dataUpdatedAt: 0,
      });

      // When: Seite gerendert
      render(
        <Wrapper>
          <AdminIntegrationOverview />
        </Wrapper>,
      );

      // Then: Fehlermeldung sichtbar
      expect(screen.getByText(/Fehler beim Laden der Integrationsübersicht/)).toBeInTheDocument();
      expect(screen.getByText(/Network timeout/)).toBeInTheDocument();
    });

    it('zeigt Retry-Button bei Fehler', async () => {
      // Given: API-Fehler mit refetch Mock
      const mockRefetch = vi.fn();
      mockUseIntegrationOverview.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Server Error'),
        refetch: mockRefetch,
        dataUpdatedAt: 0,
      });

      // When: Seite gerendert
      const user = userEvent.setup();
      render(
        <Wrapper>
          <AdminIntegrationOverview />
        </Wrapper>,
      );

      // Then: Retry-Button sichtbar und klickbar
      const retryButton = screen.getByRole('button', { name: 'Erneut versuchen' });
      expect(retryButton).toBeInTheDocument();

      await user.click(retryButton);
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('zeigt "Unbekannter Fehler" bei fehlendem error.message', () => {
      // Given: API-Fehler ohne Message
      mockUseIntegrationOverview.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: 0,
      });

      // When: Seite gerendert
      render(
        <Wrapper>
          <AdminIntegrationOverview />
        </Wrapper>,
      );

      // Then: Fallback-Fehlermeldung sichtbar
      expect(screen.getByText(/Unbekannter Fehler/)).toBeInTheDocument();
    });
  });

  describe('Access Guard', () => {
    it('zeigt Berechtigungsmeldung wenn Zugriff verweigert', () => {
      // Given: Kein Zugriff
      mockUseCanAccess.mockReturnValue({ accessible: false, isLoading: false });

      // When: Seite gerendert
      render(
        <Wrapper>
          <AdminIntegrationOverview />
        </Wrapper>,
      );

      // Then: Berechtigungsmeldung sichtbar
      expect(screen.getByText('Keine Berechtigung fuer die Integrationsübersicht.')).toBeInTheDocument();
    });

    it('zeigt keine Integrations-Karten wenn Zugriff verweigert', () => {
      // Given: Kein Zugriff
      mockUseCanAccess.mockReturnValue({ accessible: false, isLoading: false });

      // When: Seite gerendert
      render(
        <Wrapper>
          <AdminIntegrationOverview />
        </Wrapper>,
      );

      // Then: Keine Karten sichtbar
      expect(screen.queryByText('HiOrg-Server')).not.toBeInTheDocument();
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('ruft useCanAccess mit "integrationen" auf', () => {
      // Given: Standard-Setup

      // When: Seite gerendert
      render(
        <Wrapper>
          <AdminIntegrationOverview />
        </Wrapper>,
      );

      // Then: useCanAccess mit korrektem Area aufgerufen
      expect(mockUseCanAccess).toHaveBeenCalledWith('integrationen');
    });
  });

  describe('Empty State', () => {
    it('zeigt Empty-State wenn keine Integrationen vorhanden', () => {
      // Given: Leere Integrationsliste
      mockUseIntegrationOverview.mockReturnValue({
        data: { integrations: [] },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      });

      // When: Seite gerendert
      render(
        <Wrapper>
          <AdminIntegrationOverview />
        </Wrapper>,
      );

      // Then: Empty-State Text sichtbar
      expect(screen.getByText('Keine Integrationen konfiguriert.')).toBeInTheDocument();
    });

    it('zeigt Empty-State wenn data.integrations undefined', () => {
      // Given: data ohne integrations Array
      mockUseIntegrationOverview.mockReturnValue({
        data: {},
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      });

      // When: Seite gerendert
      render(
        <Wrapper>
          <AdminIntegrationOverview />
        </Wrapper>,
      );

      // Then: Empty-State statt Crash
      expect(screen.getByText('Keine Integrationen konfiguriert.')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigiert zu HiOrg-Detailseite bei Action auf hiorg-server', async () => {
      // Given: Integration mit suggestedAction
      mockUseIntegrationOverview.mockReturnValue({
        data: {
          integrations: [
            {
              ...MOCK_INTEGRATIONS[0],
              serviceKey: 'hiorg-server',
              suggestedAction: 'Details anzeigen',
            },
          ],
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        dataUpdatedAt: Date.now(),
      });

      const user = userEvent.setup();

      // When: Action-Button geklickt
      render(
        <Wrapper>
          <AdminIntegrationOverview />
        </Wrapper>,
      );
      await user.click(screen.getByRole('button', { name: /Details anzeigen/i }));

      // Then: Navigation zu HiOrg-Seite
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/admin/integrations/hiorg' });
    });
  });
});
