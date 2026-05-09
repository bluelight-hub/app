/**
 * Spec für `GefaehrdungenEditorOrganism` (Story 2.2 Task 9).
 *
 * Fokus: Save-Flow mit expectedVersion, 409-Konflikt-Banner, Ctrl+S-
 * Shortcut und Reset-Verhalten.
 */

import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    updateMutation: {
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      error: null as unknown,
    },
    invalidate: vi.fn(),
    fetchQuery: vi.fn(),
    loadPendingCommands: vi.fn(),
    replayPendingCommands: vi.fn(),
    upsertPendingCommand: vi.fn(),
    removePendingCommandsForEntity: vi.fn(),
  },
}));

// Die Error-Klasse wird im Organism per `instanceof`-Check konsumiert
// (Story 2.3 AC13). Da der gesamte Queries-Modul gemockt wird, MUSS die
// Klasse auch im Mock exportiert werden — sonst wäre der Import `undefined`
// und `instanceof` im Organism immer `false`. Definition via `vi.hoisted`,
// damit die Klasse VOR dem hoisted `vi.mock`-Factory-Call verfügbar ist.
const { GefaehrdungsbeurteilungConflictError } = vi.hoisted(() => {
  class GefaehrdungsbeurteilungConflictError extends Error {
    readonly statusCode = 409;
    constructor(
      readonly currentVersion: number | undefined,
      readonly attemptedVersion: number | undefined,
      readonly originalError: unknown,
    ) {
      super('ConflictDetected:Gefaehrdungsbeurteilung');
      this.name = 'GefaehrdungsbeurteilungConflictError';
    }
  }
  return { GefaehrdungsbeurteilungConflictError };
});

vi.mock('@/features/eigenschutz/api/queries', () => ({
  EIGENSCHUTZ_QUERY_KEYS: {
    gefaehrdungsbeurteilung: (einsatzId: string, id: string) => ['eigenschutz', einsatzId, 'beurteilungen', id],
  },
  useUpdateGefaehrdungsbeurteilungItems: () => mocks.updateMutation,
  fetchGefaehrdungsbeurteilung: vi.fn(),
  GefaehrdungsbeurteilungConflictError,
}));

vi.mock('@/features/eigenschutz/lib/pending-command-queue', () => ({
  loadPendingCommands: mocks.loadPendingCommands,
  replayPendingCommands: mocks.replayPendingCommands,
  upsertPendingCommand: mocks.upsertPendingCommand,
  removePendingCommandsForEntity: mocks.removePendingCommandsForEntity,
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({
      fetchQuery: mocks.fetchQuery,
      invalidateQueries: mocks.invalidate,
    }),
  };
});

import { GefaehrdungenEditorOrganism } from '../GefaehrdungenEditorOrganism';

function buildBeurteilung(overrides: Partial<Parameters<typeof GefaehrdungenEditorOrganism>[0]['beurteilung']> = {}) {
  return {
    id: 'cl1beurteilungiddetailxx1',
    einsatzId: 'cl1einsatzidxxxxxxxxxxxx',
    einheitId: 'cl1einheitidxxxxxxxxxxxx',
    vorlageId: undefined,
    gefahrenzoneId: undefined,
    items: [{ title: 'Strom' }],
    version: 3,
    erstelltAm: '2026-04-22T08:00:00.000Z',
    erstelltVonUserId: 'user-1',
    aktualisiertAm: '2026-04-22T09:00:00.000Z',
    aktualisiertVonUserId: 'user-1',
    ...overrides,
  } as Parameters<typeof GefaehrdungenEditorOrganism>[0]['beurteilung'];
}

