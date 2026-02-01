/**
 * Reconnect Sync Hook
 *
 * Registriert einen Callback fuer Reconnect-Events und triggert
 * die Synchronisation der Offline-Queue bei Wiederverbindung.
 *
 * **Story 1.8 AC3:**
 * - Sync Queue Processing bei Reconnect
 * - Query-Cache Invalidierung nach erfolgreichem Sync
 *
 * **Story 5.10 AC1, AC2:**
 * - ETB-Sync wird VOR Erinnerungen-Sync ausgefuehrt
 * - Datenintegritaet: ETB dokumentiert chronologischen Verlauf
 */

import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { offlineDetectionService, type OnlineCallbackData } from '../services/offline-detection.service';
import { syncService, type SyncResult } from '../services/sync.service';
import { etbSyncService } from '@/features/etb/services/etb-sync.service';
import { ETB_QUERY_KEYS } from '@/features/etb/api/queries';
import { logger } from '@/shared/lib/logger';
import { ERINNERUNG_QUERY_KEYS } from '../api/queries';

/**
 * Return-Typ des useReconnectSync Hooks
 */
export interface UseReconnectSyncReturn {
  /** Ob gerade synchronisiert wird */
  isSyncing: boolean;
  /** Letztes Sync-Ergebnis (null wenn noch kein Sync) */
  lastSyncResult: SyncResult | null;
  /** Manueller Sync-Trigger (fuer Retry nach Fehler) */
  triggerSync: () => Promise<SyncResult>;
}

/**
 * Hook fuer Reconnect-Synchronisation
 *
 * Registriert automatisch einen Callback beim offlineDetectionService,
 * der bei Wiederverbindung die Sync-Queue verarbeitet.
 *
 * **Story 1.8 AC3:** Automatische Synchronisation bei Reconnect
 * **Story 5.10 AC1, AC2:** ETB-Sync VOR Erinnerungen-Sync fuer Datenintegritaet
 *
 * **Sync-Reihenfolge:**
 * 1. ETB-Queue Sync (dokumentiert chronologischen Verlauf)
 * 2. Erinnerungen-Queue Sync (aktuelle Aktionen)
 *
 * @param einsatzId - Optional: EinsatzId fuer gezielte Query-Invalidierung
 * @returns Object mit Sync-Status und manuellem Trigger
 *
 * @example
 * ```tsx
 * function ErinnerungenPanel({ einsatzId }: Props) {
 *   const { isSyncing, lastSyncResult } = useReconnectSync(einsatzId);
 *
 *   if (isSyncing) {
 *     return <OfflineBanner variant="syncing" />;
 *   }
 *
 *   return <ErinnerungenList />;
 * }
 * ```
 */
export function useReconnectSync(einsatzId?: string): UseReconnectSyncReturn {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  /**
   * Fuehrt die Synchronisation durch
   *
   * **Story 5.10 AC2:**
   * ETB-Sync wird VOR Erinnerungen-Sync ausgefuehrt (Datenintegritaet).
   * ETB-Eintraege dokumentieren Events chronologisch, daher muessen
   * sie zuerst synchronisiert werden.
   */
  const performSync = useCallback(async (): Promise<SyncResult> => {
    setIsSyncing(true);

    try {
      logger.info('[useReconnectSync] Starting sync...');

      // 1. ETB Sync ZUERST (Story 5.10 AC2)
      let etbSyncCount = 0;
      try {
        logger.debug('[useReconnectSync] Syncing ETB queue...');
        etbSyncCount = await etbSyncService.syncAll();

        // ETB Query-Cache invalidieren bei Erfolg
        if (etbSyncCount > 0) {
          logger.debug('[useReconnectSync] Invalidating ETB queries after sync');

          if (einsatzId) {
            await queryClient.invalidateQueries({
              queryKey: ETB_QUERY_KEYS.byEinsatz(einsatzId),
            });
          } else {
            await queryClient.invalidateQueries({
              queryKey: ETB_QUERY_KEYS.all,
            });
          }
        }

        logger.info('[useReconnectSync] ETB sync complete', { syncCount: etbSyncCount });
      } catch (error) {
        logger.error('[useReconnectSync] ETB sync failed', error);
        // Fahre mit Erinnerungen-Sync fort trotz ETB-Fehler
      }

      // 2. Erinnerungen Sync (NACH ETB)
      // Pruefe ob es ausstehende Erinnerungen-Sync-Aktionen gibt
      if (!syncService.hasPendingSync()) {
        logger.debug('[useReconnectSync] No pending Erinnerungen sync actions');
        return { successCount: 0, failureCount: 0, results: [] };
      }

      logger.debug('[useReconnectSync] Syncing Erinnerungen queue...');
      const result = await syncService.syncAll();

      // Bei Erfolg: Query-Cache invalidieren
      if (result.successCount > 0) {
        logger.debug('[useReconnectSync] Invalidating Erinnerungen queries after sync');

        if (einsatzId) {
          // Gezielte Invalidierung fuer diesen Einsatz
          await queryClient.invalidateQueries({
            queryKey: ERINNERUNG_QUERY_KEYS.list(einsatzId),
          });
        } else {
          // Alle Erinnerungen invalidieren
          await queryClient.invalidateQueries({
            queryKey: ERINNERUNG_QUERY_KEYS.all,
          });
        }
      }

      setLastSyncResult(result);
      logger.info('[useReconnectSync] Sync complete', {
        etbSyncCount,
        erinnerungenSuccessCount: result.successCount,
        erinnerungenFailureCount: result.failureCount,
      });

      return result;
    } catch (error) {
      logger.error('[useReconnectSync] Sync failed', error);
      const errorResult: SyncResult = {
        successCount: 0,
        failureCount: 1,
        results: [
          {
            actionId: 'sync-error',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      };
      setLastSyncResult(errorResult);
      return errorResult;
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient, einsatzId]);

  /**
   * Manueller Sync-Trigger (fuer Retry-Button)
   */
  const triggerSync = useCallback(async (): Promise<SyncResult> => {
    return performSync();
  }, [performSync]);

  /**
   * Callback fuer Reconnect-Event
   *
   * **Story 5.10 AC1, AC2:**
   * - Triggert kombinierte Synchronisation (ETB + Erinnerungen)
   * - ETB wird VOR Erinnerungen synchronisiert (siehe performSync)
   */
  const handleReconnect = useCallback(
    async (data: OnlineCallbackData) => {
      logger.info('[useReconnectSync] Reconnected after offline period', {
        offlineSince: data.offlineSince.toISOString(),
        onlineSince: data.onlineSince.toISOString(),
      });

      // Starte kombinierte Synchronisation (ETB + Erinnerungen)
      await performSync();
    },
    [performSync],
  );

  /**
   * Registriere Reconnect-Callback
   */
  useEffect(() => {
    offlineDetectionService.setOnOnlineCallback(handleReconnect);

    return () => {
      offlineDetectionService.setOnOnlineCallback(null);
    };
  }, [handleReconnect]);

  return {
    isSyncing,
    lastSyncResult,
    triggerSync,
  };
}
