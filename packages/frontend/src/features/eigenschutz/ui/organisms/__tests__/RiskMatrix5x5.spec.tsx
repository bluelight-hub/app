/**
 * Spec für `RiskMatrix5x5` (Story 2.2 Task 9).
 *
 * Fokus: 25-Zellen-Rendering, Roving-Tabindex, Pfeiltasten-Navigation,
 * Enter/Space → `onChange`, aria-selected + Touch-Target-Klassen. Die
 * Risikoklassen-Berechnung wird nicht erneut getestet (siehe Shared-Spec
 * in `@bluelight-hub/shared`).
 */

import { renderWithProviders } from '@/test/utils';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RiskMatrix5x5 } from '../RiskMatrix5x5';

function stubMatchMedia(matches: boolean) {
  const mql = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(false),
  };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
  // jsdom exposes matchMedia on window directly, nicht nur als global.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mql),
  });
}

describe('RiskMatrix5x5 (Story 2.2 Task 9)', () => {
  beforeEach(() => {
    stubMatchMedia(false);
  });

  it('rendert exakt 25 Zellen mit role="gridcell"', () => {
    renderWithProviders(<RiskMatrix5x5 onChange={vi.fn()} />);

    const grid = screen.getByRole('grid');
    const cells = within(grid).getAllByRole('gridcell');
    expect(cells).toHaveLength(25);
  });

  it('koppelt Achsen-Header über scope col/row', () => {
    renderWithProviders(<RiskMatrix5x5 onChange={vi.fn()} />);

    const grid = screen.getByRole('grid');
    // 5 col-headers + 5 row-headers + 1 Eck-Platzhalter (aria-hidden, kein scope).
    const colHeaders = within(grid).getAllByRole('columnheader');
    const rowHeaders = within(grid).getAllByRole('rowheader');
    expect(colHeaders.length).toBe(5);
    expect(rowHeaders.length).toBe(5);
    expect(colHeaders[0]).toHaveTextContent('Vernachlässigbar');
    expect(rowHeaders[0]).toHaveTextContent('Selten');
  });

  it('liefert sprechenden aria-label inkl. Risikoklasse pro Zelle', () => {
    renderWithProviders(<RiskMatrix5x5 onChange={vi.fn()} />);

    const cell = screen.getByTestId('risk-matrix-cell-SELTEN-VERNACHLAESSIGBAR');
    expect(cell).toHaveAttribute('aria-label', 'Eintrittswahrscheinlichkeit Selten, Schadensausmaß Vernachlässigbar, Risikoklasse Grün');
  });

  it('ruft onChange bei Klick auf Zelle auf', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<RiskMatrix5x5 onChange={onChange} />);

    await user.click(screen.getByTestId('risk-matrix-cell-STAENDIG-KATASTROPHAL'));

    expect(onChange).toHaveBeenCalledWith({ eintritt: 'STAENDIG', schaden: 'KATASTROPHAL' });
  });

  it('markiert die aktive Zelle mit aria-selected="true"', () => {
    renderWithProviders(<RiskMatrix5x5 value={{ eintritt: 'OFT', schaden: 'HOCH' }} onChange={vi.fn()} />);

    const selected = screen.getByTestId('risk-matrix-cell-OFT-HOCH');
    expect(selected).toHaveAttribute('aria-selected', 'true');

    // Andere Zellen dürfen nicht selected sein.
    const other = screen.getByTestId('risk-matrix-cell-SELTEN-VERNACHLAESSIGBAR');
    expect(other).toHaveAttribute('aria-selected', 'false');
  });

  it('hält Roving-Tabindex: nur genau eine Zelle ist tabbar', () => {
    renderWithProviders(<RiskMatrix5x5 onChange={vi.fn()} />);

    const grid = screen.getByRole('grid');
    const tabbable = within(grid)
      .getAllByRole('gridcell')
      .filter((cell) => cell.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
  });

  it('Pfeiltasten bewegen den Fokus innerhalb des Grids', () => {
    const onChange = vi.fn();
    renderWithProviders(<RiskMatrix5x5 value={{ eintritt: 'HAEUFIG', schaden: 'MITTEL' }} onChange={onChange} />);

    const initial = screen.getByTestId('risk-matrix-cell-HAEUFIG-MITTEL');
    initial.focus();

    // ArrowDown bringt uns auf OFT × MITTEL
    fireEvent.keyDown(initial, { key: 'ArrowDown' });
    const next = screen.getByTestId('risk-matrix-cell-OFT-MITTEL');
    expect(next).toHaveAttribute('tabindex', '0');

    // ArrowRight → OFT × HOCH
    fireEvent.keyDown(next, { key: 'ArrowRight' });
    const third = screen.getByTestId('risk-matrix-cell-OFT-HOCH');
    expect(third).toHaveAttribute('tabindex', '0');

    // Noch kein Select — onChange darf nicht durch Navigation getriggert sein.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Enter und Space wählen die fokussierte Zelle aus', () => {
    const onChange = vi.fn();
    renderWithProviders(<RiskMatrix5x5 value={{ eintritt: 'SELTEN', schaden: 'VERNACHLAESSIGBAR' }} onChange={onChange} />);

    const cell = screen.getByTestId('risk-matrix-cell-SELTEN-VERNACHLAESSIGBAR');
    cell.focus();

    fireEvent.keyDown(cell, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith({ eintritt: 'SELTEN', schaden: 'VERNACHLAESSIGBAR' });

    onChange.mockClear();
    fireEvent.keyDown(cell, { key: ' ' });
    expect(onChange).toHaveBeenCalledWith({ eintritt: 'SELTEN', schaden: 'VERNACHLAESSIGBAR' });
  });

  it('setzt Touch-Target-Klassen `min-h-12 min-w-12`', () => {
    renderWithProviders(<RiskMatrix5x5 onChange={vi.fn()} />);

    const cell = screen.getByTestId('risk-matrix-cell-SELTEN-VERNACHLAESSIGBAR');
    expect(cell.className).toMatch(/min-h-12/);
    expect(cell.className).toMatch(/min-w-12/);
  });

  it('respektiert prefers-reduced-motion: keine Transition-Klassen', () => {
    stubMatchMedia(true);
    renderWithProviders(<RiskMatrix5x5 onChange={vi.fn()} />);

    const cell = screen.getByTestId('risk-matrix-cell-SELTEN-VERNACHLAESSIGBAR');
    expect(cell.className).not.toMatch(/transition-/);
  });

  it('disabled verhindert Klick und Tastatur-Auswahl', () => {
    const onChange = vi.fn();
    renderWithProviders(<RiskMatrix5x5 disabled onChange={onChange} />);

    const cell = screen.getByTestId('risk-matrix-cell-STAENDIG-KATASTROPHAL');
    fireEvent.click(cell);
    fireEvent.keyDown(cell, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    expect(cell).toHaveAttribute('aria-disabled', 'true');
  });

  describe('readOnly (Story 415-2-4 Task 13, AC14)', () => {
    it('Klick auf nicht-selektierte Zelle löst kein onChange aus und hält die Auswahl stabil', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderWithProviders(<RiskMatrix5x5 readOnly value={{ eintritt: 'HAEUFIG', schaden: 'MITTEL' }} onChange={onChange} />);

      await user.click(screen.getByTestId('risk-matrix-cell-STAENDIG-KATASTROPHAL'));

      expect(onChange).not.toHaveBeenCalled();
      // Auswahl (aria-selected) bleibt an der ursprünglich selektierten Zelle.
      expect(screen.getByTestId('risk-matrix-cell-HAEUFIG-MITTEL')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('risk-matrix-cell-STAENDIG-KATASTROPHAL')).toHaveAttribute('aria-selected', 'false');
    });

    it('Enter und Space auf fokussierter Zelle lösen kein onChange aus', () => {
      const onChange = vi.fn();
      renderWithProviders(<RiskMatrix5x5 readOnly value={{ eintritt: 'SELTEN', schaden: 'VERNACHLAESSIGBAR' }} onChange={onChange} />);

      const cell = screen.getByTestId('risk-matrix-cell-SELTEN-VERNACHLAESSIGBAR');
      cell.focus();

      fireEvent.keyDown(cell, { key: 'Enter' });
      fireEvent.keyDown(cell, { key: ' ' });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('setzt aria-readonly abhängig von der Prop', () => {
      const { rerender } = renderWithProviders(<RiskMatrix5x5 readOnly onChange={vi.fn()} />);
      expect(screen.getByRole('grid')).toHaveAttribute('aria-readonly', 'true');

      rerender(<RiskMatrix5x5 onChange={vi.fn()} />);
      expect(screen.getByRole('grid')).not.toHaveAttribute('aria-readonly');
    });
  });
});
