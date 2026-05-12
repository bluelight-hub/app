/**
 * A11y-Audit (Story 7.8) — axe-core State-Matrix für Eigenschutz-Hero-Komponenten.
 *
 * Diese Spec ist das Block-A-Gate aus Story 7.8: pro Audit-Scope-Komponente
 * werden mehrere Render-States gemountet und gegen `axe-core` (WCAG 2.1 AA +
 * Best-Practice) geprüft. Es darf 0 Violations geben.
 *
 * jsdom-Limit: `color-contrast` und `color-contrast-enhanced` sind im Helper
 * (`src/test/a11y.ts`) per Default deaktiviert. Diese Pfade laufen über die
 * Token-Spec (`contrast-audit.spec.ts`) und Block-B-Browser-Smoke. Layout-
 * getriebene Regeln liefern in jsdom unzuverlässige Ergebnisse, weil
 * `getBoundingClientRect()` immer `0,0,0,0` zurückgibt.
 *
 * Falsch-positive Befunde werden nicht still stummgeschaltet — wenn axe für
 * eine bewusste Designentscheidung einen Verstoß meldet, wird die Regel mit
 * `// axe-allow:`-Marker plus Eintrag in `CONSISTENCY.md` lokal in der Spec
 * deaktiviert. Aktuell: keine `axe-allow`-Marker.
 *
 * Hero-Routen-Smoke (vollständiger TanStack-Router-Mount mit `RouterProvider`)
 * ist hier bewusst NICHT enthalten — die Routen ziehen umfangreiche Query- und
 * Provider-Mock-Kaskaden nach sich, die in der bestehenden
 * `eigenschutz.route.spec.tsx` bereits gepflegt werden. Die State-Matrix der
 * mountbaren Schlüssel-Komponenten erreicht denselben Audit-Wert (axe deckt
 * generierte DOM-Strukturen, nicht Routenlogik). Die Routen-DOM-Surface wird
 * über die enthaltenen Komponenten transitiv mit-geprüft.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AmpelProjectionDtoAktivePsaProfileEnum, AmpelProjectionDtoStatusEnum, AmpelWarnBadgeDtoTypeEnum, type AmpelProjectionDto, type AmpelWarnBadgeDto } from '@bluelight-hub/shared/client';
import { PSA_PROFIL_REIHENFOLGE } from '../constants/psa-profil.constants';
import { AmpelCard } from '../ui/organisms/AmpelCard';
import { SeverityBanner } from '../ui/organisms/SeverityBanner';
import { AmpelWarnBadgeList } from '../ui/molecules/AmpelWarnBadgeList';
import { PSAProfileChip } from '../ui/molecules/PSAProfileChip';
import { StatusIndicator, QuittungsSummary } from '../ui/molecules/StatusIndicator';
import { SyncStatusBadge, type SyncStatusBadgeStatus } from '../ui/molecules/SyncStatusBadge';
import { EigenschutzShortcutHelpPopover } from '../ui/molecules/EigenschutzShortcutHelpPopover';

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

const baseProjection: AmpelProjectionDto = {
  einsatzId: 'einsatz-1',
  einheitId: 'einheit-abc123456789',
  status: AmpelProjectionDtoStatusEnum.Gruen,
  aktivePsaProfile: [AmpelProjectionDtoAktivePsaProfileEnum.Basis],
  offeneGefaehrdungenHoch: 0,
  ausstehendePsaQuittungen: 0,
  ausstehendeRegelQuittungen: 0,
  offeneVorfaelle: 0,
  ungeloesteRueckmeldungen: 0,
  letzteAenderungAm: new Date('2026-05-08T07:15:00.000Z'),
  letzteAenderungVonUserId: null,
};

function projection(overrides: Partial<AmpelProjectionDto> = {}): AmpelProjectionDto {
  return { ...baseProjection, ...overrides };
}

function warnBadge(overrides: Partial<AmpelWarnBadgeDto> = {}): AmpelWarnBadgeDto {
  return {
    id: 'badge-default',
    einsatzId: baseProjection.einsatzId,
    einheitId: baseProjection.einheitId,
    type: AmpelWarnBadgeDtoTypeEnum.GefaehrdungOhneSchutzmassnahme,
    label: 'Gefährdung ohne Schutzmaßnahme',
    sortRank: 10,
    occurredAt: new Date('2026-05-08T08:00:00.000Z'),
    gefaehrdungsbeurteilungId: 'gefb-1',
    gefaehrdungItemId: 'gefitem-1',
    gefaehrdungTitel: 'Sturzgefahr',
    ...overrides,
  };
}

describe('A11y-Audit · AmpelCard', () => {
  it.each([
    [AmpelProjectionDtoStatusEnum.Gruen, 'Status grün — populated'],
    [AmpelProjectionDtoStatusEnum.Gelb, 'Status gelb — populated'],
    [AmpelProjectionDtoStatusEnum.Rot, 'Status rot — populated'],
  ])('rendert ohne axe-Violations: %s', async (status) => {
    const { container } = render(<AmpelCard projection={projection({ status, ausstehendePsaQuittungen: 2, offeneVorfaelle: 1 })} einheitName="Abschnitt Nord" warnBadges={[warnBadge()]} />);
    await expect(container).toHaveNoAxeViolations();
  });

  it('rendert ohne axe-Violations: leerer PSA-Zustand', async () => {
    const { container } = render(<AmpelCard projection={projection({ aktivePsaProfile: [] })} einheitName="Abschnitt Süd" />);
    await expect(container).toHaveNoAxeViolations();
  });

  it('rendert ohne axe-Violations: defensive Fallback-einheitId ohne Name', async () => {
    const { container } = render(<AmpelCard projection={projection({ einheitId: 'clvabcdef1234567890xyz' })} />);
    await expect(container).toHaveNoAxeViolations();
  });

  it('rendert ohne axe-Violations: Drift-Profil unbekannt', async () => {
    const { container } = render(<AmpelCard projection={projection({ aktivePsaProfile: ['NEUES_PROFIL'] as unknown as AmpelProjectionDto['aktivePsaProfile'] })} einheitName="Abschnitt Drift" />);
    await expect(container).toHaveNoAxeViolations();
  });
});

describe('A11y-Audit · StatusIndicator', () => {
  it.each([
    [AmpelProjectionDtoStatusEnum.Gruen, 'idle · grün'],
    [AmpelProjectionDtoStatusEnum.Gelb, 'warning · gelb'],
    [AmpelProjectionDtoStatusEnum.Rot, 'critical · rot'],
    [null, 'unknown · null-Fallback'],
  ])('rendert ohne axe-Violations: %s', async (status) => {
    const { container } = render(<StatusIndicator status={status} />);
    await expect(container).toHaveNoAxeViolations();
  });
});

describe('A11y-Audit · QuittungsSummary', () => {
  it.each([
    ['empty · 0 ausstehend', 0, 0],
    ['populated · 2 PSA / 1 Regel', 2, 1],
    ['edge · negative Inputs werden defensiv normalisiert', -3, 0],
  ])('rendert ohne axe-Violations: %s', async (_label, psa, regeln) => {
    const { container } = render(<QuittungsSummary ausstehendePsaQuittungen={psa} ausstehendeRegelQuittungen={regeln} />);
    await expect(container).toHaveNoAxeViolations();
  });
});

describe('A11y-Audit · SyncStatusBadge', () => {
  const STATUS_VALUES: SyncStatusBadgeStatus[] = ['idle', 'dirty', 'debouncing', 'local-saved', 'syncing', 'synced', 'offline-queued', 'pending', 'offline', 'conflict', 'error'];

  it.each(STATUS_VALUES)('rendert ohne axe-Violations: status=%s', async (status) => {
    const { container } = render(<SyncStatusBadge status={status} pendingCount={status === 'pending' ? 2 : 0} savedVersion={status === 'synced' ? 7 : undefined} />);
    await expect(container).toHaveNoAxeViolations();
  });
});

describe('A11y-Audit · AmpelWarnBadgeList', () => {
  it('rendert ohne axe-Violations: empty (kein DOM)', async () => {
    const { container } = render(<AmpelWarnBadgeList einsatzId="einsatz-1" badges={[]} einheitName="Leer" />);
    await expect(container).toHaveNoAxeViolations();
  });

  it('rendert ohne axe-Violations: populated card-Variant mit Truncation', async () => {
    const badges = [
      warnBadge({ id: 'b1', type: AmpelWarnBadgeDtoTypeEnum.GefaehrdungOhneSchutzmassnahme, label: 'Gefährdung A' }),
      warnBadge({ id: 'b2', type: AmpelWarnBadgeDtoTypeEnum.PsaQuittungUeberfaellig, label: 'PSA-Quittung überfällig', ueberfaelligSeitMin: 75, propagationGroupId: 'grp-1' }),
      warnBadge({ id: 'b3', type: AmpelWarnBadgeDtoTypeEnum.PsaQuittungUeberfaellig, label: 'Weitere Quittung', ueberfaelligSeitMin: 32, propagationGroupId: 'grp-2' }),
      warnBadge({ id: 'b4', type: AmpelWarnBadgeDtoTypeEnum.GefaehrdungOhneSchutzmassnahme, label: 'Gefährdung B' }),
    ];
    const { container } = render(<AmpelWarnBadgeList einsatzId="einsatz-1" badges={badges} einheitName="Abschnitt Drei" maxVisible={2} variant="card" />);
    await expect(container).toHaveNoAxeViolations();
  });

  it('rendert ohne axe-Violations: compact-Variant', async () => {
    const { container } = render(<AmpelWarnBadgeList einsatzId="einsatz-1" badges={[warnBadge(), warnBadge({ id: 'b2' })]} einheitName="Compact" variant="compact" />);
    await expect(container).toHaveNoAxeViolations();
  });
});

describe('A11y-Audit · PSAProfileChip', () => {
  it.each(PSA_PROFIL_REIHENFOLGE)('rendert ohne axe-Violations: profil=%s · idle', async (profil) => {
    const { container } = render(<PSAProfileChip profil={profil} active={false} onToggle={() => undefined} />);
    await expect(container).toHaveNoAxeViolations();
  });

  it.each(PSA_PROFIL_REIHENFOLGE)('rendert ohne axe-Violations: profil=%s · aktiv', async (profil) => {
    const { container } = render(<PSAProfileChip profil={profil} active onToggle={() => undefined} />);
    await expect(container).toHaveNoAxeViolations();
  });

  it('rendert ohne axe-Violations: pending optimistisch', async () => {
    const { container } = render(<PSAProfileChip profil="CBRN_PATIENT" active={false} optimisticActive pendingChange onToggle={() => undefined} />);
    await expect(container).toHaveNoAxeViolations();
  });

  it('rendert ohne axe-Violations: disabled', async () => {
    const { container } = render(<PSAProfileChip profil="BASIS" active onToggle={() => undefined} disabled />);
    await expect(container).toHaveNoAxeViolations();
  });

  it('rendert ohne axe-Violations: mixed (Tri-State)', async () => {
    const { container } = render(<PSAProfileChip profil="INFEKTION" active={false} onToggle={() => undefined} mixed mixedBadge="2 von 4 aktiv" />);
    await expect(container).toHaveNoAxeViolations();
  });
});

describe('A11y-Audit · SeverityBanner', () => {
  it.each([
    [
      'critical · assertive · mit Aktionen',
      { variant: 'critical' as const, headline: 'Kritischer PSA-Wechsel', body: 'CBRN-Patientenversorgung wurde aktiviert.', primaryActionLabel: 'Quittieren', onPrimary: () => undefined },
    ],
    ['warning · polite · headline only', { variant: 'warning' as const, headline: 'Sicherheitsregel geändert' }],
    [
      'info · polite · mit secondary + tertiary',
      {
        variant: 'info' as const,
        headline: 'Erst-Bekanntgabe',
        body: 'Neue Regel ist aktiv.',
        secondaryActionLabel: 'Später',
        onSecondary: () => undefined,
        tertiaryActionLabel: 'Details',
        onTertiary: () => undefined,
      },
    ],
    ['critical · pending', { variant: 'critical' as const, headline: 'In Verarbeitung', primaryActionLabel: 'Quittieren', onPrimary: () => undefined, pending: true }],
    ['critical · inline-Error mit Retry', { variant: 'critical' as const, headline: 'Quittierung fehlgeschlagen', inlineError: 'Speichern fehlgeschlagen', onRetry: () => undefined }],
  ])('rendert ohne axe-Violations: %s', async (_label, props) => {
    const { container } = render(<SeverityBanner {...props} />);
    await expect(container).toHaveNoAxeViolations();
  });
});

describe('A11y-Audit · EigenschutzShortcutHelpPopover', () => {
  const CONTEXTS = ['dashboard', 'gefaehrdungen', 'vorfaelle', 'risk-matrix', 'psa-profile', 'drawer'] as const;

  it.each(CONTEXTS)('rendert ohne axe-Violations: closed · context=%s', async (context) => {
    const { container } = render(<EigenschutzShortcutHelpPopover context={context} open={false} onOpenChange={() => undefined} />);
    await expect(container).toHaveNoAxeViolations();
  });

  it.each(CONTEXTS)('rendert ohne axe-Violations: open · context=%s', async (context) => {
    const { container } = render(<EigenschutzShortcutHelpPopover context={context} open onOpenChange={() => undefined} />);
    await expect(container).toHaveNoAxeViolations();
  });
});
