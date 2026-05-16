/**
 * Spec für `EigenschutzModulStatus`.
 *
 * Die Sektion rendert vier Deep-Link-Tiles (Gefährdungen, Sicherheitsregeln,
 * Sicherungsposten, Vorfälle) auf der Eigenschutz-Übersicht.
 *
 * Tests decken:
 * - Counts und Pills aus Mock-Hooks (Aggregate-Pills aus `AmpelProjectionDto`).
 * - Empty States (keine Pills bei 0 offenen Hoch-Gefährdungen / Quittungen / Vorfällen).
 * - Deep-Link-Ziele + `einsatzId`-Param.
 * - Singular/Plural-Strings für die Counts.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AmpelProjectionDtoAktivePsaProfileEnum,
  AmpelProjectionDtoStatusEnum,
  type AmpelProjectionDto,
  type EigenschutzVorfallListItemDto,
  type GefaehrdungsbeurteilungDto,
  type SicherheitsregelDto,
  type SicherungspostenDto,
} from '@bluelight-hub/shared/client';

type QueryState<T> = {
  data?: T;
  isLoading: boolean;
  isError: boolean;
};

const { mocks } = vi.hoisted(() => ({
  mocks: {
    ampel: { data: [] as AmpelProjectionDto[], isLoading: false, isError: false } as QueryState<AmpelProjectionDto[]>,
    gefaehrdungen: { data: [] as GefaehrdungsbeurteilungDto[], isLoading: false, isError: false } as QueryState<GefaehrdungsbeurteilungDto[]>,
    sicherheitsregeln: { data: [] as SicherheitsregelDto[], isLoading: false, isError: false } as QueryState<SicherheitsregelDto[]>,
    sicherungsposten: { data: [] as SicherungspostenDto[], isLoading: false, isError: false } as QueryState<SicherungspostenDto[]>,
    vorfaelle: { data: [] as EigenschutzVorfallListItemDto[], isLoading: false, isError: false } as QueryState<EigenschutzVorfallListItemDto[]>,
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

vi.mock('../../../api/queries', () => ({
  useGefaehrdungsbeurteilungen: () => mocks.gefaehrdungen,
  useSicherheitsregeln: () => mocks.sicherheitsregeln,
}));

vi.mock('../../../api/use-sicherungsposten', () => ({
  useListSicherungsposten: () => mocks.sicherungsposten,
}));

vi.mock('../../../api/use-list-vorfaelle', () => ({
  useListVorfaelle: () => mocks.vorfaelle,
}));

import { EigenschutzModulStatus } from '../EigenschutzModulStatus';

function projection(einheitId: string, overrides: Partial<AmpelProjectionDto> = {}): AmpelProjectionDto {
  return {
    einsatzId: 'einsatz-1',
    einheitId,
    status: AmpelProjectionDtoStatusEnum.Gruen,
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

function gefaehrdung(id: string): GefaehrdungsbeurteilungDto {
  return {
    id,
    einsatzId: 'einsatz-1',
    einheitId: 'einheit-1',
    vorlageId: null,
    gefahrenzoneId: null,
    items: [],
    version: 1,
    erstelltAm: '2026-05-08T07:00:00.000Z',
    erstelltVonUserId: 'user-1',
    aktualisiertAm: '2026-05-08T07:15:00.000Z',
    aktualisiertVonUserId: 'user-1',
  };
}

function regel(id: string): SicherheitsregelDto {
  return {
    id,
    einsatzId: 'einsatz-1',
    einheitId: null,
    einsatzweit: true,
    titel: `Regel ${id}`,
    inhalt: 'Inhalt',
    version: 1,
    erstelltAm: '2026-05-08T07:00:00.000Z',
    erstelltVonUserId: 'user-1',
    aktualisiertAm: '2026-05-08T07:00:00.000Z',
    aktualisiertVonUserId: 'user-1',
    propagationGroupId: `group-${id}`,
  };
}

function posten(id: string): SicherungspostenDto {
  return {
    id,
    einsatzId: 'einsatz-1',
    einheitId: null,
    bezeichnung: `Posten ${id}`,
    standort: { coordinate: null, address: null },
    personal: [],
    zustaendigkeitsbereich: null,
    abloesezeiten: null,
    status: 'AKTIV',
    aufgeloestAm: null,
    aufgeloestVonUserId: null,
    aufloeseGrund: null,
    version: 1,
    erstelltAm: '2026-05-08T07:00:00.000Z',
    erstelltVonUserId: 'user-1',
    aktualisiertAm: '2026-05-08T07:00:00.000Z',
    aktualisiertVonUserId: 'user-1',
  } as unknown as SicherungspostenDto;
}

function vorfall(id: string): EigenschutzVorfallListItemDto {
  return {
    id,
    einheitId: 'einheit-1',
    vorfallZeit: '2026-05-08T09:00:00.000Z',
    was: 'Beinahe-Sturz',
    unfallkasseRelevant: false,
    erfasstAm: '2026-05-08T09:01:00.000Z',
    erfasstVonUserId: 'user-1',
  } as unknown as EigenschutzVorfallListItemDto;
}

beforeEach(() => {
  mocks.ampel = { data: [], isLoading: false, isError: false };
  mocks.gefaehrdungen = { data: [], isLoading: false, isError: false };
  mocks.sicherheitsregeln = { data: [], isLoading: false, isError: false };
  mocks.sicherungsposten = { data: [], isLoading: false, isError: false };
  mocks.vorfaelle = { data: [], isLoading: false, isError: false };
});

describe('EigenschutzModulStatus', () => {
  it('rendert alle vier Modul-Tiles in der Sektion', () => {
    render(<EigenschutzModulStatus einsatzId="einsatz-1" />);

    expect(screen.getByTestId('eigenschutz-modul-status')).toBeInTheDocument();
    expect(screen.getByTestId('modul-status-tile-gefaehrdungen')).toBeInTheDocument();
    expect(screen.getByTestId('modul-status-tile-sicherheitsregeln')).toBeInTheDocument();
    expect(screen.getByTestId('modul-status-tile-sicherungsposten')).toBeInTheDocument();
    expect(screen.getByTestId('modul-status-tile-vorfaelle')).toBeInTheDocument();
  });

  it('zeigt Counts aus den Mock-Hooks pro Tile', () => {
    mocks.gefaehrdungen = { data: [gefaehrdung('g1'), gefaehrdung('g2'), gefaehrdung('g3')], isLoading: false, isError: false };
    mocks.sicherheitsregeln = { data: [regel('r1'), regel('r2')], isLoading: false, isError: false };
    mocks.sicherungsposten = { data: [posten('p1'), posten('p2'), posten('p3'), posten('p4')], isLoading: false, isError: false };
    mocks.vorfaelle = { data: [vorfall('v1')], isLoading: false, isError: false };

    render(<EigenschutzModulStatus einsatzId="einsatz-1" />);

    expect(screen.getByTestId('modul-status-tile-gefaehrdungen-count')).toHaveTextContent('3');
    expect(screen.getByTestId('modul-status-tile-sicherheitsregeln-count')).toHaveTextContent('2');
    expect(screen.getByTestId('modul-status-tile-sicherungsposten-count')).toHaveTextContent('4');
    expect(screen.getByTestId('modul-status-tile-vorfaelle-count')).toHaveTextContent('1');
  });

  it('aggregiert offene Hoch-Gefährdungen über alle AmpelProjections', () => {
    mocks.ampel = {
      data: [projection('einheit-a', { offeneGefaehrdungenHoch: 2 }), projection('einheit-b', { offeneGefaehrdungenHoch: 1 }), projection('einheit-c', { offeneGefaehrdungenHoch: 0 })],
      isLoading: false,
      isError: false,
    };

    render(<EigenschutzModulStatus einsatzId="einsatz-1" />);

    const pill = screen.getByTestId('modul-status-tile-gefaehrdungen-pill');
    expect(pill).toHaveTextContent('3');
    expect(pill).toHaveTextContent('offene Hoch-Gefährdungen');
  });

  it('zeigt Singular-Label bei genau einer Hoch-Gefährdung', () => {
    mocks.ampel = { data: [projection('einheit-a', { offeneGefaehrdungenHoch: 1 })], isLoading: false, isError: false };

    render(<EigenschutzModulStatus einsatzId="einsatz-1" />);

    expect(screen.getByTestId('modul-status-tile-gefaehrdungen-pill')).toHaveTextContent('1offene Hoch-Gefährdung');
  });

  it('aggregiert ausstehende Regel-Quittungen über alle AmpelProjections', () => {
    mocks.ampel = {
      data: [projection('einheit-a', { ausstehendeRegelQuittungen: 5 }), projection('einheit-b', { ausstehendeRegelQuittungen: 2 })],
      isLoading: false,
      isError: false,
    };

    render(<EigenschutzModulStatus einsatzId="einsatz-1" />);

    const pill = screen.getByTestId('modul-status-tile-sicherheitsregeln-pill');
    expect(pill).toHaveTextContent('7');
    expect(pill).toHaveTextContent('ausstehende Quittungen');
  });

  it('blendet Pills aus, wenn die Aggregate 0 sind', () => {
    mocks.ampel = { data: [projection('einheit-a')], isLoading: false, isError: false };

    render(<EigenschutzModulStatus einsatzId="einsatz-1" />);

    expect(screen.queryByTestId('modul-status-tile-gefaehrdungen-pill')).toBeNull();
    expect(screen.queryByTestId('modul-status-tile-sicherheitsregeln-pill')).toBeNull();
    expect(screen.queryByTestId('modul-status-tile-vorfaelle-pill')).toBeNull();
  });

  it('zeigt eine Vorfälle-Pill, wenn Vorfälle existieren', () => {
    mocks.vorfaelle = { data: [vorfall('v1'), vorfall('v2')], isLoading: false, isError: false };

    render(<EigenschutzModulStatus einsatzId="einsatz-1" />);

    const pill = screen.getByTestId('modul-status-tile-vorfaelle-pill');
    expect(pill).toHaveTextContent('2');
    expect(pill).toHaveTextContent('offene Vorfälle');
  });

  it('rendert nie eine Sicherungsposten-Pill (kein offenes Konzept)', () => {
    mocks.sicherungsposten = { data: [posten('p1'), posten('p2')], isLoading: false, isError: false };

    render(<EigenschutzModulStatus einsatzId="einsatz-1" />);

    expect(screen.queryByTestId('modul-status-tile-sicherungsposten-pill')).toBeNull();
  });

  it('verlinkt jedes Tile auf den passenden Sub-Tab mit einsatzId-Param', () => {
    render(<EigenschutzModulStatus einsatzId="einsatz-42" />);

    const expectations: ReadonlyArray<readonly [string, string]> = [
      ['modul-status-tile-gefaehrdungen', '/app/einsatz/$einsatzId/sicherheit/eigenschutz/gefaehrdungen'],
      ['modul-status-tile-sicherheitsregeln', '/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherheitsregeln'],
      ['modul-status-tile-sicherungsposten', '/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten'],
      ['modul-status-tile-vorfaelle', '/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle'],
    ];

    for (const [testId, expectedTo] of expectations) {
      const link = screen.getByTestId(testId);
      expect(link).toHaveAttribute('href', expectedTo);
      expect(link).toHaveAttribute('data-params', JSON.stringify({ einsatzId: 'einsatz-42' }));
    }
  });

  it('zeigt Loading-Platzhalter pro Tile, wenn die Quelle lädt', () => {
    mocks.gefaehrdungen = { data: undefined, isLoading: true, isError: false };

    render(<EigenschutzModulStatus einsatzId="einsatz-1" />);

    const tile = screen.getByTestId('modul-status-tile-gefaehrdungen');
    expect(tile).toHaveTextContent('Lädt');
    expect(screen.queryByTestId('modul-status-tile-gefaehrdungen-count')).toBeNull();
  });

  it('zeigt Fehler-Inline ohne Toast, wenn die Quelle fehlschlägt', () => {
    mocks.vorfaelle = { data: undefined, isLoading: false, isError: true };

    render(<EigenschutzModulStatus einsatzId="einsatz-1" />);

    expect(screen.getByTestId('modul-status-tile-vorfaelle-error')).toHaveTextContent('Fehler beim Laden');
  });
});
