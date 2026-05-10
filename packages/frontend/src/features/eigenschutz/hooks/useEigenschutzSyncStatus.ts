import { onlineManager } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSyncConflicts } from '@/features/eigenschutz/api/queries';
import { loadPendingCommandsWithMeta, subscribeToPendingCommandChanges, type EigenschutzPendingCommandV1 } from '@/features/eigenschutz/lib/pending-command-queue';

export type EigenschutzCentralSyncStatus = 'synced' | 'pending' | 'offline' | 'conflict';

export interface EigenschutzSyncStatus {
  readonly status: EigenschutzCentralSyncStatus;
  readonly isLoaded: boolean;
  readonly isOnline: boolean;
  readonly pendingCount: number;
  readonly conflictCount: number;
  readonly oldestPendingAt: string | null;
  readonly lastSyncAt: string | null;
  readonly hasStorageReadError: boolean;
  readonly hasPausedConflictQuery: boolean;
}

interface PendingSummary {
  readonly isLoaded: boolean;
  readonly pendingCount: number;
  readonly queuedConflictCount: number;
  readonly oldestPendingAt: string | null;
  readonly lastSyncAt: string | null;
  readonly hasStorageReadError: boolean;
}

const INITIAL_PENDING_SUMMARY: PendingSummary = {
  isLoaded: false,
  pendingCount: 0,
  queuedConflictCount: 0,
  oldestPendingAt: null,
  lastSyncAt: null,
  hasStorageReadError: false,
};

function minIso(values: readonly string[]): string | null {
  if (values.length === 0) return null;
  return [...values].sort((a, b) => a.localeCompare(b))[0] ?? null;
}

function summarizePendingCommands(commands: readonly EigenschutzPendingCommandV1[], readError: boolean, einsatzId: string): PendingSummary {
  const einsatzCommands = commands.filter((command) => command.einsatzId === einsatzId);
  const pendingCommands = einsatzCommands.filter((command) => command.status === 'pending');
  const conflictCommands = einsatzCommands.filter((command) => command.status === 'conflict');
  return {
    isLoaded: true,
    pendingCount: pendingCommands.length,
    queuedConflictCount: conflictCommands.length,
    oldestPendingAt: minIso(pendingCommands.map((command) => command.queuedAt)),
    lastSyncAt: null,
    hasStorageReadError: readError,
  };
}

export function useEigenschutzSyncStatus(einsatzId: string): EigenschutzSyncStatus {
  const [pendingSummary, setPendingSummary] = useState<PendingSummary>(INITIAL_PENDING_SUMMARY);
  const [isOnline, setIsOnline] = useState(() => onlineManager.isOnline());
  const refreshSequenceRef = useRef(0);
  const syncConflictsQuery = useSyncConflicts(einsatzId, undefined);

  const refreshPendingSummary = useCallback(async () => {
    const sequence = ++refreshSequenceRef.current;
    const result = await loadPendingCommandsWithMeta();
    if (sequence !== refreshSequenceRef.current) return;
    setPendingSummary((current) => {
      const next = summarizePendingCommands(result.commands, result.readError, einsatzId);
      const finishedLocalReplay = current.pendingCount > 0 && next.pendingCount === 0 && next.queuedConflictCount === 0 && !next.hasStorageReadError;
      return {
        ...next,
        lastSyncAt: finishedLocalReplay ? new Date().toISOString() : current.lastSyncAt,
      };
    });
  }, [einsatzId]);

  useEffect(() => {
    void refreshPendingSummary();
    const unsubscribe = subscribeToPendingCommandChanges(() => {
      void refreshPendingSummary();
    });
    return () => {
      refreshSequenceRef.current += 1;
      unsubscribe();
    };
  }, [refreshPendingSummary]);

  useEffect(() => {
    setIsOnline(onlineManager.isOnline());
    return onlineManager.subscribe((online) => setIsOnline(online));
  }, []);

  const conflictCount = (syncConflictsQuery.data?.length ?? 0) + pendingSummary.queuedConflictCount;
  const hasPausedConflictQuery = syncConflictsQuery.fetchStatus === 'paused';
  const hasUnresolvedConflictQuery = syncConflictsQuery.data === undefined && syncConflictsQuery.fetchStatus !== 'idle';

  const status = useMemo<EigenschutzCentralSyncStatus>(() => {
    if (conflictCount > 0) return 'conflict';
    if (!isOnline) return 'offline';
    if (pendingSummary.pendingCount > 0 || pendingSummary.hasStorageReadError || hasPausedConflictQuery || hasUnresolvedConflictQuery || !pendingSummary.isLoaded) return 'pending';
    return 'synced';
  }, [conflictCount, hasPausedConflictQuery, hasUnresolvedConflictQuery, isOnline, pendingSummary.hasStorageReadError, pendingSummary.isLoaded, pendingSummary.pendingCount]);

  return {
    status,
    isLoaded: pendingSummary.isLoaded,
    isOnline,
    pendingCount: pendingSummary.pendingCount,
    conflictCount,
    oldestPendingAt: pendingSummary.oldestPendingAt,
    lastSyncAt: pendingSummary.lastSyncAt,
    hasStorageReadError: pendingSummary.hasStorageReadError,
    hasPausedConflictQuery,
  };
}
