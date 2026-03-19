import { useEinsatzDetails } from '@/features/einsatz/hooks/use-einsatz-details';
import { ErrorState } from '@/shared/ui/atoms/ErrorState';
import { cn } from '@/shared/ui/cn';
import type { EintragDto } from '@/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PiArrowsClockwise, PiClockCounterClockwise } from 'react-icons/pi';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { useEtbInfinite } from '../../api';
import { EtbComposerSkeleton } from './EtbComposerSkeleton';
import { EtbEntryForm } from './EtbEntryForm';
import { EtbEntryList } from './EtbEntryList';
import { EtbLockButton } from '../molecules/EtbLockButton';
import { EtbStatusBadge, type EtbStatus } from '../molecules/EtbStatusBadge';
import { EditEtbEntryModal } from './EditEtbEntryModal';
import { EtbSnapshotHistoryModal } from './components/EtbSnapshotHistoryModal';

interface EtbComposerWorkspaceProps {
  einsatzId: string;
}

/**
 * ETB Composer Workspace — Feature-Composite für die Einsatztagebuch-Erfassung
 *
 * Wrapper um EtbEntryForm + EtbEntryList mit:
 * - Einsatz-Kontext-Anzeige im Header
 * - Auto-Fokus auf erstem Eingabefeld
 * - Semantischer Skeleton-Ladezustand (300ms Threshold)
 * - WCAG 2.1 AA Accessibility
 */
