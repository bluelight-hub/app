import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BefehlEingabeRow } from '../BefehlEingabeRow.molecule';

const { mockMutateAsync } = vi.hoisted(() => ({
  mockMutateAsync: vi.fn(),
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
  {
    id: 'p2',
    name: 'Bernd Beispiel',
    label: 'Bernd Beispiel (ZF)',
    userId: 'bernd-id',
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
  useCreateBefehl: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useBefehlsgeberSuche: () => ({
    data: BEFEHLSGEBER_RESULTS,
  }),
}));

vi.mock('../../../api/use-empfaenger-suche', () => ({
  useEmpfaengerSuche: () => ({
    data: [],
    isError: false,
    isFetching: false,
  }),
}));

vi.mock('../../../lib/offline-queue', () => ({
  useOfflineSync: () => ({
    isOnline: true,
    enqueue: vi.fn(),
  }),
}));

describe('BefehlEingabeRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ nummer: '001' });
  });

  it('erlaubt Schreiben in Auftrag, Führung / Kommunikation und Zeitvorgabe', async () => {
    const user = userEvent.setup();
    render(<BefehlEingabeRow einsatzId="einsatz-1" onClose={vi.fn()} />);

    const auftragTextarea = screen.getByPlaceholderText('z.B. RTW-Besatzung zur Patientenversorgung...');
    await user.type(auftragTextarea, 'Patient versorgen');
    expect(auftragTextarea).toHaveValue('Patient versorgen');

    await user.click(screen.getByRole('button', { name: /Erweitert/i }));

    const fuehrungTextarea = screen.getByPlaceholderText('z.B. Rückmeldung an EL nach Patientenkontakt');
    await user.type(fuehrungTextarea, 'Rückmeldung erfolgt');
    expect(fuehrungTextarea).toHaveValue('Rückmeldung erfolgt');

    const zeitvorgabeInput = screen.getByPlaceholderText('z.B. sofort, bis 14:00 Uhr');
    await user.click(zeitvorgabeInput);
    expect(zeitvorgabeInput).toHaveFocus();
    await user.type(zeitvorgabeInput, 'bis 14:00 Uhr');
    await waitFor(() => {
      expect(zeitvorgabeInput).toHaveValue('bis 14:00 Uhr');
    });
  });

  it('zeigt gewählte Einheit als Chip an', async () => {
    const user = userEvent.setup();
    render(<BefehlEingabeRow einsatzId="einsatz-1" onClose={vi.fn()} />);

    const einheitInput = screen.getByPlaceholderText('Empfänger suchen...');
    await user.type(einheitInput, 'RTW 1');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('RTW 1')).toBeInTheDocument();
    });
  });

  it('übernimmt den aktiv gewählten Befehlsgeber statt immer den ersten Treffer', async () => {
    const user = userEvent.setup();
    render(<BefehlEingabeRow einsatzId="einsatz-1" onClose={vi.fn()} />);

    const befehlsgeberInput = screen.getByPlaceholderText('Befehlsgeber wählen...');

    await user.clear(befehlsgeberInput);
    await user.type(befehlsgeberInput, 'Anna');
    await user.click(screen.getByText('Anna Muster (GF)'));
    await waitFor(() => {
      expect(befehlsgeberInput).toHaveValue('Anna Muster (GF)');
    });

    await user.clear(befehlsgeberInput);
    await user.type(befehlsgeberInput, 'Bernd');
    await user.click(screen.getByText('Bernd Beispiel (ZF)'));
    await waitFor(() => {
      expect(befehlsgeberInput).toHaveValue('Bernd Beispiel (ZF)');
    });
  });
});
