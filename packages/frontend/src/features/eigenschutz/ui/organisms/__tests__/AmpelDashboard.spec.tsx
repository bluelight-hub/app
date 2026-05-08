import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AmpelProjectionDtoAktivePsaProfileEnum,
  AmpelProjectionDtoStatusEnum,
  EinsatzEinheitDtoStatusEnum,
  EinsatzEinheitDtoTypEnum,
  type AmpelProjectionDto,
  type EinsatzEinheitDto,
} from '@bluelight-hub/shared/client';
import { AmpelDashboard } from '../AmpelDashboard';
import { setDashboardView, resetDashboardViewStoreForTest } from '../../../stores/eigenschutz-dashboard-view.store';
import { setTestViewport } from '@/test/viewport';

type QueryState<T> = {
  data?: T;
  isLoading: boolean;
  isError: boolean;
};

const { mocks } = vi.hoisted(() => ({
  mocks: {
    ampel: { data: [] as AmpelProjectionDto[], isLoading: false, isError: false } as QueryState<AmpelProjectionDto[]>,
    warnBadges: { data: [], isLoading: false, isError: false },
    einheiten: { data: [] as EinsatzEinheitDto[], isLoading: false, isError: false } as QueryState<EinsatzEinheitDto[]>,
    storage: {
      getItem: vi.fn(),
      setItem: vi.fn(),
    },
    psa: { data: [], isLoading: false, isError: false },
    gefahren: { data: [], isLoading: false, isError: false },
    regeln: { data: [], isLoading: false, isError: false },
    vorfaelle: { data: [], isLoading: false, isError: false },
    rueckmeldungen: { data: [], isLoading: false, isError: false },
  },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    Link: ({ to, params, children, ...rest }: { to: string; params?: Record<string, string>; children: React.ReactNode; [key: string]: unknown }) => (
      <a href={to} data-params={JSON.stringify(params ?? {})} {...(rest as Record<string, unknown>)}>
        {children}
      </a>
    ),
  };
});

vi.mock('../../../api/use-eigenschutz-ampel-status', () => ({
  useEigenschutzAmpelStatus: () => mocks.ampel,
}));

vi.mock('../../../api/use-ampel-warn-badges', () => ({
  useAmpelWarnBadges: () => mocks.warnBadges,
}));

vi.mock('@/features/kraefte/api', () => ({
  useEinsatzEinheiten: () => mocks.einheiten,
}));

vi.mock('@/shared/services/storage/storage-adapter.factory', () => ({
  getStorageAdapter: () => ({
    getItem: mocks.storage.getItem,
    setItem: mocks.storage.setItem,
    removeItem: vi.fn(),
    clear: vi.fn(),
  }),
}));

vi.mock('../../../api/queries', () => ({
  EIGENSCHUTZ_QUERY_KEYS: {
    ampelWarnBadges: (einsatzId: string) => ['eigenschutz', einsatzId, 'ampel-warn-badges'],
  },
  usePsaProfileByEinheit: () => mocks.psa,
  useGefaehrdungsbeurteilungen: () => mocks.gefahren,
  useSicherheitsregeln: () => mocks.regeln,
  useOffeneRueckmeldungen: () => mocks.rueckmeldungen,
}));

vi.mock('../../../api/use-list-vorfaelle', () => ({
  useListVorfaelle: () => mocks.vorfaelle,
}));

function projection(einheitId: string, status: AmpelProjectionDtoStatusEnum | string, overrides: Partial<AmpelProjectionDto> = {}): AmpelProjectionDto {
  return {
    einsatzId: 'einsatz-1',
    einheitId,
    status: status as AmpelProjectionDtoStatusEnum,
    aktivePsaProfile: [AmpelProjectionDtoAktivePsaProfileEnum.Basis],
    offeneGefaehrdungenHoch: 0,
    ausstehendePsaQuittungen: 0,
    ausstehendeRegelQuittungen: 0,
    offeneVorfaelle: 0,
    ungeloesteRueckmeldungen: 0,
    letzteAenderungAm: new Date('2026-05-08T07:15:00.000Z'),
    letzteAenderungVonUserId: null,
    ...overrides,
  };
}

function einheit(id: string, name: string): EinsatzEinheitDto {
  return {
    id,
    einsatzId: 'einsatz-1',
    parentId: null,
    name,
    typ: EinsatzEinheitDtoTypEnum.Abschnitt,
    funktion: null,
    status: EinsatzEinheitDtoStatusEnum.ImEinsatz,
    einheitenfuehrerId: null,
    einheitenfuehrerName: null,
    sollStaerke: 4,
    istStaerke: 4,
    auftrag: null,
    einsatzort: null,
    createdAt: '2026-05-08T06:00:00.000Z',
    updatedAt: '2026-05-08T06:00:00.000Z',
  };
}

