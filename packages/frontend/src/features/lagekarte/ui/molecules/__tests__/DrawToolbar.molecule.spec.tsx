/**
 * Unit Tests für DrawToolbar Molecule
 *
 * Verifiziert die 2-Spalten-Zeichenwerkzeugleiste:
 * - Toggle-Button (Expand/Collapse)
 * - Alle Zeichenmodus-Buttons
 * - Aktiver Modus Hervorhebung
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrawToolbar, TOOLBAR_ITEMS } from '../DrawToolbar.molecule';

// Mock draw store
vi.mock('../../../stores/draw.store', () => ({
  drawStore: {
    state: {
      isDrawToolbarVisible: true,
      isSymbolPanelVisible: false,
      isTemplatePanelVisible: false,
      isLocked: false,
      isZeichenSidebarVisible: false,
      isGefahrenSidebarVisible: false,
    },
    subscribe: vi.fn((cb) => {
      cb();
      return () => {};
    }),
  },
  toggleDrawToolbar: vi.fn(),
  toggleLock: vi.fn(),
  toggleSymbolPanel: vi.fn(),
  toggleTemplatePanel: vi.fn(),
  toggleZeichenSidebar: vi.fn(),
  toggleGefahrenSidebar: vi.fn(),
}));

vi.mock('@tanstack/react-store', () => ({
  useStore: vi.fn((_store: unknown, selector: unknown) => {
    if (typeof selector === 'function') {
      return (selector as Function)({
        isDrawToolbarVisible: true,
        isSymbolPanelVisible: false,
        isTemplatePanelVisible: false,
        isLocked: false,
        isZeichenSidebarVisible: false,
        isGefahrenSidebarVisible: false,
      });
    }
    return true;
  }),
}));

describe('DrawToolbar', () => {
  it('sollte Toolbar mit role="toolbar" rendern', () => {
    render(<DrawToolbar activeMode="idle" onModeChange={vi.fn()} />);

    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('sollte alle Zeichenmodus-Buttons rendern', () => {
    render(<DrawToolbar activeMode="idle" onModeChange={vi.fn()} />);

    expect(screen.getByLabelText('Auswählen')).toBeInTheDocument();
    expect(screen.getByLabelText('Punkt zeichnen')).toBeInTheDocument();
    expect(screen.getByLabelText('Linie zeichnen')).toBeInTheDocument();
    expect(screen.getByLabelText('Polygon zeichnen')).toBeInTheDocument();
    expect(screen.getByLabelText('Kreis zeichnen')).toBeInTheDocument();
    expect(screen.getByLabelText('Rechteck zeichnen')).toBeInTheDocument();
    expect(screen.getByLabelText('Freihand zeichnen')).toBeInTheDocument();
    expect(screen.getByLabelText('Pfeil zeichnen')).toBeInTheDocument();
    expect(screen.getByLabelText('Ellipse zeichnen')).toBeInTheDocument();
    expect(screen.getByLabelText('Ausbreitungskegel zeichnen')).toBeInTheDocument();
    expect(screen.getByLabelText('Text platzieren')).toBeInTheDocument();
    expect(screen.getByLabelText('OSM-Gebäude markieren')).toBeInTheDocument();
  });

  it('sollte GAMS-Button nicht mehr im Haupt-Toolbar-Grid enthalten (liegt jetzt in der Gefahren-Sidebar)', () => {
    render(<DrawToolbar activeMode="idle" onModeChange={vi.fn()} />);
    expect(screen.queryByLabelText('GAMS-Zonen platzieren')).not.toBeInTheDocument();
  });

  it('sollte Gefahren-Tools-Button in der oberen Button-Reihe rendern', () => {
    render(<DrawToolbar activeMode="idle" onModeChange={vi.fn()} />);
    const btn = screen.getByLabelText('Gefahren-Tools');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('sollte alle erwarteten Modi in TOOLBAR_ITEMS enthalten (ohne draw_gams)', () => {
    const allModes = TOOLBAR_ITEMS.filter((item): item is Exclude<typeof item, 'separator'> => item !== 'separator').map((t) => t.mode);
    expect(allModes).toHaveLength(12);
    expect(allModes).toContain('select');
    expect(allModes).toContain('draw_point');
    expect(allModes).toContain('draw_line_string');
    expect(allModes).toContain('draw_polygon');
    expect(allModes).toContain('draw_circle');
    expect(allModes).toContain('draw_rectangle');
    expect(allModes).toContain('draw_freehand');
    expect(allModes).toContain('draw_arrow');
    expect(allModes).toContain('draw_ellipse');
    expect(allModes).toContain('draw_sector');
    expect(allModes).not.toContain('draw_gams');
    expect(allModes).toContain('draw_text');
    expect(allModes).toContain('osm_mark');
  });

  it('sollte onModeChange aufrufen bei Klick auf Mode-Button', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();

    render(<DrawToolbar activeMode="idle" onModeChange={onModeChange} />);

    await user.click(screen.getByLabelText('Punkt zeichnen'));

    expect(onModeChange).toHaveBeenCalledWith('draw_point');
  });

  it('sollte Toggle-Button mit aria-expanded rendern', () => {
    render(<DrawToolbar activeMode="idle" onModeChange={vi.fn()} />);

    const toggleBtn = screen.getByLabelText('Werkzeugleiste einklappen');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(toggleBtn).toHaveAttribute('aria-controls', 'draw-toolbar-modes');
  });

  it('sollte Vorlagen- und Symbolbibliothek-Buttons anzeigen', () => {
    render(<DrawToolbar activeMode="idle" onModeChange={vi.fn()} />);

    expect(screen.getByLabelText('Vorlagen')).toBeInTheDocument();
    expect(screen.getByLabelText('Symbolbibliothek')).toBeInTheDocument();
  });

  it('sollte Lock-Button mit aria-pressed rendern', () => {
    render(<DrawToolbar activeMode="idle" onModeChange={vi.fn()} />);

    const lockBtn = screen.getByLabelText('Bearbeitung sperren');
    expect(lockBtn).toBeInTheDocument();
    expect(lockBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('sollte Badge mit Anzahl unplatzierter Zeichen anzeigen', () => {
    render(<DrawToolbar activeMode="idle" onModeChange={vi.fn()} unplatzierteZeichenCount={3} />);

    const badge = screen.getByText('3');
    expect(badge).toBeInTheDocument();
  });

  it('sollte kein Badge anzeigen wenn keine unplatzierten Zeichen', () => {
    render(<DrawToolbar activeMode="idle" onModeChange={vi.fn()} unplatzierteZeichenCount={0} />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