describe('GefaehrdungenEditorOrganism (Story 2.2 Task 9)', () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    mocks.updateMutation.mutate = vi.fn();
    mocks.updateMutation.mutateAsync = vi.fn();
    mocks.updateMutation.mutateAsync.mockResolvedValue(buildBeurteilung({ version: 4, items: [{ title: 'Strom neu' }] }));
    mocks.updateMutation.isPending = false;
    mocks.updateMutation.error = null;
    mocks.invalidate.mockReset();
    mocks.fetchQuery.mockReset();
    mocks.loadPendingCommands.mockReset();
    mocks.loadPendingCommands.mockResolvedValue([]);
    mocks.replayPendingCommands.mockReset();
    mocks.replayPendingCommands.mockResolvedValue(undefined);
    mocks.upsertPendingCommand.mockReset();
    mocks.removePendingCommandsForEntity.mockReset();
  });

  it('ruft die Mutation mit items und expectedVersion bei Klick auf „Version abschließen" auf', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

    await user.clear(screen.getByTestId('gefaehrdung-item-title'));
    await user.type(screen.getByTestId('gefaehrdung-item-title'), 'Strom neu');
    await user.click(screen.getByTestId('gefaehrdungen-editor-save'));

    expect(mocks.updateMutation.mutateAsync).toHaveBeenCalledWith({
      items: [{ title: 'Strom neu' }],
      expectedVersion: 3,
    });
  });

  it('auto-speichert nach 2 Sekunden Inaktivität', async () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

      fireEvent.change(screen.getByTestId('gefaehrdung-item-title'), {
        target: { value: 'Strom neu' },
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect(mocks.updateMutation.mutateAsync).toHaveBeenCalledWith({
        items: [{ title: 'Strom neu' }],
        expectedVersion: 3,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('komprimiert kontinuierliches Tippen auf einen Auto-Save mit letztem Draft', async () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

      fireEvent.change(screen.getByTestId('gefaehrdung-item-title'), {
        target: { value: 'S' },
      });
      fireEvent.change(screen.getByTestId('gefaehrdung-item-title'), {
        target: { value: 'St' },
      });
      fireEvent.change(screen.getByTestId('gefaehrdung-item-title'), {
        target: { value: 'Strom neu' },
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1999);
      });
      expect(mocks.updateMutation.mutateAsync).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });

      expect(mocks.updateMutation.mutateAsync).toHaveBeenCalledTimes(1);
      expect(mocks.updateMutation.mutateAsync).toHaveBeenCalledWith({
        items: [{ title: 'Strom neu' }],
        expectedVersion: 3,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('replayt Pending Commands der aktuellen Beurteilung beim Online-Start', async () => {
    const pendingCommand = {
      schemaVersion: 1,
      id: 'cmd-1',
      entityType: 'gefaehrdungsbeurteilung',
      einsatzId: 'einsatz-1',
      entityId: 'cl1beurteilungiddetailxx1',
      expectedVersion: 3,
      payload: { items: [{ title: 'Replay' }] },
      queuedAt: '2026-04-24T10:00:00.000Z',
      updatedAt: '2026-04-24T10:00:00.000Z',
      source: 'auto-save',
      status: 'pending',
    };
    mocks.loadPendingCommands.mockResolvedValueOnce([pendingCommand]).mockResolvedValueOnce([]);
    mocks.replayPendingCommands.mockImplementation(async (options) => {
      await options.saveCommand(pendingCommand);
    });
    mocks.updateMutation.mutateAsync.mockResolvedValue(buildBeurteilung({ version: 4, items: [{ title: 'Replay' }] }));

    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

    await waitFor(() => expect(mocks.replayPendingCommands).toHaveBeenCalled());
    expect(mocks.updateMutation.mutateAsync).toHaveBeenCalledWith({
      items: [{ title: 'Replay' }],
      expectedVersion: 3,
    });
  });

  it('wertet eigene optimistic Updates mit identischem Draft nicht als Serverkonflikt', () => {
    const { rerender } = renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

    fireEvent.change(screen.getByTestId('gefaehrdung-item-title'), {
      target: { value: 'Strom neu' },
    });
    rerender(
      <GefaehrdungenEditorOrganism
        einsatzId="einsatz-1"
        beurteilung={buildBeurteilung({
          version: 4,
          items: [{ title: 'Strom neu' }],
        })}
      />,
    );

    expect(screen.queryByTestId('gefaehrdungen-editor-conflict-banner')).toBeNull();
  });

  it('zeigt Statuszeile und ersetzt Speichern durch Version abschließen', () => {
    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

    expect(screen.getByTestId('sync-status-badge')).toHaveTextContent('Synchronisiert');
    expect(screen.getByRole('button', { name: /Version abschließen/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Speichern$/ })).toBeNull();
  });

  it('rendert Konflikt-Banner bei 409 inkl. Reload-Button', async () => {
    const user = userEvent.setup();
    mocks.updateMutation.error = { response: { status: 409 } };

    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

    const banner = screen.getByTestId('gefaehrdungen-editor-conflict-banner');
    expect(banner).toHaveTextContent(/Jemand anders hat bereits Änderungen gespeichert/);

    // Reload-Button liegt im SeverityBanner (Review-Patch DN1) — per accessible
    // Name statt spezifischem test-id suchen, damit der Test robust gegen
    // UI-Refactorings bleibt.
    await user.click(screen.getByRole('button', { name: 'Neu laden' }));
    expect(mocks.invalidate).toHaveBeenCalledWith({
      queryKey: ['eigenschutz', 'einsatz-1', 'beurteilungen', 'cl1beurteilungiddetailxx1'],
    });
  });

  it('versteckt Konflikt-Banner wenn kein 409-Error vorliegt', () => {
    mocks.updateMutation.error = { response: { status: 500 } };
    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

    expect(screen.queryByTestId('gefaehrdungen-editor-conflict-banner')).toBeNull();
  });

  it('(Story 2.3 AC13) rendert dynamischen Banner-Text mit currentVersion aus GefaehrdungsbeurteilungConflictError', () => {
    mocks.updateMutation.error = new GefaehrdungsbeurteilungConflictError(5, 3, { response: { status: 409 } });
    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

    const banner = screen.getByTestId('gefaehrdungen-editor-conflict-banner');
    expect(banner).toHaveTextContent('Version 5 wurde bereits von jemand anderem gespeichert. Lade die aktuelle Version neu, um fortzufahren.');
  });

  it('(Story 2.3 AC13) fallbackt auf generischen Banner-Text, wenn currentVersion undefined ist (Alt-Backend)', () => {
    mocks.updateMutation.error = new GefaehrdungsbeurteilungConflictError(undefined, 3, { response: { status: 409 } });
    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

    const banner = screen.getByTestId('gefaehrdungen-editor-conflict-banner');
    expect(banner).toHaveTextContent(/Jemand anders hat bereits Änderungen gespeichert/);
  });

  it('Ctrl+S triggert Save (UX-DR22)', () => {
    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

    fireEvent.change(screen.getByTestId('gefaehrdung-item-title'), {
      target: { value: 'Strom neu' },
    });
    fireEvent.keyDown(document, { key: 's', ctrlKey: true });

    expect(mocks.updateMutation.mutateAsync).toHaveBeenCalledWith({
      items: [{ title: 'Strom neu' }],
      expectedVersion: 3,
    });
  });

  it('Cmd+S triggert Save auf macOS', () => {
    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

    fireEvent.change(screen.getByTestId('gefaehrdung-item-title'), {
      target: { value: 'Strom neu' },
    });
    fireEvent.keyDown(document, { key: 's', metaKey: true });

    expect(mocks.updateMutation.mutateAsync).toHaveBeenCalled();
  });

  it('Speichern ist disabled, wenn ein Item ungültig ist (leerer Titel)', () => {
    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung({ items: [{ title: '' }] })} />);

    const saveBtn = screen.getByTestId('gefaehrdungen-editor-save');
    expect(saveBtn).toBeDisabled();
  });

  it('fügt ein neues Item hinzu, wenn „Gefährdung hinzufügen" geklickt wird', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung({ items: [] })} />);

    await user.click(screen.getByTestId('gefaehrdungen-editor-add'));

    expect(screen.getAllByTestId('gefaehrdung-item-editor')).toHaveLength(1);
  });

  it('scrollt und fokussiert ein vorhandenes focusItem', () => {
    renderWithProviders(
      <GefaehrdungenEditorOrganism
        einsatzId="einsatz-1"
        focusItem="item-b"
        beurteilung={buildBeurteilung({
          items: [
            { id: 'item-a', title: 'Strom' },
            { id: 'item-b', title: 'Rauch' },
          ],
        })}
      />,
    );

    expect(document.querySelector('[data-focus-target="true"]')).toBeInTheDocument();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getAllByTestId('gefaehrdung-item-title')[1]).toHaveFocus();
  });

  it('zeigt einen Inline-Hinweis, wenn ein focusItem fehlt', () => {
    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" focusItem="item-fehlt" beurteilung={buildBeurteilung()} />);

    expect(screen.getByTestId('gefaehrdungen-editor-focus-missing')).toHaveTextContent('Gefährdung nicht gefunden');
  });

  it('Abbrechen setzt lokale Items auf beurteilung.items zurück', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

    // Eine weitere Gefährdung ergänzen …
    await user.click(screen.getByTestId('gefaehrdungen-editor-add'));
    expect(screen.getAllByTestId('gefaehrdung-item-editor')).toHaveLength(2);

    // … und zurücksetzen.
    await user.click(screen.getByTestId('gefaehrdungen-editor-reset'));
    expect(screen.getAllByTestId('gefaehrdung-item-editor')).toHaveLength(1);
    expect(mocks.removePendingCommandsForEntity).toHaveBeenCalledWith('gefaehrdungsbeurteilung', 'cl1beurteilungiddetailxx1');
  });
});
