import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GefaehrdungsbeurteilungHistorieEintrag } from '@bluelight-hub/shared/schemas';
import { VersionTimestampFooter } from '../../molecules/VersionTimestampFooter';

/**
 * Spec für den `GefaehrdungsbeurteilungHistoriePopover` (Story 415-2-4,
 * Task 11, AC2, AC12).
 *
 * Teststrategie:
 * - Der Hook `useGefaehrdungsbeurteilungHistorie` wird auf Feature-Ebene
 *   gemockt (gleiches Pattern wie `GefaehrdungseditorDrawer.spec.tsx`).
 * - Pro Test setzen wir den Hook-Return über `mocks.historieState`.
 * - Popover-Rendering passiert lazy: wir öffnen den Popover via Klick auf
 *   den Trigger, damit die `HistorieList`-Komponente gemountet wird.
 */

const { mocks } = vi.hoisted(() => ({
  mocks: {
    historieState: {
      data: undefined as unknown,
      isPending: false,
      isError: false,
      error: null as unknown,
      isSuccess: false,
    },
  },
}));

vi.mock('@/features/eigenschutz/api/queries', () => ({
  useGefaehrdungsbeurteilungHistorie: () => mocks.historieState,
}));

import { GefaehrdungsbeurteilungHistoriePopover } from '../GefaehrdungsbeurteilungHistoriePopover';

function buildEntry(version: number, overrides: Partial<GefaehrdungsbeurteilungHistorieEintrag> = {}): GefaehrdungsbeurteilungHistorieEintrag {
  return {
    version,
    gueltigVon: `2026-04-2${version}T10:00:00.000Z`,
    gueltigBis: null,
    changedByUserId: `cluser000000000000000abc${version}`,
    changedByUserName: `Ute Muster ${version}`,
    changedFields: { created: true },
    items: [],
    ...overrides,
  };
}

/**
 * Rendert den Popover mit einem einfachen Button-Trigger und öffnet ihn.
 * Liefert das user-event-Objekt sowie den gerenderten Trigger zurück.
 */
async function renderAndOpen(props: Partial<React.ComponentProps<typeof GefaehrdungsbeurteilungHistoriePopover>> = {}) {
  const user = userEvent.setup();
  const onSelectVersion = vi.fn();
  render(
    <GefaehrdungsbeurteilungHistoriePopover
      einsatzId="einsatz-1"
      gefaehrdungsbeurteilungId="cl1beurteilungidpopover0"
      popoverId="historie-popover-test"
      trigger={<button type="button">Verlauf öffnen</button>}
      onSelectVersion={onSelectVersion}
      {...props}
    />,
  );

  const triggerWrapper = screen.getByTestId('historie-popover-trigger');
  await user.click(triggerWrapper);

  return { user, onSelectVersion };
}

