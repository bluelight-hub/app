/**
 * Unit Tests für GefahrenToolsSidebar Molecule
 *
 * Verifiziert:
 * - Rendering der drei Tabs (Zone, GAMS, Symbole)
 * - Tab-Wechsel via setGefahrenSidebarTab
 * - GAMS-Button setzt Zeichenmodus `draw_gams`
 * - Symbol-Klick ruft onSelectSymbol
 * - Sichtbarkeits-Transform via isVisible-Prop (translate-x-full vs. 0)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GefahrenToolsSidebar } from '../GefahrenToolsSidebar.molecule';

// ============================================
// Mocks
// ============================================

const mockSetDrawMode = vi.fn();
const mockSetGefahrenSidebarTab = vi.fn();
const mockToggleGefahrenSidebar = vi.fn();

let mockStoreState = {
  gefahrenSidebarTab: 'zone' as 'zone' | 'gams' | 'symbole',
  drawMode: 'idle' as string,
  drawContext: null as null | 'gefahrenzone' | 'taktisch',
};

vi.mock('@/features/lagekarte/stores/draw.store', () => ({
  drawStore: {
    state: {},
    subscribe: vi.fn((cb) => {
      cb();
      return () => {};
    }),
  },
  setDrawMode: (...args: any[]) => mockSetDrawMode(...args),
  setDrawContext: vi.fn(),
  setGefahrenSidebarTab: (...args: any[]) => mockSetGefahrenSidebarTab(...args),
  toggleGefahrenSidebar: (...args: any[]) => mockToggleGefahrenSidebar(...args),
}));

vi.mock('@tanstack/react-store', () => ({
  useStore: vi.fn((_store: unknown, selector: unknown) => {
    if (typeof selector === 'function') {
      return (selector as Function)(mockStoreState);
    }
    return null;
  }),
}));

// GefahrenzoneDrawControls isoliert: wir testen die Sidebar, nicht die Draw-Controls.
vi.mock('@/features/gefahrenzone', () => ({
  GefahrenzoneDrawControls: ({ className }: { className?: string }) => (
    <div data-testid="gefahrenzone-draw-controls" className={className}>
      Polygon/Kreis-Controls
    </div>
  ),
}));

// ============================================
// Tests
// ============================================

describe('GefahrenToolsSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      gefahrenSidebarTab: 'zone',
      drawMode: 'idle',
      drawContext: null,
    };
  });

  it('sollte Header mit Titel und Close-Button rendern', () => {
    render(<GefahrenToolsSidebar isVisible={true} onSelectSymbol={vi.fn()} />);
    expect(screen.getByText('Gefahren-Tools')).toBeInTheDocument();
    expect(screen.getByLabelText('Gefahren-Sidebar schließen')).toBeInTheDocument();
  });

  it('sollte alle drei Tabs mit korrekter role und aria-selected rendern', () => {
    render(<GefahrenToolsSidebar isVisible={true} onSelectSymbol={vi.fn()} />);
    const tablist = screen.getByRole('tablist', { name: 'Gefahren-Werkzeuge' });
    expect(tablist).toBeInTheDocument();
    const zoneTab = screen.getByRole('tab', { name: /Zone/i });
    const gamsTab = screen.getByRole('tab', { name: /GAMS/i });
    const symboleTab = screen.getByRole('tab', { name: /Symbole/i });
    expect(zoneTab).toHaveAttribute('aria-selected', 'true');
    expect(gamsTab).toHaveAttribute('aria-selected', 'false');
    expect(symboleTab).toHaveAttribute('aria-selected', 'false');
  });

  it('sollte Tab-Wechsel auf GAMS via setGefahrenSidebarTab propagieren', async () => {
    const user = userEvent.setup();
    render(<GefahrenToolsSidebar isVisible={true} onSelectSymbol={vi.fn()} />);
    await user.click(screen.getByRole('tab', { name: /GAMS/i }));
    expect(mockSetGefahrenSidebarTab).toHaveBeenCalledWith('gams');
  });

  it('sollte im Zone-Tab GefahrenzoneDrawControls rendern', () => {
    mockStoreState.gefahrenSidebarTab = 'zone';
    render(<GefahrenToolsSidebar isVisible={true} onSelectSymbol={vi.fn()} />);
    expect(screen.getByTestId('gefahrenzone-draw-controls')).toBeInTheDocument();
  });

  it('sollte im GAMS-Tab den Start-Button rendern und setDrawMode("draw_gams") triggern', async () => {
    mockStoreState.gefahrenSidebarTab = 'gams';
    const user = userEvent.setup();
    render(<GefahrenToolsSidebar isVisible={true} onSelectSymbol={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /GAMS-Platzierung starten/i });
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(mockSetDrawMode).toHaveBeenCalledWith('draw_gams');
  });

  it('sollte im Symbole-Tab alle Gefahren-Symbole rendern und onSelectSymbol bei Klick aufrufen', async () => {
    mockStoreState.gefahrenSidebarTab = 'symbole';
    const onSelectSymbol = vi.fn();
    const user = userEvent.setup();
    render(<GefahrenToolsSidebar isVisible={true} onSelectSymbol={onSelectSymbol} />);
    // Mindestens Gefahrstoff + Brand sichtbar (aus gefahren.ts)
    const gefahrstoff = screen.getByTitle('Gefahrstoff');
    const brand = screen.getByTitle('Brandstelle');
    expect(gefahrstoff).toBeInTheDocument();
    expect(brand).toBeInTheDocument();
    await user.click(gefahrstoff);
    expect(onSelectSymbol).toHaveBeenCalledTimes(1);
    expect(onSelectSymbol.mock.calls[0][0]).toMatchObject({ id: 'gf-gefahrstoff', category: 'gefahren' });
  });

  it('sollte sichtbar sein (translate-x-0) wenn isVisible=true', () => {
    const { container } = render(<GefahrenToolsSidebar isVisible={true} onSelectSymbol={vi.fn()} />);
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.className).toContain('translate-x-0');
    expect(panel.getAttribute('aria-hidden')).toBe('false');
  });

  it('sollte verborgen sein (translate-x-full) wenn isVisible=false', () => {
    const { container } = render(<GefahrenToolsSidebar isVisible={false} onSelectSymbol={vi.fn()} />);
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.className).toContain('translate-x-full');
    expect(panel.getAttribute('aria-hidden')).toBe('true');
  });

  it('sollte Close-Button toggleGefahrenSidebar aufrufen', async () => {
    const user = userEvent.setup();
    render(<GefahrenToolsSidebar isVisible={true} onSelectSymbol={vi.fn()} />);
    await user.click(screen.getByLabelText('Gefahren-Sidebar schließen'));
    expect(mockToggleGefahrenSidebar).toHaveBeenCalledTimes(1);
  });

  it('sollte inaktive Tab-Inhalte NICHT mounten (verhindert leakende Event-Listener)', () => {
    mockStoreState.gefahrenSidebarTab = 'zone';
    render(<GefahrenToolsSidebar isVisible={true} onSelectSymbol={vi.fn()} />);
    // Nur Zone-Inhalt im DOM, GAMS-Start-Button + Symbol-Grid NICHT.
    expect(screen.getByTestId('gefahrenzone-draw-controls')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /GAMS-Platzierung starten/i })).not.toBeInTheDocument();
    expect(screen.queryByTitle('Gefahrstoff')).not.toBeInTheDocument();
  });

  it('sollte inert-Attribut setzen, wenn isVisible=false', () => {
    const { container } = render(<GefahrenToolsSidebar isVisible={false} onSelectSymbol={vi.fn()} />);
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.hasAttribute('inert')).toBe(true);
  });

  it('sollte kein inert-Attribut setzen, wenn isVisible=true', () => {
    const { container } = render(<GefahrenToolsSidebar isVisible={true} onSelectSymbol={vi.fn()} />);
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.hasAttribute('inert')).toBe(false);
  });
});
