import { useEffect, useRef } from 'react';
import { PushNotificationsApi } from '@bluelight-hub/shared/client';
import { getApi } from '@/shared/api/api';
import { useIsTauri } from '@/shared/hooks/useIsTauri';
import { logger } from '@/shared/lib/logger';
import { notificationService } from '@/features/reminders/services';
import { registerServiceWorker } from './register-service-worker';

/**
 * Wandelt den Base64url-kodierten VAPID-Public-Key in das von
 * `PushManager.subscribe` geforderte `Uint8Array` um (Standard-MDN-Snippet).
 */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Standard = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Standard);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

/**
 * Headless Komponente, die den Web-Push-Subscription-Lifecycle managed
 * (Story 1.2 AC6).
 *
 * Verhalten:
 * - Rendert `null` in Tauri-Runtime — Tauri nutzt `plugin-notification` (AC2).
 * - Rendert `null`, wenn `VITE_VAPID_PUBLIC_KEY` fehlt (Dev-Fallback).
 * - Registriert `sw.js`, abonniert `PushManager` und sendet die Subscription
 *   einmalig pro Page-Session über den generierten Shared-Client.
 * - Kein Toast bei 4xx/5xx (Zero-Toast-Policy UX-DR21) — nur `logger.warn`.
 * - Fragt selbst NICHT nach Permission; verlässt sich auf
 *   `initializeNotificationSetup().then(requestNotificationPermission)` aus
 *   `main.tsx` (Story 1.2 AC3, AC7).
 */
export function PushSubscriptionManager(): null {
  const { isTauri } = useIsTauri();
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  const hasSubscribedRef = useRef(false);

  useEffect(() => {
    if (isTauri || !vapidPublicKey || hasSubscribedRef.current) {
      return;
    }

    let cancelled = false;

    const subscribe = async () => {
      const permission = await notificationService.checkPermission();
      if (permission !== 'granted') {
        logger.debug('[push] skip subscription — permission not granted', { permission });
        return;
      }

      const registration = await registerServiceWorker();
      if (!registration || cancelled) {
        return;
      }

      try {
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
        if (cancelled) {
          return;
        }

        const payload = subscription.toJSON();
        if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
          logger.warn('[push] subscription payload missing required fields', { payload });
          return;
        }

        const pushApi: PushNotificationsApi = getApi().pushNotifications();
        await pushApi.pushSubscriptionControllerRegisterV1({
          createPushSubscriptionDto: {
            endpoint: payload.endpoint,
            keys: { p256dh: payload.keys.p256dh, auth: payload.keys.auth },
          },
        });

        hasSubscribedRef.current = true;
        logger.info('[push] subscription registered', { endpointHost: new URL(payload.endpoint).host });
      } catch (error) {
        logger.warn('[push] subscription registration failed', { error });
      }
    };

    void subscribe();

    return () => {
      cancelled = true;
    };
  }, [isTauri, vapidPublicKey]);

  return null;
}
