import '@fontsource-variable/inter/index.css';
import './index.tailwind.css';
import { routeTree } from '@/routeTree.gen';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryProvider } from '@/provider/query-client.provider';
import { logger } from '@/shared/lib/logger';
import { initializeNotificationSetup, requestNotificationPermission } from '@/features/reminders/services';
import { initSeenAssignmentsStore } from '@/features/reminders/stores';
import { initEtbOfflineStore } from '@/features/etb/stores';
import { eventIdLru, PushSubscriptionManager, registerServiceWorker } from '@/shared/ui/push-subscription-manager';

// Initialize notification system (channels, action types) and request permission
// Runs async in background - errors are logged but don't block app startup
initializeNotificationSetup()
  .then(() => requestNotificationPermission())
  .catch((error) => {
    logger.error('[App-Startup] Notification Setup fehlgeschlagen', { error });
  });

// Register platform service-worker for Web-Push (Story 1.2). No-op in Tauri.
registerServiceWorker().catch((error) => logger.warn('[App-Startup] Service-Worker Registration fehlgeschlagen', { error }));

// AC5: Wenn der SW einen Push zugestellt hat, postet er `push-delivered` an die
// Page. Wir füllen den Page-LRU damit, damit ein kurz danach via WebSocket
// ankommendes Event denselben `eventId` nicht nochmal als Foreground-Banner
// dispatched (Story 1.2 Review D1, 2026-04-21).
if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data as { type?: string; eventId?: string } | null;
    if (data?.type === 'push-delivered' && typeof data.eventId === 'string' && data.eventId.length > 0) {
      eventIdLru.add(data.eventId);
    }
  });
}

// Initialize seen assignments store (Story 3.7) - Loads persisted data from Tauri Store
initSeenAssignmentsStore().catch((error) => logger.error('[App-Startup] Seen Assignments Store Init fehlgeschlagen', { error }));

// Initialize ETB offline store (Story 5.10) - Loads persisted ETB queue from Tauri Store
initEtbOfflineStore().catch((error) => logger.error('[App-Startup] ETB Offline Store Init fehlgeschlagen', { error }));

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Devtools nur im Dev-Build laden, damit Production-Bundle nichts davon mitzieht
const DevTools = import.meta.env.DEV
  ? lazy(async () => {
      const [{ TanStackDevtools }, { ReactQueryDevtoolsPanel }, { TanStackRouterDevtoolsPanel }, { FormDevtoolsPanel }, { PacerDevtoolsPanel }] = await Promise.all([
        import('@tanstack/react-devtools'),
        import('@tanstack/react-query-devtools'),
        import('@tanstack/react-router-devtools'),
        import('@tanstack/react-form-devtools'),
        import('@tanstack/react-pacer-devtools'),
      ]);
      return {
        default: () => (
          <TanStackDevtools
            plugins={[
              { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> },
              { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel router={router} /> },
              { name: 'TanStack Form', render: <FormDevtoolsPanel /> },
              { name: 'TanStack Pacer', render: <PacerDevtoolsPanel /> },
            ]}
          />
        ),
      };
    })
  : null;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
const root = ReactDOM.createRoot(rootElement);
root.render(
  <StrictMode>
    <QueryProvider>
      <PushSubscriptionManager />
      <RouterProvider router={router} />
      {DevTools ? (
        <Suspense fallback={null}>
          <DevTools />
        </Suspense>
      ) : null}
    </QueryProvider>
  </StrictMode>,
);
