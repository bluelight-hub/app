/**
 * ConflictResolutionList — UI-Organism für die Auflösung offener Sync-Konflikte
 * (Story 3.10 AC8, FR50, UX-DR6).
 *
 * **Anatomie:**
 * - Filter-Bar (Entitätstyp + Einheit + Reset).
 * - Virtualisierte Tabelle (`role="table"`, `useVirtualizer`).
 * - Sortierbare Spalten via `aria-sort` + Keyboard-Toggle.
 * - 3 Resolve-Aktionen pro Row (Server / Lokal / Merge), je ≥ 48 px Touch-Target.
 * - Inline-Row-Error bei Resolve-Fehlern (UX-DR21 Zero-Toast).
 * - Polite Live-Region für SR-Ansage nach erfolgreichem Resolve.
 *
 * **Read-Only-Modus:**
 * Wird über das `canResolve`-Prop gesteuert. Default ist `true`; die Page-
 * Komponente (Task 9) verkabelt das mit `useMyEinsatzRolle`-basierter
 * BEFEHLSGEBER-Permission. Liefert `canResolve === false` werden alle drei
 * Action-Buttons via `disabled` + `aria-disabled` deaktiviert.
 */

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PiCheckCircle, PiArrowsClockwise } from 'react-icons/pi';
import type { SyncConflictListItemDto } from '@bluelight-hub/shared/client';
import { useUserNames } from '@/features/auth/api/use-users';
import { useEinsatzEinheiten } from '@/features/kraefte/api/use-einsatz-einheiten';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { EmptyState } from '@/shared/ui/molecules/empty-state.molecule';
import { cn } from '@/shared/ui/cn';
import { formatEntityTypeLabel, formatLocalPayloadFull, formatLocalPayloadPreview, formatRelativeTimeDe } from '../../utils/format-conflict-row';
import { useResolveKonflikt, useSyncConflicts, type SyncConflictsFilter } from '../../api/queries';

type Resolution = 'SERVER_WINS' | 'LOCAL_WINS' | 'MERGED';
type EntityType = SyncConflictListItemDto['entityType'];

type SortColumn = 'reportedAt' | 'entityType' | 'einheitName' | 'serverVersion' | 'localExpectedVersion';
type SortDirection = 'asc' | 'desc';

export interface ConflictResolutionListProps {
  einsatzId: string;
  /**
   * Initialer Filter (z. B. aus URL-Search-Params der Page-Komponente).
   * Wird in lokalen State übernommen — die Filter-Persistenz in der URL
   * ist Aufgabe der `SyncConflictsPage` (Task 9).
   */
  initialFilter?: SyncConflictsFilter;
  /**
   * Steuert den Read-Only-Modus. `false` deaktiviert alle Resolve-Buttons.
   * Default `true`; die Page-Komponente verkabelt das mit der Rolle.
   */
  canResolve?: boolean;
}

const ENTITY_TYPE_OPTIONS: ReadonlyArray<{ value: EntityType; label: string }> = [
  { value: 'PSA_PROFIL_ZUWEISUNG', label: formatEntityTypeLabel('PSA_PROFIL_ZUWEISUNG') },
  { value: 'GEFAEHRDUNGSBEURTEILUNG_ITEM', label: formatEntityTypeLabel('GEFAEHRDUNGSBEURTEILUNG_ITEM') },
];

const ROW_HEIGHT = 56;

interface ResolveButtonSpec {
  resolution: Resolution;
  label: string;
  intent: 'server' | 'local' | 'merge';
}

const RESOLVE_BUTTONS: ReadonlyArray<ResolveButtonSpec> = [
  { resolution: 'SERVER_WINS', label: 'Server übernehmen', intent: 'server' },
  { resolution: 'LOCAL_WINS', label: 'Lokal behalten', intent: 'local' },
  { resolution: 'MERGED', label: 'Zusammenführen', intent: 'merge' },
];

const RESOLUTION_ANNOUNCEMENT: Record<Resolution, string> = {
  SERVER_WINS: 'Server übernommen',
  LOCAL_WINS: 'Lokal behalten',
  MERGED: 'Zusammengeführt',
};

