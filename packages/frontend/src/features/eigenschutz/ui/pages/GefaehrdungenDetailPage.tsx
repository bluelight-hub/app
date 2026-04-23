/**
 * GefaehrdungenDetailPage — Editor-Page für eine einzelne
 * Gefährdungsbeurteilung (Story 2.2 Task 9, AC10).
 *
 * Lädt die Beurteilung via `useGefaehrdungsbeurteilung` und rendert je nach
 * Query-State Skeleton, Fehler-Banner oder den Editor-Organism. Der Header
 * zeigt den Einheiten-Namen (Fallback: ID) plus Version-Badge, damit der
 * User das optimistisch-concurrent Lock-Token sichtbar hat.
 *
 * Error-Handling bleibt inline (UX-DR21 Zero-Toast) — weder 403 noch 500
 * werden über Sonner gerendert.
 */

import { useGefaehrdungsbeurteilung } from '@/features/eigenschutz/api/queries';
import { useEinsatzEinheiten } from '@/features/kraefte/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { useMemo } from 'react';
import { GefaehrdungenEditorOrganism } from '../organisms/GefaehrdungenEditorOrganism';

export interface GefaehrdungenDetailPageProps {
  readonly einsatzId: string;
  readonly id: string;
}

function GefaehrdungenSkeleton() {
  return (
    <div className="space-y-4" data-testid="gefaehrdungen-detail-skeleton">
      <div className="bg-surface-muted h-7 w-64 animate-pulse rounded-control" />
      <div className="space-y-3">
        {[0, 1].map((row) => (
          <div key={row} className="space-y-2 rounded-panel border border-border-subtle bg-surface-panel p-4">
            <div className="bg-surface-muted h-4 w-40 animate-pulse rounded" />
            <div className="bg-surface-muted h-10 animate-pulse rounded" />
            {/* 5×5 Fake-Grid */}
            <div className="grid grid-cols-5 gap-1 pt-2">
              {Array.from({ length: 25 }).map((_, idx) => (
                <div key={idx} className="bg-surface-muted h-10 animate-pulse rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GefaehrdungenDetailPage({ einsatzId, id }: GefaehrdungenDetailPageProps) {
  const query = useGefaehrdungsbeurteilung(einsatzId, id);
  const einheitenQuery = useEinsatzEinheiten(einsatzId);

  const einheitName = useMemo(() => {
    if (!query.data) return null;
    const match = einheitenQuery.data?.find((einheit) => einheit.id === query.data.einheitId);
    return match?.name ?? query.data.einheitId;
  }, [einheitenQuery.data, query.data]);

  if (query.isPending) {
    return <GefaehrdungenSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-panel border border-status-danger-border bg-status-danger-surface px-4 py-3 text-sm text-status-danger-text"
        data-testid="gefaehrdungen-detail-error"
      >
        <div>
          <p className="font-medium">Gefährdungsbeurteilung konnte nicht geladen werden.</p>
          <p className="mt-1 text-xs">Bitte erneut versuchen. Falls das Problem bestehen bleibt, fehlt möglicherweise die Berechtigung für diesen Einsatz.</p>
        </div>
        <Button intent="danger" appearance="outline" size="sm" type="button" onClick={() => void query.refetch()} data-testid="gefaehrdungen-detail-retry">
          Erneut versuchen
        </Button>
      </div>
    );
  }

  const beurteilung = query.data;

  return (
    <div className="space-y-4 md:space-y-6" data-testid="gefaehrdungen-detail-page">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gefährdungsbeurteilung</h1>
          <p className="mt-1 text-sm text-text-muted">
            Einheit: <span className="font-medium text-text-primary">{einheitName ?? beurteilung.einheitId}</span>
          </p>
        </div>
        <span
          className="inline-flex items-center rounded-control bg-action-secondary px-2 py-1 text-xs font-medium text-text-secondary"
          title="Optimistic-Concurrency-Token — wird beim Speichern mitgeschickt."
          data-testid="gefaehrdungen-detail-version-badge"
        >
          Version {beurteilung.version}
        </span>
      </header>

      <GefaehrdungenEditorOrganism einsatzId={einsatzId} beurteilung={beurteilung} />
    </div>
  );
}
