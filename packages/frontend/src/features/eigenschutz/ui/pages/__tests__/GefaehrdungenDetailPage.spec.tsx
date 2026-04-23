/**
 * Spec für `GefaehrdungenDetailPage` (Story 2.2 Task 9).
 *
 * Fokus: Loading-Skeleton, Fehler-Banner mit Retry, Success-Rendering des
 * Editor-Organism. Die Organism-Interna werden hier bewusst gestubbt —
 * sie haben ihre eigene Spec.
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
  },
}));

vi.mock('@/features/eigenschutz/api/queries', () => ({
  useGefaehrdungsbeurteilung: () => mocks.detailQuery,
}));

vi.mock('@/features/kraefte/api', () => ({
  useEinsatzEinheiten: () => mocks.einheitenQuery,
}));

vi.mock('../../organisms/GefaehrdungenEditorOrganism', () => ({
  GefaehrdungenEditorOrganism: ({ einsatzId, beurteilung }: { einsatzId: string; beurteilung: { id: string; version: number } }) => (
    <div data-testid="editor-organism-stub">
      editor:{einsatzId}:{beurteilung.id}:v{beurteilung.version}
    </div>
  ),
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
