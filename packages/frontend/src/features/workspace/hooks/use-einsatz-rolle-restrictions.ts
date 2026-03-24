import { useMemo } from 'react';
import type { BefehlPermissionsDto } from '@bluelight-hub/shared/client';
import type { WorkspaceModuleDefinition } from '../types';

const SECONDARY_ROLE_REASON = 'Für Ihre Einsatzrolle nicht freigegeben.';

/** SubPage-IDs die fuer sekundaere Rollen sichtbar bleiben. */
const ALLOWED_FUEHRUNG_SUBPAGES = new Set(['etb', 'befehle']);

/**
 * Schraenkt Workspace-Module basierend auf der EinsatzRolle ein (Story 5.5).
 *
 * Sekundaere Rollen (EMPFAENGER, BEOBACHTER) sehen nur:
 * - uebersicht: Dashboard (adaptiert sich selbst)
 * - fuehrung: ETB (read-only) + Befehle (bereits rollenbasiert)
 *
 * Alle anderen Module/SubPages werden disabled mit Erklaerung.
 */
export function useEinsatzRolleWorkspaceRestrictions(modules: WorkspaceModuleDefinition[], permissions: Pick<BefehlPermissionsDto, 'isSecondaryRole'> | undefined): WorkspaceModuleDefinition[] {
  return useMemo(() => {
    if (!permissions?.isSecondaryRole) return modules;

    return modules.map((module) => {
      // uebersicht bleibt visible — Dashboard adaptiert sich via SecondaryRoleDashboard
      if (module.id === 'übersicht') return module;

      // fuehrung bleibt visible, aber SubPages einschraenken
      if (module.id === 'führung') {
        return {
          ...module,
          subPages: module.subPages.map((page) => {
            if (ALLOWED_FUEHRUNG_SUBPAGES.has(page.id)) return page;
            // Bereits disabled? Nicht ueberschreiben
            if (page.visibility.default === 'disabled') return page;
            return {
              ...page,
              visibility: { default: 'disabled' as const, reason: SECONDARY_ROLE_REASON },
            };
          }) as typeof module.subPages,
        };
      }

      // Bereits disabled (z.B. kommunikation, sicherheit etc.) → nicht ueberschreiben
      if (module.visibility.default === 'disabled') return module;

      // Alle anderen sichtbaren Module (kraefte etc.) → disabled
      return {
        ...module,
        visibility: { default: 'disabled' as const, reason: SECONDARY_ROLE_REASON },
      };
    });
  }, [modules, permissions?.isSecondaryRole]);
}
