import { useCallback } from 'react';
import { toast } from 'sonner';
import { isTauri } from '@tauri-apps/api/core';
import { logger } from '@/shared/lib/logger';
import { notificationService, sendCriticalNotification } from '@/features/reminders/services';
import { eventIdLru } from './event-id-lru';

/**
 * Client-lokale Priorität einer kritischen Notification (Story 1.2 AC4).
 *
 * **Nicht** Teil des Backend-`PushPayload`-Contracts — steuert nur Toast-Tone
 * und Tauri-Channel-Zuordnung am Client.
 */
export type CriticalNotificationPriority = 'critical' | 'warning' | 'info';

/**
 * Payload für `useCriticalNotification` (Story 1.2 AC4).
 */
export interface CriticalNotificationPayload {
  title: string;
  body: string;
  eventId: string;
  url?: string;
  priority?: CriticalNotificationPriority;
}

/**
 * Hook, der kritische Plattform-Notifications plattformspezifisch dispatcht
 * (Story 1.2 AC4, AC5, AC7).
 *
 * Runtime-Pfade:
 * - **Tauri**: `plugin-notification.sendNotification(...)` im Critical-Channel.
 * - **Browser mit `granted`**: `registration.showNotification(...)` über den
 *   registrierten Service-Worker — damit Foreground-Banner und Background-Push
 *   identisch aussehen.
 * - **Browser mit `denied`**: Sonner-Toast-Fallback (Interim bis Story 3.3 den
 *   SeverityBanner liefert). Es wird **kein** Permission-Re-Prompt ausgelöst.
 *
 * Dedup: Ein page-scoped LRU (~200 Einträge) filtert parallele Dispatches über
 * Web-Push + WebSocket anhand der `eventId`.
 */
export function useCriticalNotification(): (payload: CriticalNotificationPayload) => Promise<void> {
  return useCallback(async (payload: CriticalNotificationPayload) => {
    const { title, body, eventId, url, priority = 'critical' } = payload;

    if (eventIdLru.has(eventId)) {
      logger.debug('[push] dedup critical notification', { eventId });
      return;
    }
    eventIdLru.add(eventId);

    if (isTauri()) {
      await sendCriticalNotification({ title, body, eventId, url });
      return;
    }

    const permission = await notificationService.checkPermission();

    if (permission === 'granted') {
      try {
        if (typeof navigator !== 'undefined' && navigator.serviceWorker?.ready) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, {
            body,
            data: { eventId, url },
            tag: eventId,
          });
          return;
        }
        await sendCriticalNotification({ title, body, eventId, url });
      } catch (error) {
        logger.warn('[push] showNotification failed, falling back to native Notification', { error });
        await sendCriticalNotification({ title, body, eventId, url });
      }
      return;
    }

    // TODO(story-3-3): migrate sonner fallback to <SeverityBanner>
    const toastFn = priority === 'info' ? toast.info : priority === 'warning' ? toast.warning : toast.error;
    toastFn(title, {
      description: body,
      duration: Number.POSITIVE_INFINITY,
      action: url
        ? {
            label: 'Öffnen',
            onClick: () => {
              if (typeof window !== 'undefined') {
                window.location.href = url;
              }
            },
          }
        : undefined,
    });
  }, []);
}
