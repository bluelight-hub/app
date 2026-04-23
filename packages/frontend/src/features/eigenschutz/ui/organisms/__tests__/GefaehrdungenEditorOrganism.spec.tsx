/**
 * Spec für `GefaehrdungenEditorOrganism` (Story 2.2 Task 9).
 *
 * Fokus: Save-Flow mit expectedVersion, 409-Konflikt-Banner, Ctrl+S-
 * Shortcut, Permission-Gate mit Tooltip, und Reset-Verhalten.
 */

import { renderWithProviders } from '@/test/utils';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    updateMutation: {
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      error: null as unknown,
    },
    permissionState: {
      canCreateGefaehrdungsbeurteilung: true,
      isLoading: false,
      requiredPermission: 'eigenschutz:gefaehrdungsbeurteilung:write' as const,
    },
    invalidate: vi.fn(),
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
  GefaehrdungsbeurteilungConflictError,
}));

vi.mock('@/features/eigenschutz/hooks/useEigenschutzPermissions', () => ({
  useEigenschutzPermissions: () => mocks.permissionState,
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
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
    mocks.updateMutation.mutate = vi.fn();
    mocks.updateMutation.mutateAsync = vi.fn();
    mocks.updateMutation.isPending = false;
    mocks.updateMutation.error = null;
    mocks.permissionState.canCreateGefaehrdungsbeurteilung = true;
    mocks.permissionState.isLoading = false;
    mocks.invalidate.mockReset();
  });

  it('ruft die Mutation mit items und expectedVersion bei Klick auf Speichern auf', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

    await user.click(screen.getByTestId('gefaehrdungen-editor-save'));

    expect(mocks.updateMutation.mutate).toHaveBeenCalledWith({
      items: [{ title: 'Strom' }],
      expectedVersion: 3,
    });
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

    fireEvent.keyDown(document, { key: 's', ctrlKey: true });

    expect(mocks.updateMutation.mutate).toHaveBeenCalledWith({
      items: [{ title: 'Strom' }],
      expectedVersion: 3,
    });
  });

  it('Cmd+S triggert Save auf macOS', () => {
    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

    fireEvent.keyDown(document, { key: 's', metaKey: true });

    expect(mocks.updateMutation.mutate).toHaveBeenCalled();
  });

  it('Speichern ist disabled ohne Permission inkl. aria-disabled + Tooltip', () => {
    mocks.permissionState.canCreateGefaehrdungsbeurteilung = false;
    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

    const saveBtn = screen.getByTestId('gefaehrdungen-editor-save');
    expect(saveBtn).toBeDisabled();
    expect(saveBtn).toHaveAttribute('aria-disabled', 'true');
    expect(saveBtn).toHaveAttribute('title', 'Fehlende Berechtigung: eigenschutz:gefaehrdungsbeurteilung:write');
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

  it('Abbrechen setzt lokale Items auf beurteilung.items zurück', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungenEditorOrganism einsatzId="einsatz-1" beurteilung={buildBeurteilung()} />);

    // Eine weitere Gefährdung ergänzen …
    await user.click(screen.getByTestId('gefaehrdungen-editor-add'));
    expect(screen.getAllByTestId('gefaehrdung-item-editor')).toHaveLength(2);

    // … und zurücksetzen.
    await user.click(screen.getByTestId('gefaehrdungen-editor-reset'));
    expect(screen.getAllByTestId('gefaehrdung-item-editor')).toHaveLength(1);
  });
});
