/**
 * Unit Tests für DrawToolbar Molecule
 *
 * Verifiziert die Zeichenwerkzeugleiste:
 * - Toggle-Button (Expand/Collapse)
 * - Zeichenmodus-Buttons
 * - Aktiver Modus Hervorhebung
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrawToolbar } from '../DrawToolbar.molecule';

// Mock draw store
vi.mock('../../../stores/draw.store', () => ({
  drawStore: {
    state: { isDrawToolbarVisible: true },
    subscribe: vi.fn((cb) => {
      cb();
      return () => {};
    }),
  },
  toggleDrawToolbar: vi.fn(),
}));

vi.mock('@tanstack/react-store', () => ({
  useStore: vi.fn(() => true), // isDrawToolbarVisible = true
}));

describe('DrawToolbar', () => {
  it('sollte Toolbar mit role="toolbar" rendern', () => {
    render(<DrawToolbar activeMode="idle" onModeChange={vi.fn()} />);

    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('sollte alle Zeichenmodus-Buttons rendern', () => {
    render(<DrawToolbar activeMode="idle" onModeChange={vi.fn()} />);

    // Prüfe einige der 11 Mode-Buttons
    expect(screen.getByLabelText('Auswählen')).toBeInTheDocument();
    expect(screen.getByLabelText('Punkt zeichnen')).toBeInTheDocument();
    expect(screen.getByLabelText('Linie zeichnen')).toBeInTheDocument();
    expect(screen.getByLabelText('Polygon zeichnen')).toBeInTheDocument();
    expect(screen.getByLabelText('Kreis zeichnen')).toBeInTheDocument();
    expect(screen.getByLabelText('Freihand zeichnen')).toBeInTheDocument();
    expect(screen.getByLabelText('GAMS-Zonen platzieren')).toBeInTheDocument();
    expect(screen.getByLabelText('Text platzieren')).toBeInTheDocument();
    expect(screen.getByLabelText('OSM-Gebäude markieren')).toBeInTheDocument();
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
});
