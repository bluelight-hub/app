/**
 * ETB Sync Service fuer Offline Queue Synchronisation
 *
 * Verarbeitet gequeuete ETB-Aktionen chronologisch und synchronized diese mit dem Backend.
 * Implementiert Retry-Logik (max 3 Versuche) und Timestamp Preservation.
 *
 * **Story 5.10 AC2, AC3:**
 * - Synchronisiert alle gequeueten ETB-Aktionen chronologisch
 * - Max 3 Retry-Versuche bei Fehlern
 * - Erhalt des occurredAt Timestamps (direkt im DTO)
 */

import { api } from '@/shared';
import { logger } from '@/shared/lib/logger';
import { type EtbQueueAction, getQueuedActions, removeFromQueue, updateRetryCount, setEtbLastSync } from '../stores/offline.store';
import { offlineDetectionService } from '@/features/reminders/services/offline-detection.service';

/**
 * Maximale Anzahl Retry-Versuche fuer eine Action
 */
const MAX_RETRY_COUNT = 3;

/**
 * ETB Sync Service Klasse
 *
 * Singleton Service fuer die Synchronisation von offline gequeueten ETB-Aktionen.
 *
 * **Verwendung:**
 * - `syncAll()`: Verarbeitet alle gequeueten Aktionen chronologisch
 * - `executeAction()`: Fuehrt eine einzelne Action aus (mit Retry-Logik)
 *
 * **Retry-Strategie:**
 * - Max 3 Versuche pro Action
 * - Bei Fehlschlag: retryCount inkrementieren, Action bleibt in Queue
 * - Nach max Retries: Action bleibt in Queue (manuelles Eingreifen erforderlich)
 *
 * **Timestamp Preservation (AC3):**
 * - occurredAt aus payload wird direkt im AddEintragDto an API uebergeben
 *
 * @example
 * ```typescript
 * // Bei Reconnect aufrufen
 * await etbSyncService.syncAll();
 * ```
 */
export class EtbSyncService {
  /**
   * Synchronisiert alle gequeueten ETB-Aktionen chronologisch (AC2)
   *
   * - Prueft Offline-Status vor Sync
   * - Sortiert Queue nach timestamp (chronologisch)
   * - Fuehrt jede Action einzeln aus (mit Retry-Logik)
   * - Setzt lastSync Timestamp nach erfolgreicher Sync
   *
   * @returns Promise mit Anzahl erfolgreich synchronisierter Aktionen
   */
  async syncAll(): Promise<number> {
    // Pruefe ob aktuell offline
    if (offlineDetectionService.isOffline()) {
      logger.info('[EtbSyncService] Skipping sync - currently offline');
      return 0;
    }

    const queuedActions = getQueuedActions(); // Bereits chronologisch sortiert

    if (queuedActions.length === 0) {
      logger.info('[EtbSyncService] No queued actions to sync');
      return 0;
    }

    logger.info(`[EtbSyncService] Starting sync of ${queuedActions.length} queued actions`);

    let successCount = 0;

    for (const action of queuedActions) {
      try {
        await this.executeAction(action);
        successCount++;
      } catch (error) {
        // Network-Fehler: Sync abbrechen, wird beim naechsten Reconnect erneut versucht
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          logger.warn('[EtbSyncService] Network error during sync, will retry on reconnect');
          break;
        }
        // Sonstige Fehler: Log und weiter mit naechster Action
        logger.error(`[EtbSyncService] Failed to execute action ${action.id}`, error);
      }
    }

    // Setze lastSync Timestamp
    await setEtbLastSync(new Date().toISOString());

    logger.info(`[EtbSyncService] Sync completed: ${successCount}/${queuedActions.length} successful`);

    return successCount;
  }

  /**
   * Fuehrt eine einzelne ETB-Action aus (mit Retry-Logik)
   *
   * - Prueft retryCount (max 3 Versuche)
   * - Ruft entsprechende API-Methode auf
   * - Bei Erfolg: removeFromQueue()
   * - Bei Fehler: updateRetryCount(), Action bleibt in Queue
   *
   * @param action - Die auszufuehrende ETB-Action
   * @throws Error wenn max Retries erreicht oder API-Call fehlschlaegt
   */
  async executeAction(action: EtbQueueAction): Promise<void> {
    // Pruefe Retry-Count
    if (action.retryCount >= MAX_RETRY_COUNT) {
      logger.warn(`[EtbSyncService] Action ${action.id} exceeded max retry count (${MAX_RETRY_COUNT}), skipping`);
      throw new Error(`Max retry count exceeded for action ${action.id}`);
    }

    logger.info(`[EtbSyncService] Executing action ${action.id} (retry: ${action.retryCount}/${MAX_RETRY_COUNT})`);

    try {
      // Aktuell nur 'addEintrag' unterstuetzt
      if (action.actionType === 'addEintrag') {
        await this.executeAddEintrag(action);
      } else {
        logger.error(`[EtbSyncService] Unknown action type: ${action.actionType}`);
        throw new Error(`Unknown action type: ${action.actionType}`);
      }

      // Erfolg: Aus Queue entfernen
      await removeFromQueue(action.id);

      logger.info(`[EtbSyncService] Successfully executed action ${action.id}`);
    } catch (error) {
      // Fehler: retryCount inkrementieren
      const newRetryCount = action.retryCount + 1;
      await updateRetryCount(action.id, newRetryCount);

      logger.error(`[EtbSyncService] Failed to execute action ${action.id} (attempt ${newRetryCount}/${MAX_RETRY_COUNT})`, error);

      // Re-throw fuer syncAll() Error-Handling
      throw error;
    }
  }

  /**
   * Fuehrt eine 'addEintrag' Action aus
   *
   * Erstellt einen ETB-Eintrag via API.
   * occurredAt wird direkt im DTO uebergeben (Story 5.10, Task 3).
   *
   * @param action - Die addEintrag Action
   * @private
   */
  private async executeAddEintrag(action: EtbQueueAction): Promise<void> {
    const { payload, einsatzId } = action;

    // Backend erstellt automatisch ein ETB falls keins existiert (laut AddEintragDto.einsatzId)

    try {
      await api.etb().etbCqrsControllerAddEintragVAlpha({
        etbId: einsatzId, // Backend nutzt einsatzId um ETB zu finden/erstellen
        addEintragDto: {
          text: payload.text,
          kategorie: payload.kategorie,
          einsatzId,
          metadata: payload.metadata,
          // Timestamp Preservation (AC3): occurredAt direkt im DTO
          occurredAt: payload.occurredAt,
        },
      });
    } catch (error) {
      logger.error('[EtbSyncService] Failed to add ETB entry', error);
      throw error;
    }
  }
}

/**
 * Singleton-Instanz des ETB Sync Service
 *
 * @example
 * ```typescript
 * import { etbSyncService } from './etb-sync.service';
 *
 * // Bei Reconnect
 * await etbSyncService.syncAll();
 * ```
 */
export const etbSyncService = new EtbSyncService();
