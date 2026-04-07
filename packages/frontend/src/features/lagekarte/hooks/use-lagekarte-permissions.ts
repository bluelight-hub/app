import { useEinsatzRolleContext } from '@/features/einsatz/contexts';

/**
 * Berechtigungs-Hook für Lagekarte-Zeichenwerkzeuge
 *
 * Nutzt die Einsatz-Rolle aus dem Layout-Kontext um zu prüfen,
 * ob der aktuelle Benutzer zeichnen darf.
 * Sekundäre Rollen (z.B. Beobachter) haben keine Zeichenberechtigung.
 */
export function useLagekartePermissions() {
  const { meineRolle, isLoading } = useEinsatzRolleContext();

  const canDraw = !isLoading && !!meineRolle && !meineRolle.permissions.isSecondaryRole;

  return { canDraw, isLoading };
}
