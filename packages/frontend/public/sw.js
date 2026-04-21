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
 */

/* global self, clients */

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

  const notificationPromise = self.registration.showNotification(title, {
    body: body ?? '',
    data: { eventId, url, ...data },
    tag: eventId,
    renotify: false,
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

  const targetUrl = event.notification.data?.url;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      if (targetUrl) {
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              return client.navigate(targetUrl).catch(() => undefined);
            }
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }

      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      return undefined;
    }),
  );
});
