import { useEffect, useMemo, useRef, useState } from 'react';
import { AmpelProjectionDtoStatusEnum, type AmpelProjectionDto, type EinsatzEinheitDto } from '@bluelight-hub/shared/client';
import { useEinsatzEinheiten } from '@/features/kraefte/api';
import { cn } from '@/shared/ui/cn';
import { useEigenschutzAmpelStatus } from '../../api/use-eigenschutz-ampel-status';
import { useLgViewport, useXlViewport } from '../../hooks/use-lg-viewport';
import { hydrateDashboardView, setDashboardView, useEigenschutzDashboardView } from '../../stores/eigenschutz-dashboard-view.store';
import { AmpelDashboardViewToggle } from '../molecules/AmpelDashboardViewToggle';
import { AbschnittDetailPanel } from './AbschnittDetailPanel';
import { AmpelCard } from './AmpelCard';
import { AmpelDashboardRow } from './AmpelDashboardRow';
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
  const einheitenQuery = useEinsatzEinheiten(einsatzId);
  const { view: storedView } = useEigenschutzDashboardView();
  const isLgViewport = useLgViewport();
  const isXlViewport = useXlViewport();

  const einheitNameById = useMemo(() => new Map((einheitenQuery.data ?? []).map((einheit) => [einheit.id, einheit.name])), [einheitenQuery.data]);
  const einheitById = useMemo(() => new Map((einheitenQuery.data ?? []).map((einheit) => [einheit.id, einheit])), [einheitenQuery.data]);
  const effectiveView = storedView === 'focus' && isLgViewport ? 'focus' : 'cards';

  useEffect(() => {
    void hydrateDashboardView();
  }, []);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AmpelDashboardViewToggle effectiveView={effectiveView} storedView={storedView} focusAvailable={isLgViewport} onViewChange={(next) => void setDashboardView(next)} />
      </div>
      {!isXlViewport ? <EigenschutzOffenePunktePanel einsatzId={einsatzId} mode="compact" /> : null}
      {einheitenQuery.isError ? (
        <p role="status" className="text-xs text-text-muted">
          Abschnittsnamen konnten nicht geladen werden.
        </p>
      ) : null}
      <div data-testid="ampel-dashboard-with-panel" className={cn(isXlViewport ? 'grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]' : 'space-y-3')}>
        <div className="min-w-0">
          {effectiveView === 'focus' ? (
            <AmpelDashboardFocusView einsatzId={einsatzId} projections={projections} einheitNameById={einheitNameById} einheitById={einheitById} />
          ) : (
            <AmpelCardGrid projections={projections} einheitNameById={einheitNameById} />
          )}
        </div>
        {isXlViewport ? <EigenschutzOffenePunktePanel einsatzId={einsatzId} mode="inline" className="self-start" /> : null}
      </div>
    </section>
  );
}

function AmpelCardGrid({ projections, einheitNameById }: { readonly projections: readonly AmpelProjectionDto[]; readonly einheitNameById: ReadonlyMap<string, string> }) {
  return (
    <ul data-testid="ampel-dashboard-grid" className="grid grid-cols-1 gap-3 min-[1440px]:grid-cols-3 lg:grid-cols-2">
      {projections.map((projection: AmpelProjectionDto) => (
        <li key={`${projection.einsatzId}-${projection.einheitId}`} className="min-w-0">
          <AmpelCard projection={projection} einheitName={einheitNameById.get(projection.einheitId)} />
        </li>
      ))}
    </ul>
  );
}

function AmpelDashboardFocusView({
  einsatzId,
  projections,
  einheitNameById,
  einheitById,
}: {
  readonly einsatzId: string;
  readonly projections: readonly AmpelProjectionDto[];
  readonly einheitNameById: ReadonlyMap<string, string>;
  readonly einheitById: ReadonlyMap<string, EinsatzEinheitDto>;
}) {
  const [selectedEinheitId, setSelectedEinheitId] = useState<string | null>(() => projections[0]?.einheitId ?? null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (projections.length === 0) {
      setSelectedEinheitId(null);
      return;
    }

    if (!selectedEinheitId || !projections.some((projection) => projection.einheitId === selectedEinheitId)) {
      setSelectedEinheitId(projections[0]?.einheitId ?? null);
    }
  }, [projections, selectedEinheitId]);

  const selectedProjection = projections.find((projection) => projection.einheitId === selectedEinheitId) ?? projections[0];

  const moveSelection = (currentIndex: number, delta: number) => {
    const nextIndex = (currentIndex + delta + projections.length) % projections.length;
    const next = projections[nextIndex];
    if (!next) return;
    setSelectedEinheitId(next.einheitId);
    rowRefs.current.get(next.einheitId)?.focus();
  };

  return (
    <div data-testid="ampel-dashboard-focus" className="grid min-h-[24rem] gap-3 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
      <div role="listbox" aria-label="Abschnitt auswählen" className="bg-surface-base min-w-0 space-y-2 rounded-panel border border-border-subtle p-2">
        {projections.map((projection, index) => (
          <AmpelDashboardRow
            key={`${projection.einsatzId}-${projection.einheitId}`}
            projection={projection}
            einheitName={einheitNameById.get(projection.einheitId)}
            selected={selectedProjection?.einheitId === projection.einheitId}
            onSelect={() => setSelectedEinheitId(projection.einheitId)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                moveSelection(index, 1);
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                moveSelection(index, -1);
              }
            }}
            ref={(node) => {
              if (node) rowRefs.current.set(projection.einheitId, node);
              else rowRefs.current.delete(projection.einheitId);
            }}
          />
        ))}
      </div>
      {selectedProjection ? <AbschnittDetailPanel einsatzId={einsatzId} projection={selectedProjection} einheit={einheitById.get(selectedProjection.einheitId)} /> : null}
    </div>
  );
}
