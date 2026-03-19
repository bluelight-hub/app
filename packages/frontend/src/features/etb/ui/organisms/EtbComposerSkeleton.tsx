/**
 * Semantischer Skeleton-Ladezustand für den ETB Composer
 *
 * Bildet die Struktur des Composer-Formulars nach:
 * Header, Kommunikationsweg, Kontext, Textfeld, Aktionen.
 * Wird erst nach 300ms Verzögerung angezeigt (via useDelayedLoading).
 */
export function EtbComposerSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8" role="status" aria-label="ETB Composer wird geladen">
      <div className="space-y-4">
        {/* Header-Skeleton */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="flex items-center gap-3">
              <div className="h-7 w-56 animate-pulse rounded bg-muted" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
          </div>
        </div>

        {/* Formular-Skeleton */}
        <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <div className="mb-4">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-4">
            {/* Kommunikationsweg */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-3 h-4 w-52 animate-pulse rounded bg-muted" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                  <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                  <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
                </div>
              </div>
            </div>

            {/* Kontext */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-3 h-4 w-36 animate-pulse rounded bg-muted" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
                </div>
              </div>
            </div>

            {/* Textfeld */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-3 h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
            </div>

            {/* Aktions-Buttons */}
            <div className="flex justify-end gap-3">
              <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
              <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        </div>

        {/* Aktions-Hint */}
        <p className="text-center text-gray-500 text-sm dark:text-gray-400">ETB wird geladen — bitte warten</p>

        {/* Eintragliste-Skeleton */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="border-gray-200 border-b px-4 py-4 dark:border-gray-700">
            <div className="h-6 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-8 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-8 animate-pulse rounded bg-muted" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-8 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-8 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
