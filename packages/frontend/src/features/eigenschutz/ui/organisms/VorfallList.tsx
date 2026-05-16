import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { PiArrowClockwise, PiClipboardText } from 'react-icons/pi';
import type { EigenschutzVorfallListItemDto } from '@bluelight-hub/shared/client';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { EmptyState } from '@/shared/ui/molecules/empty-state.molecule';
import { useUserNames } from '@/features/auth/api/use-users';
import { useEinsatzEinheiten } from '@/features/kraefte/api/use-einsatz-einheiten';
import { resetFilter, selectFilterIsActive, useVorfallFilterState } from '../../stores/vorfall-filter.store';

const LIST_HARD_LIMIT = 200 as const;

export interface VorfallListProps {
  readonly einsatzId: string;
  readonly rows: ReadonlyArray<EigenschutzVorfallListItemDto> | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly onRetry: () => void;
  readonly onRowClick: (vorfallId: string) => void;
}

/**
 * Vorfall-Liste (Story 5.3, AC11). Tabelle mit Click-to-Detail-Navigation,
 * Loading/Error/Empty-States, Limit-Hinweis bei genau 200 Zeilen.
 */
export function VorfallList({ einsatzId, rows, isLoading, isError, onRetry, onRowClick }: VorfallListProps): ReactNode {
  const filterState = useVorfallFilterState();
  const filterIsActive = selectFilterIsActive(filterState);
  const einheitenQuery = useEinsatzEinheiten(einsatzId);
  const einheitenById = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of einheitenQuery.data ?? []) map.set(e.id, e.name);
    return map;
  }, [einheitenQuery.data]);
  const { getUserName } = useUserNames();

  if (isLoading) {
    return (
      <div data-testid="vorfaelle-list-loading" className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div data-testid="vorfaelle-list-error">
        <EmptyState
          icon={PiArrowClockwise}
          title="Vorfälle konnten nicht geladen werden"
          description="Bitte erneut versuchen — bei wiederholtem Fehler den Sicherheitsbeauftragten informieren."
          action={{ label: 'Erneut laden', onClick: onRetry }}
        />
      </div>
    );
  }

  const list = rows ?? [];

  if (list.length === 0) {
    if (filterIsActive) {
      return (
        <div data-testid="vorfaelle-list-empty-filtered">
          <EmptyState
            icon={PiClipboardText}
            title="Keine Vorfälle für diese Filter"
            description="Filter zurücksetzen, um alle Vorfälle des Einsatzes anzuzeigen."
            action={{ label: 'Alle Filter zurücksetzen', onClick: resetFilter }}
          />
        </div>
      );
    }
    if (filterState.status === 'GESCHLOSSEN') {
      return (
        <div data-testid="vorfaelle-list-empty-closed">
          <EmptyState icon={PiClipboardText} title="Noch keine Vorfälle geschlossen" description="Geschlossene Vorfälle erscheinen hier, sobald sie als abgearbeitet markiert sind." />
        </div>
      );
    }
    return (
      <div data-testid="vorfaelle-list-empty">
        <EmptyState icon={PiClipboardText} title="Noch keine Vorfälle erfasst" description={'Über „+ Vorfall melden" einen neuen Eintrag anlegen.'} />
      </div>
    );
  }

  return (
    <div data-testid="vorfaelle-list" className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface-panel">
        <table role="table" className="min-w-full text-sm">
          <thead className="bg-surface-panel-hover text-left text-xs text-text-muted">
            <tr role="row">
              <th scope="col" className="px-3 py-2 font-medium">
                Zeitstempel
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Titel
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Einheit
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                UK-rel.
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Erfasser
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr
                key={row.id}
                role="row"
                tabIndex={0}
                data-testid={`vorfaelle-list-row-${row.id}`}
                className="hover:bg-surface-panel-hover cursor-pointer border-t border-border-subtle focus-visible:shadow-focus-ring focus-visible:outline-none"
                onClick={() => onRowClick(row.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(row.id);
                  }
                }}
              >
                <td className="px-3 py-2 text-text-primary tabular-nums">{formatVorfallZeit(row.vorfallZeit)}</td>
                <td className="max-w-[80ch] truncate px-3 py-2 text-text-primary">{row.was}</td>
                <td className="px-3 py-2 text-text-primary">{einheitenById.get(row.einheitId) ?? row.einheitId.slice(0, 8)}</td>
                <td className="px-3 py-2">{row.unfallkasseRelevant ? <Badge variant="warning">UK-rel.</Badge> : null}</td>
                <td className="px-3 py-2" data-testid={`vorfaelle-list-status-${row.id}`}>
                  {row.status === 'GESCHLOSSEN' ? <span className="text-xs text-text-muted">Geschlossen</span> : <Badge variant="info">Offen</Badge>}
                </td>
                <td className="px-3 py-2 text-text-muted">{getUserName(row.erfasstVonUserId) || row.erfasstVonUserId.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {list.length === LIST_HARD_LIMIT ? (
        <Alert status="info" data-testid="vorfaelle-list-limit-hint">
          Anzeige limitiert auf {LIST_HARD_LIMIT} Vorfälle — Filter verfeinern.
        </Alert>
      ) : null}
    </div>
  );
}

function formatVorfallZeit(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${min} ${dd}.${mm}.${yyyy}`;
}
