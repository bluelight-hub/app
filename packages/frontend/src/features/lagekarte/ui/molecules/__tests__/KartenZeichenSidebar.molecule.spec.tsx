/**
 * Unit Tests für KartenZeichenSidebar Molecule
 *
 * Verifiziert:
 * - Katalog-Auswahl löst Platzierungsmodus aus
 * - Baukasten-Erstellung löst Platzierungsmodus aus
 * - Unplatzierte Zeichen werden aufgelistet
 * - Platzieren/Löschen von unplatzierten Zeichen
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KartenZeichenSidebar } from '../KartenZeichenSidebar.molecule';

// ============================================
// Mocks
// ============================================

const mockSetPendingZeichenPlacement = vi.fn();
const mockClearPendingZeichenPlacement = vi.fn();
const mockToggleZeichenSidebar = vi.fn();
const mockSetZeichenSidebarTab = vi.fn();

vi.mock('@/features/lagekarte/stores/draw.store', () => ({
  drawStore: {
    state: {
      zeichenSidebarTab: 'katalog',
      pendingZeichenPlacement: null,
    },
    subscribe: vi.fn((cb) => {
      cb();
      return () => {};
    }),
  },
  setZeichenSidebarTab: (...args: any[]) => mockSetZeichenSidebarTab(...args),
  toggleZeichenSidebar: (...args: any[]) => mockToggleZeichenSidebar(...args),
  setPendingZeichenPlacement: (...args: any[]) => mockSetPendingZeichenPlacement(...args),
  clearPendingZeichenPlacement: (...args: any[]) => mockClearPendingZeichenPlacement(...args),
}));

let mockStoreState = {
  zeichenSidebarTab: 'katalog' as string,
  pendingZeichenPlacement: null as any,
};

vi.mock('@tanstack/react-store', () => ({
  useStore: vi.fn((_store: unknown, selector: unknown) => {
    if (typeof selector === 'function') {
      return (selector as Function)(mockStoreState);
    }
    return null;
  }),
}));

const mockRemoveZeichen = vi.fn();
const mockEinsatzZeichen: any[] = [];

vi.mock('@/features/taktische-zeichen', () => ({
  useZeichenKatalog: () => ({ data: [], isLoading: false, error: null }),
  useEinsatzZeichen: () => ({ data: mockEinsatzZeichen }),
  useRemoveZeichen: () => ({ mutate: mockRemoveZeichen }),
  ZeichenPreview: ({ definition }: any) => <div data-testid="zeichen-preview">{definition?.grundzeichen}</div>,
}));

vi.mock('@/features/taktische-zeichen/ui/organisms/ZeichenKatalog', () => ({
  ZeichenKatalog: ({ onSelectEintrag }: any) => (
    <div data-testid="zeichen-katalog">
      <button
        type="button"
        data-testid="katalog-select-btn"
        onClick={() =>
          onSelectEintrag({
            id: 'katalog-1',
            name: 'THW Bereitstellung',
            zeichenDefinition: { grundzeichen: 'stelle', organisation: 'thw' },
          })
        }
      >
        Auswählen
      </button>
    </div>
  ),
}));

vi.mock('@/features/taktische-zeichen/ui/organisms/ZeichenBaukasten', () => ({
  ZeichenBaukasten: ({ onErstelleZeichen }: any) => (
    <div data-testid="zeichen-baukasten">
      <button type="button" data-testid="baukasten-erstellen-btn" onClick={() => onErstelleZeichen({ grundzeichen: 'fahrzeug', organisation: 'fw' })}>
        Erstellen
      </button>
    </div>
  ),
}));

vi.mock('@/features/taktische-zeichen/rendering/ZeichenPreview', () => ({
  ZeichenPreview: ({ definition }: any) => <div data-testid="zeichen-preview">{definition?.grundzeichen}</div>,
}));

vi.mock('@/features/auth/api/use-users', () => ({
  useUserNames: () => ({
    getUserName: (id: string) => `User-${id.slice(0, 4)}`,
  }),
}));

vi.mock('@/shared/ui/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// ============================================
// Tests
// ============================================

describe('KartenZeichenSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      zeichenSidebarTab: 'katalog',
      pendingZeichenPlacement: null,
    };
    mockEinsatzZeichen.length = 0;
  });

  it('sollte Sidebar mit Header und Tabs rendern', () => {
    render(<KartenZeichenSidebar einsatzId="e-1" isVisible={true} />);

    expect(screen.getByText('Taktische Zeichen')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Katalog/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Baukasten/i })).toBeInTheDocument();
  });

  it('sollte Schließen-Button toggleZeichenSidebar aufrufen', async () => {
    const user = userEvent.setup();
    render(<KartenZeichenSidebar einsatzId="e-1" isVisible={true} />);

    await user.click(screen.getByLabelText('Zeichen-Sidebar schließen'));

    expect(mockToggleZeichenSidebar).toHaveBeenCalled();
  });

  describe('Katalog-Auswahl', () => {
    it('sollte bei Katalog-Auswahl setPendingZeichenPlacement aufrufen', async () => {
      const user = userEvent.setup();
      render(<KartenZeichenSidebar einsatzId="e-1" isVisible={true} />);

      await user.click(screen.getByTestId('katalog-select-btn'));

      expect(mockSetPendingZeichenPlacement).toHaveBeenCalledWith({
        grundzeichen: 'stelle',
        organisation: 'thw',
      });
    });
  });

  describe('Baukasten-Erstellung', () => {
    it('sollte bei Baukasten-Erstellung setPendingZeichenPlacement aufrufen', async () => {
      mockStoreState.zeichenSidebarTab = 'baukasten';
      const user = userEvent.setup();
      render(<KartenZeichenSidebar einsatzId="e-1" isVisible={true} />);

      await user.click(screen.getByTestId('baukasten-erstellen-btn'));

      expect(mockSetPendingZeichenPlacement).toHaveBeenCalledWith({ grundzeichen: 'fahrzeug', organisation: 'fw' }, undefined, undefined);
    });
  });

  describe('Unplatzierte Zeichen', () => {
    const unplatziertesZeichen = {
      id: 'z-1',
      label: 'Einsatzleitung',
      zeichenDefinition: { grundzeichen: 'stelle', organisation: 'thw' },
      istPlatziert: false,
      createdBy: 'user-abc123',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const platziertesZeichen = {
      id: 'z-2',
      label: 'Fahrzeug',
      zeichenDefinition: { grundzeichen: 'fahrzeug', organisation: 'fw' },
      istPlatziert: true,
      lat: 50.0,
      lng: 10.0,
      createdBy: 'user-def456',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    it('sollte unplatzierte Zeichen anzeigen', () => {
      mockEinsatzZeichen.push(unplatziertesZeichen, platziertesZeichen);

      render(<KartenZeichenSidebar einsatzId="e-1" isVisible={true} />);

      expect(screen.getByText('Nicht platziert (1)')).toBeInTheDocument();
      expect(screen.getByText('Einsatzleitung')).toBeInTheDocument();
    });

    it('sollte Ersteller-Name via getUserName anzeigen', () => {
      mockEinsatzZeichen.push(unplatziertesZeichen);

      render(<KartenZeichenSidebar einsatzId="e-1" isVisible={true} />);

      expect(screen.getByText(/von User-user/)).toBeInTheDocument();
    });

    it('sollte Sektion NICHT anzeigen wenn keine unplatzierten Zeichen', () => {
      mockEinsatzZeichen.push(platziertesZeichen);

      render(<KartenZeichenSidebar einsatzId="e-1" isVisible={true} />);

      expect(screen.queryByText(/Nicht platziert/)).not.toBeInTheDocument();
    });

    it('sollte bei Platzieren-Klick setPendingZeichenPlacement mit existingZeichenId aufrufen', async () => {
      mockEinsatzZeichen.push(unplatziertesZeichen);
      const user = userEvent.setup();

      render(<KartenZeichenSidebar einsatzId="e-1" isVisible={true} />);

      await user.click(screen.getByLabelText('Zeichen platzieren'));

      expect(mockSetPendingZeichenPlacement).toHaveBeenCalledWith(unplatziertesZeichen.zeichenDefinition, 'z-1');
    });

    it('sollte bei Löschen-Klick removeZeichen aufrufen', async () => {
      mockEinsatzZeichen.push(unplatziertesZeichen);
      const user = userEvent.setup();

      render(<KartenZeichenSidebar einsatzId="e-1" isVisible={true} />);

      await user.click(screen.getByLabelText('Zeichen löschen'));

      expect(mockRemoveZeichen).toHaveBeenCalledWith('z-1');
    });

    it('sollte mehrere unplatzierte Zeichen korrekt zählen', () => {
      const zweites = { ...unplatziertesZeichen, id: 'z-3', label: 'Zweites Zeichen' };
      mockEinsatzZeichen.push(unplatziertesZeichen, zweites, platziertesZeichen);

      render(<KartenZeichenSidebar einsatzId="e-1" isVisible={true} />);

      expect(screen.getByText('Nicht platziert (2)')).toBeInTheDocument();
    });
  });
});
