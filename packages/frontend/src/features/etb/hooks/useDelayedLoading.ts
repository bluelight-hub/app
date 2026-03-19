import { useEffect, useState } from 'react';

/**
 * Hook für verzögertes Anzeigen eines Ladezustands
 *
 * Verhindert Flicker bei schnellem Laden: Skeleton wird erst nach `delayMs`
 * angezeigt. Wenn das Laden in weniger als `delayMs` abgeschlossen ist,
 * wird kein Skeleton angezeigt.
 *
 * @param isLoading - Ob gerade geladen wird
 * @param delayMs - Verzögerung in Millisekunden (Standard: 300)
 * @returns Ob der Skeleton-Ladezustand angezeigt werden soll
 */
export function useDelayedLoading(isLoading: boolean, delayMs = 300): boolean {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowSkeleton(false);
      return;
    }
    const timer = setTimeout(() => setShowSkeleton(true), delayMs);
    return () => clearTimeout(timer);
  }, [isLoading, delayMs]);

  return showSkeleton;
}
