import { forwardRef, type KeyboardEventHandler } from 'react';
import type { AmpelProjectionDto } from '@bluelight-hub/shared/client';
import type { PsaProfilValue } from '@bluelight-hub/shared/schemas/eigenschutz/psa-profil.schema';
import { cn } from '@/shared/ui/cn';
import { PSA_PROFIL_META } from '../../constants/psa-profil.constants';
import { StatusIndicator, buildAmpelStatusAriaLabel } from '../molecules/StatusIndicator';
import { shortenEinheitId } from './AmpelCard';

export interface AmpelDashboardRowProps {
  readonly projection: AmpelProjectionDto;
  readonly einheitName?: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
}

const PSA_PROFILE_VALUES = new Set<string>(Object.keys(PSA_PROFIL_META));

export const AmpelDashboardRow = forwardRef<HTMLButtonElement, AmpelDashboardRowProps>(function AmpelDashboardRow({ projection, einheitName, selected, onSelect, onKeyDown }, ref) {
  const displayName = einheitName?.trim() || shortenEinheitId(projection.einheitId);
  const offeneVorfaelle = toNonNegativeInteger(projection.offeneVorfaelle);
  const ungeloesteRueckmeldungen = toNonNegativeInteger(projection.ungeloesteRueckmeldungen);
  const ausstehendeQuittungen = toNonNegativeInteger(projection.ausstehendePsaQuittungen) + toNonNegativeInteger(projection.ausstehendeRegelQuittungen);
  const ariaLabel = `${displayName}, ${buildAmpelStatusAriaLabel({ status: projection.status, offeneVorfaelle, ungeloesteRueckmeldungen, ausstehendeQuittungen })}`;

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={ariaLabel}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      ref={ref}
      className={cn(
        'grid h-14 min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-control border px-3 py-2 text-left transition-colors motion-reduce:transition-none',
        'focus-visible:shadow-focus-ring focus-visible:outline-none',
        selected ? 'border-action-primary bg-action-secondary text-text-primary' : 'hover:border-border-emphasis border-border-subtle bg-surface-panel text-text-secondary hover:bg-surface-elevated',
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-text-primary">{displayName}</span>
        <span className="mt-0.5 flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden text-xs text-text-muted">
          <ProfileSummary profiles={projection.aktivePsaProfile} />
          <Metric value={offeneVorfaelle} singular="Vorfall" plural="Vorfälle" />
          <Metric value={ungeloesteRueckmeldungen} singular="Rückmeldung" plural="Rückmeldungen" />
          <Metric value={ausstehendeQuittungen} singular="Quittung" plural="Quittungen" />
        </span>
      </span>
      <StatusIndicator status={projection.status} ariaLabel={buildAmpelStatusAriaLabel({ status: projection.status, offeneVorfaelle, ungeloesteRueckmeldungen, ausstehendeQuittungen })} />
    </button>
  );
});

function ProfileSummary({ profiles }: { readonly profiles: AmpelProjectionDto['aktivePsaProfile'] }) {
  const normalized = Array.isArray(profiles) ? profiles : [];
  if (normalized.length === 0) {
    return <span className="shrink truncate">Kein Profil</span>;
  }

  const labels = normalized.map((profile) => (PSA_PROFILE_VALUES.has(profile) ? PSA_PROFIL_META[profile as PsaProfilValue].label : 'Unbekanntes Profil'));
  return (
    <span className="shrink truncate" title={labels.join(', ')}>
      {labels.join(', ')}
    </span>
  );
}

function Metric({ value, singular, plural }: { readonly value: number; readonly singular: string; readonly plural: string }) {
  if (value <= 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
      {value} {value === 1 ? singular : plural}
    </span>
  );
}

function toNonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}
