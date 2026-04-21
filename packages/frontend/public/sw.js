/**
 * Service-Worker für Plattform-Push-Notifications (Story 1.2).
 *
 * Scope ist bewusst minimal: Push-Event → Notification anzeigen,
 * Notification-Click → Fenster fokussieren oder öffnen. Kein Offline-Cache,
 * kein Background-Sync — das sind eigene Stories.
 *
 * PushPayload-Contract (Story 1.1):
 *   { eventId: string, title: string, body: string, url?: string, data?: object }
 *
 * Dedup-Semantik (Architecture §B7, Story 1.2 AC5):
 *   - Der Service-Worker zeigt Notifications IMMER — Background-Push darf nie
 *     unterdrückt werden, sonst verpasst der User das Event.
 *   - Die Page-scoped LRU-Dedup läuft in useCriticalNotification, nicht hier.
 *   - Dieser SW informiert die Page via postMessage, damit sie den LRU füllen kann.
 *
 * Review-Notes (2026-04-21, D2):
 *   `install` + `activate` aktivieren neue SW-Versionen sofort beim Reload,
 *   statt auf Tab-Schließung zu warten. Sicher, weil der SW push-only ist
 *   (kein `fetch`-Handler, keine Offline-Caches).
 */

/* global self, clients */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Prüft, ob eine URL aus dem Push-Payload für Navigation akzeptabel ist:
 * - Same-origin (bezogen auf `self.registration.scope`)
 * - Nur `http:`/`https:` — keine `javascript:` oder `data:`-URLs
 * - Keine protocol-relativen URLs (`//evil.com/...`)
 */
function isSafePushUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  if (url.startsWith('//')) {
    return false;
  }
  try {
    const parsed = new URL(url, self.registration.scope);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const scopeOrigin = new URL(self.registration.scope).origin;
    return parsed.origin === scopeOrigin;
  } catch {
    return false;
  }
}

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  if (!payload || typeof payload !== 'object' || !payload.title || !payload.eventId) {
    return;
  }

  const { eventId, title, body, url, data } = payload;
  const safeUrl = isSafePushUrl(url) ? url : undefined;

  // Spread-Reihenfolge: interne Felder (eventId/url) überschreiben zuletzt,
  // damit ein manipuliertes `data`-Objekt sie nicht überschreiben kann.
  const notificationPromise = self.registration
    .showNotification(title, {
      body: body ?? '',
      data: { ...(typeof data === 'object' && data !== null ? data : {}), eventId, url: safeUrl },
      tag: eventId,
      renotify: false,
    })
    .catch((error) => {
      // Browser lehnt Notification ab (Quota, Permission-Revoke zur Laufzeit):
      // nicht via Promise.all nach oben durchreichen, sonst markiert der Browser
      // den SW als unhealthy und Push-Events schlagen künftig fehl.
      // eslint-disable-next-line no-console
      console.warn('[sw] showNotification failed', error);
    });

  const clientSyncPromise = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((windowClients) => {
      for (const client of windowClients) {
        client.postMessage({ type: 'push-delivered', eventId });
      }
    })
    .catch(() => {});

  event.waitUntil(Promise.all([notificationPromise, clientSyncPromise]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url;
  const targetUrl = isSafePushUrl(rawUrl) ? rawUrl : undefined;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (windowClients) => {
        // 1) Fenster mit focus-API finden — wenn targetUrl gesetzt ist,
        //    bevorzugt eines, das auch navigate unterstützt.
        if (targetUrl) {
          for (const client of windowClients) {
            if ('focus' in client && 'navigate' in client) {
              await client.focus().catch(() => undefined);
              return client.navigate(targetUrl).catch(() => undefined);
            }
          }
          // Kein focus+navigate-fähiges Fenster gefunden — neues öffnen.
          if (self.clients.openWindow) {
            return self.clients.openWindow(targetUrl).catch(() => undefined);
          }
          return undefined;
        }

        // Kein Ziel-URL: erstes verfügbares Fenster fokussieren.
        for (const client of windowClients) {
          if ('focus' in client) {
            return client.focus().catch(() => undefined);
          }
        }
        return undefined;
      })
      .catch(() => undefined),
  );
});
