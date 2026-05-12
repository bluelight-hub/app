import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kraefte/api', () => ({
  useEinsatzEinheiten: vi.fn(),
}));

import { useEinsatzEinheiten } from '@/features/kraefte/api';
import { EinheitMultiCombobox } from '../EinheitMultiCombobox';

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

describe('EinheitMultiCombobox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zeigt Skeleton während Loading', () => {
    setHookState({ isLoading: true });
    const { container } = render(<EinheitMultiCombobox einsatzId="einsatz-1" values={[]} onChange={vi.fn()} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('zeigt Fehler-Hinweis bei isError', () => {
    setHookState({ isError: true });
    render(<EinheitMultiCombobox einsatzId="einsatz-1" values={[]} onChange={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/konnten nicht geladen werden/i);
  });

  it('zeigt Empty-Hinweis wenn der Einsatz keine Einheiten hat', () => {
    setHookState({ data: [] });
    render(<EinheitMultiCombobox einsatzId="einsatz-1" values={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/keine Einheiten/i)).toBeInTheDocument();
  });

  it('zeigt das Combobox-Eingabefeld mit Default-Label', () => {
    setHookState({ data: mockEinheiten });
    render(<EinheitMultiCombobox einsatzId="einsatz-1" values={[]} onChange={vi.fn()} />);
    expect(screen.getByText('Einheiten')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('rendert ausgewählte Einheiten als entfernbare Chips', () => {
    setHookState({ data: mockEinheiten });
    render(<EinheitMultiCombobox einsatzId="einsatz-1" values={['e1', 'e3']} onChange={vi.fn()} />);
    expect(screen.getByText('Trupp Alpha')).toBeInTheDocument();
    expect(screen.getByText('Abschnitt Nord')).toBeInTheDocument();
    expect(screen.getByLabelText('Trupp Alpha entfernen')).toBeInTheDocument();
    expect(screen.getByLabelText('Abschnitt Nord entfernen')).toBeInTheDocument();
  });

  it('entfernt einen Chip per Klick und ruft onChange ohne diese ID auf', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    setHookState({ data: mockEinheiten });
    render(<EinheitMultiCombobox einsatzId="einsatz-1" values={['e1', 'e2']} onChange={onChange} />);

    await user.click(screen.getByLabelText('Trupp Alpha entfernen'));
    expect(onChange).toHaveBeenCalledWith(['e2']);
  });

  it('entfernt den letzten Chip via Backspace im leeren Eingabefeld', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    setHookState({ data: mockEinheiten });
    render(<EinheitMultiCombobox einsatzId="einsatz-1" values={['e1', 'e2']} onChange={onChange} />);

    const input = screen.getByRole('combobox');
    input.focus();
    await user.keyboard('{Backspace}');
    expect(onChange).toHaveBeenCalledWith(['e1']);
  });

  it('zeigt den error-Hinweis unter dem Input', () => {
    setHookState({ data: mockEinheiten });
    render(<EinheitMultiCombobox einsatzId="einsatz-1" values={[]} onChange={vi.fn()} error="Mindestens eine Einheit auswählen" />);
    expect(screen.getByText('Mindestens eine Einheit auswählen')).toBeInTheDocument();
  });

  it('zeigt einen Hinweis statt eines Chips, wenn die übergebene ID nicht in den Einheiten existiert', () => {
    setHookState({ data: mockEinheiten });
    render(<EinheitMultiCombobox einsatzId="einsatz-1" values={['nicht-existent']} onChange={vi.fn()} />);
    // Kein Chip sichtbar, keine entfernen-Buttons
    expect(screen.queryByLabelText(/entfernen/i)).not.toBeInTheDocument();
  });
});
