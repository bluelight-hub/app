/**
 * Hook für Push-Notifications bei neuen Befehlen
 *
 * Empfängt befehl.erstellt Events via Callback vom WebSocket Hook
 * und sendet OS-Notifications an den Empfänger.
 *
 * Features:
 * - Push-Notification bei neuen Befehlen (gefiltert nach Empfänger)
 * - Badge-Count für unquittierte Befehle (Tauri + Web)
 *
 * Filtert Events:
 * - Nur wenn aktueller User Empfänger ist
 * - Keine Notification für eigene erstellte Befehle
 */

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth/api';
import { notificationService } from '@/features/reminders/services/notification.service';
import { logger } from '@/shared/lib/logger';
import type { BefehlDto } from '@/shared';
import { BEFEHL_QUERY_KEYS } from './queries';
import type { BefehlErstelltPayload } from './use-befehl-websocket';

interface UseBefehlNotificationsOptions {
  /** Einsatz-ID für Badge-Count Zuordnung */
  einsatzId: string;
  /** Ob Notifications aktiviert sein sollen (default: true) */
  enabled?: boolean;
}

/**
 * Setzt den App-Badge-Count für unquittierte Befehle
 *
 * Unterstützt Tauri (setBadgeCount) und Web (navigator.setAppBadge).
 */
async function updateAppBadge(count: number): Promise<void> {
  try {
    const { isTauri } = await import('@tauri-apps/api/core');
    if (isTauri()) {
      const { setBadgeCount } = await import('@tauri-apps/plugin-notification');
      await setBadgeCount(count);
      return;
    }
  } catch {
    // Tauri nicht verfügbar - Web Fallback
  }

  // Web Fallback: Navigator Badge API
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await (navigator as Navigator & { setAppBadge: (count: number) => Promise<void> }).setAppBadge(count);
      } else {
        await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
      }
    }
  } catch {
    // Badge API nicht unterstützt - graceful degradation
  }
}

/**
 * Hook für Push-Notifications bei neuen Befehlen
 *
 * Gibt einen `onBefehlErstellt` Callback zurück, der in
 * `useBefehlWebSocket({ onBefehlErstellt })` übergeben werden soll.
 *
 * @example
 * ```tsx
 * const { onBefehlErstellt } = useBefehlNotifications({ einsatzId });
 * useBefehlWebSocket({ einsatzId, onBefehlErstellt });
 * ```
 */
export function useBefehlNotifications({ einsatzId, enabled = true }: UseBefehlNotificationsOptions) {
  const { user: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const permissionRequestedRef = useRef(false);

  // Permission einmalig beim Mount im Einsatz-Kontext anfordern
  useEffect(() => {
    if (!enabled || permissionRequestedRef.current) return;
    permissionRequestedRef.current = true;
    notificationService.requestPermission().then((status) => {
      logger.info('Befehl-Notifications: Permission status', { status });
    });
  }, [enabled]);

  /**
   * Berechnet Badge-Count aus dem Query-Cache und aktualisiert den App-Badge
   */
  const updateBadge = useCallback(async () => {
    const befehle = queryClient.getQueryData<BefehlDto[]>(BEFEHL_QUERY_KEYS.list(einsatzId));
    if (!befehle || !currentUser?.id) return;

    const unquittiert = befehle.filter((b) => b.empfaenger.some((e) => e.empfaengerId === currentUser.id && !e.quittiertAm)).length;

    logger.debug('Befehl-Notifications: Badge update', { unquittiert });
    await updateAppBadge(unquittiert);
  }, [queryClient, einsatzId, currentUser?.id]);

  // Badge auf 0 beim Cleanup (Unmount)
  useEffect(() => {
    return () => {
      updateAppBadge(0);
    };
  }, []);

  // Callback für useBefehlWebSocket.onBefehlErstellt
  const handleBefehlErstellt = useCallback(
    (event: BefehlErstelltPayload) => {
      if (!enabled || !currentUser?.id) return;

      // Filter: Nur wenn aktueller User Empfänger ist
      // Auch Selbst-Zuweisungen beruecksichtigen (Ersteller = Empfaenger)
      if (!event.empfaengerIds?.includes(currentUser.id)) return;

      logger.info('Befehl-Notifications: Sending OS notification', {
        befehlId: event.befehlId,
        nummer: event.nummer,
      });

      // OS-Notification (wichtig bei minimierter App; Alarm-Toast + Sound kommen via WebSocket-Hook)
      notificationService.sendBefehlNotification({
        befehlId: event.befehlId,
        einsatzId: event.einsatzId,
        nummer: event.nummer,
        befehlsgeber: event.befehlsgeberName,
        inhalt: event.auftrag,
      });

      // Badge nach Cache-Invalidierung updaten
      queryClient
        .invalidateQueries({ queryKey: BEFEHL_QUERY_KEYS.list(einsatzId) })
        .then(() => updateBadge())
        .catch(() => {
          // Fallback: Badge trotzdem updaten
          updateBadge();
        });
    },
    [enabled, currentUser?.id, updateBadge, einsatzId, queryClient],
  );

  /**
   * Callback für Quittierungs-Events (Badge aktualisieren)
   *
   * Kann in useBefehlWebSocket nicht direkt genutzt werden,
   * aber der Badge wird auch nach Cache-Invalidierung aktualisiert.
   */
  const handleBefehlQuittiert = useCallback(() => {
    // Badge nach Cache-Invalidierung updaten
    queryClient
      .invalidateQueries({ queryKey: BEFEHL_QUERY_KEYS.list(einsatzId) })
      .then(() => updateBadge())
      .catch(() => {
        updateBadge();
      });
  }, [updateBadge, queryClient, einsatzId]);

  return {
    onBefehlErstellt: handleBefehlErstellt,
    onBefehlQuittiert: handleBefehlQuittiert,
    updateBadge,
  };
}
