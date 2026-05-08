/**
 * Spec für `GefaehrdungenDetailPage` (Story 2.2 Task 9 + Story 2.4 Task 14).
 *
 * Fokus: Loading-Skeleton, Fehler-Banner mit Retry, Success-Rendering des
 * Editor-Organism plus der Story-2.4-Footer+Popover+Drawer-Verdrahtung.
 * Die Organism-Interna werden hier bewusst gestubbt — sie haben ihre
 * eigene Spec.
 */

import { renderWithProviders } from '@/test/utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    detailQuery: {
      data: undefined as unknown,
      isPending: true,
      isError: false,
      refetch: vi.fn(),
    },
    einheitenQuery: {
      data: [] as Array<{ id: string; name: string }>,
      isPending: false,
    },
    historieCallbacks: {
      lastOnSelect: null as ((entry: { version: number; changedByUserId: string; changedByUserName: string | null }) => void) | null,
    },
  },
}));

vi.mock('@/features/eigenschutz/api/queries', () => ({
  useGefaehrdungsbeurteilung: () => mocks.detailQuery,
}));

vi.mock('@/features/kraefte/api', () => ({
  useEinsatzEinheiten: () => mocks.einheitenQuery,
}));

vi.mock('../../organisms/GefaehrdungenEditorOrganism', () => ({
  GefaehrdungenEditorOrganism: ({ einsatzId, beurteilung, focusItem }: { einsatzId: string; beurteilung: { id: string; version: number }; focusItem?: string }) => (
    <div data-testid="editor-organism-stub" data-focus-item={focusItem ?? ''}>
      editor:{einsatzId}:{beurteilung.id}:v{beurteilung.version}
    </div>
  ),
}));

// Popover-Stub: Der Trigger wird unverändert gerendert, damit der Footer-Button
// im DOM testbar bleibt. `onSelectVersion` wird in einem ref gecacht, sodass
// der Drawer-Flow-Test einen History-Eintrag simulieren kann.
vi.mock('../../organisms/GefaehrdungsbeurteilungHistoriePopover', () => ({
  GefaehrdungsbeurteilungHistoriePopover: ({
    einsatzId,
    gefaehrdungsbeurteilungId,
    popoverId,
    trigger,
    onSelectVersion,
  }: {
    einsatzId: string;
    gefaehrdungsbeurteilungId: string;
    popoverId: string;
    trigger: React.ReactElement;
    onSelectVersion: (entry: { version: number; changedByUserId: string; changedByUserName: string | null }) => void;
  }) => {
    mocks.historieCallbacks.lastOnSelect = onSelectVersion;
    return (
      <div data-testid="historie-popover-stub" data-einsatz={einsatzId} data-beurteilung={gefaehrdungsbeurteilungId} data-popover-id={popoverId}>
        {trigger}
      </div>
    );
  },
}));

// Drawer-Stub: rendert nur, wenn ein Entry gesetzt ist — genau wie das Original.
vi.mock('../../organisms/GefaehrdungsbeurteilungVersionDrawer', () => ({
  GefaehrdungsbeurteilungVersionDrawer: ({ entry, aggregateVersion, onClose }: { entry: { version: number } | null; aggregateVersion: number; onClose: () => void }) => {
    if (!entry) return null;
    return (
      <div data-testid="version-drawer-stub" data-version={entry.version} data-aggregate={aggregateVersion}>
        <button type="button" onClick={onClose} data-testid="version-drawer-close-stub">
          close
        </button>
      </div>
    );
  },
}));

import { GefaehrdungenDetailPage } from '../GefaehrdungenDetailPage';

