import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VersionTimestampFooter } from '../VersionTimestampFooter';

/**
 * Spec für den `VersionTimestampFooter` (Story 415-2-4, Task 9, AC11).
 *
 * Die Zeit-Assertion nutzt einen Regex (`\d{2}:\d{2}`), damit der Test
 * unabhängig von der Test-Environment-TZ grün bleibt — `Intl.DateTimeFormat`
 * liefert lokalisierte Werte, und in der jsdom-Umgebung kann die Zeitzone
 * je nach CI-Konfiguration abweichen.
 */
describe('VersionTimestampFooter (Story 415-2-4 Task 9)', () => {
  const defaultProps = {
    aktualisiertAm: '2026-04-23T14:30:00.000Z',
    aktualisiertVonUserId: 'cluser0123456789abcd1234',
    version: 5,
    popoverId: 'historie-popover-xyz',
  };

  it('rendert lokale HH:mm-Zeit, UserId-Kurzform (letzte 8) und „V{n}"-Chip', () => {
    render(<VersionTimestampFooter {...defaultProps} onOpen={() => {}} />);

    const button = screen.getByTestId('version-timestamp-footer');
    // Zeitformat: zwei Ziffern, Doppelpunkt, zwei Ziffern — unabhängig von TZ.
    expect(button.textContent).toMatch(/\d{2}:\d{2}/);
    // UserId-Kurzform: letzte 8 Zeichen von `cluser0123456789abcd1234` → `abcd1234`.
    expect(button).toHaveTextContent('abcd1234');
    // Versionsnummer als „V5"-Chip.
    expect(button).toHaveTextContent('V5');
  });

  it('setzt ARIA-Attribute korrekt (aria-haspopup=dialog, aria-expanded, aria-controls)', () => {
    const { rerender } = render(<VersionTimestampFooter {...defaultProps} onOpen={() => {}} isOpen={false} />);

    const button = screen.getByTestId('version-timestamp-footer');
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'historie-popover-xyz');

    // `isOpen={true}` → aria-expanded wechselt auf "true" via rerender.
    rerender(<VersionTimestampFooter {...defaultProps} onOpen={() => {}} isOpen={true} popoverId="other-popover" />);
    const sameButton = screen.getByTestId('version-timestamp-footer');
    expect(sameButton).toHaveAttribute('aria-expanded', 'true');
    expect(sameButton).toHaveAttribute('aria-controls', 'other-popover');
  });

  it('ruft onOpen bei Klick auf', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<VersionTimestampFooter {...defaultProps} onOpen={onOpen} />);

    await user.click(screen.getByTestId('version-timestamp-footer'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('erfüllt das 44×44 px Touch-Target-Minimum über Tailwind-Utility-Klassen', () => {
    render(<VersionTimestampFooter {...defaultProps} onOpen={() => {}} />);

    const button = screen.getByTestId('version-timestamp-footer');
    // Pragmatisch: die Mindestgrößen werden per Utility-Klassen gesetzt.
    // In jsdom liefert getBoundingClientRect keine echten Pixel-Werte, daher
    // prüfen wir die className statt computed styles.
    expect(button.className).toMatch(/min-h-\[44px\]/);
    expect(button.className).toMatch(/min-w-\[44px\]/);
  });
});
