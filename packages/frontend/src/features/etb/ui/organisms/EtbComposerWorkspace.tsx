import { useEinsatzDetails } from '@/features/einsatz/hooks/use-einsatz-details';
import { logger } from '@/shared/lib/logger';
import { ErrorState } from '@/shared/ui/atoms/ErrorState';
import { cn } from '@/shared/ui/cn';
import type { EintragDto } from '@/shared';
import { useBlocker } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PiArrowsClockwise, PiClockCounterClockwise } from 'react-icons/pi';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { useEtbDraftResume } from '../../hooks/useEtbDraftResume';
import { useEtbSyncStatus } from '../../hooks/useEtbSyncStatus';
import { useEtbInfinite, useCreateEtbEntry, useUpdateEtbEntry } from '../../api';
import { setHighlightedEntry } from '@/features/reminders/stores';
import { EtbComposerSkeleton } from './EtbComposerSkeleton';
import { EtbEntryForm } from './EtbEntryForm';
import { EtbEntryList } from './EtbEntryList';
import { EtbLockButton } from '../molecules/EtbLockButton';
import { EtbDraftResumeBanner } from '../molecules/EtbDraftResumeBanner';
import { EtbStatusBadge, type EtbStatus } from '../molecules/EtbStatusBadge';
import { ContinuityStatusRail } from '../molecules/ContinuityStatusRail';
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

  /** Mutation-Hooks für Sync-Status-Ableitung */
  const createEintragMutation = useCreateEtbEntry();
  const updateEintragMutation = useUpdateEtbEntry();

  const [editingEntry, setEditingEntry] = useState<(EintragDto & { etbId: string }) | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  /** Story 3.4: aria-live Meldung nach erfolgreicher Bearbeitung */
  const [editStatusMessage, setEditStatusMessage] = useState('');
  /** Story 3.5: Wiederhergestellte Draft-Werte (einmalig an EtbEntryForm übergeben) */
  const [restoredDraftValues, setRestoredDraftValues] = useState<{
    text: string;
    kategorie: string;
    absender?: string;
    empfaenger?: string;
  } | null>(null);

  /** Ref für Fokus-Management: Kategorie-Feld nach Speichern fokussieren */
  const afterSaveFocusRef = useRef<HTMLDivElement>(null);

  /** Timer-Refs für Cleanup bei Unmount */
  const rafIdRef = useRef<number | null>(null);
  const timerIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Story 3.4: ID des bearbeiteten Eintrags fuer Fokus-Rueckkehr nach Modal-Close */
  const editingEntryIdRef = useRef<string | null>(null);

  /** Story 3.5: Draft-Resume Hook */
  const { pendingDraft, isLoadingDraft, restoreDraft, discardDraft, saveDraft, clearDraft, discardReason } = useEtbDraftResume({
    einsatzId,
    etbId: data?.pages?.[0]?.data?.id ?? '',
    etbStatus: data?.pages?.[0]?.data?.status,
  });

  /** Story 3.5: Tracking ob Formular nicht-leer ist (für beforeunload + useBlocker) */
  const [hasUnsavedContent, setHasUnsavedContent] = useState(false);

  const isRefreshPending = isRefetching;
  const showSkeleton = useDelayedLoading(isLoading || isEinsatzLoading);
  const showDraftLoadingSkeleton = useDelayedLoading(isLoadingDraft);

  const handleReload = async () => {
    try {
      await refetch();
    } catch (reloadError) {
      logger.error('ETB-Reload fehlgeschlagen', reloadError);
    }
  };

  const etb = data?.pages?.[0]?.data;

  /** Retry-Handler für fehlgeschlagene Speichervorgänge */
  const handleRetry = useCallback(() => {
    if (createEintragMutation.isError && createEintragMutation.variables) {
      createEintragMutation.mutate(createEintragMutation.variables);
    } else if (updateEintragMutation.isError && updateEintragMutation.variables) {
      updateEintragMutation.mutate(updateEintragMutation.variables);
    }
  }, [createEintragMutation, updateEintragMutation]);

  /** Sync-Status aus Mutation-State + ETB-Status ableiten */
  const syncStatus = useEtbSyncStatus({
    createMutation: {
      isPending: createEintragMutation.isPending,
      isSuccess: createEintragMutation.isSuccess,
      isError: createEintragMutation.isError,
      errorMessage: createEintragMutation.error?.message,
    },
    updateMutation: {
      isPending: updateEintragMutation.isPending,
      isSuccess: updateEintragMutation.isSuccess,
      isError: updateEintragMutation.isError,
      errorMessage: updateEintragMutation.error?.message,
    },
    etbStatus: etb?.status,
    onRetry: handleRetry,
  });

  const handleSortChange = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  const handleEditEntry = useCallback(
    (entry: EintragDto) => {
      if (!etb?.id) return;
      editingEntryIdRef.current = entry.id;
      setEditingEntry({ ...entry, etbId: etb.id });
      setIsEditModalOpen(true);
    },
    [etb?.id],
  );

  /** Story 3.4: Nach Modal-Close Fokus zur bearbeiteten Zeile zuruecksetzen */
  const handleCloseEditModal = useCallback(() => {
    const entryId = editingEntryIdRef.current;
    setIsEditModalOpen(false);
    setEditingEntry(null);

    if (entryId) {
      requestAnimationFrame(() => {
        const rowElement = document.getElementById(`etb-entry-${entryId}`);
        if (rowElement) {
          rowElement.focus();
        } else {
          // Fallback: Eintrag ist virtualisiert (nicht im DOM) — scrolle dorthin
          setHighlightedEntry(entryId);
          // Nach Scroll erneut Fokus versuchen
          timerIdsRef.current.push(
            setTimeout(() => {
              document.getElementById(`etb-entry-${entryId}`)?.focus();
            }, 200),
          );
        }
      });
    }
    editingEntryIdRef.current = null;
  }, []);

  /** Story 3.4: Nach erfolgreicher Bearbeitung → Highlight + aria-live Meldung */
  const handleEditSuccess = useCallback((entry: EintragDto) => {
    setHighlightedEntry(entry.id);
    setEditStatusMessage(`Eintrag #${entry.sequenceNumber} aktualisiert`);
    // Meldung nach 5s ausblenden
    timerIdsRef.current.push(setTimeout(() => setEditStatusMessage(''), 5000));
  }, []);

  const handleSaveSuccess = useCallback(() => {
    // Story 3.5: Draft löschen nach erfolgreichem Speichern
    clearDraft();
    setHasUnsavedContent(false);

    // Fokus auf Kategorie-Feld für schnellen Folge-Eintrag
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      // TODO(Story 3.1 Review H3): querySelector durch explizite Ref ersetzen — siehe Review-Fix-Pattern in Story 3.1
      afterSaveFocusRef.current?.querySelector<HTMLElement>('input, button, [role="combobox"]')?.focus();
    });
  }, [clearDraft]);

  /** Story 3.5: Restore-Handler — setzt Form-Werte aus dem Draft */
  const handleRestoreDraft = useCallback(() => {
    const draft = restoreDraft();
    setRestoredDraftValues({
      text: draft.text,
      kategorie: draft.kategorie,
      absender: draft.absender,
      empfaenger: draft.empfaenger,
    });
  }, [restoreDraft]);

  /** Story 3.5: Discard-Handler */
  const handleDiscardDraft = useCallback(async () => {
    await discardDraft();
  }, [discardDraft]);

  /** Story 3.5: Auto-Save Callback — wird von form.Subscribe aufgerufen */
  const handleFormValuesChange = useCallback(
    (values: { text: string; kategorie: string; absender?: string; empfaenger?: string }) => {
      const hasContent = (values.text || '').trim() !== '';
      setHasUnsavedContent(hasContent);

      // Kein Draft-Save im Edit-Modus
      if (editingEntry) return;

      if (hasContent && etb?.id) {
        saveDraft({
          ...values,
          etbId: etb.id,
        });
      }
    },
    [editingEntry, etb?.id, saveDraft],
  );

  /** Story 3.5: beforeunload-Guard */
  useEffect(() => {
    if (!hasUnsavedContent || createEintragMutation.isPending) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedContent, createEintragMutation.isPending]);

  /** Story 3.5: Navigation-Guard via TanStack Router */
  const navBlocker = useBlocker({
    shouldBlockFn: () => hasUnsavedContent && !createEintragMutation.isPending,
    withResolver: true,
  });

  // Cleanup Timer bei Unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      timerIdsRef.current.forEach(clearTimeout);
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

        {/* Story 3.5: Navigation-Blocker Bestätigung */}
        {navBlocker.status === 'blocked' && (
          <div
            role="alertdialog"
            aria-label="Ungespeicherter Eintrag"
            className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/20"
          >
            <p className="text-amber-800 text-sm dark:text-amber-200">Du hast einen ungespeicherten Eintrag. Möchtest du die Seite verlassen? Der Entwurf bleibt erhalten.</p>
            <div className="ml-4 flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => navBlocker.reset()}
                className="rounded-md px-3 py-1.5 font-medium text-amber-800 text-xs hover:bg-amber-100 focus:outline-none focus-visible:shadow-focus-ring dark:text-amber-200 dark:hover:bg-amber-800"
              >
                Bleiben
              </button>
              <button
                type="button"
                onClick={() => navBlocker.proceed()}
                className="rounded-md bg-amber-600 px-3 py-1.5 font-medium text-white text-xs hover:bg-amber-700 focus:outline-none focus-visible:shadow-focus-ring"
              >
                Verlassen
              </button>
            </div>
          </div>
        )}

        {/* ContinuityStatusRail — Inline-Sync-Status zwischen Header und Formular */}
        <ContinuityStatusRail syncStatus={syncStatus} />

        {/* Story 3.5: Draft-Resume-Banner */}
        {pendingDraft && !editingEntry && <EtbDraftResumeBanner draft={pendingDraft} onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />}

        {/* Story 3.5: Draft-Loading-Skeleton (300ms-Gate) */}
        {isLoadingDraft && showDraftLoadingSkeleton && <div className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" role="status" aria-label="Draft wird geladen" />}

        {/* Story 3.5: Discard-Reason Inline-Meldung */}
        {discardReason && (
          <div role="status" aria-live="polite" className="rounded-md bg-gray-50 px-3 py-2 text-sm text-text-secondary dark:bg-gray-800">
            {discardReason}
          </div>
        )}

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
            <EtbEntryForm
              etbId={etb.id}
              einsatzId={einsatzId}
              autoFocus
              onSuccess={handleSaveSuccess}
              aria-labelledby="composer-heading"
              afterSaveFocusRef={afterSaveFocusRef}
              createMutation={createEintragMutation}
              updateMutation={updateEintragMutation}
              onFormValuesChange={handleFormValuesChange}
              restoredDraftValues={restoredDraftValues}
              onDraftRestored={() => setRestoredDraftValues(null)}
            />
          </div>
        )}

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

      {/* Story 3.4: aria-live Region fuer Edit-Rueckmeldung */}
      {editStatusMessage && (
        <div aria-live="polite" className="sr-only">
          {editStatusMessage}
        </div>
      )}

      {/* Edit Modal */}
      <EditEtbEntryModal entry={editingEntry} isOpen={isEditModalOpen} onClose={handleCloseEditModal} onEditSuccess={handleEditSuccess} updateMutation={updateEintragMutation} />

      {/* History Modal */}
      <EtbSnapshotHistoryModal etbId={etb.id} isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} />
    </div>
  );
}