export function EtbComposerWorkspace({ einsatzId }: EtbComposerWorkspaceProps) {
  const [sortBy, setSortBy] = useState<string>('sequenceNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDeleted, setShowDeleted] = useState<boolean>(false);

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } = useEtbInfinite({
    einsatzId,
    limit: 30,
    sortBy,
    sortOrder,
    includeDeleted: showDeleted,
  });

  const { einsatz, isLoading: isEinsatzLoading } = useEinsatzDetails(einsatzId);

  const [editingEntry, setEditingEntry] = useState<(EintragDto & { etbId: string }) | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  /** Ref für Fokus-Management: Kategorie-Feld nach Speichern fokussieren */
  const afterSaveFocusRef = useRef<HTMLDivElement>(null);

  /** Live-Region Ref für Status-Ankündigungen */
  const [statusMessage, setStatusMessage] = useState('');

  /** Timer-Refs für Cleanup bei Unmount */
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const isRefreshPending = isRefetching;
  const showSkeleton = useDelayedLoading(isLoading || isEinsatzLoading);

  const handleReload = async () => {
    await refetch();
  };

  const etb = data?.pages?.[0]?.data;

  const handleSortChange = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  const handleEditEntry = useCallback(
    (entry: EintragDto) => {
      if (!etb?.id) return;
      setEditingEntry({ ...entry, etbId: etb.id });
      setIsEditModalOpen(true);
    },
    [etb?.id],
  );

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingEntry(null);
  }, []);

  const handleSaveSuccess = useCallback(() => {
    setStatusMessage('Eintrag erfolgreich gespeichert');
    // Fokus auf Kategorie-Feld für schnellen Folge-Eintrag
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      // TODO(Story 3.1 Review H3): querySelector durch explizite Ref ersetzen — siehe Review-Fix-Pattern in Story 3.1
      afterSaveFocusRef.current?.querySelector<HTMLElement>('input, button, [role="combobox"]')?.focus();
    });
    // Status-Nachricht nach kurzer Zeit zurücksetzen
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatusMessage(''), 3000);
  }, []);

  // Cleanup Timer bei Unmount
  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const allEntries = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data?.eintraege || []);
  }, [data]);

  // Skeleton-Ladezustand (erst nach 300ms anzeigen)
  if (isLoading || isEinsatzLoading) {
    if (showSkeleton) {
      return <EtbComposerSkeleton />;
    }
    // Unter 300ms: nichts anzeigen (verhindert Flicker)
    return null;
  }

  if (error) {
    return <ErrorState title="Fehler beim Laden" description="Das Einsatztagebuch konnte nicht geladen werden." />;
  }

  if (!etb) {
    return <ErrorState title="ETB nicht verfügbar" description="Das Einsatztagebuch existiert nicht. Es sollte automatisch bei der Einsatz-Erstellung angelegt worden sein." />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-4">
        {/* Einsatz-Kontext + Header */}
        <div className="flex items-start justify-between">
          <div>
            {/* Breadcrumb/Context-Hint */}
            <nav aria-label="ETB-Kontext-Navigation">
              <p className="text-gray-500 text-sm dark:text-gray-400">
                <span>Führung</span>
                <span className="mx-1.5" aria-hidden="true">
                  →
                </span>
                <span>ETB</span>
                {einsatz?.name && (
                  <>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{einsatz.name}</span>
                  </>
                )}
              </p>
            </nav>
            {/* Titel + Status */}
            <div className="mt-1 flex items-center gap-3">
              <h1 id="composer-heading" className="font-semibold text-2xl text-gray-900 dark:text-gray-100">
                Einsatztagebuch
              </h1>
              {etb?.status && <EtbStatusBadge status={etb.status as EtbStatus} showDot />}
            </div>
            <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">Dokumentiere alle wichtigen Ereignisse und Maßnahmen während des Einsatzes.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReload}
              aria-disabled={isRefreshPending}
              disabled={isRefreshPending}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-gray-700 text-sm shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:outline-none focus-visible:shadow-focus-ring dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600',
                isRefreshPending && 'cursor-not-allowed opacity-50',
              )}
              title="Aktualisieren"
            >
              <PiArrowsClockwise className={cn('h-4 w-4', isRefreshPending && 'animate-spin')} aria-hidden="true" />
              {isRefreshPending ? 'Aktualisiere ETB…' : 'Aktualisieren'}
            </button>
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-gray-700 text-sm shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:outline-none focus-visible:shadow-focus-ring dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600"
              title="Versionshistorie anzeigen"
            >
              <PiClockCounterClockwise className="h-4 w-4" aria-hidden="true" />
              Historie
            </button>
            <EtbLockButton etbId={etb.id} disabled={etb.status === 'LOCKED'} />
          </div>
        </div>

        {/* Eingabeformular */}
        {etb.status === 'LOCKED' ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20" role="alert">
            <p className="text-center text-red-700 dark:text-red-400">Das ETB ist gesperrt. Neue Einträge können nicht hinzugefügt werden.</p>
          </div>
        ) : (
          <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
            <div className="mb-4">
              <h2 className="font-medium text-gray-900 text-lg dark:text-gray-100">Neuer Eintrag</h2>
            </div>
            <EtbEntryForm etbId={etb.id} einsatzId={einsatzId} autoFocus onSuccess={handleSaveSuccess} aria-labelledby="composer-heading" afterSaveFocusRef={afterSaveFocusRef} />
          </div>
        )}

        {/* Live-Region für Status-Änderungen */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {statusMessage}
        </div>

        {/* Eintragliste mit Infinite Scrolling */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="border-gray-200 border-b px-4 py-4 dark:border-gray-700">
            <h2 className="font-medium text-gray-900 text-lg dark:text-gray-100">
              Einträge
              {data?.pages?.[0]?.pagination?.total ? (
                <span className="ml-2 text-gray-500 text-sm dark:text-gray-400">
                  ({allEntries.length} von {data.pages[0].pagination.total} geladen)
                </span>
              ) : (
                <span className="ml-2 text-gray-500 text-sm dark:text-gray-400">({allEntries.length})</span>
              )}
            </h2>
          </div>
          <div className="min-h-[700px] p-4">
            <EtbEntryList
              entries={allEntries}
              einsatzId={einsatzId}
              etbId={etb.id}
              isLoading={isLoading}
              hasNextPage={hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onEditEntry={handleEditEntry}
              onSortChange={handleSortChange}
              sortBy={sortBy}
              sortOrder={sortOrder}
              enableInlineEdit={true}
              showDeleted={showDeleted}
              onShowDeletedChange={setShowDeleted}
            />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditEtbEntryModal entry={editingEntry} isOpen={isEditModalOpen} onClose={handleCloseEditModal} />

      {/* History Modal */}
      <EtbSnapshotHistoryModal etbId={etb.id} isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} />
    </div>
  );
}