const BUTTON_CLASSES: Record<ResolveButtonSpec['intent'], string> = {
  server: 'border-status-info-border bg-status-info-surface text-status-info-text hover:border-status-info-text hover:opacity-90',
  local: 'border-status-warning-border bg-status-warning-surface text-status-warning-text hover:border-status-warning-text',
  merge: 'border-border-subtle bg-surface-panel text-text-primary hover:border-border-strong hover:bg-action-secondary-hover',
};

export function ConflictResolutionList({ einsatzId, initialFilter, canResolve = true }: ConflictResolutionListProps) {
  const [filter, setFilter] = useState<SyncConflictsFilter>(() => ({ ...initialFilter }));
  const [sortColumn, setSortColumn] = useState<SortColumn>('reportedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [openSnapshotId, setOpenSnapshotId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Map<string, string>>(() => new Map());
  const [announcement, setAnnouncement] = useState<string>('');

  const conflictsQuery = useSyncConflicts(einsatzId, filter);
  const resolveMutation = useResolveKonflikt(einsatzId);
  const einheitenQuery = useEinsatzEinheiten(einsatzId);
  const { getUserName } = useUserNames();

  const einheitNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const einheit of einheitenQuery.data ?? []) {
      map.set(einheit.id, einheit.name);
    }
    return map;
  }, [einheitenQuery.data]);

  const conflicts = conflictsQuery.data ?? [];

  const sortedConflicts = useMemo(() => {
    const list = [...conflicts];
    list.sort((a, b) => compareConflicts(a, b, sortColumn, einheitNameById));
    if (sortDirection === 'desc') list.reverse();
    return list;
  }, [conflicts, sortColumn, sortDirection, einheitNameById]);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: sortedConflicts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const handleHeaderKey = (event: React.KeyboardEvent<HTMLTableCellElement>, column: SortColumn) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSort(column);
    }
  };

  const handleResolve = (conflict: SyncConflictListItemDto, resolution: Resolution) => {
    if (!canResolve) return;
    setRowErrors((prev) => {
      if (!prev.has(conflict.id)) return prev;
      const next = new Map(prev);
      next.delete(conflict.id);
      return next;
    });
    resolveMutation.mutate(
      { syncConflictId: conflict.id, resolution },
      {
        onSuccess: () => {
          setAnnouncement(`Konflikt aufgelöst: ${RESOLUTION_ANNOUNCEMENT[resolution]}`);
        },
        onError: (error: unknown) => {
          setRowErrors((prev) => {
            const next = new Map(prev);
            next.set(conflict.id, formatResolveError(error));
            return next;
          });
        },
      },
    );
  };

  const handleResetFilter = () => {
    setFilter({});
  };

  const isLoading = conflictsQuery.isLoading;
  const isError = conflictsQuery.isError;

  return (
    <section aria-label={canResolve ? 'Sync-Konflikte' : 'Sync-Konflikte (Read-Only)'} className="flex flex-col gap-4" data-testid="conflict-resolution-list">
      {/* Polite Live-Region für SR-Ansagen (UX-DR6 §A11y) */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="conflict-sr-announcer">
        {announcement}
      </div>

      <FilterBar filter={filter} onChange={setFilter} onReset={handleResetFilter} />

      {isError ? (
        <Alert
          status="error"
          title="Konflikte können nicht geladen werden"
          description="Die Konflikt-Liste ist derzeit nicht erreichbar. Bitte erneut versuchen."
          role="alert"
          data-testid="conflict-error-alert"
        >
          <button
            type="button"
            onClick={() => void conflictsQuery.refetch()}
            className="mt-2 inline-flex items-center gap-2 rounded-control border border-status-danger-border bg-surface-panel px-3 py-1.5 text-sm font-medium text-status-danger-text hover:border-status-danger-text"
          >
            <PiArrowsClockwise className="h-4 w-4" aria-hidden="true" />
            Erneut versuchen
          </button>
        </Alert>
      ) : isLoading ? (
        <LoadingSkeleton />
      ) : sortedConflicts.length === 0 ? (
        <EmptyState icon={PiCheckCircle} title="Keine offenen Sync-Konflikte" description="Alle Multi-Device-Konflikte wurden aufgelöst." />
      ) : (
        <div ref={parentRef} className="relative isolate overflow-auto rounded-panel border border-border-subtle" style={{ height: 600, maxHeight: 600 }} data-testid="conflict-table-container">
          <table role="table" aria-label={canResolve ? 'Konflikte' : 'Konflikte (Read-Only)'} aria-rowcount={sortedConflicts.length} className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-panel">
              <tr role="row">
                <SortHeader column="entityType" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} onKey={handleHeaderKey}>
                  Entität
                </SortHeader>
                <th scope="col" className="px-3 py-2 text-left text-sm font-medium text-text-primary">
                  Feld
                </th>
                <SortHeader column="serverVersion" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} onKey={handleHeaderKey}>
                  Server-Version
                </SortHeader>
                <SortHeader column="localExpectedVersion" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} onKey={handleHeaderKey}>
                  Lokale Version
                </SortHeader>
                <th scope="col" className="px-3 py-2 text-left text-sm font-medium text-text-primary">
                  Lokal-Snapshot
                </th>
                <SortHeader column="reportedAt" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} onKey={handleHeaderKey}>
                  Reportet
                </SortHeader>
                <th scope="col" className="px-3 py-2 text-left text-sm font-medium text-text-primary">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody style={{ height: rowVirtualizer.getTotalSize(), display: 'block', position: 'relative' }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const conflict = sortedConflicts[virtualRow.index];
                if (!conflict) return null;
                const einheitName = conflict.einheitId ? (einheitNameById.get(conflict.einheitId) ?? `Einheit ${conflict.einheitId.slice(0, 8)}`) : '–';
                const reporterName = getUserName(conflict.reportedByUserId);
                const rowError = rowErrors.get(conflict.id);
                return (
                  <tr
                    key={conflict.id}
                    role="row"
                    aria-rowindex={virtualRow.index + 1}
                    data-testid={`conflict-row-${conflict.id}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                      display: 'table',
                      tableLayout: 'fixed',
                    }}
                    className="bg-surface-base border-b border-border-subtle"
                  >
                    <td className="px-3 py-2 align-top text-sm text-text-primary">
                      <div className="flex flex-col">
                        <span className="font-medium">{formatEntityTypeLabel(conflict.entityType)}</span>
                        <span className="text-xs text-text-muted">{einheitName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-sm text-text-primary">{conflict.fieldPath}</td>
                    <td className="px-3 py-2 align-top text-sm text-text-primary tabular-nums" aria-label={`Server-Version: ${conflict.serverVersion}`}>
                      {conflict.serverVersion}
                    </td>
                    <td className="px-3 py-2 align-top text-sm text-text-primary tabular-nums" aria-label={`Lokal erwartete Version: ${conflict.localExpectedVersion}`}>
                      {conflict.localExpectedVersion}
                    </td>
                    <td className="px-3 py-2 align-top text-sm text-text-primary">
                      <details
                        open={openSnapshotId === conflict.id}
                        onToggle={(event) => {
                          const isOpen = (event.currentTarget as HTMLDetailsElement).open;
                          setOpenSnapshotId(isOpen ? conflict.id : null);
                        }}
                        data-testid={`conflict-snapshot-${conflict.id}`}
                      >
                        <summary className="cursor-pointer text-action-primary hover:underline">{formatLocalPayloadPreview(conflict.localPayload)}</summary>
                        <pre className="mt-2 max-h-48 overflow-auto rounded bg-surface-raised p-2 text-xs">{formatLocalPayloadFull(conflict.localPayload)}</pre>
                      </details>
                    </td>
                    <td className="px-3 py-2 align-top text-sm text-text-primary">
                      <time dateTime={toIsoString(conflict.reportedAt)}>{formatRelativeTimeDe(conflict.reportedAt)}</time>
                      <div className="text-xs text-text-muted">{reporterName}</div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {RESOLVE_BUTTONS.map(({ resolution, label, intent }) => {
                          const ariaLabel = `${label} für ${formatEntityTypeLabel(conflict.entityType)} von ${einheitName}`;
                          return (
                            <button
                              key={resolution}
                              type="button"
                              onClick={() => handleResolve(conflict, resolution)}
                              disabled={!canResolve || resolveMutation.isPending}
                              aria-disabled={!canResolve}
                              aria-label={ariaLabel}
                              data-testid={`conflict-resolve-${resolution}-${conflict.id}`}
                              style={{ minHeight: 48 }}
                              className={cn(
                                'inline-flex items-center justify-center rounded-control border px-3 text-sm font-medium transition-colors focus-visible:shadow-focus-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                                BUTTON_CLASSES[intent],
                              )}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {rowError ? (
                        <p role="alert" className="mt-1 text-xs text-status-danger-text" data-testid={`conflict-row-error-${conflict.id}`}>
                          {rowError}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!canResolve ? <p className="text-xs text-text-muted">Konflikte können nur vom Sicherheitsbeauftragten aufgelöst werden.</p> : null}
    </section>
  );
}

interface FilterBarProps {
  filter: SyncConflictsFilter;
  onChange: (next: SyncConflictsFilter) => void;
  onReset: () => void;
}

function FilterBar({ filter, onChange, onReset }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3" data-testid="conflict-filter-bar">
      <div className="flex flex-col gap-1">
        <label htmlFor="conflict-filter-entity-type" className="text-xs font-medium text-text-secondary">
          Entitätstyp
        </label>
        <select
          id="conflict-filter-entity-type"
          value={filter.entityType ?? ''}
          onChange={(event) => {
            const value = event.target.value;
            onChange({ ...filter, entityType: value === '' ? undefined : (value as EntityType) });
          }}
          className="rounded-control border border-border-subtle bg-surface-panel px-2 py-1.5 text-sm"
        >
          <option value="">Alle</option>
          {ENTITY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="conflict-filter-einheit-id" className="text-xs font-medium text-text-secondary">
          Einheit-ID
        </label>
        <input
          id="conflict-filter-einheit-id"
          type="text"
          value={filter.einheitId ?? ''}
          onChange={(event) => {
            const value = event.target.value.trim();
            onChange({ ...filter, einheitId: value === '' ? undefined : value });
          }}
          placeholder="cuid2"
          className="rounded-control border border-border-subtle bg-surface-panel px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="button"
        onClick={onReset}
        className="rounded-control border border-border-subtle bg-surface-panel px-3 py-1.5 text-sm font-medium text-text-primary hover:border-border-strong hover:bg-action-secondary-hover"
        data-testid="conflict-filter-reset"
      >
        Reset
      </button>
    </div>
  );
}

interface SortHeaderProps {
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  onKey: (event: React.KeyboardEvent<HTMLTableCellElement>, column: SortColumn) => void;
  children: ReactNode;
}

function SortHeader({ column, sortColumn, sortDirection, onSort, onKey, children }: SortHeaderProps) {
  const isActive = sortColumn === column;
  const ariaSort = isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th
      scope="col"
      role="columnheader"
      aria-sort={ariaSort}
      tabIndex={0}
      onClick={() => onSort(column)}
      onKeyDown={(event) => onKey(event, column)}
      className="cursor-pointer px-3 py-2 text-left text-sm font-medium text-text-primary select-none hover:text-action-primary focus-visible:shadow-focus-ring focus-visible:outline-none"
      data-testid={`conflict-sort-${column}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive ? (sortDirection === 'asc' ? '▲' : '▼') : null}
      </span>
    </th>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2" data-testid="conflict-loading-skeleton">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

function compareConflicts(a: SyncConflictListItemDto, b: SyncConflictListItemDto, column: SortColumn, einheitNameById: Map<string, string>): number {
  switch (column) {
    case 'entityType':
      return formatEntityTypeLabel(a.entityType).localeCompare(formatEntityTypeLabel(b.entityType), 'de');
    case 'einheitName': {
      const an = a.einheitId ? (einheitNameById.get(a.einheitId) ?? '') : '';
      const bn = b.einheitId ? (einheitNameById.get(b.einheitId) ?? '') : '';
      return an.localeCompare(bn, 'de');
    }
    case 'serverVersion':
      return a.serverVersion - b.serverVersion;
    case 'localExpectedVersion':
      return a.localExpectedVersion - b.localExpectedVersion;
    case 'reportedAt':
    default: {
      const at = toIsoString(a.reportedAt);
      const bt = toIsoString(b.reportedAt);
      return at.localeCompare(bt);
    }
  }
}

function toIsoString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function formatResolveError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    if (message.includes('ConflictAlreadyResolved')) return 'Konflikt wurde bereits aufgelöst.';
    if (message.includes('ConflictDetected')) return 'Erneuter Konflikt — bitte neu laden und prüfen.';
    if (message.startsWith('ConflictNotFound')) return 'Konflikt nicht gefunden.';
    return message;
  }
  return 'Unbekannter Fehler beim Auflösen.';
}
