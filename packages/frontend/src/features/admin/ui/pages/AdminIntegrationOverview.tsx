/**
 * AdminIntegrationOverview - Übersichtsseite aller externen Integrationen.
 *
 * Zeigt pro Integration eine Statuskachel mit aggregiertem Status,
 * Fehlerrate, letzter Aktivitaet und empfohlener Aktion.
 *
 * AC1: Textliche Status (nicht nur Farbe)
 * AC2: Fehler innerhalb 5s sichtbar (via WebSocket + Polling)
 * AC3: Keyboard + Viewport zugaenglich
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCanAccess } from '@/features/auth/hooks/use-can-access';
import { useIntegrationOverview } from '@/features/admin/api';
import { useIntegrationWebSocket } from '@/features/admin/hooks/use-integration-websocket';
import { IntegrationStatusCard } from '../molecules/IntegrationStatusCard';

/**
 * Skeleton-Kachel fuer Loading-State (NFR5: Text innerhalb 300ms).
 */
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-2">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-700" />
        <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-gray-700" />
      </div>
      <div className="mt-3 border-gray-100 border-t pt-3 dark:border-gray-700">
        <div className="h-7 w-full rounded bg-gray-100 dark:bg-gray-700" />
      </div>
    </div>
  );
}

/**
 * Formatiert den Zeitpunkt als "Letzte Aktualisierung vor X Sekunden".
 */
function useRefreshIndicator(dataUpdatedAt: number) {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!dataUpdatedAt) return;

    const update = () => {
      const diff = Math.floor((Date.now() - dataUpdatedAt) / 1000);
      setSecondsAgo(diff);
    };

    update();
    intervalRef.current = setInterval(update, 1000);
    return () => clearInterval(intervalRef.current);
  }, [dataUpdatedAt]);

  if (!dataUpdatedAt) return null;
  if (secondsAgo < 5) return 'Gerade aktualisiert';
  if (secondsAgo < 60) return `Vor ${secondsAgo}s aktualisiert`;
  return `Vor ${Math.floor(secondsAgo / 60)} Min. aktualisiert`;
}

export function AdminIntegrationOverview() {
  const navigate = useNavigate();
  const { accessible, isLoading: accessLoading } = useCanAccess('integrationen');
  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useIntegrationOverview();
  useIntegrationWebSocket(accessible);
  const refreshLabel = useRefreshIndicator(dataUpdatedAt);

  const handleAction = useCallback(
    (serviceKey: string) => {
      if (serviceKey === 'hiorg-server') {
        navigate({ to: '/admin/integrations/hiorg' });
      }
    },
    [navigate],
  );

  // Access Guard
  if (accessLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!accessible) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-gray-500 dark:text-gray-400">Keine Berechtigung fuer die Integrationsübersicht.</p>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-lg dark:text-gray-100">Externe Integrationen</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <div className="space-y-4 p-6">
        <h2 className="font-semibold text-gray-900 text-lg dark:text-gray-100">Externe Integrationen</h2>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <p className="text-red-700 text-sm dark:text-red-300">Fehler beim Laden der Integrationsübersicht: {(error as Error)?.message ?? 'Unbekannter Fehler'}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 rounded-md bg-red-100 px-3 py-1.5 font-medium text-red-700 text-xs transition-colors hover:bg-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  const integrations = data?.integrations ?? [];

  return (
    <div className="space-y-4 p-6">
      {/* Header mit aria-live Region fuer Status-Aenderungen */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-lg dark:text-gray-100">Externe Integrationen</h2>
        {refreshLabel && (
          <span aria-live="polite" className="text-gray-400 text-xs dark:text-gray-500">
            {refreshLabel}
          </span>
        )}
      </div>

      {/* Grid: 2-3 Spalten auf Desktop, Stack auf engem Viewport (AC3) */}
      {integrations.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <IntegrationStatusCard key={integration.serviceKey} integration={integration} onAction={handleAction} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-gray-500 text-sm dark:text-gray-400">Keine Integrationen konfiguriert.</p>
      )}
    </div>
  );
}
