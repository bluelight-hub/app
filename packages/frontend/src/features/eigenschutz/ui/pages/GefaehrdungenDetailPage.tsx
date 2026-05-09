/**
 * GefaehrdungenDetailPage — Editor-Page für eine einzelne
 * Gefährdungsbeurteilung (Story 2.2 Task 9, AC10 + Story 2.4 Task 14, AC1).
 *
 * Lädt die Beurteilung via `useGefaehrdungsbeurteilung` und rendert je nach
 * Query-State Skeleton, Fehler-Banner oder den Editor-Organism. Der Header
 * zeigt den Einheiten-Namen (Fallback: ID) plus Version-Badge, damit der
 * User das optimistisch-concurrent Lock-Token sichtbar hat.
 *
 * **Story 2.4:** Unter dem Editor hängt der `VersionTimestampFooter`, der
 * beim Klick das `GefaehrdungsbeurteilungHistoriePopover` öffnet. Wird dort
 * eine Versions-Zeile gewählt, öffnet sich der Read-Only-
 * `GefaehrdungsbeurteilungVersionDrawer`.
 *
 * Error-Handling bleibt inline (UX-DR21 Zero-Toast) — weder 403 noch 500
 * werden über Sonner gerendert.
 */

import { useGefaehrdungsbeurteilung } from '@/features/eigenschutz/api/queries';
import { buildEigenschutzBrowserUrl } from '@/features/eigenschutz/utils/build-eigenschutz-deep-link';
import { useEinsatzEinheiten } from '@/features/kraefte/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { CopyButton } from '@/shared/ui/molecules/copy-button.molecule';
import { useMemo, useState } from 'react';
import type { GefaehrdungsbeurteilungHistorieEintrag } from '@bluelight-hub/shared/schemas';
import { VersionTimestampFooter } from '../molecules/VersionTimestampFooter';
import { GefaehrdungenEditorOrganism } from '../organisms/GefaehrdungenEditorOrganism';
import { GefaehrdungsbeurteilungHistoriePopover } from '../organisms/GefaehrdungsbeurteilungHistoriePopover';
import { GefaehrdungsbeurteilungVersionDrawer } from '../organisms/GefaehrdungsbeurteilungVersionDrawer';

export interface GefaehrdungenDetailPageProps {
  readonly einsatzId: string;
  readonly id: string;
  readonly focusItem?: string;
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

const HISTORIE_POPOVER_ID = 'gefaehrdungsbeurteilung-historie-popover';
const FORBIDDEN_ENTITY_MESSAGE = 'Diese Entität gehört zu einem anderen Einsatz oder ist für dich nicht freigegeben.';

function getHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as { status?: number; response?: { status?: number }; cause?: { status?: number } };
  return candidate.status ?? candidate.response?.status ?? candidate.cause?.status ?? null;
}

export function GefaehrdungenDetailPage({ einsatzId, id, focusItem }: GefaehrdungenDetailPageProps) {
  const query = useGefaehrdungsbeurteilung(einsatzId, id);
  const einheitenQuery = useEinsatzEinheiten(einsatzId);
  const [selectedHistorieEintrag, setSelectedHistorieEintrag] = useState<GefaehrdungsbeurteilungHistorieEintrag | null>(null);

  const einheitName = useMemo(() => {
    if (!query.data) return null;
    const match = einheitenQuery.data?.find((einheit) => einheit.id === query.data.einheitId);
    return match?.name ?? query.data.einheitId;
  }, [einheitenQuery.data, query.data]);

  if (query.isPending) {
    return <GefaehrdungenSkeleton />;
  }

  if (query.isError || !query.data) {
    const status = getHttpStatus(query.error);
    const isForbidden = status === 403;
    const isNotFound = status === 404;
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-panel border border-status-danger-border bg-status-danger-surface px-4 py-3 text-sm text-status-danger-text"
        data-testid="gefaehrdungen-detail-error"
      >
        <div>
          <p className="font-medium">{isForbidden ? FORBIDDEN_ENTITY_MESSAGE : isNotFound ? 'Gefährdungsbeurteilung nicht gefunden.' : 'Gefährdungsbeurteilung konnte nicht geladen werden.'}</p>
          {!isForbidden && !isNotFound ? <p className="mt-1 text-xs">Bitte erneut versuchen. Falls das Problem bestehen bleibt, ist der Bereich möglicherweise nicht freigegeben.</p> : null}
        </div>
        {!isForbidden && !isNotFound ? (
          <Button intent="danger" appearance="outline" size="sm" type="button" onClick={() => void query.refetch()} data-testid="gefaehrdungen-detail-retry">
            Erneut versuchen
          </Button>
        ) : null}
      </div>
    );
  }

  const beurteilung = query.data;
  const detailUrl = buildEigenschutzBrowserUrl({
    type: 'gefaehrdungsbeurteilung',
    einsatzId,
    id: beurteilung.id,
    focusItem,
  });
  const drawerEntry =
    selectedHistorieEintrag?.gueltigBis === null
      ? {
          ...selectedHistorieEintrag,
          version: beurteilung.version,
          gueltigBis: null,
          changedByUserId: beurteilung.aktualisiertVonUserId,
          items: beurteilung.items,
        }
      : selectedHistorieEintrag;

  return (
    <div className="space-y-4 md:space-y-6" data-testid="gefaehrdungen-detail-page">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gefährdungsbeurteilung</h1>
          <p className="mt-1 text-sm text-text-muted">
            Einheit: <span className="font-medium text-text-primary">{einheitName ?? beurteilung.einheitId}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          <CopyButton text={detailUrl} idleLabel="Link kopieren" copiedLabel="Link kopiert" errorLabel="Link konnte nicht kopiert werden" size="sm" statusTestId="gefaehrdungen-detail-copy-status" />
          <span
            className="inline-flex items-center rounded-control bg-action-secondary px-2 py-1 text-xs font-medium text-text-secondary"
            title="Optimistic-Concurrency-Token — wird beim Speichern mitgeschickt."
            data-testid="gefaehrdungen-detail-version-badge"
          >
            Version {beurteilung.version}
          </span>
        </div>
      </header>

      <GefaehrdungenEditorOrganism einsatzId={einsatzId} beurteilung={beurteilung} focusItem={focusItem} />

      <GefaehrdungsbeurteilungHistoriePopover
        einsatzId={einsatzId}
        gefaehrdungsbeurteilungId={beurteilung.id}
        popoverId={HISTORIE_POPOVER_ID}
        trigger={
          <VersionTimestampFooter aktualisiertAm={beurteilung.aktualisiertAm} aktualisiertVonUserId={beurteilung.aktualisiertVonUserId} version={beurteilung.version} popoverId={HISTORIE_POPOVER_ID} />
        }
        onSelectVersion={setSelectedHistorieEintrag}
      />

      <GefaehrdungsbeurteilungVersionDrawer entry={drawerEntry} aggregateVersion={beurteilung.version} onClose={() => setSelectedHistorieEintrag(null)} />
    </div>
  );
}
