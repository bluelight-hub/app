/**
 * Hook für operative Rolle des aktuellen Benutzers
 *
 * Leitet boolesche Flags und Berechtigungen aus der operativen Rolle ab.
 * Die operative Rolle kommt aus dem Auth-State (via `.passthrough()` im Zod-Schema).
 *
 * Hinweis: Die operative Rolle wird vom Backend über den JWT Validated User gesetzt,
 * aber derzeit nicht explizit im AuthUserResponseDto exponiert. Das Zod-Schema in
 * auth-session.ts nutzt `.passthrough()`, sodass zusätzliche Felder durchgereicht werden.
 */

import { useCurrentUser } from '@/features/auth/api/use-current-user';
import { useMemo } from 'react';

/** Mögliche operative Rollen */
export type OperativeRole = 'FUEHRUNGSKRAFT' | 'EINSATZKRAFT' | 'EXTERNE';

export interface OperativeRoleInfo {
  /** Die operative Rolle des Benutzers (null wenn nicht gesetzt) */
  role: OperativeRole | null;
  /** Ist der Benutzer eine Führungskraft? */
  isFuehrungskraft: boolean;
  /** Ist der Benutzer eine Einsatzkraft? */
  isEinsatzkraft: boolean;
  /** Ist der Benutzer eine externe Person? */
  isExterne: boolean;
  /** Darf der Benutzer die Einsatz-Liste sehen? (alle operativen Rollen, Backend filtert nach Berechtigung) */
  canAccessEinsatzList: boolean;
  /** Darf der Benutzer einen Einsatz öffnen? (Führungskraft und Einsatzkraft) */
  canOpenEinsatz: boolean;
  /** Darf der Benutzer einen neuen Einsatz anlegen? (nur Führungskraft) */
  canCreateEinsatz: boolean;
  /** Darf der Benutzer einen Einsatz archivieren? (nur Führungskraft) */
  canArchiveEinsatz: boolean;
}

/**
 * Hook der die operative Rolle des aktuellen Benutzers bereitstellt
 *
 * @returns Operative Rolle und abgeleitete Berechtigungsflags
 *
 * @example
 * ```tsx
 * const { isFuehrungskraft, canArchiveEinsatz } = useOperativeRole();
 *
 * if (!canArchiveEinsatz) {
 *   return <PermissionDenied />;
 * }
 * ```
 */
export function useOperativeRole(): OperativeRoleInfo {
  const { user } = useCurrentUser();

  return useMemo(() => {
    // operativeRole wird via .passthrough() im Zod-Schema durchgereicht
    const role = ((user as Record<string, unknown> | null | undefined)?.operativeRole as OperativeRole) ?? null;

    const isFuehrungskraft = role === 'FUEHRUNGSKRAFT';
    const isEinsatzkraft = role === 'EINSATZKRAFT';
    const isExterne = role === 'EXTERNE';

    return {
      role,
      isFuehrungskraft,
      isEinsatzkraft,
      isExterne,
      canAccessEinsatzList: isFuehrungskraft || isEinsatzkraft || isExterne,
      canOpenEinsatz: isFuehrungskraft || isEinsatzkraft || isExterne,
      canCreateEinsatz: isFuehrungskraft,
      canArchiveEinsatz: isFuehrungskraft,
    };
  }, [user]);
}
