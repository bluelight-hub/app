/**
 * Spec für `GefaehrdungItemEditor` (Story 2.2 Task 9).
 *
 * Fokus: Progressive-Disclosure der Schutzmaßnahmen (GRÜN vs. übrige
 * Klassen), Character-Counter-Threshold, Tab-Order und Risiko-Badge.
 */

import { renderWithProviders } from '@/test/utils';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GefaehrdungItemEditor } from '../GefaehrdungItemEditor';

function stubReducedMotion(matches: boolean) {
  const mql = { matches, media: '', onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() };
  Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: vi.fn().mockReturnValue(mql) });
}

describe('GefaehrdungItemEditor (Story 2.2 Task 9)', () => {
  beforeEach(() => {
    stubReducedMotion(false);
  });

  it('zeigt Titel-Input und Beschreibungs-Textarea', () => {
    renderWithProviders(<GefaehrdungItemEditor value={{ title: 'Strom' }} onChange={vi.fn()} />);

    expect(screen.getByTestId('gefaehrdung-item-title')).toHaveValue('Strom');
    expect(screen.getByTestId('gefaehrdung-item-description')).toBeInTheDocument();
  });

  it('fokussiert bei autoFocusTitle den Titel-Input beim Mount', () => {
    renderWithProviders(<GefaehrdungItemEditor value={{ title: '' }} onChange={vi.fn()} autoFocusTitle />);

    expect(screen.getByTestId('gefaehrdung-item-title')).toHaveFocus();
  });

  it('blendet Schutzmaßnahmen-Textarea bei GRÜN-Item aus (Progressive-Disclosure)', () => {
    renderWithProviders(<GefaehrdungItemEditor value={{ title: 'GRÜN-Item', eintritt: 'SELTEN', schaden: 'VERNACHLAESSIGBAR' }} onChange={vi.fn()} />);

    expect(screen.queryByTestId('gefaehrdung-item-schutzmassnahmen')).toBeNull();
    expect(screen.getByTestId('gefaehrdung-item-schutzmassnahmen-opener')).toBeInTheDocument();
  });

  it('öffnet Schutzmaßnahmen-Textarea beim Fokussieren des Openers (GRÜN)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungItemEditor value={{ title: 'GRÜN-Item', eintritt: 'SELTEN', schaden: 'VERNACHLAESSIGBAR' }} onChange={vi.fn()} />);

    const opener = screen.getByTestId('gefaehrdung-item-schutzmassnahmen-opener');
    await user.click(opener);

    expect(screen.getByTestId('gefaehrdung-item-schutzmassnahmen')).toBeInTheDocument();
  });

  it('zeigt Schutzmaßnahmen-Textarea sofort bei ROT-Item', () => {
    renderWithProviders(<GefaehrdungItemEditor value={{ title: 'ROT-Item', eintritt: 'STAENDIG', schaden: 'KATASTROPHAL' }} onChange={vi.fn()} />);

    expect(screen.getByTestId('gefaehrdung-item-schutzmassnahmen')).toBeInTheDocument();
    expect(screen.queryByTestId('gefaehrdung-item-schutzmassnahmen-opener')).toBeNull();
  });

  it('zeigt Risiko-Badge mit errechneter Klasse', () => {
    renderWithProviders(<GefaehrdungItemEditor value={{ title: 'Risiko', eintritt: 'OFT', schaden: 'HOCH' }} onChange={vi.fn()} />);

    const badge = screen.getByTestId('gefaehrdung-item-risiko-badge');
    expect(badge).toHaveTextContent('Rot');
  });

  it('blendet Character-Counter erst ab 80% der 2000-Zeichen-Grenze ein', () => {
    // 1599 < 1600 → kein Counter
    const value1599 = 'x'.repeat(1599);
    const { rerender } = renderWithProviders(<GefaehrdungItemEditor value={{ title: 'T', eintritt: 'STAENDIG', schaden: 'HOCH', schutzmassnahmen: value1599 }} onChange={vi.fn()} />);

    expect(screen.queryByTestId('gefaehrdung-item-schutzmassnahmen-counter')).toBeNull();

    // 1600 = Threshold → Counter sichtbar
    const value1600 = 'x'.repeat(1600);
    rerender(<GefaehrdungItemEditor value={{ title: 'T', eintritt: 'STAENDIG', schaden: 'HOCH', schutzmassnahmen: value1600 }} onChange={vi.fn()} />);

    const counter = screen.getByTestId('gefaehrdung-item-schutzmassnahmen-counter');
    expect(counter).toHaveTextContent('1600 / 2000 Zeichen');
    expect(counter).toHaveAttribute('aria-live', 'polite');
  });

  it('markiert > 2000 Zeichen mit aria-invalid und Inline-Fehler', () => {
    const tooLong = 'x'.repeat(2001);
    renderWithProviders(<GefaehrdungItemEditor value={{ title: 'T', eintritt: 'STAENDIG', schaden: 'KATASTROPHAL', schutzmassnahmen: tooLong }} onChange={vi.fn()} />);

    const textarea = screen.getByTestId('gefaehrdung-item-schutzmassnahmen');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('gefaehrdung-item-schutzmassnahmen-error')).toBeInTheDocument();
  });

  it('Tab-Order: Titel → Beschreibung → erste Matrix-Zelle → Schutzmaßnahmen (nach Reveal)', async () => {
    const user = userEvent.setup();
    // Start mit ROT-Item, damit das Schutzmaßnahmen-Textarea direkt in der
    // Tab-Order steht (ohne Opener-Umweg).
    renderWithProviders(<GefaehrdungItemEditor value={{ title: 'T', eintritt: 'STAENDIG', schaden: 'KATASTROPHAL' }} onChange={vi.fn()} />);

    const title = screen.getByTestId('gefaehrdung-item-title');
    const description = screen.getByTestId('gefaehrdung-item-description');
    title.focus();
    expect(title).toHaveFocus();

    await user.tab();
    expect(description).toHaveFocus();

    await user.tab();
    // Nächstes tabbares Element ist die aktive (Roving-Tabindex) Matrix-Zelle.
    const afterMatrix = document.activeElement;
    expect(afterMatrix?.getAttribute('role')).toBe('gridcell');

    await user.tab();
    expect(screen.getByTestId('gefaehrdung-item-schutzmassnahmen')).toHaveFocus();
  });

  it('Tab-Order-GRÜN: Opener öffnet das Textarea beim Fokus (Progressive-Disclosure)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungItemEditor value={{ title: 'T', eintritt: 'SELTEN', schaden: 'VERNACHLAESSIGBAR' }} onChange={vi.fn()} />);

    const opener = screen.getByTestId('gefaehrdung-item-schutzmassnahmen-opener');
    fireEvent.focus(opener);

    // Der Fokus-Event hat das Textarea gerendert.
    expect(screen.getByTestId('gefaehrdung-item-schutzmassnahmen')).toBeInTheDocument();

    // Weiter-Tab ist nicht nötig — der Reveal-Test deckt Progressive-Disclosure ab.
    void user;
  });

  it('ruft onRemove auf, wenn Löschen-Button geklickt wird', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderWithProviders(<GefaehrdungItemEditor value={{ title: 'T' }} onChange={vi.fn()} onRemove={onRemove} />);

    await user.click(screen.getByTestId('gefaehrdung-item-remove'));
    expect(onRemove).toHaveBeenCalled();
  });
});
