import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kraefte/api', () => ({
  useEinsatzEinheiten: vi.fn(),
}));

import { useEinsatzEinheiten } from '@/features/kraefte/api';
import { EinheitCombobox } from '../EinheitCombobox';

const mockedUseEinsatzEinheiten = vi.mocked(useEinsatzEinheiten);

const mockEinheiten = [
  { id: 'e1', einsatzId: 'einsatz-1', name: 'Trupp Alpha', typ: 'TRUPP', status: 'EINSATZBEREIT' },
  { id: 'e2', einsatzId: 'einsatz-1', name: 'Gruppe Bravo', typ: 'GRUPPE', status: 'EINSATZBEREIT' },
  { id: 'e3', einsatzId: 'einsatz-1', name: 'Abschnitt Nord', typ: 'ABSCHNITT', status: 'EINSATZBEREIT' },
];

function setHookState(state: { data?: typeof mockEinheiten | []; isLoading?: boolean; isError?: boolean }) {
  mockedUseEinsatzEinheiten.mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  } as unknown as ReturnType<typeof useEinsatzEinheiten>);
}

describe('EinheitCombobox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zeigt Skeleton während Loading', () => {
    setHookState({ isLoading: true });
    const { container } = render(<EinheitCombobox einsatzId="einsatz-1" value="" onChange={vi.fn()} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('zeigt Fehler-Hinweis bei isError', () => {
    setHookState({ isError: true });
    render(<EinheitCombobox einsatzId="einsatz-1" value="" onChange={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/konnten nicht geladen werden/i);
  });

  it('zeigt Empty-Hinweis wenn der Einsatz keine Einheiten hat', () => {
    setHookState({ data: [] });
    render(<EinheitCombobox einsatzId="einsatz-1" value="" onChange={vi.fn()} />);
    expect(screen.getByText(/keine Einheiten/i)).toBeInTheDocument();
  });

  it('zeigt FilteredEmpty-Hinweis wenn alle Einheiten ausgeschlossen sind', () => {
    setHookState({ data: mockEinheiten });
    render(<EinheitCombobox einsatzId="einsatz-1" value="" onChange={vi.fn()} excludeEinheitIds={['e1', 'e2', 'e3']} />);
    expect(screen.getByText(/bereits zugewiesen/i)).toBeInTheDocument();
  });

  it('zeigt das Combobox-Eingabefeld mit Default-Label', () => {
    setHookState({ data: mockEinheiten });
    render(<EinheitCombobox einsatzId="einsatz-1" value="" onChange={vi.fn()} />);
    expect(screen.getByText('Einheit')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('verwendet den übergebenen Label-Prop', () => {
    setHookState({ data: mockEinheiten });
    render(<EinheitCombobox einsatzId="einsatz-1" value="" onChange={vi.fn()} label="Zugewiesene Einheit" />);
    expect(screen.getByText('Zugewiesene Einheit')).toBeInTheDocument();
  });

  it('zeigt initial den Label-Wert "Name (Typ)" der ausgewählten Einheit', () => {
    setHookState({ data: mockEinheiten });
    render(<EinheitCombobox einsatzId="einsatz-1" value="e2" onChange={vi.fn()} />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('Gruppe Bravo (Gruppe)');
  });

  it('blockt Clear (leerer onChange) wenn allowEmpty=false', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    setHookState({ data: mockEinheiten });
    render(<EinheitCombobox einsatzId="einsatz-1" value="e1" onChange={onChange} />);
    const clearButton = screen.getByLabelText(/auswahl löschen/i);
    await user.click(clearButton);
    expect(onChange).not.toHaveBeenCalledWith('');
  });

  it('erlaubt Clear (leerer onChange) wenn allowEmpty=true', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    setHookState({ data: mockEinheiten });
    render(<EinheitCombobox einsatzId="einsatz-1" value="e1" onChange={onChange} allowEmpty />);
    const clearButton = screen.getByLabelText(/auswahl löschen/i);
    await user.click(clearButton);
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('zeigt error-Hinweis unter dem Input', () => {
    setHookState({ data: mockEinheiten });
    render(<EinheitCombobox einsatzId="einsatz-1" value="" onChange={vi.fn()} error="Pflichtfeld" />);
    expect(screen.getByText('Pflichtfeld')).toBeInTheDocument();
  });
});
