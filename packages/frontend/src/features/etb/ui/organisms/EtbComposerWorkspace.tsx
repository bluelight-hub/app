import { useEinsatzDetails } from '@/features/einsatz/hooks/use-einsatz-details';
import { logger } from '@/shared/lib/logger';
import { useConfirm } from '@/shared/hooks';
import { ErrorState } from '@/shared/ui/atoms/ErrorState';
import { cn } from '@/shared/ui/cn';
import type { EintragDto } from '@/shared';
import { useBlocker } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PiArrowsClockwise, PiClockCounterClockwise } from 'react-icons/pi';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { useEtbDraftResume } from '../../hooks/useEtbDraftResume';
import { useEtbSyncStatus } from '../../hooks/useEtbSyncStatus';
import { useEtbInfinite, useCreateEtbEntry, useDeleteEtbEntry } from '../../api';
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
  /** Story 5.5: Sekundaere Rollen sehen ETB read-only (kein Erstellen/Bearbeiten/Loeschen) */
  readOnly?: boolean;
}

/**
 * ETB Composer Workspace — Feature-Composite fuer die Einsatztagebuch-Erfassung
 *
 * Wrapper um EtbEntryForm + EtbEntryList mit:
 * - Einsatz-Kontext-Anzeige im Header
 * - Auto-Fokus auf erstem Eingabefeld
 * - Semantischer Skeleton-Ladezustand (300ms Threshold)
 * - WCAG 2.1 AA Accessibility
 */
