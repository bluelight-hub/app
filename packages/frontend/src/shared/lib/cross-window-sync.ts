import { logger } from '@/shared/lib/logger';
import type { QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Cross-Window-Sync für Admin-Mutationen.
 *
 * In Tauri v2 sind Webview-Fenster oft process-isoliert, sodass
 * `BroadcastChannel` zwischen Haupt- und Admin-Fenster nicht zuverlässig
 * funktioniert. Deshalb nutzen wir Tauris IPC-Event-System (`emit`/`listen`)
 * als primären Kanal und fallen im Browser auf `BroadcastChannel` zurück.
 *
 * Sender: `broadcastInvalidation('admin.users')`
 * Empfänger: `useCrossWindowSync(queryClient)` in `__root.tsx`.
 */

const TAURI_EVENT_NAME = 'bluelight:sync';
const BROADCAST_CHANNEL_NAME = 'bluelight-hub.sync';

export type CrossWindowSyncScope = 'admin.users';

interface SyncMessage {
  scope: CrossWindowSyncScope;
}

function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  // Tauri v2 setzt `__TAURI_INTERNALS__` am window-Objekt. Wir checken das
  // direkt, statt `isTauri()` aus `@tauri-apps/api/core` zu importieren —
  // so bleibt der Browser-Pfad frei von Tauri-Modul-Kosten.
  return Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

function supportsBroadcastChannel(): boolean {
  return typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function';
}

let browserSender: BroadcastChannel | null = null;

function getBrowserSender(): BroadcastChannel | null {
  if (!supportsBroadcastChannel()) return null;
  if (!browserSender) {
    browserSender = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
  return browserSender;
}

/**
 * Broadcastet eine Invalidierung an alle anderen Fenster/Tabs.
 * Lokale Query-Invalidierung muss der Caller weiterhin selbst anstoßen
 * (TanStack Query macht das beim `invalidateQueries`-Aufruf).
 */
export function broadcastInvalidation(scope: CrossWindowSyncScope): void {
  const message: SyncMessage = { scope };

  if (isTauriRuntime()) {
    // Lazy-Import verhindert Test-Import-Fehler in Non-Tauri-Umgebungen.
    void import('@tauri-apps/api/event')
      .then(({ emit }) => emit(TAURI_EVENT_NAME, message))
      .then(() => logger.debug('[cross-window-sync] tauri emit', { scope }))
      .catch((error) => {
        logger.warn('Tauri-Cross-Window-Broadcast fehlgeschlagen', { scope, error });
      });
    return;
  }

  const channel = getBrowserSender();
  if (!channel) return;
  try {
    channel.postMessage(message);
  } catch (error) {
    logger.warn('BroadcastChannel-Cross-Window-Broadcast fehlgeschlagen', { scope, error });
  }
}

function invalidateScope(queryClient: QueryClient, scope: CrossWindowSyncScope): void {
  switch (scope) {
    case 'admin.users':
      // Benutzer-Mutationen können u.a. die eigene Session (role, operativeRole)
      // oder die Admin-User-Liste betreffen. Beides breit invalidieren, damit
      // das jeweils andere Fenster bei der nächsten Anzeige frische Daten lädt.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['auth'] });
      return;
  }
}

function isSyncMessage(value: unknown): value is SyncMessage {
  return typeof value === 'object' && value !== null && typeof (value as { scope?: unknown }).scope === 'string';
}

/**
 * Registriert den Listener für Cross-Window-Sync. Genau einmal am App-Root
 * einhängen (`__root.tsx`), damit Nachrichten aus anderen Fenstern gezielt
 * den QueryClient des aktuellen Fensters invalidieren.
 */
export function useCrossWindowSync(queryClient: QueryClient): void {
  useEffect(() => {
    if (isTauriRuntime()) {
      let unlisten: (() => void) | null = null;
      let cancelled = false;

      void import('@tauri-apps/api/event')
        .then(({ listen }) =>
          listen<SyncMessage>(TAURI_EVENT_NAME, (event) => {
            if (isSyncMessage(event.payload)) {
              logger.debug('[cross-window-sync] tauri received', { scope: event.payload.scope });
              invalidateScope(queryClient, event.payload.scope);
            }
          }),
        )
        .then((dispose) => {
          if (cancelled) {
            dispose();
          } else {
            unlisten = dispose;
          }
        })
        .catch((error) => {
          logger.warn('Tauri-Cross-Window-Listener Registrierung fehlgeschlagen', { error });
        });

      return () => {
        cancelled = true;
        unlisten?.();
      };
    }

    if (!supportsBroadcastChannel()) return;

    const listener = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    const handler = (event: MessageEvent<unknown>): void => {
      if (isSyncMessage(event.data)) {
        invalidateScope(queryClient, event.data.scope);
      }
    };

    listener.addEventListener('message', handler);
    return () => {
      listener.removeEventListener('message', handler);
      listener.close();
    };
  }, [queryClient]);
}
