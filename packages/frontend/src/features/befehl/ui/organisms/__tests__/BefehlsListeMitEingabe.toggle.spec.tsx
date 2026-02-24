/**
 * Unit Tests fuer Toggle/Badge in BefehlsListeMitEingabe
 *
 * Verifiziert:
 * - Desktop: Toggle-Button "Meine Befehle" sichtbar und toggled Filter
 * - Badge-Count zeigt Anzahl unquittierter Befehle
 * - Mobile: Tabs "Alle Befehle" / "Meine Befehle" sichtbar
 * - Leerzustand-Text aendert sich basierend auf Filter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
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
let mockAlleBefehle: BefehlDto[] | undefined;
let mockAlleIsLoading = false;

vi.mock('../../../api/use-befehle-by-einsatz', () => ({
  useBefehleByEinsatz: () => ({
    data: mockAlleBefehle,
    isLoading: mockAlleIsLoading,
    isError: false,
    refetch: vi.fn(),
  }),
}));

// Mock useMeineBefehle
let mockMeineBefehle: BefehlDto[] | undefined;

vi.mock('../../../api/use-meine-befehle', () => ({
  useMeineBefehle: () => ({
    data: mockMeineBefehle,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

// Mock useMeineBefehleFilter + useOffeneRueckfragenFilter
let mockShowMeineBefehle = false;
const mockToggle = vi.fn();
const mockSetShowMeineBefehle = vi.fn();
const mockSetShowOffeneRueckfragen = vi.fn();

vi.mock('../../../hooks/use-meine-befehle-filter', () => ({
  useMeineBefehleFilter: () => [mockShowMeineBefehle, mockToggle],
  useOffeneRueckfragenFilter: () => [false, vi.fn()],
  setShowMeineBefehle: (...args: unknown[]) => mockSetShowMeineBefehle(...args),
  setShowOffeneRueckfragen: (...args: unknown[]) => mockSetShowOffeneRueckfragen(...args),
}));

// Mock useQuittierenBefehl (benoetigt vom Dialog)
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
  BefehlKarte: ({ nummer, befehlId }: { nummer: string; befehlId: string }) => (
    <div data-testid={`befehl-karte-${befehlId}`}>
      <span>{nummer}</span>
    </div>
  ),
}));

vi.mock('../BefehlQuittierenDialog.organism', () => ({
  BefehlQuittierenDialog: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="quittieren-dialog" /> : null),
}));

/** Factory fuer Mock-Befehle */
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
    empfaenger: [{ id: 'emp-1', empfaengerId: 'user-1', empfaengerName: 'Test User' }],
    kommentare: [],
    createdAt: new Date('2026-01-15T10:00:00Z'),
    updatedAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  } as BefehlDto;
}

