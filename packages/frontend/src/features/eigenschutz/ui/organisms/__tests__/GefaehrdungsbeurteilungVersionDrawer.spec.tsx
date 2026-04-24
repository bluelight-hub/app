import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GefaehrdungsbeurteilungHistorieEintrag } from '@bluelight-hub/shared/schemas';

/**
 * Spec für den `GefaehrdungsbeurteilungVersionDrawer` (Story 415-2-4,
 * Task 12, AC4, AC5, AC13).
 *
 * Der `GefaehrdungItemEditor` wird gemockt, damit der Test sich auf
 * das Drawer-Verhalten (A11y, Header-Text, Footer-Buttons, Close-Pfade)
 * konzentrieren kann. Die editorgleiche Read-Only-Shape wird über die
 * Prop-Weitergabe abgesichert; Details des Editors testen die eigene Spec.
 */

vi.mock('@/features/eigenschutz/ui/molecules/GefaehrdungItemEditor', () => ({
  GefaehrdungItemEditor: ({ readOnly, index }: { readOnly?: boolean; index?: number }) => (
    <div data-testid="gefaehrdung-item-editor-mock" data-readonly={readOnly ? 'true' : 'false'} data-index={index ?? -1} />
  ),
}));

import { GefaehrdungsbeurteilungVersionDrawer } from '../GefaehrdungsbeurteilungVersionDrawer';

function buildEntry(overrides: Partial<GefaehrdungsbeurteilungHistorieEintrag> = {}): GefaehrdungsbeurteilungHistorieEintrag {
  return {
    version: 2,
    gueltigVon: '2026-04-20T10:00:00.000Z',
    gueltigBis: '2026-04-22T10:00:00.000Z',
    changedByUserId: 'cluser00000000000000abc2',
    changedByUserName: 'Ute Muster',
    changedFields: { added: [], removed: [], updated: [{ id: 'x', fields: ['title'] }], unchanged: 1 },
    items: [
      {
        id: 'cl1item00000000000000000',
        title: 'Stolperstelle am Fahrzeugheck',
        description: 'Lose Ausrüstung im Zufahrtsbereich',
        eintritt: 'HAEUFIG',
        schaden: 'MITTEL',
        schutzmassnahmen: 'Bereich abräumen, Verkehrsleitkegel aufstellen.',
      },
    ],
    ...overrides,
  };
}

describe('GefaehrdungsbeurteilungVersionDrawer (Story 415-2-4 Task 12)', () => {
  it('rendert nichts, wenn `entry === null`', () => {
    render(<GefaehrdungsbeurteilungVersionDrawer entry={null} aggregateVersion={5} onClose={() => {}} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('version-drawer-panel')).not.toBeInTheDocument();
  });

  it('setzt `aria-readonly="true"` auf dem Panel und `aria-labelledby` auf den Header', () => {
    render(<GefaehrdungsbeurteilungVersionDrawer entry={buildEntry()} aggregateVersion={5} onClose={() => {}} />);

    const panel = screen.getByTestId('version-drawer-panel');
    expect(panel).toHaveAttribute('aria-readonly', 'true');

    const labelledBy = panel.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const title = document.getElementById(labelledBy as string);
    expect(title).not.toBeNull();
    expect(title).toHaveTextContent(/Version 2 von 5/);
  });

  it('rendert Historische-Version-Header „Version N von M — gültig … bis …" + nur „Schließen"-Button', () => {
    render(<GefaehrdungsbeurteilungVersionDrawer entry={buildEntry({ version: 2, gueltigBis: '2026-04-22T10:00:00.000Z' })} aggregateVersion={5} onClose={() => {}} />);

    const title = screen.getByTestId('version-drawer-title');
    expect(title).toHaveTextContent(/Version 2 von 5 — gültig/);
    // Zeitformat: „DD.MM. HH:mm" — pragmatisch per Regex.
    expect(title).toHaveTextContent(/\d{2}\.\d{2}\. \d{2}:\d{2}/);
    expect(title).toHaveTextContent(/bis \d{2}\.\d{2}\. \d{2}:\d{2}/);

    expect(screen.getByTestId('version-drawer-close')).toBeInTheDocument();
    expect(screen.queryByTestId('version-drawer-back-to-editor')).not.toBeInTheDocument();
  });

  it('rendert Aktuelle-Version-Header „Version N — aktuell" + beide Footer-Buttons', () => {
    render(<GefaehrdungsbeurteilungVersionDrawer entry={buildEntry({ version: 5, gueltigBis: null })} aggregateVersion={5} onClose={() => {}} />);

    const title = screen.getByTestId('version-drawer-title');
    expect(title).toHaveTextContent('Version 5 — aktuell');

    expect(screen.getByTestId('version-drawer-close')).toBeInTheDocument();
    expect(screen.getByTestId('version-drawer-back-to-editor')).toBeInTheDocument();
  });

  it('rendert den historischen Header korrekt, wenn `gueltigBis === null` aber keine aktuelle Version (z. B. inkonsistenter Backend-Stand — defensive)', () => {
    // `entry.version !== aggregateVersion` aber `gueltigBis === null`: wir
    // routen trotzdem über den historischen Header-Zweig, weil der Drawer
    // per Prop `aggregateVersion` entscheidet (Task-Spec: identisch zum AC).
    render(<GefaehrdungsbeurteilungVersionDrawer entry={buildEntry({ version: 3, gueltigBis: null })} aggregateVersion={5} onClose={() => {}} />);

    const title = screen.getByTestId('version-drawer-title');
    expect(title).toHaveTextContent(/Version 3 von 5 — gültig/);
    // `formatGueltigBis(null)` liefert „aktuell".
    expect(title).toHaveTextContent(/bis aktuell/);
  });

  it('ruft `onClose` bei Klick auf „Schließen" auf', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<GefaehrdungsbeurteilungVersionDrawer entry={buildEntry()} aggregateVersion={5} onClose={onClose} />);

    await user.click(screen.getByTestId('version-drawer-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ruft `onClose` bei Klick auf „Zurück zum Editor" auf (aktuelle Version)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<GefaehrdungsbeurteilungVersionDrawer entry={buildEntry({ version: 5, gueltigBis: null })} aggregateVersion={5} onClose={onClose} />);

    await user.click(screen.getByTestId('version-drawer-back-to-editor'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape schließt den Drawer (Headless-UI-default)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<GefaehrdungsbeurteilungVersionDrawer entry={buildEntry()} aggregateVersion={5} onClose={onClose} />);

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('rendert die editorgleiche Item-Shape im Read-Only-Modus', () => {
    render(<GefaehrdungsbeurteilungVersionDrawer entry={buildEntry()} aggregateVersion={5} onClose={() => {}} />);

    const itemEditor = screen.getByTestId('gefaehrdung-item-editor-mock');
    expect(itemEditor).toHaveAttribute('data-readonly', 'true');
    expect(itemEditor).toHaveAttribute('data-index', '0');
  });

  it('rendert einen Empty-Hinweis, wenn `entry.items` leer ist', () => {
    render(<GefaehrdungsbeurteilungVersionDrawer entry={buildEntry({ items: [] })} aggregateVersion={5} onClose={() => {}} />);

    expect(screen.getByTestId('version-drawer-empty-items')).toHaveTextContent(/enthält keine Gefährdungen/i);
  });
});
