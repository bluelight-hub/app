/**
 * Hook zur Prüfung ob der aktuelle Benutzer auf einen Einsatz zugreifen darf
 *
 * Basiert auf der operativen Rolle des Benutzers.
 * Externe haben keinen direkten Zugriff auf Einsätze.
 */

import { useOperativeRole } from './use-operative-role';

export interface EinsatzAccessInfo {
  /** Darf der Benutzer auf den Einsatz zugreifen? */
  canAccess: boolean;
  /** Ist der Zugriffs-Check noch am Laden? */
  isLoading: boolean;
}

/**
 * Prüft ob der aktuelle Benutzer auf einen bestimmten Einsatz zugreifen darf
 *
 * Führungskräfte und Einsatzkräfte haben grundsätzlich Zugriff.
 * Externe Personen haben keinen direkten Zugriff (müssen Beitrittsanfrage stellen).
 *
 * @param _einsatzId - ID des Einsatzes (für zukünftige einsatzspezifische Prüfungen)
 * @returns Zugriffsinformation
 *
 * @example
 * ```tsx
 * const { canAccess, isLoading } = useCanAccessEinsatz(einsatzId);
 *
 * if (isLoading) return <Spinner />;
 * if (!canAccess) return <AccessDenied />;
 * ```
 */
export function useCanAccessEinsatz(_einsatzId: string): EinsatzAccessInfo {
  const { canOpenEinsatz } = useOperativeRole();

  return {
    canAccess: canOpenEinsatz,
    isLoading: false,
  };
}