describe('BefehlsListeMitEingabe - Toggle/Badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShowMeineBefehle = false;
    mockAlleIsLoading = false;
    mockAlleBefehle = [
      createMockBefehl({ id: 'b1', nummer: 'B2026-001', empfaenger: [{ id: 'e1', empfaengerId: 'user-1' }] }),
      createMockBefehl({ id: 'b2', nummer: 'B2026-002', empfaenger: [{ id: 'e2', empfaengerId: 'user-1', quittiertAm: new Date('2026-01-15T10:05:00Z') }] }),
      createMockBefehl({ id: 'b3', nummer: 'B2026-003', empfaenger: [{ id: 'e3', empfaengerId: 'other-user' }] }),
    ] as BefehlDto[];
    mockMeineBefehle = [
      createMockBefehl({ id: 'b1', nummer: 'B2026-001', empfaenger: [{ id: 'e1', empfaengerId: 'user-1' }] }),
      createMockBefehl({ id: 'b2', nummer: 'B2026-002', empfaenger: [{ id: 'e2', empfaengerId: 'user-1', quittiertAm: new Date('2026-01-15T10:05:00Z') }] }),
    ] as BefehlDto[];
  });

  it('zeigt Desktop Toggle-Button "Meine Befehle"', () => {
    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    const toggleButton = screen.getByRole('button', { name: /Meine Befehle/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('ruft toggleMeineBefehle auf beim Klick auf Desktop Toggle-Button', () => {
    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    const toggleButton = screen.getByRole('button', { name: /Meine Befehle/i });
    fireEvent.click(toggleButton);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('zeigt Badge-Count mit Anzahl unquittierter Befehle', () => {
    // b1 hat user-1 als Empfaenger ohne quittiertAm => 1 unquittiert
    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    // Badge sollte "1" zeigen (b1 ist unquittiert fuer user-1)
    // Badge erscheint sowohl im Desktop-Button als auch im Mobile-Tab
    const badges = screen.getAllByText('1');
    // Mindestens ein Badge mit der richtigen Zahl
    expect(badges.length).toBeGreaterThanOrEqual(1);
    // Pruefe dass ein Badge die korrekte Styling-Klasse hat (rounded-full = Badge)
    const badgeElement = badges.find((el) => el.classList.contains('rounded-full'));
    expect(badgeElement).toBeDefined();
  });

  it('zeigt keinen Badge wenn keine unquittierten Befehle', () => {
    mockAlleBefehle = [
      createMockBefehl({
        id: 'b1',
        empfaenger: [{ id: 'e1', empfaengerId: 'user-1', quittiertAm: new Date('2026-01-15T10:05:00Z') }],
      }),
    ] as BefehlDto[];

    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    // Kein Badge mit Zahl sichtbar - der Toggle-Button existiert aber ohne Badge-Count
    const toggleButton = screen.getByRole('button', { name: /Meine Befehle/i });
    expect(toggleButton).toBeInTheDocument();
    // Kein "0" Badge angezeigt
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('zeigt Mobile Tabs "Alle", "Meine" und "Rückfragen"', () => {
    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('Alle');
    expect(tabs[1]).toHaveTextContent('Meine');
    expect(tabs[2]).toHaveTextContent('Rückfragen');
  });

  it('markiert "Alle" Tab als ausgewaehlt wenn kein Filter aktiv', () => {
    mockShowMeineBefehle = false;

    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
  });

  it('markiert "Meine" Tab als ausgewaehlt wenn Filter aktiv', () => {
    mockShowMeineBefehle = true;

    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
  });

  it('ruft setShowMeineBefehle(true) auf beim Klick auf Mobile Tab "Meine"', () => {
    mockShowMeineBefehle = false;

    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]); // "Meine" Tab

    expect(mockSetShowMeineBefehle).toHaveBeenCalledWith(true);
  });

  it('zeigt Leerzustand "Noch keine Befehle erteilt" bei Filter inaktiv', () => {
    mockShowMeineBefehle = false;
    mockAlleBefehle = [];

    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    expect(screen.getByText('Noch keine Befehle erteilt')).toBeInTheDocument();
  });

  it('zeigt Leerzustand "Keine eigenen Befehle" bei Filter aktiv', () => {
    mockShowMeineBefehle = true;
    mockMeineBefehle = [];

    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    expect(screen.getByText('Keine eigenen Befehle')).toBeInTheDocument();
  });

  it('setzt aria-pressed auf true wenn Filter aktiv (Desktop)', () => {
    mockShowMeineBefehle = true;

    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    const toggleButton = screen.getByRole('button', { name: /Meine Befehle/i });
    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('zeigt aria-label "Meine Befehlsliste" wenn Filter aktiv', () => {
    mockShowMeineBefehle = true;

    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    expect(screen.getByLabelText('Meine Befehlsliste')).toBeInTheDocument();
  });

  it('zeigt aria-label "Befehlsliste" wenn Filter inaktiv', () => {
    mockShowMeineBefehle = false;

    renderWithProviders(<BefehlsListeMitEingabe einsatzId="einsatz-1" />);

    expect(screen.getByLabelText('Befehlsliste')).toBeInTheDocument();
  });
});
