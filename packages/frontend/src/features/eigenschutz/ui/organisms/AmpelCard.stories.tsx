/**
 * Storybook State-Matrix für `AmpelCard`.
 *
 * Storybook ist im Repo derzeit nicht installiert; CSF3 ist hier als
 * Fixture-Scaffold abgelegt. Sobald Storybook initialisiert wird, lassen
 * sich die lokalen Typ-Stubs gegen `@storybook/react` austauschen.
 */

import type { ComponentType } from 'react';
import { AmpelProjectionDtoAktivePsaProfileEnum, AmpelProjectionDtoStatusEnum, type AmpelProjectionDto } from '@bluelight-hub/shared/client';
import { AmpelCard } from './AmpelCard';

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
