/**
 * Spec für `SicherungspostenList` (Story 4.1, T6).
 *
 * Schwerpunkte:
 * - Tab-Switch lädt die Liste mit korrektem Status-Filter.
 * - Empty-State pro Tab.
 * - Edit-/Auflösen-Aktionen werden nur im AKTIV-Tab gerendert.
 * - „+ Sicherungsposten" nur im AKTIV-Tab sichtbar.
 */

import { renderWithProviders } from '@/test/utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listMock, navigateMock } = vi.hoisted(() => ({
  listMock: { current: vi.fn() },
  navigateMock: { current: vi.fn() },
}));

vi.mock('../../../api/use-sicherungsposten', () => ({
  useListSicherungsposten: (einsatzId: string, status: 'AKTIV' | 'AUFGELOEST') => listMock.current(einsatzId, status),
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => navigateMock.current,
  };
});

import { SicherungspostenList } from '../SicherungspostenList';

const POSTEN_AKTIV = {
  id: 'posten-1',
  einsatzId: 'einsatz-1',
  bezeichnung: 'Eingang Hörsaal C',
  standort: { kind: 'address', text: 'Hörsaal C' },
  personal: [{ kind: 'freitext', name: 'Max Müller' }],
  version: 2,
  erstelltAm: '2026-05-01T10:00:00.000Z',
  erstelltVonUserId: 'user-1',
  aktualisiertAm: '2026-05-01T10:00:00.000Z',
  aktualisiertVonUserId: 'user-1',
};

const POSTEN_AUFGELOEST = {
  ...POSTEN_AKTIV,
  id: 'posten-2',
  bezeichnung: 'Notausgang Süd',
  aufgeloestAm: '2026-05-02T10:00:00.000Z',
};

beforeEach(() => {
  listMock.current = vi.fn((_einsatzId: string, status: 'AKTIV' | 'AUFGELOEST') => {
    if (status === 'AKTIV') return { data: [POSTEN_AKTIV], isPending: false, isError: false };
    return { data: [POSTEN_AUFGELOEST], isPending: false, isError: false };
  });
  navigateMock.current = vi.fn();
});

function setup() {
  const onEdit = vi.fn();
  const onAufloesen = vi.fn();
  const onCreate = vi.fn();
  renderWithProviders(<SicherungspostenList einsatzId="einsatz-1" onEdit={onEdit} onAufloesen={onAufloesen} onCreate={onCreate} />);
  return { onEdit, onAufloesen, onCreate };
}

describe('SicherungspostenList', () => {
  it('rendert die AKTIV-Liste initial mit Tab und Tabelle', () => {
    setup();
    expect(screen.getByTestId('sicherungsposten-list')).toBeInTheDocument();
    expect(screen.getByTestId('sicherungsposten-tab-aktiv')).toBeInTheDocument();
    expect(screen.getByTestId('sicherungsposten-tab-aufgeloest')).toBeInTheDocument();
    expect(screen.getByTestId(`sicherungsposten-row-${POSTEN_AKTIV.id}`)).toBeInTheDocument();
  });

  it('zeigt Empty-State wenn keine aktiven Posten existieren', () => {
    listMock.current = vi.fn(() => ({ data: [], isPending: false, isError: false }));
    setup();
    expect(screen.getByTestId('sicherungsposten-empty')).toBeInTheDocument();
  });

  it('Edit-Button im AKTIV-Tab triggert onEdit-Callback mit dem Posten', async () => {
    const user = userEvent.setup();
    const { onEdit } = setup();
    await user.click(screen.getByTestId(`sicherungsposten-edit-${POSTEN_AKTIV.id}`));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: POSTEN_AKTIV.id }));
  });

  it('Auflösen-Button im AKTIV-Tab triggert onAufloesen-Callback', async () => {
    const user = userEvent.setup();
    const { onAufloesen } = setup();
    await user.click(screen.getByTestId(`sicherungsposten-aufloesen-${POSTEN_AKTIV.id}`));
    expect(onAufloesen).toHaveBeenCalledWith(expect.objectContaining({ id: POSTEN_AKTIV.id }));
  });

  it('Create-Button ist nur im AKTIV-Tab sichtbar, nicht im AUFGELOEST-Tab', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByTestId('sicherungsposten-create-button')).toBeInTheDocument();

    await user.click(screen.getByTestId('sicherungsposten-tab-aufgeloest'));
    await waitFor(() => {
      expect(screen.queryByTestId('sicherungsposten-create-button')).not.toBeInTheDocument();
    });
  });

  it('zeigt im AUFGELOEST-Tab keine Edit-Buttons', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByTestId('sicherungsposten-tab-aufgeloest'));
    await waitFor(() => {
      expect(screen.queryByTestId(`sicherungsposten-edit-${POSTEN_AUFGELOEST.id}`)).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId(`sicherungsposten-aufloesen-${POSTEN_AUFGELOEST.id}`)).not.toBeInTheDocument();
  });

  describe('„Auf Karte zeigen"-Button (Story 4.4 T6, AC6+AC9)', () => {
    it('rendert den Button im AKTIV-Tab für coordinate-Posten und navigiert mit focus-Search', async () => {
      const POSTEN_COORD = {
        ...POSTEN_AKTIV,
        id: 'posten-coord',
        standort: { kind: 'coordinate', longitude: 10.5, latitude: 51.2 },
      };
      listMock.current = vi.fn(() => ({ data: [POSTEN_COORD], isPending: false, isError: false }));
      const user = userEvent.setup();
      setup();
      const button = screen.getByTestId(`sicherungsposten-show-on-map-${POSTEN_COORD.id}`);
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();

      await user.click(button);
      expect(navigateMock.current).toHaveBeenCalledTimes(1);
      const arg = navigateMock.current.mock.calls[0][0];
      expect(arg.to).toBe('/app/einsatz/$einsatzId/übersicht/karte');
      expect(arg.params).toEqual({ einsatzId: 'einsatz-1' });
      // search ist eine Updater-Function — auf prev anwenden und prüfen, dass focus gesetzt ist.
      expect(arg.search({ existing: 'value' })).toEqual({ existing: 'value', focus: `sicherungsposten:${POSTEN_COORD.id}` });
    });

    it('ist disabled für Address-only-Posten und triggert keine Navigation (AC9)', async () => {
      // POSTEN_AKTIV hat standort.kind === 'address' — disabled erwartet.
      const user = userEvent.setup();
      setup();
      const button = screen.getByTestId(`sicherungsposten-show-on-map-${POSTEN_AKTIV.id}`);
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('title', expect.stringContaining('Kein Standort hinterlegt'));

      await user.click(button);
      expect(navigateMock.current).not.toHaveBeenCalled();
    });
  });
});
