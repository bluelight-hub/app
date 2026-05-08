/**
 * Tests für die Story-3.4-Sender-Sektion „Offene PSA-Bekanntgaben" auf
 * `PsaProfilePage` (AC13 + AC15). Mockt die Page-Hooks bewusst minimal,
 * damit die Sektion isoliert renderbar ist.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OffenePsaBekanntgabeEntry, PsaQuittungEntry } from '../../../api/queries';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    offene: undefined as { data?: OffenePsaBekanntgabeEntry[]; isLoading: boolean } | undefined,
    quittungen: { data: [] as PsaQuittungEntry[], isPending: false },
    einheiten: { data: [], isLoading: false, isError: false },
  },
}));

vi.mock('../../../api/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/queries')>();
  return {
    ...actual,
    useOffenePsaBekanntgaben: () => mocks.offene ?? { data: [], isLoading: false },
    useEigenschutzPsaQuittungen: () => mocks.quittungen,
    usePsaProfileByEinheit: () => ({ data: [], isPending: false }),
    useAckPsaQuittung: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false }),
  };
});

vi.mock('@/features/kraefte/api', () => ({
  useEinsatzEinheiten: () => mocks.einheiten,
}));

vi.mock('@/features/auth/api/use-current-user', () => ({
  useCurrentUser: () => ({ user: { id: 'user-sender' } }),
}));

vi.mock('../../../stores/eigenschutz-selection.store', () => ({
  useEigenschutzSelection: () => ({
    isMultiSelectActive: false,
    selectionCount: 0,
    selectedEinheitIds: new Set<string>(),
    isSelected: () => false,
    enterMultiSelect: vi.fn(),
    exitMultiSelect: vi.fn(),
    toggleSelection: vi.fn(),
    clearSelection: vi.fn(),
    removeFromSelection: vi.fn(),
  }),
}));

import { PsaProfilePage } from '../PsaProfilePage';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

describe('PsaProfilePage — Sektion „Offene PSA-Bekanntgaben" (Story 3.4 AC13)', () => {
  beforeEach(() => {
    mocks.offene = undefined;
    mocks.quittungen = { data: [], isPending: false };
    mocks.einheiten = { data: [], isLoading: false, isError: false };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rendert Empty-State, wenn keine offenen Bekanntgaben existieren', () => {
    mocks.offene = { data: [], isLoading: false };
    const client = makeClient();
    render(<PsaProfilePage einsatzId="einsatz-1" />, { wrapper: wrapper(client) });

    expect(screen.getByTestId('offene-psa-bekanntgaben-section')).toBeInTheDocument();
    expect(screen.getByTestId('offene-psa-bekanntgaben-empty')).toHaveTextContent('Aktuell keine offenen Bekanntgaben');
  });

  it('rendert Liste mit AcknowledgmentStatusBadge pro Eintrag (AC13)', () => {
    mocks.offene = {
      data: [
        {
          propagationGroupId: 'group-1',
          occurredAt: '2026-04-24T08:30:00.000Z',
          begruendungAnriss: 'Verdacht auf Kontamination',
          profilToggles: [{ profil: 'CBRN_PATIENT', aktion: 'AKTIVIERT' }],
          betroffeneEinheitIds: ['e1', 'e2'],
          ackCount: 1,
          totalCount: 2,
          status: 'partial',
        },
      ],
      isLoading: false,
    };
    mocks.quittungen = {
      data: [
        { einheitId: 'e1', einheitName: 'Sangruppe 1', status: 'QUITTIERT', quittiertAm: '2026-04-24T08:32:00.000Z', quittiertVonUserId: 'u-1' },
        { einheitId: 'e2', einheitName: 'Sangruppe 2', status: 'AUSSTEHEND' },
      ],
      isPending: false,
    };
    const client = makeClient();
    render(<PsaProfilePage einsatzId="einsatz-1" />, { wrapper: wrapper(client) });

    const list = screen.getByTestId('offene-psa-bekanntgaben-list');
    expect(list).toBeInTheDocument();
    expect(list.querySelectorAll('li')).toHaveLength(1);
    expect(screen.getByText(/Verdacht auf Kontamination/)).toBeInTheDocument();
    // Das Badge selbst kommt aus der Molecule-Komponente
    expect(screen.getByTestId('acknowledgment-status-badge')).toBeInTheDocument();
  });

  describe('Story 3.5 AC11 — „Checkliste anzeigen" öffnet Sender-Read-Only-Drawer', () => {
    it('rendert pro Eintrag einen „Checkliste anzeigen"-Button', () => {
      mocks.offene = {
        data: [
          {
            propagationGroupId: 'group-3-5-page',
            occurredAt: '2026-04-24T08:30:00.000Z',
            begruendungAnriss: 'Verdacht auf Kontamination',
            profilToggles: [{ profil: 'CBRN_PATIENT', aktion: 'AKTIVIERT' }],
            betroffeneEinheitIds: ['e1'],
            ackCount: 0,
            totalCount: 1,
            status: 'pending',
          },
        ],
        isLoading: false,
      };
      const client = makeClient();
      render(<PsaProfilePage einsatzId="einsatz-1" />, { wrapper: wrapper(client) });

      expect(screen.getByTestId('offene-psa-bekanntgabe-checkliste-group-3-5-page')).toBeInTheDocument();
    });

    it('Klick auf Eintrag mit ausschließlich DEAKTIVIERT-Toggles öffnet Drawer mit Section-B-Deaktiviert + Empty-aktiviert (P14b)', () => {
      mocks.offene = {
        data: [
          {
            propagationGroupId: 'group-deaktiviert-only',
            occurredAt: '2026-04-24T08:30:00.000Z',
            begruendungAnriss: 'Schutzstufe wieder gesenkt',
            profilToggles: [{ profil: 'BASIS', aktion: 'DEAKTIVIERT' }],
            betroffeneEinheitIds: ['e1'],
            ackCount: 0,
            totalCount: 1,
            status: 'pending',
          },
        ],
        isLoading: false,
      };
      const client = makeClient();
      render(<PsaProfilePage einsatzId="einsatz-1" />, { wrapper: wrapper(client) });

      fireEvent.click(screen.getByTestId('offene-psa-bekanntgabe-checkliste-group-deaktiviert-only'));

      // Drawer mountet — Decision-Aufloesung: Section B zeigt nur die
      // Deaktiviert-Liste, Aktiviert-Liste fehlt (filter ergibt leer).
      expect(screen.getByTestId('psa-profil-detail-drawer')).toBeInTheDocument();
      expect(screen.getByTestId('psa-profil-detail-deaktiviert')).toHaveTextContent(/Basis/);
      // Aktiviert-Liste rendert NICHT als eigene Section (keine `Aktiviert`-Header).
      expect(screen.queryByTestId('psa-profil-detail-aktiviert')).toBeNull();
    });

    it('Klick öffnet Drawer im Sender-Read-Only-Modus (kein Quittungs-/Lücke-Button)', () => {
      mocks.offene = {
        data: [
          {
            propagationGroupId: 'group-3-5-page',
            occurredAt: '2026-04-24T08:30:00.000Z',
            begruendungAnriss: 'Verdacht auf Kontamination',
            profilToggles: [{ profil: 'CBRN_PATIENT', aktion: 'AKTIVIERT' }],
            betroffeneEinheitIds: ['e1'],
            ackCount: 0,
            totalCount: 1,
            status: 'pending',
          },
        ],
        isLoading: false,
      };
      const client = makeClient();
      render(<PsaProfilePage einsatzId="einsatz-1" />, { wrapper: wrapper(client) });

      // Pre: Drawer zu.
      expect(screen.queryByTestId('psa-profil-detail-drawer')).toBeNull();

      fireEvent.click(screen.getByTestId('offene-psa-bekanntgabe-checkliste-group-3-5-page'));

      const drawer = screen.getByTestId('psa-profil-detail-drawer');
      expect(drawer).toHaveAttribute('data-read-only', 'true');
      // Read-Only-Hint sichtbar.
      expect(screen.getByTestId('psa-profil-detail-read-only-hint')).toBeInTheDocument();
      // Keine Quittungs-/Lücke-Buttons.
      expect(screen.queryByTestId('psa-profil-detail-quittieren')).toBeNull();
      expect(screen.queryByTestId('psa-profil-detail-luecke')).toBeNull();
    });

    it('öffnet die Checkliste aus dem focusGroup-Deep-Link', () => {
      mocks.offene = {
        data: [
          {
            propagationGroupId: 'group-focus',
            occurredAt: '2026-04-24T08:30:00.000Z',
            begruendungAnriss: 'Verdacht auf Kontamination',
            profilToggles: [{ profil: 'CBRN_PATIENT', aktion: 'AKTIVIERT' }],
            betroffeneEinheitIds: ['e1'],
            ackCount: 0,
            totalCount: 1,
            status: 'pending',
          },
        ],
        isLoading: false,
      };
      const client = makeClient();

      render(<PsaProfilePage einsatzId="einsatz-1" focusGroup="group-focus" />, { wrapper: wrapper(client) });

      expect(screen.getByTestId('psa-profil-detail-drawer')).toBeInTheDocument();
    });
  });

  describe('Story 3.6 AC13 — lueckenCount-Badge in der OffenePsaBekanntgabenSection', () => {
    it('rendert luecke-badge bei lueckenCount > 0', () => {
      mocks.offene = {
        data: [
          {
            propagationGroupId: 'group-luecke',
            occurredAt: '2026-04-24T08:30:00.000Z',
            begruendungAnriss: 'Verdacht auf Kontamination',
            profilToggles: [{ profil: 'CBRN_PATIENT', aktion: 'AKTIVIERT' }],
            betroffeneEinheitIds: ['e1', 'e2'],
            ackCount: 2,
            totalCount: 2,
            status: 'partial',
            lueckenCount: 2,
          },
        ],
        isLoading: false,
      };
      const client = makeClient();
      render(<PsaProfilePage einsatzId="einsatz-1" />, { wrapper: wrapper(client) });

      const badge = screen.getByTestId('luecke-badge-group-luecke');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('2');
      expect(badge).toHaveTextContent(/Lücken gemeldet/);
    });

    it('zeigt Singular bei lueckenCount === 1', () => {
      mocks.offene = {
        data: [
          {
            propagationGroupId: 'group-eins',
            occurredAt: '2026-04-24T08:30:00.000Z',
            begruendungAnriss: 'CBRN',
            profilToggles: [{ profil: 'CBRN_PATIENT', aktion: 'AKTIVIERT' }],
            betroffeneEinheitIds: ['e1'],
            ackCount: 1,
            totalCount: 1,
            status: 'partial',
            lueckenCount: 1,
          },
        ],
        isLoading: false,
      };
      const client = makeClient();
      render(<PsaProfilePage einsatzId="einsatz-1" />, { wrapper: wrapper(client) });

      expect(screen.getByTestId('luecke-badge-group-eins')).toHaveTextContent(/Lücke gemeldet/);
    });

    it('rendert KEIN luecke-badge bei lueckenCount === 0', () => {
      mocks.offene = {
        data: [
          {
            propagationGroupId: 'group-keine-luecke',
            occurredAt: '2026-04-24T08:30:00.000Z',
            begruendungAnriss: 'CBRN',
            profilToggles: [{ profil: 'CBRN_PATIENT', aktion: 'AKTIVIERT' }],
            betroffeneEinheitIds: ['e1'],
            ackCount: 0,
            totalCount: 1,
            status: 'pending',
            lueckenCount: 0,
          },
        ],
        isLoading: false,
      };
      const client = makeClient();
      render(<PsaProfilePage einsatzId="einsatz-1" />, { wrapper: wrapper(client) });

      expect(screen.queryByTestId('luecke-badge-group-keine-luecke')).toBeNull();
    });
  });
});
