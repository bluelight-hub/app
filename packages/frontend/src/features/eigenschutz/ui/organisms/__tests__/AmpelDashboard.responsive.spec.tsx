/**
 * Story 7.7 Breakpoint-Layout-Tests (AC4) + Render-basierter Touch-Target-Smoke (D2).
 *
 * Heuristik-Hinweis: jsdom evaluiert keine Tailwind-Media-Queries. Statische
 * Tailwind-Tokens wie `lg:grid-cols-2` oder `min-[1440px]:grid-cols-3` sind
 * im Source-Output bei jedem Viewport sichtbar — diese Assertions sind also
 * Tautologien und werden bewusst NUR als Smoke-Check (Source enthält das Token)
 * verwendet. Was diese Spec wirklich prüft, sind die viewport-abhängigen JSX-Branches:
 *
 *   - Inline-Seitenpanel (`useXlViewport === true`, ab 1280 px)
 *   - Wrapper-Class `xl:grid-cols-[…]` ist nur am Wrapper, wenn xl-Hook true ist
 *
 * Zusätzlich: render-basierter Touch-Target-Smoke über die transitively
 * gerenderten Audit-Scope-Komponenten (D2 — Render-Verifikation der UX-Spec
 * ≥ 44 px-Regel ergänzt die Source-Heuristik in `touch-target-audit.spec.tsx`).
 *
 * Echte Pixel-Layout-Verifikation gehört in den Browser-Smoke (Block A des
 * Device-Test-Berichts).
 *
 * Historisch (vor 2026-05-12): diese Spec deckte zusätzlich den Fokus-Modus
 * (Direction C) und das Toggle-Verhalten an der lg-Schwelle (1023/1024 px) ab.
 * Mit der Entfernung des Fokus-Modus (`spec-eigenschutz-fokusmodus-entfernen.md`)
 * sind diese Tests entfallen.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AmpelProjectionDtoAktivePsaProfileEnum,
  AmpelProjectionDtoStatusEnum,
  EinsatzEinheitDtoStatusEnum,
  EinsatzEinheitDtoTypEnum,
  type AmpelProjectionDto,
  type EinsatzEinheitDto,
} from '@bluelight-hub/shared/client';
import { AmpelDashboard } from '../AmpelDashboard';
import { resetTestViewport, setTestViewport } from '@/test/viewport';

const here = dirname(fileURLToPath(import.meta.url));
const featureRoot = resolve(here, '..', '..', '..');

const PRIMARY_TOUCH_TOKENS = ['min-h-12', 'min-h-[48px]', 'h-12', 'size-12'] as const;
const SECONDARY_TOUCH_TOKENS = ['min-h-11', 'min-h-[44px]', 'h-11', 'h-14', 'size-11'] as const;
const ALLOWED_TOUCH_TOKENS = [...PRIMARY_TOUCH_TOKENS, ...SECONDARY_TOUCH_TOKENS];

function hasAllowedTouchToken(className: string): boolean {
  return ALLOWED_TOUCH_TOKENS.some((token) => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[\\s'"\`,(:])${escaped}(?=[\\s'"\`,)]|$)`);
    return re.test(className);
  });
}

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

function projection(einheitId: string, status: AmpelProjectionDtoStatusEnum, overrides: Partial<AmpelProjectionDto> = {}): AmpelProjectionDto {
  return {
    einsatzId: 'einsatz-1',
    einheitId,
    status,
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
  mocks.ampel = {
    data: [projection('einheit-1', AmpelProjectionDtoStatusEnum.Gruen)],
    isLoading: false,
    isError: false,
  };
  mocks.einheiten = { data: [einheit('einheit-1', 'Abschnitt Nord')], isLoading: false, isError: false };
  mocks.warnBadges = { data: [], isLoading: false, isError: false };
  mocks.psa = { data: [], isLoading: false, isError: false };
  mocks.gefahren = { data: [], isLoading: false, isError: false };
  mocks.regeln = { data: [], isLoading: false, isError: false };
  mocks.vorfaelle = { data: [], isLoading: false, isError: false };
  mocks.rueckmeldungen = { data: [], isLoading: false, isError: false };
});

afterEach(() => {
  resetTestViewport();
});

describe('AmpelDashboard responsive (Story 7.7 Breakpoint-Switch)', () => {
  it('320 px (≤ 640): 1-spaltiges Card-Grid, kein Inline-Panel', async () => {
    setTestViewport({ width: 320, height: 568 });

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    const grid = await screen.findByTestId('ampel-dashboard-grid');
    // Statische Tailwind-Tokens (Source-Smoke; jsdom evaluiert keine Media-Queries):
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('lg:grid-cols-2');

    // Inline-Seitenpanel darf unter xl nicht gerendert werden:
    expect(screen.queryByTestId('eigenschutz-offene-punkte-panel')).toBeNull();
  });

  it('768 px (Tablet Portrait): bleibt 1-spaltig (lg-Schwelle 1024 px), kein Inline-Panel', async () => {
    setTestViewport({ width: 768, height: 1024 });

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    const grid = await screen.findByTestId('ampel-dashboard-grid');
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('lg:grid-cols-2');

    expect(screen.queryByTestId('eigenschutz-offene-punkte-panel')).toBeNull();
  });

  it('1024 px (Tablet Landscape): Karten-Grid sichtbar, kein Inline-Seitenpanel', async () => {
    setTestViewport({ width: 1024, height: 768 });

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    await screen.findByTestId('ampel-dashboard-grid');

    expect(screen.queryByTestId('eigenschutz-offene-punkte-panel'), 'Inline-Seitenpanel darf unter 1280 px nicht sichtbar sein.').toBeNull();
    const wrapper = screen.getByTestId('ampel-dashboard-with-panel');
    expect(wrapper.className, 'xl-Wrapper-Klasse darf unter 1280 px NICHT am Wrapper sein.').not.toContain('xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]');
  });

  it('1280 px (Desktop Standard): Inline-Seitenpanel sichtbar (xl-Slot belegt)', async () => {
    setTestViewport({ width: 1280, height: 800 });
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

    const wrapper = await screen.findByTestId('ampel-dashboard-with-panel');
    // Viewport-abhängig: xl-Wrapper-Klasse ist NUR ab 1280 px am Wrapper:
    expect(wrapper.className, 'xl-Wrapper-Klasse muss ab 1280 px am Wrapper sein.').toContain('xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]');
    // Viewport-abhängig: Inline-Seitenpanel rendert nur ab xl:
    expect(await screen.findByTestId('eigenschutz-offene-punkte-panel')).toBeInTheDocument();
  });

  it('1440 px (Wide Desktop): Card-Grid trägt min-[1440px]:grid-cols-3 und Seitenpanel bleibt sichtbar', async () => {
    setTestViewport({ width: 1440, height: 900 });

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    const grid = await screen.findByTestId('ampel-dashboard-grid');
    expect(grid.className).toContain('min-[1440px]:grid-cols-3');

    const wrapper = screen.getByTestId('ampel-dashboard-with-panel');
    expect(wrapper.className, 'xl-Wrapper-Klasse muss auch über xl-Schwelle bleiben.').toContain('xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]');
  });

  it('1439 px (genau unter xxl-Schwelle, off-by-one-Sentinel): xl-Panel sichtbar', async () => {
    setTestViewport({ width: 1439, height: 900 });
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

    const wrapper = await screen.findByTestId('ampel-dashboard-with-panel');
    expect(wrapper.className).toContain('xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]');
    await screen.findByTestId('eigenschutz-offene-punkte-panel');
  });
});

describe('AmpelDashboard render-basierter Touch-Target-Smoke (Story 7.7 / D2 / UX-Spec ≥ 44 px)', () => {
  function vorfallFixture() {
    return {
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
  }

  async function auditCurrentRender(label: string): Promise<void> {
    const buttons = screen.queryAllByRole('button');
    const links = screen.queryAllByRole('link');

    // Cross-Check: jeder data-touch-target-allow-Grund MUSS in CONSISTENCY.md auftauchen.
    // Verhindert silent Render-only Skips ohne Doku-Trail.
    const consistencyDocPath = resolve(featureRoot, 'CONSISTENCY.md');
    const consistencyDoc = readFileSync(consistencyDocPath, 'utf8');

    const offenders: string[] = [];
    for (const element of [...buttons, ...links]) {
      const className = element.className ?? '';
      const renderMarker = element.getAttribute('data-touch-target-allow');
      if (renderMarker !== null) {
        if (!consistencyDoc.includes(renderMarker)) {
          offenders.push(`[${label}] <${element.tagName.toLowerCase()}> data-touch-target-allow="${renderMarker}" — Grund ist nicht in CONSISTENCY.md gelistet.`);
        }
        continue;
      }
      if (hasAllowedTouchToken(className)) continue;
      // aria-disabled-Toggles sind Screenreader-Hilfen, kein primärer Touch-Target
      // mit eigener Aktion; sie werden über den umschließenden Container erreicht.
      if (element.getAttribute('aria-disabled') === 'true') continue;
      offenders.push(
        `[${label}] <${element.tagName.toLowerCase()}> "${element.getAttribute('aria-label') ?? element.textContent?.slice(0, 40) ?? ''}" — className=\`${className}\` enthält kein erlaubtes Höhen-Token (${ALLOWED_TOUCH_TOKENS.join(', ')}).`,
      );
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  }

  it('1280 px (Desktop Standard): alle gerenderten Buttons/Links haben Höhen-Token oder dokumentierten Render-Marker', async () => {
    setTestViewport({ width: 1280, height: 800 });
    mocks.vorfaelle = vorfallFixture();

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('ampel-dashboard-with-panel')).toBeInTheDocument();
    });

    await auditCurrentRender('1280px');
  });

  it('320 px (Mobile, Touch kritisch): Compact-Trigger und Cards halten Höhen-Token', async () => {
    setTestViewport({ width: 320, height: 568 });
    mocks.vorfaelle = vorfallFixture();

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('ampel-dashboard-grid')).toBeInTheDocument();
    });

    await auditCurrentRender('320px');
  });

  it('1024 px (lg-Schwelle): Karten-Grid sichtbar, alle Buttons/Links halten Höhen-Token', async () => {
    setTestViewport({ width: 1024, height: 768 });
    mocks.vorfaelle = vorfallFixture();

    render(<AmpelDashboard einsatzId="einsatz-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('ampel-dashboard-grid')).toBeInTheDocument();
    });

    await auditCurrentRender('1024px');
  });
});
