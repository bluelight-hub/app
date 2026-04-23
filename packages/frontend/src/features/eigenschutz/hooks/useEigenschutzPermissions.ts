import { useCanAccess } from '@/features/auth';

/**
 * Frontend-Permission-Wrapper für den Eigenschutz-Feature-Slice (Story 2.1 AC5).
 *
 * **Designentscheidung / Fallback:** Das Projekt hat derzeit keinen granularen,
 * einsatz-scoped Permission-Hook. Die serverseitige Guard-Kette (JWT →
 * Einsatz-Scope → Eigenschutz-Rolle, inkl. `eigenschutz:gefaehrdungsbeurteilung:write`)
 * ist die **Source of Truth** — sie entscheidet endgültig bei jedem Create-
 * Request. Auf dem Client wollen wir trotzdem optimistisch den „Neue
 * Gefährdungsbeurteilung"-Button disablen, statt einem Nutzer ohne Rolle den
 * Drawer zu öffnen, den der Backend dann mit 403 beantwortet.
 *
 * **Proxy-Logik:** Wir nutzen `useCanAccess('eigenschutz')`, das über den
 * `/navigation/permissions`-Endpoint den Zugriff auf den Navigationsbereich
 * liefert. Das ist area-level, nicht action-level — also bewusst
 * konservativ: wer den Eigenschutz-Bereich nicht sehen darf, kann auch
 * keine Beurteilung anlegen. Umgekehrt kann ein 403 bei Submit trotzdem
 * passieren (z. B. wenn jemand `read`-Rolle hat, aber kein `write`). Der
 * Drawer fängt das über Inline-Fehler-Mapping ab (AC6).
 *
 * **Story 2.X+:** Sobald ein dedizierter `useEinsatzPermissions(einsatzId)`-Hook
 * existiert (z. B. aus JWT-Claims + Rollen-Matrix), wird dieser Wrapper
 * 1-zu-1 auf `canWriteGefaehrdungsbeurteilung` umgestellt.
 */
export interface EigenschutzPermissions {
  /** Ob der aktuelle Nutzer eine Gefährdungsbeurteilung anlegen darf. */
  readonly canCreateGefaehrdungsbeurteilung: boolean;
  /** Permissions laden noch — UI sollte den Button deaktivieren, nicht vorschnell disablen. */
  readonly isLoading: boolean;
  /** Maschinenlesbarer Permission-Key für Tooltip-Text (AC5). */
  readonly requiredPermission: 'eigenschutz:gefaehrdungsbeurteilung:write';
}

export function useEigenschutzPermissions(): EigenschutzPermissions {
  const { accessible, isLoading } = useCanAccess('eigenschutz');
  return {
    canCreateGefaehrdungsbeurteilung: accessible,
    isLoading,
    requiredPermission: 'eigenschutz:gefaehrdungsbeurteilung:write',
  };
}
