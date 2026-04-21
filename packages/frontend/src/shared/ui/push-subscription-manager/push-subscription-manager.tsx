import { useEffect, useRef } from 'react';
import { PushNotificationsApi } from '@bluelight-hub/shared/client';
import { getApi } from '@/shared/api/api';
import { useIsTauri } from '@/shared/hooks/useIsTauri';
import { logger } from '@/shared/lib/logger';
import { notificationService } from '@/features/reminders/services';

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
 * Loggt den Erfolg einer Subscription-Registrierung mit schonend extrahiertem
 * Endpoint-Host — ohne den Rest der URL zu persistieren und ohne dass ein
 * malformed Endpoint den Log-Pfad in den outer catch schickt.
 */
function logSubscriptionSuccess(endpoint: string): void {
  let host: string | undefined;
  try {
    host = new URL(endpoint).host;
  } catch {
    host = undefined;
  }
  logger.info('[push] subscription registered', host ? { endpointHost: host } : {});
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
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (isTauri || !vapidPublicKey || hasSubscribedRef.current || inFlightRef.current) {
      return;
    }

    let cancelled = false;
    inFlightRef.current = true;

    const subscribe = async () => {
      try {
        const permission = await notificationService.checkPermission();
        if (permission !== 'granted') {
          logger.debug('[push] skip subscription — permission not granted', { permission });
          return;
        }

        // Single-Source Service-Worker-Registration läuft in `main.tsx`.
        // Hier konsumieren wir nur die bereits aktive Registration.
        if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
          logger.debug('[push] skip subscription — no ServiceWorker support');
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        if (cancelled) {
          return;
        }

        if (!registration.pushManager) {
          logger.warn('[push] PushManager not supported by browser');
          return;
        }

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
        logSubscriptionSuccess(payload.endpoint);
      } catch (error) {
        logger.warn('[push] subscription registration failed', { error });
      } finally {
        inFlightRef.current = false;
      }
    };

    void subscribe();

    return () => {
      cancelled = true;
    };
  }, [isTauri, vapidPublicKey]);

  return null;
}