describe('GefaehrdungsbeurteilungHistoriePopover (Story 415-2-4 Task 11)', () => {
  beforeEach(() => {
    mocks.historieState = {
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
    };
  });

  it('rendert Loading-Skeleton, wenn der Hook `isPending: true` liefert', async () => {
    mocks.historieState.isPending = true;

    await renderAndOpen();

    expect(await screen.findByTestId('historie-popover-loading')).toBeInTheDocument();
  });

  it('rendert `role="alert"`-Fehler, wenn der Hook `isError: true` liefert (Zero-Toast UX-DR21)', async () => {
    mocks.historieState.isError = true;
    mocks.historieState.error = new Error('boom');

    await renderAndOpen();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/historie konnte nicht geladen werden/i);
  });

  it('rendert den Empty-Defensive-Zustand, wenn `eintraege` leer ist', async () => {
    mocks.historieState.data = { aggregateVersion: 1, eintraege: [] };
    mocks.historieState.isSuccess = true;

    await renderAndOpen();

    expect(await screen.findByTestId('historie-popover-empty')).toHaveTextContent(/keine versionen verfügbar/i);
  });

  it('rendert alle 3 Einträge mit Versionsnummer, Zeitstempel, Name und Stichwort', async () => {
    mocks.historieState.data = {
      aggregateVersion: 3,
      eintraege: [
        buildEntry(3, { gueltigBis: null, changedFields: { added: ['x'], removed: [], updated: [], unchanged: 2 } }),
        buildEntry(2, { gueltigBis: '2026-04-23T10:00:00.000Z', changedFields: { added: [], removed: [], updated: [{ id: 'y', fields: ['title'] }], unchanged: 1 } }),
        buildEntry(1, { gueltigBis: '2026-04-22T10:00:00.000Z', changedFields: { created: true } }),
      ],
    };
    mocks.historieState.isSuccess = true;

    await renderAndOpen();

    const list = await screen.findByTestId('historie-popover-list');
    const options = within(list).getAllByRole('option');
    expect(options).toHaveLength(3);

    // Zeile V3: aktuelle Version, hinzugefügte Gefährdung.
    expect(options[0]).toHaveTextContent('V3');
    expect(options[0]).toHaveTextContent(/1 Gefährdung hinzugefügt/);
    expect(options[0]).toHaveTextContent(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/);
    expect(options[0]).toHaveTextContent('Ute Muster 3');

    // Zeile V2: updated-Summary.
    expect(options[1]).toHaveTextContent('V2');
    expect(options[1]).toHaveTextContent(/1 Gefährdung geändert/);

    // Zeile V1: Angelegt.
    expect(options[2]).toHaveTextContent('V1');
    expect(options[2]).toHaveTextContent(/Angelegt/);
  });

  it('markiert die aktuelle Version (`gueltigBis === null`) mit `aria-current="true"`', async () => {
    mocks.historieState.data = {
      aggregateVersion: 2,
      eintraege: [buildEntry(2, { gueltigBis: null }), buildEntry(1, { gueltigBis: '2026-04-22T10:00:00.000Z' })],
    };
    mocks.historieState.isSuccess = true;

    await renderAndOpen();

    const list = await screen.findByTestId('historie-popover-list');
    const options = within(list).getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-current', 'true');
    expect(options[1]).not.toHaveAttribute('aria-current');
  });

  it('ruft `onSelectVersion(entry)` bei Klick auf eine Zeile auf', async () => {
    const entry2 = buildEntry(2, { gueltigBis: '2026-04-22T10:00:00.000Z' });
    mocks.historieState.data = {
      aggregateVersion: 3,
      eintraege: [buildEntry(3), entry2, buildEntry(1, { gueltigBis: '2026-04-21T10:00:00.000Z' })],
    };
    mocks.historieState.isSuccess = true;

    const { user, onSelectVersion } = await renderAndOpen();

    const option = await screen.findByTestId('historie-popover-option-2');
    await user.click(option);

    expect(onSelectVersion).toHaveBeenCalledTimes(1);
    expect(onSelectVersion).toHaveBeenCalledWith(entry2);
  });

  it('ArrowDown + Enter ruft `onSelectVersion` für den fokussierten Eintrag auf', async () => {
    const entry3 = buildEntry(3, { gueltigBis: null });
    const entry2 = buildEntry(2, { gueltigBis: '2026-04-22T10:00:00.000Z' });
    const entry1 = buildEntry(1, { gueltigBis: '2026-04-21T10:00:00.000Z' });
    mocks.historieState.data = {
      aggregateVersion: 3,
      eintraege: [entry3, entry2, entry1],
    };
    mocks.historieState.isSuccess = true;

    const { user, onSelectVersion } = await renderAndOpen();

    const firstOption = await screen.findByTestId('historie-popover-option-3');
    await waitFor(() => {
      expect(firstOption).toHaveFocus();
    });

    // Zwei ArrowDowns → Index 2 (Eintrag V1).
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onSelectVersion).toHaveBeenCalledTimes(1);
    expect(onSelectVersion).toHaveBeenCalledWith(entry1);
  });

  it('Escape schließt den Popover (Headless-UI-default)', async () => {
    mocks.historieState.data = {
      aggregateVersion: 1,
      eintraege: [buildEntry(1)],
    };
    mocks.historieState.isSuccess = true;

    const { user } = await renderAndOpen();

    // Panel ist sichtbar — beim Ursprung-Check verifizieren wir die listbox.
    expect(await screen.findByTestId('historie-popover-list')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    // Nach Escape verschwindet die listbox — Headless-UI unmount-t den Panel.
    await waitFor(() => {
      expect(screen.queryByTestId('historie-popover-list')).not.toBeInTheDocument();
    });
  });

  it('verdrahtet Footer-ARIA mit offenem Zustand und Panel-ID', async () => {
    mocks.historieState.data = {
      aggregateVersion: 1,
      eintraege: [buildEntry(1)],
    };
    mocks.historieState.isSuccess = true;

    const user = userEvent.setup();
    render(
      <GefaehrdungsbeurteilungHistoriePopover
        einsatzId="einsatz-1"
        gefaehrdungsbeurteilungId="cl1beurteilungidpopover0"
        popoverId="historie-popover-footer"
        trigger={<VersionTimestampFooter aktualisiertAm="2026-04-21T10:00:00.000Z" aktualisiertVonUserId="cluser12345678" version={1} popoverId="historie-popover-footer" />}
        onSelectVersion={vi.fn()}
      />,
    );

    const footer = screen.getByTestId('version-timestamp-footer');
    expect(footer).toHaveAttribute('aria-expanded', 'false');
    expect(footer).toHaveAttribute('aria-controls', 'historie-popover-footer');

    await user.click(footer);

    expect(await screen.findByTestId('historie-popover-panel')).toHaveAttribute('id', 'historie-popover-footer');
    expect(screen.getByTestId('version-timestamp-footer')).toHaveAttribute('aria-expanded', 'true');
  });
});
