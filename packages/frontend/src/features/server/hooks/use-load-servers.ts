import { useEffect, useState } from 'react';
import { hydrateServerStore } from '../stores/server.store';

/**
 * React Hook zum Laden der Server-Konfiguration aus dem Storage.
 *
 * Führt die Store-Hydration beim ersten Mount aus und schützt vor
 * doppelten Aufrufen. Gibt Loading- und Error-State für UI-Feedback zurück.
 *
 * @returns Object mit isLoading und error State
 *
 * @example
 * ```typescript
 * function App() {
 *   const { isLoading, error } = useLoadServers();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return <MainApp />;
 * }
 * ```
 */
export function useLoadServers(): { isLoading: boolean; error: Error | null } {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    hydrateServerStore()
      .then(() => {
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });
  }, []); // Only run once on mount

  return { isLoading, error };
}