describe('GefaehrdungenDetailPage (Story 2.2 Task 9)', () => {
  beforeEach(() => {
    mocks.detailQuery.data = undefined;
    mocks.detailQuery.isPending = true;
    mocks.detailQuery.isError = false;
    mocks.detailQuery.refetch = vi.fn();
    mocks.einheitenQuery.data = [];
    mocks.einheitenQuery.isPending = false;
    mocks.historieCallbacks.lastOnSelect = null;
  });

  it('rendert Skeleton während Loading', () => {
    renderWithProviders(<GefaehrdungenDetailPage einsatzId="einsatz-1" id="b-1" />);

    expect(screen.getByTestId('gefaehrdungen-detail-skeleton')).toBeInTheDocument();
  });

  it('rendert Fehler-Banner mit Retry-Button bei Query-Error', async () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.isError = true;
    const refetch = vi.fn();
    mocks.detailQuery.refetch = refetch;

    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungenDetailPage einsatzId="einsatz-1" id="b-1" />);

    const alert = screen.getByTestId('gefaehrdungen-detail-error');
    expect(alert).toHaveTextContent(/konnte nicht geladen werden/);

    await user.click(screen.getByTestId('gefaehrdungen-detail-retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('rendert Heading + Version-Badge + Editor-Organism bei Success', () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.isError = false;
    mocks.detailQuery.data = {
      id: 'cl1beurteilungiddetailxx1',
      einsatzId: 'cl1einsatzidxxxxxxxxxxxx',
      einheitId: 'cl1einheitidxxxxxxxxxxxx',
      items: [],
      version: 7,
      erstelltAm: '2026-04-22T00:00:00Z',
      erstelltVonUserId: 'u',
      aktualisiertAm: '2026-04-22T00:00:00Z',
      aktualisiertVonUserId: 'u',
    };
    mocks.einheitenQuery.data = [{ id: 'cl1einheitidxxxxxxxxxxxx', name: 'Rettungstrupp 1' }];

    renderWithProviders(<GefaehrdungenDetailPage einsatzId="einsatz-1" id="cl1beurteilungiddetailxx1" />);

    expect(screen.getByRole('heading', { level: 1, name: /Gefährdungsbeurteilung/ })).toBeInTheDocument();
    expect(screen.getByText('Rettungstrupp 1')).toBeInTheDocument();
    expect(screen.getByTestId('gefaehrdungen-detail-version-badge')).toHaveTextContent('Version 7');
    expect(screen.getByTestId('editor-organism-stub')).toHaveTextContent('editor:einsatz-1:cl1beurteilungiddetailxx1:v7');
  });

  it('reicht focusItem an den Editor weiter', () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.isError = false;
    mocks.detailQuery.data = {
      id: 'cl1beurteilungiddetailxx1',
      einsatzId: 'cl1einsatzidxxxxxxxxxxxx',
      einheitId: 'cl1einheitidxxxxxxxxxxxx',
      items: [{ id: 'item-1', title: 'Austretender Kraftstoff' }],
      version: 7,
      erstelltAm: '2026-04-22T00:00:00Z',
      erstelltVonUserId: 'u',
      aktualisiertAm: '2026-04-22T00:00:00Z',
      aktualisiertVonUserId: 'u',
    };

    renderWithProviders(<GefaehrdungenDetailPage einsatzId="einsatz-1" id="cl1beurteilungiddetailxx1" focusItem="item-1" />);

    expect(screen.getByTestId('editor-organism-stub')).toHaveAttribute('data-focus-item', 'item-1');
  });

  it('rendert VersionTimestampFooter + HistoriePopover + Drawer-Slot (Story 2.4 AC1)', () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.data = {
      id: 'cl1beurteilungiddetailxx1',
      einsatzId: 'cl1einsatzidxxxxxxxxxxxx',
      einheitId: 'cl1einheitidxxxxxxxxxxxx',
      items: [],
      version: 7,
      erstelltAm: '2026-04-22T00:00:00Z',
      erstelltVonUserId: 'user-abc-12345678',
      aktualisiertAm: '2026-04-23T10:30:00Z',
      aktualisiertVonUserId: 'user-def-87654321',
    };
    mocks.einheitenQuery.data = [{ id: 'cl1einheitidxxxxxxxxxxxx', name: 'Rettungstrupp 1' }];

    renderWithProviders(<GefaehrdungenDetailPage einsatzId="einsatz-1" id="cl1beurteilungiddetailxx1" />);

    expect(screen.getByTestId('version-timestamp-footer')).toBeInTheDocument();
    const popoverStub = screen.getByTestId('historie-popover-stub');
    expect(popoverStub).toHaveAttribute('data-einsatz', 'einsatz-1');
    expect(popoverStub).toHaveAttribute('data-beurteilung', 'cl1beurteilungiddetailxx1');
    expect(popoverStub).toHaveAttribute('data-popover-id', 'gefaehrdungsbeurteilung-historie-popover');
    // Drawer ist initial nicht offen (kein Entry ausgewählt).
    expect(screen.queryByTestId('version-drawer-stub')).not.toBeInTheDocument();
  });

  it('öffnet den Drawer bei onSelectVersion und schließt ihn via onClose (Story 2.4 AC4 + AC5)', async () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.data = {
      id: 'cl1beurteilungiddetailxx1',
      einsatzId: 'cl1einsatzidxxxxxxxxxxxx',
      einheitId: 'cl1einheitidxxxxxxxxxxxx',
      items: [],
      version: 3,
      erstelltAm: '2026-04-22T00:00:00Z',
      erstelltVonUserId: 'u',
      aktualisiertAm: '2026-04-23T10:30:00Z',
      aktualisiertVonUserId: 'u',
    };

    const user = userEvent.setup();
    const { rerender } = renderWithProviders(<GefaehrdungenDetailPage einsatzId="einsatz-1" id="cl1beurteilungiddetailxx1" />);

    // Simulation: Popover-Auswahl einer historischen Version (V2).
    expect(mocks.historieCallbacks.lastOnSelect).not.toBeNull();
    const entryV2 = {
      version: 2,
      gueltigVon: '2026-04-23T09:00:00Z',
      gueltigBis: '2026-04-23T10:30:00Z',
      changedByUserId: 'u',
      changedByUserName: 'Test User',
      changedFields: { updated: [{ id: 'i-1', fields: ['title'] }] },
      items: [],
    };
    mocks.historieCallbacks.lastOnSelect!(entryV2);
    rerender(<GefaehrdungenDetailPage einsatzId="einsatz-1" id="cl1beurteilungiddetailxx1" />);

    const drawer = await screen.findByTestId('version-drawer-stub');
    expect(drawer).toHaveAttribute('data-version', '2');
    expect(drawer).toHaveAttribute('data-aggregate', '3');

    // Close über Drawer-Stub → Drawer verschwindet.
    await user.click(screen.getByTestId('version-drawer-close-stub'));
    expect(screen.queryByTestId('version-drawer-stub')).not.toBeInTheDocument();
  });

  it('überschreibt die aktuelle Historie-Version im Drawer mit dem Detail-Cache (Story 2.4 AC5)', async () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.data = {
      id: 'cl1beurteilungiddetailxx1',
      einsatzId: 'cl1einsatzidxxxxxxxxxxxx',
      einheitId: 'cl1einheitidxxxxxxxxxxxx',
      items: [{ title: 'Aktueller Stand' }],
      version: 4,
      erstelltAm: '2026-04-22T00:00:00Z',
      erstelltVonUserId: 'u',
      aktualisiertAm: '2026-04-23T10:30:00Z',
      aktualisiertVonUserId: 'u-neu',
    };

    const { rerender } = renderWithProviders(<GefaehrdungenDetailPage einsatzId="einsatz-1" id="cl1beurteilungiddetailxx1" />);

    expect(mocks.historieCallbacks.lastOnSelect).not.toBeNull();
    mocks.historieCallbacks.lastOnSelect!({
      version: 3,
      gueltigVon: '2026-04-23T10:30:00Z',
      gueltigBis: null,
      changedByUserId: 'u-alt',
      changedByUserName: 'Alt',
      changedFields: { updated: [{ id: 'i-1', fields: ['title'] }] },
      items: [{ title: 'Veralteter Stand' }],
    });
    rerender(<GefaehrdungenDetailPage einsatzId="einsatz-1" id="cl1beurteilungiddetailxx1" />);

    const drawer = await screen.findByTestId('version-drawer-stub');
    expect(drawer).toHaveAttribute('data-version', '4');
    expect(drawer).toHaveAttribute('data-aggregate', '4');
  });

  it('fällt auf einheitId zurück, wenn Einheiten-Liste keinen Match liefert', () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.data = {
      id: 'cl1beurteilungiddetailxx1',
      einsatzId: 'cl1einsatzidxxxxxxxxxxxx',
      einheitId: 'cl1einheitidxxxxxxxxxxxx',
      items: [],
      version: 1,
      erstelltAm: '',
      erstelltVonUserId: '',
      aktualisiertAm: '',
      aktualisiertVonUserId: '',
    };
    mocks.einheitenQuery.data = [];

    renderWithProviders(<GefaehrdungenDetailPage einsatzId="einsatz-1" id="cl1beurteilungiddetailxx1" />);

    // Der Einheiten-Fallback rendert die ID direkt als Label.
    expect(screen.getByText('cl1einheitidxxxxxxxxxxxx')).toBeInTheDocument();
  });
});
