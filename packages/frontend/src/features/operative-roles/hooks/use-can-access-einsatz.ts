/**
 * Hook zur Prüfung ob der aktuelle Benutzer auf einen Einsatz zugreifen darf
 *
 * Basiert auf der operativen Rolle des Benutzers.
 * Alle operativen Rollen (inkl. Externe) dürfen zugreifen,
 * das Backend filtert nach Berechtigung (Externe sehen nur eingeladene Einsätze).
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
 * Alle operativen Rollen haben grundsätzlich Zugriff.
 * Externe sehen nur Einsätze, zu denen sie eingeladen wurden (Backend-Filterung).
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
