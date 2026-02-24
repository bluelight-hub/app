/**
 * Unit Tests für Deeplink-Navigation in BefehlsListeMitEingabe
 *
 * Verifiziert, dass initialBefehlId korrekt verarbeitet wird:
 * - Ohne initialBefehlId: kein Dialog, keine Auto-Navigation
 * - Mit matching initialBefehlId: Dialog wird automatisch geöffnet
 * - Mit nicht-matchender initialBefehlId: Dialog bleibt geschlossen
 * - Search-Param wird nach Dialog-Öffnung via navigate(replace) entfernt
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { BefehlsListeMitEingabe } from '../BefehlsListeMitEingabe.organism';
import type { BefehlDto } from '@bluelight-hub/shared/client';

// Mock useNavigate
const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock useCurrentUser
vi.mock('@/features/auth/api', () => ({
  useCurrentUser: () => ({ user: { id: 'user-1', name: 'Test User' }, isLoading: false }),
}));

// Mock useBefehleByEinsatz
let mockBefehle: BefehlDto[] | undefined;
let mockIsLoading = false;

vi.mock('../../../api/use-befehle-by-einsatz', () => ({
  useBefehleByEinsatz: () => ({
    data: mockBefehle,
    isLoading: mockIsLoading,
    isError: false,
    refetch: vi.fn(),
  }),
}));

// Mock useMeineBefehle
vi.mock('../../../api/use-meine-befehle', () => ({
  useMeineBefehle: () => ({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() }),
}));

// Mock useMeineBefehleFilter + useOffeneRueckfragenFilter
vi.mock('../../../hooks/use-meine-befehle-filter', () => ({
  useMeineBefehleFilter: () => [false, vi.fn()],
  useOffeneRueckfragenFilter: () => [false, vi.fn()],
  setShowMeineBefehle: vi.fn(),
  setShowOffeneRueckfragen: vi.fn(),
}));

// Mock useQuittierenBefehl (benötigt vom Dialog)
vi.mock('../../../api/use-quittieren-befehl', () => ({
  useQuittierenBefehl: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock react-hotkeys-hook
vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}));

// Mock useOffeneRueckfragen
vi.mock('../../../api/use-offene-rueckfragen', () => ({
  useOffeneRueckfragen: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
}));

// Mock getOffeneRueckfragenCount
vi.mock('../../../lib/befehl-utils', () => ({
  getOffeneRueckfragenCount: () => 0,
}));

// Mock Kind-Komponenten um Tests zu isolieren
vi.mock('../../molecules/BefehlEingabeRow.molecule', () => ({
  BefehlEingabeRow: () => <div data-testid="befehl-eingabe-row" />,
}));

vi.mock('../../molecules/BefehlKarte.molecule', () => ({
  BefehlKarte: ({ nummer, befehlId, onQuittieren }: { nummer: string; befehlId: string; onQuittieren?: (id: string) => void }) => (
    <div data-testid={`befehl-karte-${befehlId}`}>
      <span>{nummer}</span>
      {onQuittieren && (
        <button type="button" onClick={() => onQuittieren(befehlId)}>
          Quittieren
        </button>
      )}
    </div>
  ),
}));

vi.mock('../BefehlQuittierenDialog.organism', () => ({
  BefehlQuittierenDialog: ({ isOpen, befehlId }: { isOpen: boolean; befehlId: string }) => (isOpen ? <div data-testid="quittieren-dialog" data-befehl-id={befehlId} /> : null),
}));

/** Factory für Mock-Befehle */
function createMockBefehl(overrides: Partial<BefehlDto> = {}): BefehlDto {
  return {
    id: 'befehl-1',
    nummer: 'B2026-abc12345',
    einsatzId: 'einsatz-1',
    auftrag: 'Wasser marsch',
    befehlsgeberName: 'Befehlsgeber-1',
    erstellerId: 'ersteller-1',
    status: 'ERTEILT',
    befehlstyp: 'KURZBEFEHL',
    erteiltAm: new Date('2026-01-15T10:00:00Z'),
    empfaenger: [{ empfaengerId: 'user-1', empfaengerName: 'Test User' }],
    kommentare: [],
    createdAt: new Date('2026-01-15T10:00:00Z'),
    updatedAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  } as BefehlDto;
}

describe('BefehlsListeMitEingabe - Deeplink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockBefehle = [createMockBefehl({ id: 'befehl-1', nummer: 'B2026-abc12345' }), createMockBefehl({ id: 'befehl-2', nummer: 'B2026-def67890' })];
    // jsdom hat kein scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('sollte ohne initialBefehlId keinen Dialog öffnen', () => {
    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    expect(screen.queryByTestId('quittieren-dialog')).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('sollte mit matching initialBefehlId den Dialog automatisch öffnen und zum Befehl scrollen', async () => {
    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" initialBefehlId="befehl-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('quittieren-dialog')).toBeInTheDocument();
    });

    expect(screen.getByTestId('quittieren-dialog').getAttribute('data-befehl-id')).toBe('befehl-1');

    // AC4: Auto-Scroll zum Befehl
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });

  it('sollte mit nicht-matchender initialBefehlId den Dialog geschlossen lassen', () => {
    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" initialBefehlId="nicht-existierend" />);

    expect(screen.queryByTestId('quittieren-dialog')).not.toBeInTheDocument();
  });

  it('sollte den Search-Param nach Dialog-Öffnung via navigate(replace) entfernen', async () => {
    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" initialBefehlId="befehl-1" />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        search: {},
        replace: true,
      });
    });
  });

  it('sollte den Dialog nicht öffnen während Daten noch laden', () => {
    mockIsLoading = true;
    mockBefehle = undefined;

    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" initialBefehlId="befehl-1" />);

    expect(screen.queryByTestId('quittieren-dialog')).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('sollte eine id auf jedem Listenelement setzen (für scrollIntoView)', () => {
    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    expect(document.getElementById('befehl-befehl-1')).toBeInTheDocument();
    expect(document.getElementById('befehl-befehl-2')).toBeInTheDocument();
  });
});
