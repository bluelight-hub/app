/**
 * Storybook State-Matrix für `AmpelCard`.
 *
 * Storybook ist im Repo derzeit nicht installiert; CSF3 ist hier als
 * Fixture-Scaffold abgelegt. Sobald Storybook initialisiert wird, lassen
 * sich die lokalen Typ-Stubs gegen `@storybook/react` austauschen.
 */

import type { ComponentType } from 'react';
import { AmpelProjectionDtoAktivePsaProfileEnum, AmpelProjectionDtoStatusEnum, type AmpelProjectionDto } from '@bluelight-hub/shared/client';
import { SyncStatusBadge } from '../molecules/SyncStatusBadge';
import { AmpelCard } from './AmpelCard';
import { SeverityBanner } from './SeverityBanner';

type ComponentProps<T> = T extends ComponentType<infer P> ? P : never;
interface Meta<T> {
  title: string;
  component: T;
  parameters?: Record<string, unknown>;
}
interface StoryObj<T> {
  args?: ComponentProps<T>;
  parameters?: Record<string, unknown>;
  render?: (args: ComponentProps<T>) => React.ReactElement;
}

const baseProjection: AmpelProjectionDto = {
  einsatzId: 'einsatz-storybook',
  einheitId: 'einheit-nord',
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

function makeProjection(overrides: Partial<AmpelProjectionDto> = {}): AmpelProjectionDto {
  return { ...baseProjection, ...overrides };
}

const meta: Meta<typeof AmpelCard> = {
  title: 'Eigenschutz/Organisms/AmpelCard',
  component: AmpelCard,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof AmpelCard>;

export const GruenIdle: Story = {
  args: {
    projection: makeProjection(),
    einheitName: 'Abschnitt Nord',
  },
};

export const GelbMitQuittungen: Story = {
  args: {
    projection: makeProjection({
      status: AmpelProjectionDtoStatusEnum.Gelb,
      aktivePsaProfile: [AmpelProjectionDtoAktivePsaProfileEnum.Basis, AmpelProjectionDtoAktivePsaProfileEnum.Infektion],
      ausstehendePsaQuittungen: 2,
      ausstehendeRegelQuittungen: 1,
    }),
    einheitName: 'Abschnitt Betreuung',
  },
};

export const RotMitVorfall: Story = {
  args: {
    projection: makeProjection({
      status: AmpelProjectionDtoStatusEnum.Rot,
      aktivePsaProfile: [AmpelProjectionDtoAktivePsaProfileEnum.CbrnPatient, AmpelProjectionDtoAktivePsaProfileEnum.Vollschutz],
      offeneVorfaelle: 2,
      ungeloesteRueckmeldungen: 1,
      ausstehendePsaQuittungen: 1,
    }),
    einheitName: 'Abschnitt CBRN',
  },
};

export const Loading: Story = {
  render: () => <div className="min-h-[18rem] rounded-panel border border-border-subtle bg-surface-panel p-4 text-sm text-text-muted">Lade Sicherheitsstatus…</div>,
};

export const ErrorState: Story = {
  render: () => (
    <p role="alert" className="rounded-control border border-status-danger-border bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text">
      Sicherheitsstatus konnte nicht geladen werden.
    </p>
  ),
};

export const EmptyNoProfile: Story = {
  args: {
    projection: makeProjection({
      aktivePsaProfile: [],
    }),
    einheitName: 'Abschnitt Sanität',
  },
};

export const SchmalerContainer: Story = {
  args: {
    projection: makeProjection({
      status: AmpelProjectionDtoStatusEnum.Gelb,
      aktivePsaProfile: [AmpelProjectionDtoAktivePsaProfileEnum.Basis, AmpelProjectionDtoAktivePsaProfileEnum.Vu],
      ausstehendePsaQuittungen: 4,
      ungeloesteRueckmeldungen: 1,
    }),
    einheitName: 'Sehr langer Abschnittsname für schmale Slots',
  },
  render: (args) => (
    <div className="max-w-[360px]">
      <AmpelCard {...args} />
    </div>
  ),
};

export const NachtEinsatzPruefmatrix: Story = {
  render: () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-panel border border-border-subtle bg-surface-canvas p-4 text-text-primary">
        <h2 className="mb-3 text-title-sm font-semibold">Hell</h2>
        <div className="space-y-3">
          <SeverityBanner
            variant="critical"
            tone="assertive"
            headline="PSA-Hochstufung erforderlich"
            body="CBRN-Patientenlage im Abschnitt Nord."
            primaryActionLabel="Quittieren"
            onPrimary={() => undefined}
          />
          <SeverityBanner variant="warning" headline="Sicherheitsregel geändert" body="Neue Rückmeldung aus dem Einsatzabschnitt." />
          <SeverityBanner variant="info" headline="Neue Regel verfügbar" body="Bitte vor dem Betreten prüfen." />
          <div className="flex flex-wrap gap-2">
            <SyncStatusBadge status="synced" savedVersion={3} />
            <SyncStatusBadge status="syncing" />
            <SyncStatusBadge status="offline-queued" />
            <SyncStatusBadge status="conflict" />
            <SyncStatusBadge status="error" />
          </div>
          <AmpelCard
            projection={makeProjection({
              status: AmpelProjectionDtoStatusEnum.Rot,
              aktivePsaProfile: [
                AmpelProjectionDtoAktivePsaProfileEnum.Basis,
                AmpelProjectionDtoAktivePsaProfileEnum.Infektion,
                AmpelProjectionDtoAktivePsaProfileEnum.Vu,
                AmpelProjectionDtoAktivePsaProfileEnum.CbrnPatient,
                AmpelProjectionDtoAktivePsaProfileEnum.Vollschutz,
              ],
              offeneVorfaelle: 1,
              ausstehendePsaQuittungen: 2,
            })}
            einheitName="Abschnitt CBRN"
          />
        </div>
      </section>
      <section className="dark rounded-panel border border-border-subtle bg-surface-canvas p-4 text-text-primary">
        <h2 className="mb-3 text-title-sm font-semibold">Dunkel</h2>
        <div className="space-y-3">
          <SeverityBanner
            variant="critical"
            tone="assertive"
            headline="PSA-Hochstufung erforderlich"
            body="CBRN-Patientenlage im Abschnitt Nord."
            primaryActionLabel="Quittieren"
            onPrimary={() => undefined}
          />
          <SeverityBanner variant="warning" headline="Sicherheitsregel geändert" body="Neue Rückmeldung aus dem Einsatzabschnitt." />
          <SeverityBanner variant="info" headline="Neue Regel verfügbar" body="Bitte vor dem Betreten prüfen." />
          <div className="flex flex-wrap gap-2">
            <SyncStatusBadge status="synced" savedVersion={3} />
            <SyncStatusBadge status="syncing" />
            <SyncStatusBadge status="offline-queued" />
            <SyncStatusBadge status="conflict" />
            <SyncStatusBadge status="error" />
          </div>
          <AmpelCard
            projection={makeProjection({
              status: AmpelProjectionDtoStatusEnum.Rot,
              aktivePsaProfile: [
                AmpelProjectionDtoAktivePsaProfileEnum.Basis,
                AmpelProjectionDtoAktivePsaProfileEnum.Infektion,
                AmpelProjectionDtoAktivePsaProfileEnum.Vu,
                AmpelProjectionDtoAktivePsaProfileEnum.CbrnPatient,
                AmpelProjectionDtoAktivePsaProfileEnum.Vollschutz,
              ],
              offeneVorfaelle: 1,
              ausstehendePsaQuittungen: 2,
            })}
            einheitName="Abschnitt CBRN"
          />
        </div>
      </section>
    </div>
  ),
};
