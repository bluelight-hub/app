import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBefehl, createEmpfaenger } from '../../../__fixtures__/befehl-test-utils';
import { KorrekturBefehlDialog } from '../KorrekturBefehlDialog.organism';

const { mockMutate } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
}));

const BEFEHLSGEBER_RESULTS = [
  {
    id: 'v1',
    name: 'EL',
    label: 'EL',
    quelle: 'VORSCHLAG',
  },
  {
    id: 'p1',
    name: 'Anna Muster',
    label: 'Anna Muster (GF)',
    userId: 'anna-id',
    quelle: 'EINSATZ_PERSON',
  },
] as const;

vi.mock('@/features/auth', () => ({
  useCurrentUser: () => ({
    user: { id: 'user-1' },
    isLoading: false,
  }),
}));

vi.mock('../../../api', () => ({
  useBefehlsgeberSuche: () => ({
    data: BEFEHLSGEBER_RESULTS,
  }),
}));

vi.mock('../../../api/use-korrigiere-befehl', () => ({
  useKorrigiereBefehl: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock('../../../api/use-empfaenger-suche', () => ({
  useEmpfaengerSuche: () => ({
    data: [],
    isError: false,
    isFetching: false,
  }),
}));

describe('KorrekturBefehlDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutate.mockImplementation((_payload: unknown, options?: { onSuccess?: () => void }) => {
      options?.onSuccess?.();
    });
  });

  it('rendert dieselbe Formularstruktur wie "Neuer Befehl"', () => {
    const originalBefehl = createBefehl({
      id: 'befehl-1',
      nummer: 'B-001',
      auftrag: 'Originalauftrag',
      empfaenger: [createEmpfaenger({ empfaengerId: 'emp-1', name: 'RTW 1' })],
    });

    render(<KorrekturBefehlDialog isOpen={true} onClose={vi.fn()} originalBefehl={originalBefehl} einsatzId="einsatz-1" />);

    expect(screen.getByText('Schemawahl')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /einfach/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /erweitert/i })).toBeInTheDocument();
    expect(screen.getByText('Adressierung und Zeit')).toBeInTheDocument();
    expect(screen.getByLabelText('Empfänger suchen')).toBeInTheDocument();
  });

  it('erlaubt Schreiben in Führung / Kommunikation und Zeitvorgabe', async () => {
    const user = userEvent.setup();
    const originalBefehl = createBefehl({
      id: 'befehl-1',
      nummer: 'B-001',
      auftrag: 'Originalauftrag',
      empfaenger: [createEmpfaenger({ empfaengerId: 'emp-1', name: 'RTW 1' })],
    });

    render(<KorrekturBefehlDialog isOpen={true} onClose={vi.fn()} originalBefehl={originalBefehl} einsatzId="einsatz-1" />);

    await user.click(screen.getByRole('button', { name: /erweitert/i }));

    const fuehrungTextarea = screen.getByPlaceholderText('z.B. Rückmeldung an EL nach Patientenkontakt');
    await user.type(fuehrungTextarea, 'Rückmeldung erfolgt');
    expect(fuehrungTextarea).toHaveValue('Rückmeldung erfolgt');

    const zeitvorgabeInput = screen.getByPlaceholderText('z.B. sofort, bis 14:00 Uhr');
    await user.type(zeitvorgabeInput, 'bis 14:00 Uhr');
    await waitFor(() => {
      expect(zeitvorgabeInput).toHaveValue('bis 14:00 Uhr');
    });
  });

  it('sendet gewählten Befehlsgeber mit befehlsgeberId', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const originalBefehl = createBefehl({
      id: 'befehl-1',
      nummer: 'B-001',
      auftrag: 'Originalauftrag',
      empfaenger: [createEmpfaenger({ empfaengerId: 'emp-1', name: 'RTW 1' })],
    });

    render(<KorrekturBefehlDialog isOpen={true} onClose={onClose} originalBefehl={originalBefehl} einsatzId="einsatz-1" />);

    const befehlsgeberInput = screen.getByPlaceholderText('Befehlsgeber wählen...');
    await user.clear(befehlsgeberInput);
    await user.type(befehlsgeberInput, 'Anna');
    await user.click(screen.getByText('Anna Muster (GF)'));

    await user.click(screen.getByRole('button', { name: /korrektur erteilen/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        befehlsgeber: 'Anna Muster',
        befehlsgeberId: 'anna-id',
        erstellerId: 'user-1',
      }),
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });
});
