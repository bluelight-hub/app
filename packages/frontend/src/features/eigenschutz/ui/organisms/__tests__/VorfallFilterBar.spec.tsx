import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EinsatzEinheitDto } from '@bluelight-hub/shared/client';

const einheitenMock: { data: EinsatzEinheitDto[] | undefined; isLoading: boolean } = { data: [], isLoading: false };

vi.mock('@/features/kraefte/api/use-einsatz-einheiten', () => ({
  useEinsatzEinheiten: () => einheitenMock,
}));

import { resetFilter, vorfallFilterStore } from '../../../stores/vorfall-filter.store';
import { VorfallFilterBar } from '../VorfallFilterBar';

function makeAbschnitt(id: string, name = id): EinsatzEinheitDto {
  return {
    id,
    einsatzId: 'einsatz-1',
    parentId: null as unknown as EinsatzEinheitDto['parentId'],
    name,
    typ: 'ABSCHNITT' as EinsatzEinheitDto['typ'],
    status: 'EINSATZBEREIT' as EinsatzEinheitDto['status'],
    sollStaerke: 0,
    istStaerke: 0,
  } as EinsatzEinheitDto;
}

beforeEach(() => {
  resetFilter();
  einheitenMock.data = [makeAbschnitt('aaaaaaaaaaaaaaaaaaaaaaaaaa', 'Abschnitt A'), makeAbschnitt('bbbbbbbbbbbbbbbbbbbbbbbbbb', 'Abschnitt B')];
  einheitenMock.isLoading = false;
});

afterEach(() => {
  resetFilter();
});

describe('VorfallFilterBar (Story 5.3 AC10)', () => {
  it('(B1) rendert alle 4 Controls + role="search"', () => {
    render(<VorfallFilterBar einsatzId="einsatz-1" />);

    expect(screen.getByRole('search', { name: 'Vorfälle filtern' })).toBeInTheDocument();
    expect(screen.getByTestId('vorfaelle-filter-abschnitt-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('vorfaelle-filter-von')).toBeInTheDocument();
    expect(screen.getByTestId('vorfaelle-filter-bis')).toBeInTheDocument();
    expect(screen.getByTestId('vorfaelle-filter-uk-wrapper')).toBeInTheDocument();
  });

  it('(B2) Reset-Button ist nur sichtbar wenn Filter aktiv ist', () => {
    const { rerender } = render(<VorfallFilterBar einsatzId="einsatz-1" />);
    expect(screen.queryByTestId('vorfaelle-filter-reset')).toBeNull();

    fireEvent.change(screen.getByTestId('vorfaelle-filter-von'), { target: { value: '2026-05-01' } });
    rerender(<VorfallFilterBar einsatzId="einsatz-1" />);
    expect(screen.getByTestId('vorfaelle-filter-reset')).toBeInTheDocument();
  });

  it('(B3) Reset-Button setzt Store zurück', async () => {
    const user = userEvent.setup();
    fireEvent.change(document.body); // touch DOM
    render(<VorfallFilterBar einsatzId="einsatz-1" />);

    fireEvent.change(screen.getByTestId('vorfaelle-filter-von'), { target: { value: '2026-05-01' } });
    expect(vorfallFilterStore.state.vorfallZeitVon).toBe('2026-05-01');

    await user.click(screen.getByTestId('vorfaelle-filter-reset'));
    expect(vorfallFilterStore.state.vorfallZeitVon).toBeUndefined();
  });

  it('(B4) Zeitraum-Range-Validation: Inline-Fehler bei bis < von', () => {
    render(<VorfallFilterBar einsatzId="einsatz-1" />);

    fireEvent.change(screen.getByTestId('vorfaelle-filter-von'), { target: { value: '2026-05-08' } });
    fireEvent.change(screen.getByTestId('vorfaelle-filter-bis'), { target: { value: '2026-05-01' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Bis-Datum muss ≥ Von-Datum sein');
    expect(screen.getByTestId('vorfaelle-filter-von').getAttribute('aria-invalid')).toBe('true');
  });

  it('(B5) UK-Checkbox togglet zwischen true und undefined', async () => {
    const user = userEvent.setup();
    render(<VorfallFilterBar einsatzId="einsatz-1" />);

    const checkbox = screen.getByRole('checkbox', { name: /Unfallkasse-relevant/i });
    await user.click(checkbox);
    expect(vorfallFilterStore.state.unfallkasseRelevant).toBe(true);

    await user.click(checkbox);
    expect(vorfallFilterStore.state.unfallkasseRelevant).toBeUndefined();
  });

  it('(B6) Active-Filter-Chip „UK-relevant" entfernt nur den UK-Filter', async () => {
    const user = userEvent.setup();
    render(<VorfallFilterBar einsatzId="einsatz-1" />);

    fireEvent.change(screen.getByTestId('vorfaelle-filter-von'), { target: { value: '2026-05-01' } });
    const checkbox = screen.getByRole('checkbox', { name: /Unfallkasse-relevant/i });
    await user.click(checkbox);
    expect(vorfallFilterStore.state.unfallkasseRelevant).toBe(true);

    const ukChip = await screen.findByTestId('vorfaelle-filter-chip-uk');
    const removeBtn = ukChip.querySelector('button[aria-label="Filter entfernen"]')!;
    await user.click(removeBtn);

    expect(vorfallFilterStore.state.unfallkasseRelevant).toBeUndefined();
    expect(vorfallFilterStore.state.vorfallZeitVon).toBe('2026-05-01');
  });

  it('(B7) Disabled-State wenn keine ABSCHNITT-Einheiten vorhanden', () => {
    einheitenMock.data = [];
    render(<VorfallFilterBar einsatzId="einsatz-1" />);

    const trigger = screen.getByTestId('vorfaelle-filter-abschnitt-trigger') as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    expect(trigger.title).toBe('Keine Abschnitte definiert');
  });

  it('(B8) Truncation-Hint-Chip rendert wenn truncatedHint > 0 übergeben wird', () => {
    render(<VorfallFilterBar einsatzId="einsatz-1" truncatedHint={{ truncatedCount: 5 }} />);

    expect(screen.getByTestId('vorfaelle-filter-truncated-hint')).toHaveTextContent('5 weitere Einheiten ignoriert (Backend-Cap 50)');
  });
});