beforeEach(() => {
  mocks.ampel = { data: [], isLoading: false, isError: false };
  mocks.warnBadges = { data: [], isLoading: false, isError: false };
  mocks.einheiten = { data: [], isLoading: false, isError: false };
  mocks.storage.getItem.mockResolvedValue(null);
  mocks.storage.setItem.mockResolvedValue(undefined);
  mocks.psa = { data: [], isLoading: false, isError: false };
  mocks.gefahren = { data: [], isLoading: false, isError: false };
  mocks.regeln = { data: [], isLoading: false, isError: false };
  mocks.vorfaelle = { data: [], isLoading: false, isError: false };
  mocks.rueckmeldungen = { data: [], isLoading: false, isError: false };
  resetDashboardViewStoreForTest();
});

describe('AmpelDashboard', () => {
  it('zeigt einen stabilen Loading-State', () => {
    mocks.ampel = { isLoading: true, isError: false };

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    expect(screen.getByTestId('ampel-dashboard-loading')).toHaveTextContent('Lade Sicherheitsstatus…');
  });

  it('zeigt einen Inline-Error ohne Toast', () => {
    mocks.ampel = { isLoading: false, isError: true };

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Sicherheitsstatus konnte nicht geladen werden.');
  });

  it('zeigt einen Empty-State ohne Karten', () => {
    render(<AmpelDashboard einsatzId="einsatz-1" />);

    expect(screen.getByTestId('ampel-dashboard-empty')).toHaveTextContent('Noch kein Sicherheitsstatus vorhanden.');
    expect(screen.queryByTestId(/ampel-card-/)).toBeNull();
  });

  it('löst Einheitennamen per einheitId auf', () => {
    mocks.ampel = { data: [projection('einheit-1', AmpelProjectionDtoStatusEnum.Gruen)], isLoading: false, isError: false };
    mocks.einheiten = { data: [einheit('einheit-1', 'Abschnitt Nord')], isLoading: false, isError: false };

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    expect(screen.getByRole('heading', { name: 'Abschnitt Nord' })).toBeInTheDocument();
  });

  it('rendert das responsive Card-Grid mit stabilen Spaltenklassen', () => {
    mocks.ampel = { data: [projection('einheit-1', AmpelProjectionDtoStatusEnum.Gruen)], isLoading: false, isError: false };

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    const grid = screen.getByTestId('ampel-dashboard-grid');
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('lg:grid-cols-2');
    expect(grid.className).toContain('min-[1440px]:grid-cols-3');
  });

  it('sortiert Rot vor Gelb vor Grün und danach nach Name', () => {
    mocks.ampel = {
      data: [
        projection('einheit-gruen', AmpelProjectionDtoStatusEnum.Gruen),
        projection('einheit-rot', AmpelProjectionDtoStatusEnum.Rot),
        projection('einheit-gelb', AmpelProjectionDtoStatusEnum.Gelb),
      ],
      isLoading: false,
      isError: false,
    };
    mocks.einheiten = {
      data: [einheit('einheit-gruen', 'Charlie'), einheit('einheit-rot', 'Alpha'), einheit('einheit-gelb', 'Bravo')],
      isLoading: false,
      isError: false,
    };

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    const cards = within(screen.getByTestId('ampel-dashboard-grid')).getAllByTestId(/^ampel-card-einheit-/);
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('sortiert unbekannte Statuswerte stabil vor die bekannten Status', () => {
    mocks.ampel = {
      data: [projection('einheit-gruen', AmpelProjectionDtoStatusEnum.Gruen), projection('einheit-unbekannt', 'NEU')],
      isLoading: false,
      isError: false,
    };
    mocks.einheiten = {
      data: [einheit('einheit-gruen', 'Grün'), einheit('einheit-unbekannt', 'Unbekannt')],
      isLoading: false,
      isError: false,
    };

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    const cards = within(screen.getByTestId('ampel-dashboard-grid')).getAllByTestId(/^ampel-card-einheit-/);
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual(['Unbekannt', 'Grün']);
  });

  it('nutzt ID-Fallback, wenn die Einheiten-Query fehlschlägt', () => {
    mocks.ampel = { data: [projection('clvabcdef1234567890xyz', AmpelProjectionDtoStatusEnum.Gruen)], isLoading: false, isError: false };
    mocks.einheiten = { isLoading: false, isError: true };

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    expect(screen.getByRole('heading', { name: 'clvabc…0xyz' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Abschnittsnamen konnten nicht geladen werden.');
  });

  it('rendert Überblick als Default mit View-Toggle', () => {
    setTestViewport(1280);
    mocks.ampel = { data: [projection('einheit-1', AmpelProjectionDtoStatusEnum.Gruen)], isLoading: false, isError: false };

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    expect(screen.getByRole('button', { name: 'Überblick' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('ampel-dashboard-grid')).toBeInTheDocument();
  });

  it('aktiviert Fokus ab 1024 px ohne Page-Reload', async () => {
    setTestViewport(1280);
    const user = userEvent.setup();
    mocks.ampel = { data: [projection('einheit-1', AmpelProjectionDtoStatusEnum.Gruen)], isLoading: false, isError: false };
    mocks.einheiten = { data: [einheit('einheit-1', 'Abschnitt Nord')], isLoading: false, isError: false };

    render(<AmpelDashboard einsatzId="einsatz-1" />);
    await user.click(screen.getByRole('button', { name: 'Fokus' }));

    expect(screen.getByTestId('ampel-dashboard-focus')).toBeInTheDocument();
    expect(mocks.storage.setItem).toHaveBeenCalledWith('bluelight-hub:eigenschutz:dashboard-view:v1', 'focus');
  });

  it('rendert bei gespeicherter Fokus-Ansicht unter 1024 px defensiv den Überblick', async () => {
    setTestViewport(800);
    await setDashboardView('focus');
    mocks.ampel = { data: [projection('einheit-1', AmpelProjectionDtoStatusEnum.Gruen)], isLoading: false, isError: false };

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    expect(screen.getByRole('button', { name: 'Fokus' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('ampel-dashboard-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('ampel-dashboard-focus')).toBeNull();
  });

  it('greift bei ausreichendem Viewport wieder auf gespeicherten Fokus zurück', async () => {
    setTestViewport(1280);
    await setDashboardView('focus');
    mocks.ampel = { data: [projection('einheit-1', AmpelProjectionDtoStatusEnum.Gelb)], isLoading: false, isError: false };
    mocks.einheiten = { data: [einheit('einheit-1', 'Abschnitt Nord')], isLoading: false, isError: false };

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    expect(screen.getByTestId('ampel-dashboard-focus')).toBeInTheDocument();
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Abschnitt Nord');
  });

  it('navigiert in der Fokus-Liste mit Pfeiltasten', async () => {
    setTestViewport(1280);
    await setDashboardView('focus');
    const user = userEvent.setup();
    mocks.ampel = {
      data: [projection('einheit-1', AmpelProjectionDtoStatusEnum.Rot), projection('einheit-2', AmpelProjectionDtoStatusEnum.Gelb)],
      isLoading: false,
      isError: false,
    };
    mocks.einheiten = { data: [einheit('einheit-1', 'Alpha'), einheit('einheit-2', 'Bravo')], isLoading: false, isError: false };

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    const first = screen.getByRole('option', { name: /Alpha/ });
    first.focus();
    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('option', { name: /Bravo/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('kündigt Warnungen im zugänglichen Namen der Fokus-Zeile an', async () => {
    setTestViewport(1280);
    await setDashboardView('focus');
    mocks.ampel = { data: [projection('einheit-1', AmpelProjectionDtoStatusEnum.Gelb)], isLoading: false, isError: false };
    mocks.einheiten = { data: [einheit('einheit-1', 'Abschnitt Nord')], isLoading: false, isError: false };
    mocks.warnBadges = {
      data: [
        {
          id: 'gefahr:gef-1:item-1',
          einsatzId: 'einsatz-1',
          einheitId: 'einheit-1',
          type: 'GEFAEHRDUNG_OHNE_SCHUTZMASSNAHME',
          label: 'Gefährdung ohne Schutzmaßnahme',
          sortRank: 10,
          occurredAt: new Date('2026-05-08T10:00:00.000Z'),
          gefaehrdungsbeurteilungId: 'gef-1',
          gefaehrdungItemId: 'item-1',
          gefaehrdungTitel: 'Kraftstoff',
        },
      ],
      isLoading: false,
      isError: false,
    };

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    expect(screen.getByRole('option', { name: /Abschnitt Nord.*1 Warnung/ })).toBeInTheDocument();
  });

  it('fällt stabil auf den ersten Eintrag zurück, wenn die Auswahl verschwindet', async () => {
    setTestViewport(1280);
    await setDashboardView('focus');
    const user = userEvent.setup();
    mocks.ampel = {
      data: [projection('einheit-1', AmpelProjectionDtoStatusEnum.Rot), projection('einheit-2', AmpelProjectionDtoStatusEnum.Gelb)],
      isLoading: false,
      isError: false,
    };
    mocks.einheiten = { data: [einheit('einheit-1', 'Alpha'), einheit('einheit-2', 'Bravo')], isLoading: false, isError: false };

    const { rerender } = render(<AmpelDashboard einsatzId="einsatz-1" />);
    await user.click(screen.getByRole('option', { name: /Bravo/ }));
    mocks.ampel = { data: [projection('einheit-1', AmpelProjectionDtoStatusEnum.Rot)], isLoading: false, isError: false };

    rerender(<AmpelDashboard einsatzId="einsatz-1" />);

    await waitFor(() => expect(screen.getByRole('option', { name: /Alpha/ })).toHaveAttribute('aria-selected', 'true'));
  });

  it('rendert ab xl das Seitenpanel neben dem Überblick', () => {
    setTestViewport(1280);
    mocks.ampel = { data: [projection('einheit-1', AmpelProjectionDtoStatusEnum.Gruen)], isLoading: false, isError: false };
    mocks.vorfaelle = {
      data: [
        {
          id: 'vorfall-1',
          einheitId: 'einheit-1',
          vorfallZeit: '2026-05-08T09:00:00.000Z',
          was: 'Beinahe-Sturz',
          unfallkasseRelevant: false,
          erfasstAm: '2026-05-08T09:01:00.000Z',
          erfasstVonUserId: 'user-1',
        },
      ],
      isLoading: false,
      isError: false,
    };

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    expect(screen.getByTestId('ampel-dashboard-with-panel')).toHaveClass('xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]');
    expect(screen.getByTestId('eigenschutz-offene-punkte-panel')).toBeInTheDocument();
    expect(screen.getByText('Beinahe-Sturz')).toBeInTheDocument();
  });

  it('rendert ab xl das Seitenpanel auch in der Fokus-Ansicht', async () => {
    setTestViewport(1280);
    await setDashboardView('focus');
    mocks.ampel = { data: [projection('einheit-1', AmpelProjectionDtoStatusEnum.Gelb)], isLoading: false, isError: false };
    mocks.einheiten = { data: [einheit('einheit-1', 'Abschnitt Nord')], isLoading: false, isError: false };
    mocks.rueckmeldungen = {
      data: [{ propagationGroupId: 'group-1', einsatzId: 'einsatz-1', einheitId: 'einheit-1', lueckeNotiz: 'Maske fehlt', gemeldetAm: '2026-05-08T09:00:00.000Z' }],
      isLoading: false,
      isError: false,
    };

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    expect(screen.getByTestId('ampel-dashboard-focus')).toBeInTheDocument();
    expect(screen.getByTestId('eigenschutz-offene-punkte-panel')).toBeInTheDocument();
    expect(screen.getByText('Maske fehlt')).toBeInTheDocument();
  });

  it('rendert unter xl den kompakten Indikator statt Inline-Panel', () => {
    setTestViewport(1024);
    mocks.ampel = { data: [projection('einheit-1', AmpelProjectionDtoStatusEnum.Gruen)], isLoading: false, isError: false };
    mocks.vorfaelle = {
      data: [
        {
          id: 'vorfall-1',
          einheitId: 'einheit-1',
          vorfallZeit: '2026-05-08T09:00:00.000Z',
          was: 'Beinahe-Sturz',
          unfallkasseRelevant: false,
          erfasstAm: '2026-05-08T09:01:00.000Z',
          erfasstVonUserId: 'user-1',
        },
      ],
      isLoading: false,
      isError: false,
    };
    mocks.rueckmeldungen = {
      data: [{ propagationGroupId: 'group-1', einsatzId: 'einsatz-1', einheitId: 'einheit-1', lueckeNotiz: 'Maske fehlt', gemeldetAm: '2026-05-08T09:00:00.000Z' }],
      isLoading: false,
      isError: false,
    };

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    expect(screen.getByRole('button', { name: '2 offene Punkte im Eigenschutz' })).toBeInTheDocument();
    expect(screen.queryByTestId('eigenschutz-offene-punkte-panel')).toBeNull();
  });

  it('hält Empty-State ohne Seitenpanel-Lücke stabil', () => {
    setTestViewport(1280);

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    expect(screen.getByTestId('ampel-dashboard-empty')).toHaveTextContent('Noch kein Sicherheitsstatus vorhanden.');
    expect(screen.queryByTestId('eigenschutz-offene-punkte-panel')).toBeNull();
  });

  it('lässt den View-Toggle mit Panel bedienbar', async () => {
    setTestViewport(1280);
    const user = userEvent.setup();
    mocks.ampel = { data: [projection('einheit-1', AmpelProjectionDtoStatusEnum.Gruen)], isLoading: false, isError: false };

    render(<AmpelDashboard einsatzId="einsatz-1" />);
    await user.click(screen.getByRole('button', { name: 'Fokus' }));

    expect(screen.getByRole('button', { name: 'Fokus' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('eigenschutz-offene-punkte-panel')).toBeInTheDocument();
  });
});
