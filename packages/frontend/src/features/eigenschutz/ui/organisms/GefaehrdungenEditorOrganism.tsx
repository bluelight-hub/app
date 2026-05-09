/**
 * GefaehrdungenEditorOrganism — Save-Flow-Orchester für Gefährdungs-Items
 * (Story 2.2 Task 9, AC4 + AC10).
 *
 * Rendert pro Item einen `GefaehrdungItemEditor`, verwaltet lokalen
 * Draft-State und übergibt den gesamten Items-Array beim Speichern an den
 * Update-Mutation-Hook. Die Mutation trägt das `expectedVersion` der
 * geladenen Beurteilung für Optimistic-Concurrency (409 → Konflikt-Banner).
 *
 * Keyboard-Shortcut `Ctrl/Cmd+S` triggert den Speichern-Flow, analog zum
 * Admin-Backend-Pattern (UX-DR22).
 */

import { GEFAEHRDUNG_ITEM_LIMITS, type GefaehrdungItem, type Gefaehrdungsbeurteilung } from '@bluelight-hub/shared/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PiCheckCircleFill, PiPlusLight } from 'react-icons/pi';
import { EIGENSCHUTZ_QUERY_KEYS, fetchGefaehrdungsbeurteilung, GefaehrdungsbeurteilungConflictError, useUpdateGefaehrdungsbeurteilungItems } from '@/features/eigenschutz/api/queries';
import { useAutoSave } from '@/features/eigenschutz/hooks/useAutoSave';
import { loadPendingCommands, removePendingCommandsForEntity, replayPendingCommands, upsertPendingCommand } from '@/features/eigenschutz/lib/pending-command-queue';
import { Button } from '@/shared/ui/atoms/button.atom';
import { SeverityBanner } from '@/shared/ui/molecules/severity-banner.molecule';
import { GefaehrdungItemEditor } from '../molecules/GefaehrdungItemEditor';
import { SyncStatusBadge } from '../molecules/SyncStatusBadge';

export interface GefaehrdungenEditorOrganismProps {
  readonly einsatzId: string;
  readonly beurteilung: Gefaehrdungsbeurteilung;
  readonly focusItem?: string;
}

function getHttpStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

function serializeItems(items: readonly GefaehrdungItem[]): string {
  return JSON.stringify(items);
}

