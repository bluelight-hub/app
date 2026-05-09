import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useEigenschutzShortcuts } from '../useEigenschutzShortcuts';
import type { EigenschutzShortcutContext } from '../../constants/shortcuts.constants';

function Harness({
  context = 'vorfaelle',
  blocked = false,
  onFocusFilter = vi.fn(),
  onOpenGefaehrdung = vi.fn(),
  onOpenVorfall = vi.fn(),
}: {
  readonly context?: EigenschutzShortcutContext;
  readonly blocked?: boolean;
  readonly onFocusFilter?: () => void;
  readonly onOpenGefaehrdung?: () => void;
  readonly onOpenVorfall?: () => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  useEigenschutzShortcuts({
    context,
    enabled: true,
    isOverlayBlocking: blocked,
    isHelpOpen: helpOpen,
    onOpenHelp: () => setHelpOpen(true),
    onCloseHelp: () => setHelpOpen(false),
    onFocusPrimaryFilter: onFocusFilter,
    onOpenGefaehrdungCreate: onOpenGefaehrdung,
    onOpenVorfallCreate: onOpenVorfall,
  });

  return (
    <div>
      <input aria-label="Textfeld" />
      <textarea aria-label="Notiz" />
      <div role="textbox" aria-label="ARIA-Textfeld" tabIndex={0} />
      <div contentEditable aria-label="Editor" tabIndex={0} />
      <output>{helpOpen ? 'Hilfe offen' : 'Hilfe zu'}</output>
    </div>
  );
}

describe('useEigenschutzShortcuts', () => {
  it('triggert /, V und ? im Vorfall-Kontext außerhalb editierbarer Felder', async () => {
    const user = userEvent.setup();
    const onFocusFilter = vi.fn();
    const onOpenGefaehrdung = vi.fn();
    const onOpenVorfall = vi.fn();

    render(<Harness onFocusFilter={onFocusFilter} onOpenGefaehrdung={onOpenGefaehrdung} onOpenVorfall={onOpenVorfall} />);

    await user.keyboard('/');
    await user.keyboard('v');
    await user.keyboard('?');

    expect(onFocusFilter).toHaveBeenCalledTimes(1);
    expect(onOpenGefaehrdung).not.toHaveBeenCalled();
    expect(onOpenVorfall).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Hilfe offen')).toBeInTheDocument();
  });

  it('akzeptiert echte Symbol-Key-Events für / und ?', () => {
    const onFocusFilter = vi.fn();
    const onOpenVorfall = vi.fn();

    render(<Harness onFocusFilter={onFocusFilter} onOpenVorfall={onOpenVorfall} />);

    fireEvent.keyDown(document, { key: '/', code: 'Slash', shiftKey: false });
    fireEvent.keyDown(document, { key: '?', code: 'Slash', shiftKey: true });

    expect(onFocusFilter).toHaveBeenCalledTimes(1);
    expect(onOpenVorfall).not.toHaveBeenCalled();
    expect(screen.getByText('Hilfe offen')).toBeInTheDocument();
  });

  it('dupliziert mod+k nicht im Eigenschutz-Hook', () => {
    const onFocusFilter = vi.fn();
    const onOpenGefaehrdung = vi.fn();
    const onOpenVorfall = vi.fn();

    render(<Harness onFocusFilter={onFocusFilter} onOpenGefaehrdung={onOpenGefaehrdung} onOpenVorfall={onOpenVorfall} />);

    const event = createEvent.keyDown(window, { key: 'k', metaKey: true });
    fireEvent(window, event);

    expect(event.defaultPrevented).toBe(false);
    expect(onFocusFilter).not.toHaveBeenCalled();
    expect(onOpenGefaehrdung).not.toHaveBeenCalled();
    expect(onOpenVorfall).not.toHaveBeenCalled();
    expect(screen.getByText('Hilfe zu')).toBeInTheDocument();
  });

  it('triggert N im Gefährdungs-Kontext', async () => {
    const user = userEvent.setup();
    const onOpenGefaehrdung = vi.fn();

    render(<Harness context="gefaehrdungen" onOpenGefaehrdung={onOpenGefaehrdung} />);

    await user.keyboard('n');

    expect(onOpenGefaehrdung).toHaveBeenCalledTimes(1);
  });

  it('schützt input, textarea, contenteditable und ARIA-Textfelder vor Einzelbuchstaben-Hotkeys', async () => {
    const user = userEvent.setup();
    const onFocusFilter = vi.fn();
    const onOpenGefaehrdung = vi.fn();
    const onOpenVorfall = vi.fn();

    render(<Harness onFocusFilter={onFocusFilter} onOpenGefaehrdung={onOpenGefaehrdung} onOpenVorfall={onOpenVorfall} />);

    for (const label of ['Textfeld', 'Notiz', 'ARIA-Textfeld', 'Editor']) {
      const target = screen.getByLabelText(label);
      await user.click(target);
      expect(document.activeElement, label).toBe(target);
      await user.keyboard('/nv?');
      expect(onFocusFilter, label).not.toHaveBeenCalled();
      expect(onOpenGefaehrdung, label).not.toHaveBeenCalled();
      expect(onOpenVorfall, label).not.toHaveBeenCalled();
      onFocusFilter.mockClear();
      onOpenGefaehrdung.mockClear();
      onOpenVorfall.mockClear();
    }
    expect(screen.getByText('Hilfe zu')).toBeInTheDocument();
  });

  it('blockiert konkurrierende globale Aktionen bei Overlay-Blocking', async () => {
    const user = userEvent.setup();
    const onFocusFilter = vi.fn();
    const onOpenGefaehrdung = vi.fn();
    const onOpenVorfall = vi.fn();

    render(<Harness blocked onFocusFilter={onFocusFilter} onOpenGefaehrdung={onOpenGefaehrdung} onOpenVorfall={onOpenVorfall} />);

    await user.keyboard('/nv?');

    expect(onFocusFilter).not.toHaveBeenCalled();
    expect(onOpenGefaehrdung).not.toHaveBeenCalled();
    expect(onOpenVorfall).not.toHaveBeenCalled();
    expect(screen.getByText('Hilfe zu')).toBeInTheDocument();
  });

  it('schließt die Shortcut-Hilfe mit Escape', async () => {
    const user = userEvent.setup();

    render(<Harness />);

    await user.keyboard('?');
    expect(screen.getByText('Hilfe offen')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByText('Hilfe zu')).toBeInTheDocument());
  });
});