export function EtbComposerWorkspace({ einsatzId, readOnly = false }: EtbComposerWorkspaceProps) {
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

  /** Mutation-Hook fuer Sync-Status-Ableitung */
  const createEintragMutation = useCreateEtbEntry();
  const deleteEintragMutation = useDeleteEtbEntry();
  const confirm = useConfirm();

  const [editingEntry, setEditingEntry] = useState<(EintragDto & { etbId: string }) | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  /** aria-live Meldung nach erfolgreichem Bearbeiten */
  const [editStatusMessage, setEditStatusMessage] = useState('');
  /** Story 3.5: Wiederhergestellte Draft-Werte (einmalig an EtbEntryForm uebergeben) */
  const [restoredDraftValues, setRestoredDraftValues] = useState<{
    text: string;
    kategorie: string;
    absender?: string;
    empfaenger?: string;
  } | null>(null);

  /** Ref fuer Fokus-Management: Kategorie-Feld nach Speichern fokussieren */
  const afterSaveFocusRef = useRef<HTMLDivElement>(null);

  /** Timer-Refs fuer Cleanup bei Unmount */
  const rafIdRef = useRef<number | null>(null);
  const timerIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** ID des bearbeiteten Eintrags fuer Fokus-Rueckkehr nach Modal-Close */
  const editEntryIdRef = useRef<string | null>(null);

  /** Story 3.5: Draft-Resume Hook */
  const { pendingDraft, isLoadingDraft, restoreDraft, discardDraft, saveDraft, clearDraft, discardReason } = useEtbDraftResume({
    einsatzId,
    etbId: data?.pages?.[0]?.data?.id ?? '',
    etbStatus: data?.pages?.[0]?.data?.status,
  });

  /** Story 3.5: Tracking ob Formular nicht-leer ist (fuer beforeunload + useBlocker) */
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

  /** Retry-Handler fuer fehlgeschlagene Speichervorgaenge */
  const handleRetry = useCallback(() => {
    if (createEintragMutation.isError && createEintragMutation.variables) {
      createEintragMutation.mutate(createEintragMutation.variables);
    }
  }, [createEintragMutation]);

  /** Sync-Status aus Mutation-State + ETB-Status ableiten */
  const syncStatus = useEtbSyncStatus({
    createMutation: {
      isPending: createEintragMutation.isPending,
      isSuccess: createEintragMutation.isSuccess,
      isError: createEintragMutation.isError,
      errorMessage: createEintragMutation.error?.message,
    },
    updateMutation: {
      isPending: false,
      isSuccess: false,
      isError: false,
    },
    etbStatus: etb?.status,
    onRetry: handleRetry,
  });

  const handleSortChange = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  /** Bearbeiten-Handler: oeffnet den Edit-Dialog */
  const handleEditEntry = useCallback(
    (entry: EintragDto) => {
      if (!etb?.id) return;
      editEntryIdRef.current = entry.id;
      setEditingEntry({ ...entry, etbId: etb.id });
      setIsEditModalOpen(true);
    },
    [etb?.id],
  );

  /** Loeschen-Handler: Bestaetigungsdialog + Soft-Delete */
  const handleDeleteEntry = useCallback(
    async (entry: EintragDto) => {
      if (!etb?.id) return;

      const confirmed = await confirm({
        title: 'Eintrag loeschen',
        message: `Eintrag #${entry.sequenceNumber} wirklich loeschen?`,
        variant: 'danger',
        confirmLabel: 'Loeschen',
        cancelLabel: 'Abbrechen',
      });

      if (!confirmed) return;

      deleteEintragMutation.mutate({
        etbId: etb.id,
        eintragId: entry.id,
      });
    },
    [etb?.id, confirm, deleteEintragMutation],
  );

  /** Nach Modal-Close Fokus zur bearbeiteten Zeile zuruecksetzen */
  const handleCloseEditModal = useCallback(() => {
    const entryId = editEntryIdRef.current;
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
    editEntryIdRef.current = null;
  }, []);

  /** Nach erfolgreichem Bearbeiten: Highlight + aria-live Meldung */
  const handleEditSuccess = useCallback((entry: EintragDto) => {
    setHighlightedEntry(entry.id);
    setEditStatusMessage(`Eintrag #${entry.sequenceNumber} gespeichert`);
    // Meldung nach 5s ausblenden
    timerIdsRef.current.push(setTimeout(() => setEditStatusMessage(''), 5000));
  }, []);

  const handleSaveSuccess = useCallback(() => {
    // Story 3.5: Draft loeschen nach erfolgreichem Speichern
    clearDraft();
    setHasUnsavedContent(false);

    // Fokus auf Kategorie-Feld fuer schnellen Folge-Eintrag
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
              <p className="text-sm text-text-muted">
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
                    <span className="font-medium text-text-secondary">{einsatz.name}</span>
                  </>
                )}
              </p>
            </nav>
            {/* Titel + Status */}
            <div className="mt-1 flex items-center gap-3">
              <h1 id="composer-heading" className="text-2xl font-semibold text-text-primary">
                Einsatztagebuch
              </h1>
              {etb?.status && <EtbStatusBadge status={etb.status as EtbStatus} showDot />}
            </div>
            <p className="mt-1 text-sm text-text-muted">Dokumentiere alle wichtigen Ereignisse und Maßnahmen während des Einsatzes.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReload}
              aria-disabled={isRefreshPending}
              disabled={isRefreshPending}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md bg-surface-panel px-3 py-2 text-sm text-text-secondary shadow-sm ring-1 ring-border-subtle ring-inset hover:bg-surface-raised focus:outline-none focus-visible:shadow-focus-ring',
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
              className="inline-flex items-center gap-1.5 rounded-md bg-surface-panel px-3 py-2 text-sm text-text-secondary shadow-sm ring-1 ring-border-subtle ring-inset hover:bg-surface-raised focus:outline-none focus-visible:shadow-focus-ring"
              title="Versionshistorie anzeigen"
            >
              <PiClockCounterClockwise className="h-4 w-4" aria-hidden="true" />
              Historie
            </button>
            {!readOnly && <EtbLockButton etbId={etb.id} disabled={etb.status === 'LOCKED'} />}
          </div>
        </div>

        {/* Story 3.5: Navigation-Blocker Bestätigung */}
        {!readOnly && navBlocker.status === 'blocked' && (
          <div
            role="alertdialog"
            aria-label="Ungespeicherter Eintrag"
            className="flex items-center justify-between rounded-panel border border-status-warning-border bg-status-warning-surface px-4 py-3"
          >
            <p className="text-sm text-status-warning-text">Du hast einen ungespeicherten Eintrag. Möchtest du die Seite verlassen? Der Entwurf bleibt erhalten.</p>
            <div className="ml-4 flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => navBlocker.reset()}
                className="rounded-control px-3 py-1.5 text-xs font-medium text-status-warning-text hover:bg-status-warning-surface/80 focus:outline-none focus-visible:shadow-focus-ring"
              >
                Bleiben
              </button>
              <button
                type="button"
                onClick={() => navBlocker.proceed()}
                className="rounded-control bg-status-warning-text px-3 py-1.5 text-xs font-medium text-text-inverse hover:opacity-90 focus:outline-none focus-visible:shadow-focus-ring"
              >
                Verlassen
              </button>
            </div>
          </div>
        )}

        {/* ContinuityStatusRail — Inline-Sync-Status zwischen Header und Formular */}
        <ContinuityStatusRail syncStatus={syncStatus} />

        {/* Story 3.5: Draft-Resume-Banner */}
        {!readOnly && pendingDraft && !editingEntry && <EtbDraftResumeBanner draft={pendingDraft} onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />}

        {/* Story 3.5: Draft-Loading-Skeleton (300ms-Gate) */}
        {isLoadingDraft && showDraftLoadingSkeleton && <div className="h-12 animate-pulse rounded-lg bg-surface-raised" role="status" aria-label="Draft wird geladen" />}

        {/* Story 3.5: Discard-Reason Inline-Meldung */}
        {discardReason && (
          <div role="status" aria-live="polite" className="rounded-md bg-surface-raised px-3 py-2 text-sm text-text-secondary">
            {discardReason}
          </div>
        )}

        {/* Eingabeformular */}
        {readOnly ? (
          <div className="rounded-lg border border-status-info-border bg-status-info-surface p-4" role="status" aria-live="polite">
            <p className="text-center text-status-info-text">Sie sehen das ETB im Lesemodus. Ihre Einsatzrolle erlaubt keine Bearbeitung.</p>
          </div>
        ) : etb.status === 'LOCKED' ? (
          <div className="rounded-lg border border-status-danger-border bg-status-danger-surface p-4" role="alert">
            <p className="text-center text-status-danger-text">Das ETB ist gesperrt. Neue Einträge können nicht hinzugefügt werden.</p>
          </div>
        ) : (
          <div className="rounded-lg bg-surface-panel p-4 shadow">
            <div className="mb-4">
              <h2 className="text-lg font-medium text-text-primary">Neuer Eintrag</h2>
            </div>
            <EtbEntryForm
              etbId={etb.id}
              einsatzId={einsatzId}
              autoFocus
              onSuccess={handleSaveSuccess}
              aria-labelledby="composer-heading"
              afterSaveFocusRef={afterSaveFocusRef}
              createMutation={createEintragMutation}
              onFormValuesChange={handleFormValuesChange}
              restoredDraftValues={restoredDraftValues}
              onDraftRestored={() => setRestoredDraftValues(null)}
            />
          </div>
        )}

        {/* Eintragliste mit Infinite Scrolling */}
        <div className="overflow-hidden rounded-lg bg-surface-panel shadow">
          <div className="border-b border-border-subtle px-4 py-4">
            <h2 className="text-lg font-medium text-text-primary">
              Einträge
              {data?.pages?.[0]?.pagination?.total ? (
                <span className="ml-2 text-sm text-text-muted">
                  ({allEntries.length} von {data.pages[0].pagination.total} geladen)
                </span>
              ) : (
                <span className="ml-2 text-sm text-text-muted">({allEntries.length})</span>
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
              onEditEntry={readOnly ? undefined : handleEditEntry}
              onDeleteEntry={readOnly ? undefined : handleDeleteEntry}
              onSortChange={handleSortChange}
              sortBy={sortBy}
              sortOrder={sortOrder}
              enableInlineEdit={!readOnly}
              showDeleted={showDeleted}
              onShowDeletedChange={setShowDeleted}
            />
          </div>
        </div>
      </div>

      {/* aria-live Region fuer Bearbeitungs-Rückmeldung */}
      {editStatusMessage && (
        <div aria-live="polite" className="sr-only">
          {editStatusMessage}
        </div>
      )}

      {/* Bearbeiten Modal */}
      <EditEtbEntryModal entry={editingEntry} isOpen={isEditModalOpen} onClose={handleCloseEditModal} onSaveSuccess={handleEditSuccess} />

      {/* History Modal */}
      <EtbSnapshotHistoryModal etbId={etb.id} isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} />
    </div>
  );
}