function createPendingCommandId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function GefaehrdungenEditorOrganism({ einsatzId, beurteilung, focusItem }: GefaehrdungenEditorOrganismProps) {
  const queryClient = useQueryClient();
  const mutation = useUpdateGefaehrdungsbeurteilungItems(einsatzId, beurteilung.id);

  const [items, setItems] = useState<GefaehrdungItem[]>(() => beurteilung.items);
  const [autoFocusIndex, setAutoFocusIndex] = useState<number | null>(null);
  const [savedVersion, setSavedVersion] = useState(beurteilung.version);
  const [serverConflict, setServerConflict] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const lastSyncedVersionRef = useRef<number>(beurteilung.version);
  const lastSyncedItemsRef = useRef<GefaehrdungItem[]>(beurteilung.items);
  const lastSyncedItemsKeyRef = useRef<string>(serializeItems(beurteilung.items));
  const focusItemRef = useRef<HTMLDivElement | null>(null);
  const replayInFlightRef = useRef(false);

  // Validierungs-Status lokal ableiten — TanStack-Form wäre Overkill für
  // einen flachen Items-Array. Die Zod-Validation im Mutation-Handler
  // bleibt die Source-of-Truth fürs Backend-Round-Trip.
  const hasInvalidItem = useMemo(() => {
    return items.some((item) => {
      const titleInvalid = !(item.title ?? '').trim() || (item.title ?? '').length > GEFAEHRDUNG_ITEM_LIMITS.titleMax;
      const schutzTooLong = (item.schutzmassnahmen ?? '').length > GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax;
      const descTooLong = (item.description ?? '').length > GEFAEHRDUNG_ITEM_LIMITS.descriptionMax;
      return titleInvalid || schutzTooLong || descTooLong;
    });
  }, [items]);

  const hasDraftChanges = useMemo(() => serializeItems(items) !== lastSyncedItemsKeyRef.current, [items]);

  useEffect(() => {
    if (!focusItem) return;
    const index = beurteilung.items.findIndex((item) => item.id === focusItem);
    if (index >= 0) {
      setAutoFocusIndex(index);
    }
  }, [beurteilung.items, focusItem]);

  const focusedItemFound = Boolean(focusItem && beurteilung.items.some((item) => item.id === focusItem));

  useEffect(() => {
    if (!focusedItemFound || !focusItemRef.current) return;
    focusItemRef.current.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    focusItemRef.current.querySelector<HTMLElement>('input, textarea, button')?.focus();
  }, [focusedItemFound, focusItem]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateOnlineState = () => setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
    updateOnlineState();
    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  const applySavedBeurteilung = useCallback((saved: Gefaehrdungsbeurteilung): Gefaehrdungsbeurteilung => {
    lastSyncedVersionRef.current = saved.version;
    lastSyncedItemsRef.current = saved.items;
    lastSyncedItemsKeyRef.current = serializeItems(saved.items);
    setSavedVersion(saved.version);
    return saved;
  }, []);

  const saveItemsWithVersion = useCallback(
    async (draftItems: GefaehrdungItem[], expectedVersion: number): Promise<Gefaehrdungsbeurteilung> => {
      const saved = await mutation.mutateAsync({
        items: draftItems,
        expectedVersion,
      });
      return applySavedBeurteilung(saved);
    },
    [applySavedBeurteilung, mutation],
  );

  const saveItems = useCallback(
    (draftItems: GefaehrdungItem[]): Promise<Gefaehrdungsbeurteilung> => {
      return saveItemsWithVersion(draftItems, lastSyncedVersionRef.current);
    },
    [saveItemsWithVersion],
  );

  const queuePendingCommand = useCallback(
    async (draftItems: GefaehrdungItem[], source: 'auto-save' | 'manual-finalize') => {
      const now = new Date().toISOString();
      await upsertPendingCommand({
        schemaVersion: 1,
        id: createPendingCommandId(),
        entityType: 'gefaehrdungsbeurteilung',
        einsatzId,
        entityId: beurteilung.id,
        expectedVersion: lastSyncedVersionRef.current,
        payload: { items: draftItems },
        queuedAt: now,
        updatedAt: now,
        source,
        status: 'pending',
      });
    },
    [beurteilung.id, einsatzId],
  );

  const autoSave = useAutoSave<GefaehrdungItem[], Gefaehrdungsbeurteilung>({
    entityId: beurteilung.id,
    entityType: 'gefaehrdungsbeurteilung',
    saveFn: saveItems,
    debounceMs: 2000,
    enabled: !serverConflict,
    isValid: () => !hasInvalidItem,
    hasChanges: (draftItems) => serializeItems(draftItems) !== lastSyncedItemsKeyRef.current,
    isConflictError: (error) => error instanceof GefaehrdungsbeurteilungConflictError || getHttpStatus(error) === 409,
    isOfflineError: (error) => getHttpStatus(error) === undefined,
    isOnline,
    onSaved: (saved) => {
      setItems(saved.items);
      setServerConflict(false);
      void removePendingCommandsForEntity('gefaehrdungsbeurteilung', beurteilung.id);
    },
    onLocalSave: queuePendingCommand,
    onOfflineSave: queuePendingCommand,
  });
  const { status: autoSaveStatus, hasPendingChanges: autoSaveHasPendingChanges, scheduleSave, finalizeNow, cancel: cancelAutoSave, resetSynced } = autoSave;

  const isCurrentBeurteilungCommand = useCallback(
    (command: { readonly entityType: string; readonly einsatzId: string; readonly entityId: string }) => {
      return command.entityType === 'gefaehrdungsbeurteilung' && command.einsatzId === einsatzId && command.entityId === beurteilung.id;
    },
    [beurteilung.id, einsatzId],
  );

  const replayPendingForCurrentBeurteilung = useCallback(async () => {
    if (!isOnline || replayInFlightRef.current) return;

    const pendingBeforeReplay = await loadPendingCommands();
    const hasCurrentConflict = pendingBeforeReplay.some((command) => isCurrentBeurteilungCommand(command) && command.status === 'conflict');
    if (hasCurrentConflict) {
      setServerConflict(true);
      return;
    }

    const hasReplayableCommand = pendingBeforeReplay.some((command) => isCurrentBeurteilungCommand(command) && command.status === 'pending');
    if (!hasReplayableCommand) return;

    replayInFlightRef.current = true;
    try {
      await replayPendingCommands({
        shouldReplay: isCurrentBeurteilungCommand,
        saveCommand: async (command) => {
          await saveItemsWithVersion(command.payload.items, command.expectedVersion);
        },
        isAlreadyApplied: async (command) => {
          const current = await queryClient.fetchQuery({
            queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung(einsatzId, command.entityId),
            queryFn: () => fetchGefaehrdungsbeurteilung(einsatzId, command.entityId),
          });
          return serializeItems(current.items) === serializeItems(command.payload.items);
        },
      });

      const pendingAfterReplay = await loadPendingCommands();
      const hasConflictAfterReplay = pendingAfterReplay.some((command) => isCurrentBeurteilungCommand(command) && command.status === 'conflict');
      setServerConflict(hasConflictAfterReplay);
      if (!hasConflictAfterReplay) {
        void queryClient.invalidateQueries({
          queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung(einsatzId, beurteilung.id),
        });
      }
    } finally {
      replayInFlightRef.current = false;
    }
  }, [beurteilung.id, einsatzId, isCurrentBeurteilungCommand, isOnline, queryClient, saveItemsWithVersion]);

  useEffect(() => {
    void replayPendingForCurrentBeurteilung();
  }, [replayPendingForCurrentBeurteilung]);

  const editorBusy = mutation.isPending || autoSaveStatus === 'syncing';
  const finalizeDisabled = hasInvalidItem || editorBusy || !hasDraftChanges || serverConflict;

  useEffect(() => {
    const incomingItemsKey = serializeItems(beurteilung.items);
    const incomingChanged = beurteilung.version !== lastSyncedVersionRef.current || incomingItemsKey !== lastSyncedItemsKeyRef.current;
    if (!incomingChanged) return;

    const localItemsKey = serializeItems(items);
    const localDirty = localItemsKey !== lastSyncedItemsKeyRef.current || autoSaveHasPendingChanges;
    if (localDirty) {
      if (incomingItemsKey === localItemsKey) {
        return;
      }
      setServerConflict(true);
      return;
    }

    lastSyncedVersionRef.current = beurteilung.version;
    lastSyncedItemsRef.current = beurteilung.items;
    lastSyncedItemsKeyRef.current = incomingItemsKey;
    setItems(beurteilung.items);
    setSavedVersion(beurteilung.version);
    setServerConflict(false);
    resetSynced(beurteilung.items);
  }, [autoSaveHasPendingChanges, beurteilung.items, beurteilung.version, items, resetSynced]);

  useEffect(() => {
    if (hasInvalidItem || serverConflict || !hasDraftChanges) return;
    scheduleSave(items);
  }, [hasDraftChanges, hasInvalidItem, items, scheduleSave, serverConflict]);

  // AC13: Unterscheide typsierten ConflictError (mit `currentVersion`) vom
  // rohen 409-Fetch-Error. Fallback-Pfad deckt Alt-Backends + den Edge-Case
  // ab, dass ein Upstream-Proxy den Context rewrites.
  const conflictError = mutation.error instanceof GefaehrdungsbeurteilungConflictError ? mutation.error : null;
  const conflictDetected = serverConflict || autoSaveStatus === 'conflict' || conflictError !== null || getHttpStatus(mutation.error) === 409;
  const bannerTitle = serverConflict
    ? 'Es gibt einen neueren Stand auf dem Server. Lade die aktuelle Version neu, um fortzufahren.'
    : conflictError?.currentVersion !== undefined
      ? `Version ${conflictError.currentVersion} wurde bereits von jemand anderem gespeichert. Lade die aktuelle Version neu, um fortzufahren.`
      : 'Jemand anders hat bereits Änderungen gespeichert — bitte neu laden.';

  const handleFinalize = useCallback(() => {
    if (finalizeDisabled) return;
    void finalizeNow(items);
  }, [finalizeDisabled, finalizeNow, items]);

  // Ctrl/Cmd+S Shortcut (UX-DR22) — document-level, damit auch bei Fokus
  // im Editor-Feld ein Save ausgelöst werden kann. preventDefault verhindert
  // den Browser-Save-Dialog.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const matches = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
      if (!matches) return;
      event.preventDefault();
      handleFinalize();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleFinalize]);

  const handleAdd = useCallback(() => {
    setItems((prev) => {
      const next = [...prev, { title: '' } as GefaehrdungItem];
      setAutoFocusIndex(next.length - 1);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    cancelAutoSave();
    setServerConflict(false);
    setItems(lastSyncedItemsRef.current);
    setAutoFocusIndex(null);
    void removePendingCommandsForEntity('gefaehrdungsbeurteilung', beurteilung.id);
  }, [beurteilung.id, cancelAutoSave]);

  const handleReload = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung(einsatzId, beurteilung.id),
    });
  }, [queryClient, einsatzId, beurteilung.id]);

  const handleRemove = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const handleItemChange = useCallback((index: number, next: GefaehrdungItem) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? next : item)));
  }, []);

  return (
    <div className="space-y-4" data-testid="gefaehrdungen-editor-organism">
      {conflictDetected ? (
        <SeverityBanner
          variant="warning"
          title={bannerTitle}
          description="Der Save-Versuch wurde nicht übernommen, damit keine fremden Änderungen überschrieben werden."
          action={{ label: 'Neu laden', onClick: handleReload }}
          data-testid="gefaehrdungen-editor-conflict-banner"
        />
      ) : null}

      {autoSaveStatus === 'error' ? (
        <SeverityBanner
          variant="danger"
          title="Speichern fehlgeschlagen"
          description="Die Änderung wurde nicht übernommen. Prüfe die Verbindung und versuche es erneut."
          data-testid="gefaehrdungen-editor-error-banner"
        />
      ) : null}

      {focusItem && !focusedItemFound ? (
        <SeverityBanner
          variant="warning"
          title="Gefährdung nicht gefunden"
          description="Das verlinkte Item ist in dieser Beurteilung nicht mehr vorhanden."
          data-testid="gefaehrdungen-editor-focus-missing"
        />
      ) : null}

      <div className="space-y-3" data-testid="gefaehrdungen-editor-items">
        {items.map((item, idx) => {
          const isFocusTarget = Boolean(focusItem && item.id === focusItem);
          return (
            <div key={item.id ?? `item-${idx}`} ref={isFocusTarget ? focusItemRef : undefined} data-focus-target={isFocusTarget || undefined}>
              <GefaehrdungItemEditor
                index={idx}
                value={item}
                onChange={(next) => handleItemChange(idx, next)}
                onRemove={() => handleRemove(idx)}
                autoFocusTitle={autoFocusIndex === idx}
                disabled={editorBusy}
              />
            </div>
          );
        })}
        {items.length === 0 ? (
          <p className="rounded-panel border border-dashed border-border-subtle bg-surface-panel p-4 text-center text-sm text-text-muted">
            Keine Gefährdungen erfasst. Füge eine hinzu, um zu starten.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-4">
        <Button intent="secondary" appearance="outline" type="button" onClick={handleAdd} disabled={editorBusy} data-testid="gefaehrdungen-editor-add">
          <PiPlusLight className="h-4 w-4" />
          Gefährdung hinzufügen
        </Button>
        <div className="flex items-center gap-2">
          <SyncStatusBadge status={serverConflict ? 'conflict' : autoSaveStatus} savedVersion={autoSaveStatus === 'synced' ? savedVersion : undefined} />
          {/* Tab-Order: Version abschließen vor Abbrechen (linear zu Schutzmaßnahmen → Abschluss → Abbrechen). */}
          <Button
            intent="primary"
            type="button"
            onClick={handleFinalize}
            disabled={finalizeDisabled}
            aria-disabled={finalizeDisabled || undefined}
            loading={editorBusy}
            kbd="⌘S"
            data-testid="gefaehrdungen-editor-save"
          >
            <PiCheckCircleFill className="h-4 w-4" />
            Version abschließen
          </Button>
          <Button intent="secondary" appearance="ghost" type="button" onClick={handleReset} disabled={editorBusy} data-testid="gefaehrdungen-editor-reset">
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  );
}
