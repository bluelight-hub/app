import { useMemo } from 'react';
import { AmpelProjectionDtoStatusEnum, type AmpelProjectionDto, type AmpelWarnBadgeDto } from '@bluelight-hub/shared/client';
import { useEinsatzEinheiten } from '@/features/kraefte/api';
import { cn } from '@/shared/ui/cn';
import { useEigenschutzAmpelStatus } from '../../api/use-eigenschutz-ampel-status';
import { useAmpelWarnBadges } from '../../api/use-ampel-warn-badges';
import { useXlViewport } from '../../hooks/use-lg-viewport';
import { AmpelCard } from './AmpelCard';
import { EigenschutzOffenePunktePanel } from './EigenschutzOffenePunktePanel';

export interface AmpelDashboardProps {
  readonly einsatzId: string;
  readonly className?: string;
}

const STATUS_ORDER: Record<AmpelProjectionDtoStatusEnum, number> = {
  [AmpelProjectionDtoStatusEnum.Rot]: 0,
  [AmpelProjectionDtoStatusEnum.Gelb]: 1,
  [AmpelProjectionDtoStatusEnum.Gruen]: 2,
};

function getStatusOrder(status: AmpelProjectionDto['status'] | string): number {
  return STATUS_ORDER[status as AmpelProjectionDtoStatusEnum] ?? -1;
}

export function AmpelDashboard({ einsatzId, className }: AmpelDashboardProps) {
  const ampelQuery = useEigenschutzAmpelStatus(einsatzId);
  const warnBadgesQuery = useAmpelWarnBadges(einsatzId);
  const einheitenQuery = useEinsatzEinheiten(einsatzId);
  const isXlViewport = useXlViewport();

  const einheitNameById = useMemo(() => new Map((einheitenQuery.data ?? []).map((einheit) => [einheit.id, einheit.name])), [einheitenQuery.data]);
  const warnBadgesByEinheit = useMemo(() => groupWarnBadgesByEinheit(warnBadgesQuery.data ?? []), [warnBadgesQuery.data]);

  const projections = useMemo(
    () =>
      [...(ampelQuery.data ?? [])].sort((left, right) => {
        const statusDelta = getStatusOrder(left.status) - getStatusOrder(right.status);
        if (statusDelta !== 0) return statusDelta;
        const leftName = einheitNameById.get(left.einheitId) ?? left.einheitId;
        const rightName = einheitNameById.get(right.einheitId) ?? right.einheitId;
        return leftName.localeCompare(rightName, 'de');
      }),
    [ampelQuery.data, einheitNameById],
  );

  if (ampelQuery.isLoading) {
    return (
      <section data-testid="ampel-dashboard" className={cn('space-y-3', className)}>
        <div data-testid="ampel-dashboard-loading" className="min-h-[12rem] rounded-panel border border-border-subtle bg-surface-panel p-4 text-sm text-text-muted">
          Lade Sicherheitsstatus…
        </div>
      </section>
    );
  }

  if (ampelQuery.isError) {
    return (
      <section data-testid="ampel-dashboard" className={cn('space-y-3', className)}>
        <p role="alert" className="rounded-control border border-status-danger-border bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text">
          Sicherheitsstatus konnte nicht geladen werden.
        </p>
      </section>
    );
  }

  if (projections.length === 0) {
    return (
      <section data-testid="ampel-dashboard" className={cn('space-y-3', className)}>
        <div data-testid="ampel-dashboard-empty" className="min-h-[12rem] rounded-panel border border-dashed border-border-subtle bg-surface-panel p-4 text-sm text-text-muted">
          Noch kein Sicherheitsstatus vorhanden.
        </div>
      </section>
    );
  }

  return (
    <section data-testid="ampel-dashboard" className={cn('space-y-3', className)} aria-label="Sicherheitsstatus pro Abschnitt">
      {!isXlViewport ? <EigenschutzOffenePunktePanel einsatzId={einsatzId} mode="compact" /> : null}
      {einheitenQuery.isError ? (
        <p role="status" className="text-xs text-text-muted">
          Abschnittsnamen konnten nicht geladen werden.
        </p>
      ) : null}
      {warnBadgesQuery.isError ? (
        <p role="status" className="text-xs text-text-muted">
          Warnungen konnten nicht geladen werden.
        </p>
      ) : null}
      <div data-testid="ampel-dashboard-with-panel" className={cn(isXlViewport ? 'grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]' : 'space-y-3')}>
        <div className="min-w-0">
          <AmpelCardGrid projections={projections} einheitNameById={einheitNameById} warnBadgesByEinheit={warnBadgesByEinheit} />
        </div>
        {isXlViewport ? <EigenschutzOffenePunktePanel einsatzId={einsatzId} mode="inline" className="self-start" /> : null}
      </div>
    </section>
  );
}

function AmpelCardGrid({
  projections,
  einheitNameById,
  warnBadgesByEinheit,
}: {
  readonly projections: readonly AmpelProjectionDto[];
  readonly einheitNameById: ReadonlyMap<string, string>;
  readonly warnBadgesByEinheit: ReadonlyMap<string, readonly AmpelWarnBadgeDto[]>;
}) {
  return (
    <ul data-testid="ampel-dashboard-grid" className="grid grid-cols-1 gap-3 min-[1440px]:grid-cols-3 lg:grid-cols-2">
      {projections.map((projection: AmpelProjectionDto) => (
        <li key={`${projection.einsatzId}-${projection.einheitId}`} className="min-w-0">
          <AmpelCard projection={projection} einheitName={einheitNameById.get(projection.einheitId)} warnBadges={warnBadgesByEinheit.get(projection.einheitId) ?? []} />
        </li>
      ))}
    </ul>
  );
}

function groupWarnBadgesByEinheit(badges: readonly AmpelWarnBadgeDto[]): ReadonlyMap<string, readonly AmpelWarnBadgeDto[]> {
  const grouped = new Map<string, AmpelWarnBadgeDto[]>();
  for (const badge of badges) {
    const list = grouped.get(badge.einheitId) ?? [];
    list.push(badge);
    grouped.set(badge.einheitId, list);
  }
  return grouped;
}
