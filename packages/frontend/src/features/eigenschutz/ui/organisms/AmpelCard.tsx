import { Link } from '@tanstack/react-router';
import type { AmpelProjectionDto, AmpelProjectionDtoAktivePsaProfileEnum } from '@bluelight-hub/shared/client';
import type { PsaProfilValue } from '@bluelight-hub/shared/schemas/eigenschutz/psa-profil.schema';
import { cn } from '@/shared/ui/cn';
import { PSA_PROFIL_META } from '../../constants/psa-profil.constants';
import { QuittungsSummary, StatusIndicator, buildAmpelStatusAriaLabel, getAmpelStatusMeta } from '../molecules/StatusIndicator';

export interface AmpelCardProps {
  readonly projection: AmpelProjectionDto;
  readonly einheitName?: string;
  readonly className?: string;
}

const PSA_PROFILE_VALUES = new Set<string>(Object.keys(PSA_PROFIL_META));

export function AmpelCard({ projection, einheitName, className }: AmpelCardProps) {
  const displayName = einheitName?.trim() || shortenEinheitId(projection.einheitId);
  const aktivePsaProfile = normalizePsaProfileList(projection.aktivePsaProfile);
  const ausstehendePsaQuittungen = toNonNegativeInteger(projection.ausstehendePsaQuittungen);
  const ausstehendeRegelQuittungen = toNonNegativeInteger(projection.ausstehendeRegelQuittungen);
  const offeneVorfaelle = toNonNegativeInteger(projection.offeneVorfaelle);
  const ungeloesteRueckmeldungen = toNonNegativeInteger(projection.ungeloesteRueckmeldungen);
  const ausstehendeQuittungen = ausstehendePsaQuittungen + ausstehendeRegelQuittungen;
  const ariaLabel = buildAmpelStatusAriaLabel({
    status: projection.status,
    offeneVorfaelle,
    ungeloesteRueckmeldungen,
    ausstehendeQuittungen,
  });
  const statusMeta = getAmpelStatusMeta(projection.status);
  const letzteAenderungAm = normalizeDate(projection.letzteAenderungAm);

  return (
    <article
      data-testid={`ampel-card-${projection.einheitId}`}
      className={cn(
        '@container flex min-h-[18rem] flex-col gap-3 rounded-panel border bg-surface-panel p-3 shadow-panel transition-colors motion-reduce:transition-none @sm:gap-4 @sm:p-4',
        statusMeta.label === 'Rot' ? 'border-status-danger-border ring-1 ring-status-danger-border' : 'border-border-subtle',
        className,
      )}
      aria-labelledby={`ampel-card-title-${projection.einheitId}`}
    >
      <header className="flex min-w-0 flex-col gap-2 @sm:flex-row @sm:items-start @sm:justify-between @sm:gap-3">
        <div className="min-w-0">
          <h2 id={`ampel-card-title-${projection.einheitId}`} className="truncate text-base font-semibold text-text-primary">
            {displayName}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Aktualisiert{' '}
            {letzteAenderungAm === null ? (
              <span data-testid="ampel-card-updated-at">unbekannt</span>
            ) : (
              <time data-testid="ampel-card-updated-at" dateTime={letzteAenderungAm.toISOString()}>
                {formatTime(letzteAenderungAm)}
              </time>
            )}
          </p>
        </div>
        <StatusIndicator status={projection.status} ariaLabel={ariaLabel} />
      </header>

      <div className="flex flex-wrap gap-2" aria-label="Aktive PSA-Profile">
        {aktivePsaProfile.length === 0 ? <span className="text-sm text-text-muted">Kein aktives Profil</span> : aktivePsaProfile.map((profil) => <PsaDisplayChip key={profil} profil={profil} />)}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <QuittungsSummary ausstehendePsaQuittungen={ausstehendePsaQuittungen} ausstehendeRegelQuittungen={ausstehendeRegelQuittungen} />
        {offeneVorfaelle > 0 ? <MetricPill value={offeneVorfaelle} label={offeneVorfaelle === 1 ? 'offener Vorfall' : 'offene Vorfälle'} tone="danger" /> : null}
        {ungeloesteRueckmeldungen > 0 ? <MetricPill value={ungeloesteRueckmeldungen} label={`ungelöste Rückmeldung${ungeloesteRueckmeldungen === 1 ? '' : 'en'}`} tone="warning" /> : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <Link
          to="/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile"
          params={{ einsatzId: projection.einsatzId }}
          data-testid={`ampel-psa-change-${projection.einheitId}`}
          aria-label={`PSA für ${displayName} ändern`}
          className="inline-flex min-h-11 items-center justify-center rounded-control bg-action-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-action-primary-hover focus-visible:shadow-focus-ring focus-visible:outline-none"
        >
          PSA ändern
        </Link>
      </div>
    </article>
  );
}

function PsaDisplayChip({ profil }: { readonly profil: AmpelProjectionDtoAktivePsaProfileEnum | string }) {
  if (!PSA_PROFILE_VALUES.has(profil)) {
    return (
      <span
        aria-label={`Unbekanntes PSA-Profil: ${profil}`}
        className="inline-flex items-center gap-1 rounded-control border border-status-warning-border bg-status-warning-surface px-2 py-1 text-xs font-medium text-status-warning-text"
      >
        Unbekanntes Profil
      </span>
    );
  }

  const meta = PSA_PROFIL_META[profil as PsaProfilValue];

  return <span className={cn('inline-flex items-center gap-1 rounded-control border px-2 py-1 text-xs font-medium', meta.chipColorActiveClass)}>{meta.label}</span>;
}

function MetricPill({ value, label, tone }: { readonly value: number; readonly label: string; readonly tone: 'danger' | 'warning' }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-medium',
        tone === 'danger' ? 'border-status-danger-border bg-status-danger-surface text-status-danger-text' : 'border-status-warning-border bg-status-warning-surface text-status-warning-text',
      )}
    >
      <span className="tabular-nums">{value}</span>
      <span>{label}</span>
    </span>
  );
}

export function shortenEinheitId(einheitId: string): string {
  if (einheitId.length <= 12) return einheitId;
  return `${einheitId.slice(0, 6)}…${einheitId.slice(-4)}`;
}

function normalizeDate(value: unknown): Date | null {
  if (!(value instanceof Date) && typeof value !== 'string' && typeof value !== 'number') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function normalizePsaProfileList(value: AmpelProjectionDto['aktivePsaProfile']): Array<AmpelProjectionDtoAktivePsaProfileEnum | string> {
  return Array.isArray(value) ? value : [];
}

function toNonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}
