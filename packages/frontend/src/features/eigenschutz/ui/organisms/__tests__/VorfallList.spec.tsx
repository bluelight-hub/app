import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EigenschutzVorfallListItemDto, EinsatzEinheitDto } from '@bluelight-hub/shared/client';

const einheitenMock: { data: EinsatzEinheitDto[] | undefined } = { data: [] };

vi.mock('@/features/kraefte/api/use-einsatz-einheiten', () => ({
  useEinsatzEinheiten: () => ({ data: einheitenMock.data, isLoading: false }),
}));

vi.mock('@/features/auth/api/use-users', () => ({
  useUserNames: () => ({ getUserName: (id: string) => (id === 'user-1' ? 'Max Mustermann' : '') }),
}));

import { resetFilter, setUnfallkasseRelevant } from '../../../stores/vorfall-filter.store';
import { VorfallList } from '../VorfallList';

function makeRow(overrides: Partial<EigenschutzVorfallListItemDto> = {}): EigenschutzVorfallListItemDto {
  return {
    id: overrides.id ?? 'vorfall-1',
    einheitId: overrides.einheitId ?? 'einheit-1',
    vorfallZeit: overrides.vorfallZeit ?? '2026-05-06T10:00:00.000Z',
    was: overrides.was ?? 'Sturz beim Aufbau',
    unfallkasseRelevant: overrides.unfallkasseRelevant ?? true,
    erfasstAm: overrides.erfasstAm ?? '2026-05-06T10:01:00.000Z',
    erfasstVonUserId: overrides.erfasstVonUserId ?? 'user-1',
  } as EigenschutzVorfallListItemDto;
}

beforeEach(() => {
  resetFilter();
  einheitenMock.data = [
    {
      id: 'einheit-1',
      einsatzId: 'einsatz-1',
      parentId: null as unknown as EinsatzEinheitDto['parentId'],
      name: 'Trupp Alpha',
      typ: 'TRUPP' as EinsatzEinheitDto['typ'],
      status: 'EINSATZBEREIT' as EinsatzEinheitDto['status'],
      sollStaerke: 0,
      istStaerke: 0,
    } as EinsatzEinheitDto,
  ];
});

afterEach(() => {
  resetFilter();
});

describe('VorfallList (Story 5.3 AC11)', () => {
  it('(L1) Loading-State', () => {
    render(<VorfallList einsatzId="einsatz-1" rows={undefined} isLoading={true} isError={false} onRetry={vi.fn()} onRowClick={vi.fn()} />);
    expect(screen.getByTestId('vorfaelle-list-loading')).toBeInTheDocument();
  });

  it('(L2) Error-State mit Retry-Button ruft onRetry', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<VorfallList einsatzId="einsatz-1" rows={[]} isLoading={false} isError={true} onRetry={onRetry} onRowClick={vi.fn()} />);

    expect(screen.getByTestId('vorfaelle-list-error')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Erneut laden' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('(L3a) Empty-State ohne aktive Filter — zeigt „Noch keine Vorfälle erfasst"', () => {
    render(<VorfallList einsatzId="einsatz-1" rows={[]} isLoading={false} isError={false} onRetry={vi.fn()} onRowClick={vi.fn()} />);
    expect(screen.getByTestId('vorfaelle-list-empty')).toBeInTheDocument();
    expect(screen.getByText('Noch keine Vorfälle erfasst')).toBeInTheDocument();
  });

  it('(L3b) Empty-State mit aktiven Filtern — zeigt CTA „Alle Filter zurücksetzen"', async () => {
    setUnfallkasseRelevant(true);
    const user = userEvent.setup();
    render(<VorfallList einsatzId="einsatz-1" rows={[]} isLoading={false} isError={false} onRetry={vi.fn()} onRowClick={vi.fn()} />);

    expect(screen.getByTestId('vorfaelle-list-empty-filtered')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Alle Filter zurücksetzen' }));
    expect(screen.queryByTestId('vorfaelle-list-empty-filtered')).toBeNull();
  });

  it('(L4) Daten-State: rendert alle Spalten korrekt', () => {
    render(<VorfallList einsatzId="einsatz-1" rows={[makeRow()]} isLoading={false} isError={false} onRetry={vi.fn()} onRowClick={vi.fn()} />);

    expect(screen.getByTestId('vorfaelle-list')).toBeInTheDocument();
    expect(screen.getByText('Sturz beim Aufbau')).toBeInTheDocument();
    expect(screen.getByText('Trupp Alpha')).toBeInTheDocument();
    expect(screen.getAllByText('UK-rel.').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
  });

  it('(L5) Zeilen-Klick (Maus + Enter) navigiert via onRowClick', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(<VorfallList einsatzId="einsatz-1" rows={[makeRow()]} isLoading={false} isError={false} onRetry={vi.fn()} onRowClick={onRowClick} />);

    const row = screen.getByTestId('vorfaelle-list-row-vorfall-1');
    await user.click(row);
    expect(onRowClick).toHaveBeenCalledWith('vorfall-1');

    onRowClick.mockClear();
    row.focus();
    await user.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledWith('vorfall-1');
  });

  it('(L6) Limit-Hinweis erscheint bei genau 200 Zeilen', () => {
    const rows = Array.from({ length: 200 }, (_, i) => makeRow({ id: `vorfall-${i}` }));
    render(<VorfallList einsatzId="einsatz-1" rows={rows} isLoading={false} isError={false} onRetry={vi.fn()} onRowClick={vi.fn()} />);

    expect(screen.getByTestId('vorfaelle-list-limit-hint')).toBeInTheDocument();
    expect(screen.getByText(/Anzeige limitiert auf 200 Vorfälle/)).toBeInTheDocument();
  });
});
