import { screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';

/**
 * Route-Tests für `/app/einsatz/$einsatzId/sicherheit/eigenschutz` (Story 1.6 AC10).
 *
 * **Testansatz:** `createFileRoute` wird gemockt, damit wir die Closure-
 * Rückgabe abfangen und die Route-Komponente isoliert rendern können
 * (Pattern aus `-befehle.spec.tsx`). Der Hook `useEigenschutzHealth` wird
 * feature-level gemockt — der echte Hook hängt am generierten API-Client,
 * und Story 1.6 Dev Notes empfehlen explizit Feature-Level-Mocks für Route-
 * Tests.
 */

const { captured, mockUseParams, mockNavigate, mockRefetch } = vi.hoisted(() => ({
  captured: { component: null as (() => React.JSX.Element) | null },
  mockUseParams: vi.fn(() => ({ einsatzId: 'einsatz-1' })),
  mockNavigate: vi.fn(),
  mockRefetch: vi.fn(),
}));

const mockHealth = vi.hoisted(() => ({
  state: {
    data: undefined as { status: 'ready' } | undefined,
    isPending: false,
    error: null as unknown,
  },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    createFileRoute: (_path: string) => {
      return (factory: () => { component: () => React.JSX.Element }) => {
        const options = factory();
        captured.component = options.component;
        return {
          useParams: mockUseParams,
          useNavigate: () => mockNavigate,
          options,
        };
      };
    },
    useNavigate: () => mockNavigate,
    // Story 2.1: Nach dem Umbau zu Layout-Route rendert die Komponente bei
    // grünem Health-Check `<Outlet />`. Ohne `<RouterProvider>` crasht der
    // echte Outlet in Tests — deshalb stubben wir ihn hier isoliert.
    Outlet: () => <div data-testid="outlet" />,
  };
});

vi.mock('@/features/eigenschutz', () => ({
  EigenschutzEntryPage: () => <div data-testid="entry-page">EntryPage</div>,
  useEigenschutzHealth: () => ({ ...mockHealth.state, refetch: mockRefetch }),
}));

// Route-Import muss NACH den vi.mock-Aufrufen stehen (captured.component
// wird beim Modul-Import vom gemockten createFileRoute befüllt).
import '../eigenschutz';

function renderRoute() {
  if (!captured.component) {
    throw new Error('Route-Komponente wurde nicht via createFileRoute-Mock erfasst.');
  }
  const Component = captured.component;
  return renderWithProviders(<Component />);
}

describe('Eigenschutz Route (Story 1.6)', () => {
  beforeEach(() => {
    mockHealth.state = { data: undefined, isPending: false, error: null };
    mockNavigate.mockClear();
    mockRefetch.mockClear();
    mockUseParams.mockReturnValue({ einsatzId: 'einsatz-1' });
  });

  it('(a) rendert Outlet bei erfolgreichem Health-Query (Layout-Route seit Story 2.1)', () => {
    mockHealth.state = { data: { status: 'ready' }, isPending: false, error: null };
    renderRoute();

    // Die Route ist jetzt eine Layout-Route: nach erfolgreichem Health-Check
    // rendert sie `<Outlet />`, damit Child-Routen (Index → EntryPage,
    // /gefaehrdungen → GefaehrdungenPage) sichtbar werden.
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('(b) rendert EmptyState bei 403 ohne Toast-Aktion', () => {
    mockHealth.state = {
      data: undefined,
      isPending: false,
      error: { response: { status: 403 } },
    };
    renderRoute();

    expect(screen.getByText('Keine Berechtigung für Eigenschutz')).toBeInTheDocument();
    expect(screen.getByText(/Eigenschutz-Rolle/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zurück zur Einsatz-Übersicht/i })).toBeInTheDocument();
    // Kein Toast-Spy nötig: Der `meta.silentError`-Flag unterdrückt den
    // globalen Toast im QueryCache-Handler; hier prüfen wir, dass die
    // Route **selbst** keinen Toast auslöst, sondern ausschließlich den
    // EmptyState rendert.
    expect(screen.queryByTestId('entry-page')).toBeNull();
  });

  it('(c) rendert Spinner bei isPending (via aria-label)', () => {
    mockHealth.state = { data: undefined, isPending: true, error: null };
    renderRoute();

    expect(screen.getByLabelText('Eigenschutz wird geladen')).toBeInTheDocument();
    expect(screen.getByText(/Eigenschutz wird geladen/i)).toBeInTheDocument();
  });

  it('rendert Verbindungsfehler-EmptyState bei 500 mit Retry-Aktion', () => {
    mockHealth.state = {
      data: undefined,
      isPending: false,
      error: { response: { status: 500 } },
    };
    renderRoute();

    expect(screen.getByText('Eigenschutz aktuell nicht erreichbar')).toBeInTheDocument();
    expect(screen.getByText(/Serveranbindung prüfen/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Erneut versuchen/i })).toBeInTheDocument();
    expect(screen.queryByText('Keine Berechtigung für Eigenschutz')).toBeNull();
    expect(screen.queryByText('Eigenschutz nicht verfügbar')).toBeNull();
  });

  it('rendert Verbindungsfehler-EmptyState bei Errors ohne HTTP-Status (Network / Timeout)', () => {
    mockHealth.state = {
      data: undefined,
      isPending: false,
      error: new Error('Failed to fetch'),
    };
    renderRoute();

    expect(screen.getByText('Eigenschutz aktuell nicht erreichbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Erneut versuchen/i })).toBeInTheDocument();
  });

  it('triggert refetch bei Klick auf „Erneut versuchen"', () => {
    mockHealth.state = {
      data: undefined,
      isPending: false,
      error: { response: { status: 500 } },
    };
    renderRoute();

    screen.getByRole('button', { name: /Erneut versuchen/i }).click();

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('navigiert bei 403 zurück zur Einsatz-Übersicht, wenn die Action geklickt wird', () => {
    mockHealth.state = {
      data: undefined,
      isPending: false,
      error: { response: { status: 403 } },
    };
    renderRoute();

    screen.getByRole('button', { name: /Zurück zur Einsatz-Übersicht/i }).click();

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId/übersicht',
      params: { einsatzId: 'einsatz-1' },
    });
  });

  it('rendert Fallback-Empty-State, wenn data weder definiert noch "ready" ist', () => {
    mockHealth.state = {
      data: { status: 'unexpected' as unknown as 'ready' },
      isPending: false,
      error: null,
    };
    renderRoute();

    expect(screen.getByText('Eigenschutz nicht verfügbar')).toBeInTheDocument();
  });
});
