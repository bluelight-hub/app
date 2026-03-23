/**
 * Semantischer Skeleton-Ladezustand für den Befehl-Workspace
 *
 * Bildet die Struktur des Befehl-Workspace nach:
 * Toolbar, Filter-Bereich, Tabellen-Header + Zeilen.
 * Wird erst nach 300ms Verzögerung angezeigt (via useDelayedLoading).
 */
export function BefehlWorkspaceSkeleton() {
  return (
    <div className="flex h-full flex-col" role="status" aria-label="Befehlsarbeitsraum wird geladen">
      {/* Toolbar-Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-gray-200 border-b px-4 py-2 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-28 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      {/* Content-Skeleton */}
      <div className="flex-1 overflow-y-auto">
        {/* Handlungsbedarf-Skeleton */}
        <div className="border-gray-200 border-b px-4 py-3 dark:border-gray-700">
          <div className="mb-2 h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="flex gap-3">
            <div className="h-16 flex-1 animate-pulse rounded-lg bg-muted" />
            <div className="h-16 flex-1 animate-pulse rounded-lg bg-muted" />
            <div className="h-16 flex-1 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>

        {/* Tabellen-Skeleton */}
        <div className="p-4">
          {/* Tabellen-Header */}
          <div className="flex items-center gap-4 border-gray-200 border-b pb-3 dark:border-gray-700">
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>

          {/* Tabellen-Zeilen */}
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-gray-100 border-b py-3 dark:border-gray-800">
              <div className="h-4 w-8 animate-pulse rounded bg-muted" />
              <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* Textuelle Lade-Meldung */}
      <p className="py-2 text-center text-gray-500 text-sm dark:text-gray-400">Befehle werden geladen</p>
    </div>
  );
}
