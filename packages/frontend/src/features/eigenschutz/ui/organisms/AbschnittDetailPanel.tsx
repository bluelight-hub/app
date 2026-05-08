import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { AmpelProjectionDto, EinsatzEinheitDto } from '@bluelight-hub/shared/client';
import type { Gefaehrdungsbeurteilung } from '@bluelight-hub/shared/schemas';
import type { PsaProfilValue } from '@bluelight-hub/shared/schemas/eigenschutz/psa-profil.schema';
import { cn } from '@/shared/ui/cn';
import { useGefaehrdungsbeurteilungen, usePsaProfileByEinheit, useSicherheitsregeln } from '../../api/queries';
import { PSA_PROFIL_META } from '../../constants/psa-profil.constants';
import { QuittungsSummary, StatusIndicator, buildAmpelStatusAriaLabel } from '../molecules/StatusIndicator';
import { shortenEinheitId } from './AmpelCard';

export interface AbschnittDetailPanelProps {
  readonly einsatzId: string;
  readonly projection: AmpelProjectionDto;
  readonly einheit?: EinsatzEinheitDto;
  readonly className?: string;
}

const PSA_PROFILE_VALUES = new Set<string>(Object.keys(PSA_PROFIL_META));

export function AbschnittDetailPanel({ einsatzId, projection, einheit, className }: AbschnittDetailPanelProps) {
  const displayName = einheit?.name?.trim() || shortenEinheitId(projection.einheitId);
  const psaQuery = usePsaProfileByEinheit(einsatzId, projection.einheitId, { enabled: Boolean(projection.einheitId) });
  const gefahrenQuery = useGefaehrdungsbeurteilungen(einsatzId);
  const regelnQuery = useSicherheitsregeln(einsatzId, projection.einheitId);
  const aktivePsaProfile = resolvePsaProfiles(psaQuery.data, projection.aktivePsaProfile);
  const gefaehrdungen = (gefahrenQuery.data ?? []).filter((item) => item.einheitId === projection.einheitId);
  const regeln = (regelnQuery.data ?? []).filter((regel) => regel.einsatzweit || regel.einheitId == null || regel.einheitId === projection.einheitId);
  const ausstehendeQuittungen = toNonNegativeInteger(projection.ausstehendePsaQuittungen) + toNonNegativeInteger(projection.ausstehendeRegelQuittungen);

  return (
    <aside
      data-testid="abschnitt-detail-panel"
      className={cn('min-w-0 rounded-panel border border-border-subtle bg-surface-panel p-4 shadow-panel', className)}
      aria-labelledby="abschnitt-detail-title"
    >
      <header className="flex min-w-0 flex-col gap-3 border-b border-border-subtle pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 id="abschnitt-detail-title" className="truncate text-lg font-semibold text-text-primary">
            {displayName}
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Aktualisiert{' '}
            {formatDate(projection.letzteAenderungAm) === null ? (
              <span>unbekannt</span>
            ) : (
              <time dateTime={formatDate(projection.letzteAenderungAm)?.toISOString()}>{formatTime(formatDate(projection.letzteAenderungAm)!)}</time>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusIndicator
            status={projection.status}
            ariaLabel={buildAmpelStatusAriaLabel({
              status: projection.status,
              offeneVorfaelle: projection.offeneVorfaelle,
              ungeloesteRueckmeldungen: projection.ungeloesteRueckmeldungen,
              ausstehendeQuittungen,
            })}
          />
          <Link
            to="/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile"
            params={{ einsatzId }}
            aria-label={`PSA für ${displayName} ändern`}
            className="inline-flex min-h-10 items-center justify-center rounded-control bg-action-primary px-3 py-2 text-sm font-semibold text-white hover:bg-action-primary-hover focus-visible:shadow-focus-ring focus-visible:outline-none"
          >
            PSA ändern
          </Link>
        </div>
      </header>

      <div className="grid gap-4 pt-4 xl:grid-cols-2">
        <DetailBlock title="PSA-Status" testId="abschnitt-detail-psa" loading={psaQuery.isLoading} error={psaQuery.isError ? 'PSA-Status konnte nicht geladen werden.' : null}>
          <div className="flex flex-wrap gap-2">
            {aktivePsaProfile.length === 0 ? <span className="text-sm text-text-muted">Kein aktives Profil</span> : aktivePsaProfile.map((profil) => <PsaChip key={profil} profil={profil} />)}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <QuittungsSummary ausstehendePsaQuittungen={projection.ausstehendePsaQuittungen} ausstehendeRegelQuittungen={projection.ausstehendeRegelQuittungen} />
            {toNonNegativeInteger(projection.ausstehendePsaQuittungen) > 0 ? (
              <span className="text-sm text-text-muted">{toNonNegativeInteger(projection.ausstehendePsaQuittungen)} PSA offen</span>
            ) : null}
          </div>
        </DetailBlock>

        <DetailBlock title="Abschnitt" testId="abschnitt-detail-einheit" loading={false} error={null}>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-text-muted">Typ</dt>
              <dd className="font-medium text-text-primary">{String(einheit?.typ ?? 'unbekannt')}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Status</dt>
              <dd className="font-medium text-text-primary">{String(einheit?.status ?? 'unbekannt')}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Stärke</dt>
              <dd className="font-medium text-text-primary">
                Stärke {einheit?.istStaerke ?? '–'}/{einheit?.sollStaerke ?? '–'}
              </dd>
            </div>
          </dl>
        </DetailBlock>

        <DetailBlock
          title="Gefährdungen"
          testId="abschnitt-detail-gefahren"
          loading={gefahrenQuery.isLoading}
          error={gefahrenQuery.isError ? 'Gefährdungsbeurteilungen konnten nicht geladen werden.' : null}
        >
          {gefaehrdungen.length === 0 ? (
            <p className="text-sm text-text-muted">Keine Gefährdungsbeurteilung für diesen Abschnitt.</p>
          ) : (
            <ul className="space-y-2">
              {gefaehrdungen.map((gefahr) => (
                <li key={gefahr.id} className="rounded-control border border-border-subtle px-3 py-2 text-sm">
                  <span className="font-medium text-text-primary">{firstGefahrTitle(gefahr)}</span>
                </li>
              ))}
            </ul>
          )}
        </DetailBlock>

        <DetailBlock title="Sicherheitsregeln" testId="abschnitt-detail-regeln" loading={regelnQuery.isLoading} error={regelnQuery.isError ? 'Sicherheitsregeln konnten nicht geladen werden.' : null}>
          {regeln.length === 0 ? (
            <p className="text-sm text-text-muted">Keine Sicherheitsregeln für diesen Abschnitt.</p>
          ) : (
            <ul className="space-y-2">
              {regeln.map((regel) => (
                <li key={regel.id} className="rounded-control border border-border-subtle px-3 py-2 text-sm">
                  <span className="font-medium text-text-primary">{regel.titel}</span>
                  {regel.einsatzweit ? <span className="ml-2 text-xs text-text-muted">einsatzweit</span> : null}
                </li>
              ))}
            </ul>
          )}
        </DetailBlock>
      </div>
    </aside>
  );
}

function DetailBlock({
  title,
  testId,
  loading,
  error,
  children,
}: {
  readonly title: string;
  readonly testId: string;
  readonly loading: boolean;
  readonly error: string | null;
  readonly children: ReactNode;
}) {
  return (
    <section data-testid={testId} className="bg-surface-base min-w-0 rounded-control border border-border-subtle p-3">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <div className="mt-2">
        {loading ? <p className="text-sm text-text-muted">Lädt…</p> : null}
        {!loading && error ? (
          <p role="status" className="text-sm text-status-warning-text">
            {error}
          </p>
        ) : null}
        {!loading && !error ? children : null}
      </div>
    </section>
  );
}

function PsaChip({ profil }: { readonly profil: string }) {
  if (!PSA_PROFILE_VALUES.has(profil)) {
    return <span className="rounded-control border border-status-warning-border bg-status-warning-surface px-2 py-1 text-xs font-medium text-status-warning-text">Unbekanntes Profil</span>;
  }

  const meta = PSA_PROFIL_META[profil as PsaProfilValue];
  return <span className={cn('rounded-control border px-2 py-1 text-xs font-medium', meta.chipColorActiveClass)}>{meta.label}</span>;
}

function resolvePsaProfiles(psaRows: ReadonlyArray<{ profil: string }> | undefined, projectionProfiles: AmpelProjectionDto['aktivePsaProfile']): string[] {
  if (Array.isArray(psaRows)) {
    return psaRows.map((row) => row.profil);
  }

  return Array.isArray(projectionProfiles) ? projectionProfiles : [];
}

function firstGefahrTitle(gefahr: Gefaehrdungsbeurteilung): string {
  const firstWithTitle = gefahr.items.find((item) => typeof item.title === 'string' && item.title.trim().length > 0);
  return firstWithTitle?.title ?? `Gefährdungsbeurteilung ${shortenEinheitId(gefahr.id)}`;
}

function formatDate(value: unknown): Date | null {
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

function toNonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}
