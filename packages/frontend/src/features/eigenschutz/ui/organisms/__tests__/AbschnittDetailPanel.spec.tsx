import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AmpelProjectionDtoAktivePsaProfileEnum, AmpelProjectionDtoStatusEnum, type AmpelProjectionDto, type EinsatzEinheitDto } from '@bluelight-hub/shared/client';
import type { Gefaehrdungsbeurteilung, SicherheitsregelDto } from '@bluelight-hub/shared/schemas';
import { AbschnittDetailPanel } from '../AbschnittDetailPanel';

type QueryState<T> = {
  data?: T;
  isLoading: boolean;
  isError: boolean;
};

const { mocks } = vi.hoisted(() => ({
  mocks: {
    psa: { data: [], isLoading: false, isError: false } as QueryState<Array<{ id: string; profil: string; version: number }>>,
    gefahren: { data: [], isLoading: false, isError: false } as QueryState<Gefaehrdungsbeurteilung[]>,
    regeln: { data: [], isLoading: false, isError: false } as QueryState<SicherheitsregelDto[]>,
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

vi.mock('../../../api/queries', () => ({
  usePsaProfileByEinheit: () => mocks.psa,
  useGefaehrdungsbeurteilungen: () => mocks.gefahren,
  useSicherheitsregeln: () => mocks.regeln,
}));

function projection(overrides: Partial<AmpelProjectionDto> = {}): AmpelProjectionDto {
  return {
    einsatzId: 'einsatz-1',
    einheitId: 'einheit-1',
    status: AmpelProjectionDtoStatusEnum.Rot,
    aktivePsaProfile: [AmpelProjectionDtoAktivePsaProfileEnum.Basis],
    offeneGefaehrdungenHoch: 2,
    ausstehendePsaQuittungen: 1,
    ausstehendeRegelQuittungen: 1,
    offeneVorfaelle: 1,
    ungeloesteRueckmeldungen: 0,
    letzteAenderungAm: '2026-05-08T07:15:00.000Z' as unknown as Date,
    letzteAenderungVonUserId: null,
    ...overrides,
  };
}

const einheit = {
  id: 'einheit-1',
  name: 'Abschnitt Nord',
  typ: 'ABSCHNITT',
  status: 'IM_EINSATZ',
  sollStaerke: 4,
  istStaerke: 3,
} as EinsatzEinheitDto;

function gefahr(id: string, einheitId: string): Gefaehrdungsbeurteilung {
  return {
    id,
    einsatzId: 'einsatz-1',
    einheitId,
    vorlageId: null,
    gefahrenzoneId: null,
    items: [{ id: `${id}-item`, title: 'Atemschutz prüfen', beschreibung: null, risiko: null, massnahmen: null, erledigt: false }],
    version: 1,
    erstelltAm: '2026-05-08T07:00:00.000Z',
    erstelltVonUserId: 'user-1',
    aktualisiertAm: '2026-05-08T07:10:00.000Z',
    aktualisiertVonUserId: 'user-1',
  } as Gefaehrdungsbeurteilung;
}

function regel(id: string, einheitId: string | null | undefined): SicherheitsregelDto {
  return {
    id,
    einsatzId: 'einsatz-1',
    einheitId,
    einsatzweit: einheitId == null,
    titel: einheitId == null ? 'Einsatzweit funken' : 'Abstand halten',
    inhalt: 'Kurz und klar',
    version: 1,
    erstelltAm: '2026-05-08T07:00:00.000Z',
    erstelltVonUserId: 'user-1',
    aktualisiertAm: '2026-05-08T07:10:00.000Z',
    aktualisiertVonUserId: 'user-1',
    propagationGroupId: `pg-${id}`,
  };
}

describe('AbschnittDetailPanel', () => {
  beforeEach(() => {
    mocks.psa = { data: [], isLoading: false, isError: false };
    mocks.gefahren = { data: [], isLoading: false, isError: false };
    mocks.regeln = { data: [], isLoading: false, isError: false };
  });

  it('rendert Header, Status und echte Primäraktion', () => {
    render(<AbschnittDetailPanel einsatzId="einsatz-1" projection={projection()} einheit={einheit} />);

    expect(screen.getByRole('heading', { name: 'Abschnitt Nord' })).toBeInTheDocument();
    expect(screen.getByText('Rot')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'PSA für Abschnitt Nord ändern' })).toHaveAttribute('href', '/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile');
  });

  it('zeigt PSA-Status aus Ampel- und Detaildaten', () => {
    mocks.psa = { data: [{ id: 'psa-1', profil: 'BASIS', version: 2 }], isLoading: false, isError: false };

    render(<AbschnittDetailPanel einsatzId="einsatz-1" projection={projection({ ausstehendePsaQuittungen: 2 })} einheit={einheit} />);

    const block = screen.getByTestId('abschnitt-detail-psa');
    expect(within(block).getByText('Basis')).toBeInTheDocument();
    expect(within(block).getByText('2 PSA offen')).toBeInTheDocument();
  });

  it('zeigt leere PSA-Detaildaten nicht als alte Projektionsprofile an', () => {
    mocks.psa = { data: [], isLoading: false, isError: false };

    render(<AbschnittDetailPanel einsatzId="einsatz-1" projection={projection({ aktivePsaProfile: [AmpelProjectionDtoAktivePsaProfileEnum.Basis] })} einheit={einheit} />);

    const block = screen.getByTestId('abschnitt-detail-psa');
    expect(within(block).getByText('Kein aktives Profil')).toBeInTheDocument();
    expect(within(block).queryByText('Basis')).toBeNull();
  });

  it('rendert den Einheitenblock aus der Einheiten-Query', () => {
    render(<AbschnittDetailPanel einsatzId="einsatz-1" projection={projection()} einheit={einheit} />);

    expect(screen.getByText('Stärke 3/4')).toBeInTheDocument();
    expect(screen.getByText('IM_EINSATZ')).toBeInTheDocument();
  });

  it('filtert Gefährdungsbeurteilungen nach einheitId', () => {
    mocks.gefahren = { data: [gefahr('g-1', 'einheit-1'), gefahr('g-2', 'einheit-2')], isLoading: false, isError: false };

    render(<AbschnittDetailPanel einsatzId="einsatz-1" projection={projection()} einheit={einheit} />);

    const block = screen.getByTestId('abschnitt-detail-gefahren');
    expect(within(block).getByText('Atemschutz prüfen')).toBeInTheDocument();
    expect(within(block).queryByText('g-2')).toBeNull();
  });

  it('zeigt Sicherheitsregeln für die ausgewählte Einheit', () => {
    mocks.regeln = { data: [regel('r-1', 'einheit-1'), regel('r-2', null)], isLoading: false, isError: false };

    render(<AbschnittDetailPanel einsatzId="einsatz-1" projection={projection()} einheit={einheit} />);

    const block = screen.getByTestId('abschnitt-detail-regeln');
    expect(within(block).getByText('Abstand halten')).toBeInTheDocument();
    expect(within(block).getByText('Einsatzweit funken')).toBeInTheDocument();
  });

  it('zeigt einsatzweite Sicherheitsregeln auch mit normalisierter undefined-einheitId', () => {
    mocks.regeln = { data: [regel('r-1', undefined)], isLoading: false, isError: false };

    render(<AbschnittDetailPanel einsatzId="einsatz-1" projection={projection()} einheit={einheit} />);

    expect(within(screen.getByTestId('abschnitt-detail-regeln')).getByText('Einsatzweit funken')).toBeInTheDocument();
  });

  it('zeigt dezente Platzhalter während Detaildaten laden', () => {
    mocks.psa = { data: [], isLoading: true, isError: false };
    mocks.gefahren = { data: [], isLoading: true, isError: false };
    mocks.regeln = { data: [], isLoading: true, isError: false };

    render(<AbschnittDetailPanel einsatzId="einsatz-1" projection={projection()} einheit={einheit} />);

    expect(screen.getAllByText('Lädt…')).toHaveLength(3);
  });

  it('rendert Detailfehler inline', () => {
    mocks.regeln = { data: [], isLoading: false, isError: true };

    render(<AbschnittDetailPanel einsatzId="einsatz-1" projection={projection()} einheit={einheit} />);

    expect(screen.getByRole('status')).toHaveTextContent('Sicherheitsregeln konnten nicht geladen werden.');
  });

  it('erfindet keine Daten, wenn Listen leer sind', () => {
    render(<AbschnittDetailPanel einsatzId="einsatz-1" projection={projection({ aktivePsaProfile: [] })} einheit={einheit} />);

    expect(screen.getByText('Kein aktives Profil')).toBeInTheDocument();
    expect(screen.getByText('Keine Gefährdungsbeurteilung für diesen Abschnitt.')).toBeInTheDocument();
    expect(screen.getByText('Keine Sicherheitsregeln für diesen Abschnitt.')).toBeInTheDocument();
  });
});
