import { useCallback, useEffect, useRef, useState } from 'react';

type ConfirmationVariant = 'success' | 'error' | 'warning';

interface ConfirmationState {
  message: string;
  variant: ConfirmationVariant;
}

/**
 * Hook für Inline-Bestätigungsmeldungen mit Auto-Dismiss
 *
 * Verwaltet State und Timer für die InlineConfirmation-Komponente.
 * Timer-Cleanup via useRef (nicht nur im Effect-Cleanup), um Leaks
 * bei schnellem Aufruf von `show()` zu vermeiden.
 *
 * @param duration - Auto-Dismiss Dauer in Millisekunden (Standard: 3000)
 * @returns confirmation State, show() und dismiss() Funktionen
 */
export function useInlineConfirmation(duration = 3000) {
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Laufenden Timer aufräumen */
  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Bestätigung anzeigen und Auto-Dismiss-Timer starten */
  const show = useCallback(
    (message: string, variant: ConfirmationVariant) => {
      // Vorherigen Timer aufräumen bevor neuer gesetzt wird
      clearTimer();
      setConfirmation({ message, variant });
      timerRef.current = setTimeout(() => {
        setConfirmation(null);
        timerRef.current = null;
      }, duration);
    },
    [duration, clearTimer],
  );

  /** Bestätigung manuell schließen */
  const dismiss = useCallback(() => {
    clearTimer();
    setConfirmation(null);
  }, [clearTimer]);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return { confirmation, show, dismiss } as const;
}
