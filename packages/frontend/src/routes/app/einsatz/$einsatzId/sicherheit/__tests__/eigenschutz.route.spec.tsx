import { screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';

/**
 * Route-Tests für `/app/einsatz/$einsatzId/sicherheit/eigenschutz` (Story 1.6 AC10).
 *
 * **Testansatz:** `createFileRoute` wird gemockt, damit wir die Closure-
 * Rückgabe abfangen und die Route-Komponente isoliert rendern können
 * (Pattern aus `-befehle.spec.tsx`). Die Route rendert bewusst ohne
 * Health-/Scope-Gate, damit Eigenschutz für den aktuellen Einsatz-Workspace
 * direkt verfügbar bleibt.
 */

const { captured, mockUseParams, mockUseLocation } = vi.hoisted(() => ({
  captured: { component: null as (() => React.JSX.Element) | null },
  mockUseParams: vi.fn(() => ({ einsatzId: 'einsatz-1' })),
  mockUseLocation: vi.fn(() => ({ pathname: '/app/einsatz/einsatz-1/sicherheit/eigenschutz' })),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    createFileRoute: (_path: string) => {
      return (options: { component: () => React.JSX.Element }) => {
        captured.component = options.component;
        return {
          useParams: mockUseParams,
          options,
        };
      };
    },
    useLocation: () => mockUseLocation(),
    // Ohne `<RouterProvider>` crasht der echte Outlet in Tests — deshalb
    // stubben wir ihn hier isoliert.
    Outlet: () => <div data-testid="outlet" />,
  };
});

vi.mock('@/features/eigenschutz', () => ({
  EigenschutzEntryPage: ({ einsatzId }: { einsatzId: string }) => <div data-testid="entry-page">EntryPage:{einsatzId}</div>,
}));

vi.mock('@/features/eigenschutz/ui/organisms/PsaProfilEmpfangBanner', () => ({
  PsaProfilEmpfangBanner: ({ einsatzId }: { einsatzId: string }) => <div data-testid="psa-empfang-banner-mock">PsaBanner:{einsatzId}</div>,
}));

const { mockQuittungLive } = vi.hoisted(() => ({
  mockQuittungLive: vi.fn(),
}));
vi.mock('@/features/eigenschutz/api/use-eigenschutz-psa-quittung-live', () => ({
  useEigenschutzPsaQuittungLive: (...args: unknown[]) => {
    mockQuittungLive(...args);
    return { status: 'connected' };
  },
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
    mockUseLocation.mockReturnValue({ pathname: '/app/einsatz/einsatz-1/sicherheit/eigenschutz/gefaehrdungen' });
    mockUseParams.mockReturnValue({ einsatzId: 'einsatz-1' });
  });

  it('(a) rendert die EntryPage direkt auf der Eigenschutz-Root-Route', () => {
    mockUseLocation.mockReturnValue({ pathname: '/app/einsatz/einsatz-1/sicherheit/eigenschutz' });
    renderRoute();

    expect(screen.getByTestId('entry-page')).toHaveTextContent('EntryPage:einsatz-1');
    expect(screen.queryByTestId('outlet')).toBeNull();
  });

  it('rendert die EntryPage auch auf der Root-Route mit trailing slash', () => {
    mockUseLocation.mockReturnValue({ pathname: '/app/einsatz/einsatz-1/sicherheit/eigenschutz/' });
    renderRoute();

    expect(screen.getByTestId('entry-page')).toHaveTextContent('EntryPage:einsatz-1');
    expect(screen.queryByTestId('outlet')).toBeNull();
  });

  it('rendert Outlet auf Child-Routen', () => {
    renderRoute();

    // Child-Routen bleiben über `<Outlet />` sichtbar
    // (/gefaehrdungen → GefaehrdungenPage, /gefaehrdungen/$id → DetailPage).
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
    expect(screen.queryByTestId('entry-page')).toBeNull();
  });

  it('mountet den PSA-Empfangs-Banner als gemeinsamen Layout-Container (Story 3.3 AC8)', () => {
    mockUseLocation.mockReturnValue({ pathname: '/app/einsatz/einsatz-1/sicherheit/eigenschutz' });
    renderRoute();
    expect(screen.getByTestId('psa-empfang-banner-mock')).toHaveTextContent('PsaBanner:einsatz-1');
    expect(screen.getByTestId('entry-page')).toBeInTheDocument();
  });

  it('rendert PSA-Banner auch auf Child-Routen oberhalb des Outlets', () => {
    renderRoute();
    const banner = screen.getByTestId('psa-empfang-banner-mock');
    const outlet = screen.getByTestId('outlet');
    expect(banner).toBeInTheDocument();
    expect(outlet).toBeInTheDocument();
    // AC8: Banner muss DOM-mäßig **vor** Outlet stehen, damit er oberhalb des
    // Inhalts sichtbar bleibt — sonst landet der CBRN-Banner unter dem Inhalt.
    expect(banner.compareDocumentPosition(outlet) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('rendert PSA-Banner auch auf der Root-Route oberhalb der EntryPage', () => {
    mockUseLocation.mockReturnValue({ pathname: '/app/einsatz/einsatz-1/sicherheit/eigenschutz' });
    renderRoute();
    const banner = screen.getByTestId('psa-empfang-banner-mock');
    const entry = screen.getByTestId('entry-page');
    expect(banner.compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('mountet den Sender-Live-Hook useEigenschutzPsaQuittungLive (Story 3.4 AC11)', () => {
    mockQuittungLive.mockClear();
    mockUseLocation.mockReturnValue({ pathname: '/app/einsatz/einsatz-1/sicherheit/eigenschutz' });
    renderRoute();
    expect(mockQuittungLive).toHaveBeenCalledWith(expect.objectContaining({ einsatzId: 'einsatz-1' }));
  });

  it('propagiert die aktuelle einsatzId an die EntryPage', () => {
    mockUseParams.mockReturnValue({ einsatzId: 'einsatz-xyz' });
    mockUseLocation.mockReturnValue({ pathname: '/app/einsatz/einsatz-xyz/sicherheit/eigenschutz' });
    renderRoute();

    expect(screen.getByTestId('entry-page')).toHaveTextContent('EntryPage:einsatz-xyz');
  });
});
